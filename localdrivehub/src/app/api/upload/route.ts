import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { decryptRefreshToken, generateId } from '@/lib/encryption';
import { createGoogleAuthManager } from '@/lib/google-auth';
import { GoogleDriveManager } from '@/lib/google-drive';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const targetAccountId = formData.get('targetAccountId') as string;
    const passphrase = formData.get('passphrase') as string;

    if (!files.length || !targetAccountId) {
      return NextResponse.json(
        { success: false, error: 'Files and target account are required' },
        { status: 400 }
      );
    }

    const database = await getDatabase();
    const account = await database.getAccount(targetAccountId);

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Target account not found' },
        { status: 404 }
      );
    }

    // If passphrase not provided, try to use existing access token
    let accessToken = account.access_token;
    let needsRefresh = !accessToken || (account.token_expiry && account.token_expiry < Date.now());

    if (needsRefresh) {
      if (!passphrase) {
        return NextResponse.json(
          { success: false, error: 'Passphrase required to refresh token' },
          { status: 401 }
        );
      }

      // Decrypt refresh token and get new access token
      const refreshToken = decryptRefreshToken(account.refresh_token, passphrase);
      const authManager = createGoogleAuthManager();
      accessToken = await authManager.refreshAccessToken(refreshToken);

      // Update account with new access token
      const updatedAccount = {
        ...account,
        access_token: accessToken,
        token_expiry: Date.now() + 3600000, // 1 hour
        updated_at: Date.now()
      };
      await database.saveAccount(updatedAccount);
    }

    // Initialize Drive manager
    const authManager = createGoogleAuthManager();
    const driveManager = new GoogleDriveManager(authManager);
    await driveManager.initialize(accessToken!);

    // Check available space
    const availableSpace = await driveManager.getAvailableSpace();
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    if (totalSize > availableSpace) {
      return NextResponse.json(
        { success: false, error: 'Insufficient storage space in target account' },
        { status: 400 }
      );
    }

    // Start uploads
    const uploadPromises = files.map(async (file) => {
      const uploadId = generateId();
      
      // Save upload record
      const upload = {
        id: uploadId,
        file_name: file.name,
        file_size: file.size,
        target_account_id: targetAccountId,
        status: 'uploading' as const,
        progress_bytes: 0,
        created_at: Date.now()
      };
      await database.saveUpload(upload);

      try {
        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Drive
        const fileId = await driveManager.uploadFile(
          file.name,
          buffer,
          file.type || 'application/octet-stream',
          (progress) => {
            // Update progress in database (simplified - in production would use WebSockets)
            database.updateUploadProgress(uploadId, progress.bytesUploaded);
          }
        );

        // Mark as completed
        await database.updateUploadStatus(uploadId, 'completed');
        
        return { success: true, fileId, fileName: file.name };
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        await database.updateUploadStatus(uploadId, 'failed', error instanceof Error ? error.message : 'Upload failed');
        return { success: false, fileName: file.name, error: error instanceof Error ? error.message : 'Upload failed' };
      }
    });

    const results = await Promise.all(uploadPromises);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return NextResponse.json({
      success: true,
      message: `Uploaded ${successful.length} of ${files.length} files`,
      results: {
        successful: successful.length,
        failed: failed.length,
        details: results
      }
    });

  } catch (error) {
    console.error('Error in upload API:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const database = await getDatabase();
    const uploads = await database.getUploads(status || undefined);

    return NextResponse.json({
      success: true,
      uploads
    });
  } catch (error) {
    console.error('Error fetching uploads:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch uploads' },
      { status: 500 }
    );
  }
}
