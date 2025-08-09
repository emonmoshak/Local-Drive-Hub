import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { decryptRefreshToken } from '@/lib/encryption';
import { createGoogleAuthManager } from '@/lib/google-auth';
import { GoogleDriveManager } from '@/lib/google-drive';

export async function GET(request: NextRequest) {
  try {
    const database = await getDatabase();
    const accounts = await database.getAccounts();
    
    // Remove sensitive data before sending to client
    const sanitizedAccounts = accounts.map(account => ({
      id: account.id,
      email: account.email,
      name: account.name,
      quota_bytes_total: account.quota_bytes_total,
      quota_bytes_used: account.quota_bytes_used,
      created_at: account.created_at,
      updated_at: account.updated_at
    }));
    
    return NextResponse.json({
      success: true,
      accounts: sanitizedAccounts
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('id');
    
    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      );
    }
    
    const database = await getDatabase();
    await database.deleteAccount(accountId);
    
    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { accountId, passphrase } = await request.json();
    
    if (!accountId || !passphrase) {
      return NextResponse.json(
        { success: false, error: 'Account ID and passphrase are required' },
        { status: 400 }
      );
    }
    
    const database = await getDatabase();
    const account = await database.getAccount(accountId);
    
    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      );
    }
    
    // Decrypt refresh token and refresh access token
    const refreshToken = decryptRefreshToken(account.refresh_token, passphrase);
    const authManager = createGoogleAuthManager();
    const newAccessToken = await authManager.refreshAccessToken(refreshToken);
    
    // Update quota information
    const driveManager = new GoogleDriveManager(authManager);
    await driveManager.initialize(newAccessToken);
    const quota = await driveManager.getQuota();
    
    // Update account in database
    const updatedAccount = {
      ...account,
      access_token: newAccessToken,
      token_expiry: Date.now() + 3600000, // 1 hour
      quota_bytes_total: quota.bytesTotal,
      quota_bytes_used: quota.bytesUsed,
      updated_at: Date.now()
    };
    
    await database.saveAccount(updatedAccount);
    
    return NextResponse.json({
      success: true,
      message: 'Account refreshed successfully',
      account: {
        id: updatedAccount.id,
        email: updatedAccount.email,
        name: updatedAccount.name,
        quota_bytes_total: updatedAccount.quota_bytes_total,
        quota_bytes_used: updatedAccount.quota_bytes_used,
        updated_at: updatedAccount.updated_at
      }
    });
  } catch (error) {
    console.error('Error refreshing account:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to refresh account. Check your passphrase.' },
      { status: 500 }
    );
  }
}
