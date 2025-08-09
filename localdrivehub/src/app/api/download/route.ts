import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { decryptRefreshToken } from '@/lib/encryption';
import { createGoogleAuthManager } from '@/lib/google-auth';
import { GoogleDriveManager } from '@/lib/google-drive';
import archiver from 'archiver';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const fileIds = searchParams.getAll('fileIds'); // For bulk download
    const passphrase = searchParams.get('passphrase');
    const bulk = searchParams.get('bulk') === 'true';

    if (!fileId && !fileIds.length) {
      return NextResponse.json(
        { success: false, error: 'File ID(s) required' },
        { status: 400 }
      );
    }

    const database = await getDatabase();
    
    if (bulk && fileIds.length > 0) {
      return handleBulkDownload(fileIds, passphrase, database);
    } else if (fileId) {
      return handleSingleDownload(fileId, passphrase, database);
    }

    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in download API:', error);
    return NextResponse.json(
      { success: false, error: 'Download failed' },
      { status: 500 }
    );
  }
}

async function handleSingleDownload(fileId: string, passphrase: string | null, database: any) {
  // Get file metadata
  const files = await database.getFiles();
  const file = files.find((f: any) => f.id === fileId);

  if (!file) {
    return NextResponse.json(
      { success: false, error: 'File not found' },
      { status: 404 }
    );
  }

  // Get account
  const account = await database.getAccount(file.account_id);
  if (!account) {
    return NextResponse.json(
      { success: false, error: 'Account not found' },
      { status: 404 }
    );
  }

  // Get access token
  let accessToken = account.access_token;
  let needsRefresh = !accessToken || (account.token_expiry && account.token_expiry < Date.now());

  if (needsRefresh) {
    if (!passphrase) {
      return NextResponse.json(
        { success: false, error: 'Passphrase required to refresh token' },
        { status: 401 }
      );
    }

    const refreshToken = decryptRefreshToken(account.refresh_token, passphrase);
    const authManager = createGoogleAuthManager();
    accessToken = await authManager.refreshAccessToken(refreshToken);
  }

  // Download file from Drive
  const authManager = createGoogleAuthManager();
  const driveManager = new GoogleDriveManager(authManager);
  await driveManager.initialize(accessToken!);

  const fileBuffer = await driveManager.downloadFile(file.drive_file_id);

  // Return file as response
  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': file.mime_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${file.name}"`,
      'Content-Length': fileBuffer.length.toString(),
    },
  });
}

async function handleBulkDownload(fileIds: string[], passphrase: string | null, database: any) {
  // Get file metadata for all files
  const allFiles = await database.getFiles();
  const files = allFiles.filter((f: any) => fileIds.includes(f.id));

  if (files.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No valid files found' },
      { status: 404 }
    );
  }

  // Group files by account
  const filesByAccount = files.reduce((acc: any, file: any) => {
    if (!acc[file.account_id]) {
      acc[file.account_id] = [];
    }
    acc[file.account_id].push(file);
    return acc;
  }, {});

  // Create a readable stream for the ZIP
  const readableStream = new ReadableStream({
    async start(controller) {
      const archive = archiver('zip', {
        zlib: { level: 1 } // Fastest compression
      });

      // Pipe archive data to the stream
      archive.on('data', (chunk) => {
        controller.enqueue(new Uint8Array(chunk));
      });

      archive.on('end', () => {
        controller.close();
      });

      archive.on('error', (err) => {
        controller.error(err);
      });

      try {
        // Process each account
        for (const [accountId, accountFiles] of Object.entries(filesByAccount)) {
          const account = await database.getAccount(accountId);
          if (!account) continue;

          // Get access token
          let accessToken = account.access_token;
          let needsRefresh = !accessToken || (account.token_expiry && account.token_expiry < Date.now());

          if (needsRefresh) {
            if (!passphrase) {
              console.error('Passphrase required for account:', account.email);
              continue;
            }

            const refreshToken = decryptRefreshToken(account.refresh_token, passphrase);
            const authManager = createGoogleAuthManager();
            accessToken = await authManager.refreshAccessToken(refreshToken);
          }

          // Initialize Drive manager
          const authManager = createGoogleAuthManager();
          const driveManager = new GoogleDriveManager(authManager);
          await driveManager.initialize(accessToken!);

          // Download and add each file to archive
          for (const file of accountFiles as any[]) {
            try {
              const fileBuffer = await driveManager.downloadFile(file.drive_file_id);
              
              // Create safe filename (include account email to avoid conflicts)
              const safeFileName = `${account.email}/${file.name}`;
              archive.append(fileBuffer, { name: safeFileName });
            } catch (error) {
              console.error(`Error downloading file ${file.name}:`, error);
              // Add error file to archive
              const errorContent = `Error downloading ${file.name}: ${error}`;
              archive.append(Buffer.from(errorContent), { name: `errors/${file.name}.error.txt` });
            }
          }
        }

        // Finalize the archive
        await archive.finalize();
      } catch (error) {
        controller.error(error);
      }
    }
  });

  // Return the ZIP stream
  return new NextResponse(readableStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="localdrivehub-files-${Date.now()}.zip"`,
      'Transfer-Encoding': 'chunked',
    },
  });
}
