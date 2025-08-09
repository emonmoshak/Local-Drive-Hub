import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { decryptRefreshToken } from '@/lib/encryption';
import { createGoogleAuthManager } from '@/lib/google-auth';
import { GoogleDriveManager } from '@/lib/google-drive';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const search = searchParams.get('search');
    const refresh = searchParams.get('refresh') === 'true';
    const passphrase = searchParams.get('passphrase');
    
    const database = await getDatabase();
    
    // If refresh is requested, sync files from Google Drive
    if (refresh && passphrase) {
      if (accountId) {
        await syncAccountFiles(accountId, passphrase);
      } else {
        // Sync all accounts
        const accounts = await database.getAccounts();
        for (const account of accounts) {
          try {
            await syncAccountFiles(account.id, passphrase);
          } catch (error) {
            console.error(`Failed to sync account ${account.email}:`, error);
          }
        }
      }
    }
    
    // Get files from database
    const files = await database.getFiles(accountId || undefined, search || undefined);
    
    // Get account info for account badges
    const accounts = await database.getAccounts();
    const accountMap = accounts.reduce((map, account) => {
      map[account.id] = {
        email: account.email,
        name: account.name
      };
      return map;
    }, {} as Record<string, { email: string; name: string }>);
    
    // Add account info to files
    const enrichedFiles = files.map(file => ({
      ...file,
      account: accountMap[file.account_id]
    }));
    
    return NextResponse.json({
      success: true,
      files: enrichedFiles,
      totalFiles: files.length
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

async function syncAccountFiles(accountId: string, passphrase: string): Promise<void> {
  const database = await getDatabase();
  const account = await database.getAccount(accountId);
  
  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }
  
  try {
    // Decrypt refresh token
    const refreshToken = decryptRefreshToken(account.refresh_token, passphrase);
    
    // Get fresh access token
    const authManager = createGoogleAuthManager();
    const accessToken = await authManager.refreshAccessToken(refreshToken);
    
    // Initialize Drive manager
    const driveManager = new GoogleDriveManager(authManager);
    await driveManager.initialize(accessToken);
    
    // Get all files from Drive
    const driveFiles = await driveManager.getAllFiles();
    
    // Convert to database format
    const fileMetadata = driveFiles.map(driveFile => 
      driveManager.convertToFileMetadata(driveFile, accountId)
    );
    
    // Clear existing files for this account and save new ones
    await database.clearFileMetadata(accountId);
    if (fileMetadata.length > 0) {
      await database.saveFileMetadata(fileMetadata);
    }
    
    // Update account quota
    const quota = await driveManager.getQuota();
    const updatedAccount = {
      ...account,
      access_token: accessToken,
      token_expiry: Date.now() + 3600000, // 1 hour
      quota_bytes_total: quota.bytesTotal,
      quota_bytes_used: quota.bytesUsed,
      updated_at: Date.now()
    };
    
    await database.saveAccount(updatedAccount);
    
    console.log(`Synced ${fileMetadata.length} files for account ${account.email}`);
  } catch (error) {
    console.error(`Error syncing files for account ${account.email}:`, error);
    throw error;
  }
}
