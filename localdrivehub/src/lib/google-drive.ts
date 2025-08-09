import { drive_v3, google } from 'googleapis';
import { GoogleAuthManager } from './google-auth';
import { FileMetadata } from './database';

export interface DriveQuota {
  bytesTotal: number;
  bytesUsed: number;
  bytesUsedInDrive: number;
  bytesUsedInTrash: number;
}

export interface DriveFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  parents?: string[];
  modifiedTime: string;
  createdTime: string;
  thumbnailLink?: string;
  webViewLink?: string;
  downloadUrl?: string;
}

export interface UploadProgress {
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
}

export class GoogleDriveManager {
  private authManager: GoogleAuthManager;
  private drive: drive_v3.Drive | null = null;

  constructor(authManager: GoogleAuthManager) {
    this.authManager = authManager;
  }

  /**
   * Initialize Drive client with access token
   */
  async initialize(accessToken: string): Promise<void> {
    this.drive = this.authManager.getDriveClient(accessToken);
  }

  /**
   * Get user's Drive quota information
   */
  async getQuota(): Promise<DriveQuota> {
    if (!this.drive) throw new Error('Drive client not initialized');

    try {
      const response = await this.drive.about.get({
        fields: 'storageQuota'
      });

      const quota = response.data.storageQuota;
      if (!quota) {
        throw new Error('Failed to get storage quota information');
      }

      return {
        bytesTotal: parseInt(quota.limit || '0'),
        bytesUsed: parseInt(quota.usage || '0'),
        bytesUsedInDrive: parseInt(quota.usageInDrive || '0'),
        bytesUsedInTrash: parseInt(quota.usageInDriveTrash || '0')
      };
    } catch (error) {
      console.error('Error getting Drive quota:', error);
      throw new Error('Failed to get Drive quota information');
    }
  }

  /**
   * List files in Drive with pagination
   */
  async listFiles(pageToken?: string, query?: string): Promise<{
    files: DriveFile[];
    nextPageToken?: string;
  }> {
    if (!this.drive) throw new Error('Drive client not initialized');

    try {
      let driveQuery = "trashed=false";
      if (query) {
        driveQuery += ` and name contains '${query}'`;
      }

      const response = await this.drive.files.list({
        pageSize: 100,
        pageToken,
        q: driveQuery,
        fields: 'nextPageToken, files(id, name, size, mimeType, parents, modifiedTime, createdTime, thumbnailLink, webViewLink)',
        orderBy: 'modifiedTime desc'
      });

      const files = response.data.files || [];
      
      return {
        files: files.map(file => ({
          id: file.id || '',
          name: file.name || '',
          size: parseInt(file.size || '0'),
          mimeType: file.mimeType || '',
          parents: file.parents,
          modifiedTime: file.modifiedTime || '',
          createdTime: file.createdTime || '',
          thumbnailLink: file.thumbnailLink,
          webViewLink: file.webViewLink,
          downloadUrl: this.getDownloadUrl(file.id || '', file.mimeType || '')
        })),
        nextPageToken: response.data.nextPageToken || undefined
      };
    } catch (error) {
      console.error('Error listing Drive files:', error);
      throw new Error('Failed to list Drive files');
    }
  }

  /**
   * Get all files from Drive (with pagination handling)
   */
  async getAllFiles(query?: string): Promise<DriveFile[]> {
    const allFiles: DriveFile[] = [];
    let pageToken: string | undefined;

    do {
      const result = await this.listFiles(pageToken, query);
      allFiles.push(...result.files);
      pageToken = result.nextPageToken;
    } while (pageToken);

    return allFiles;
  }

  /**
   * Convert DriveFile to FileMetadata for database storage
   */
  convertToFileMetadata(driveFile: DriveFile, accountId: string): FileMetadata {
    return {
      id: `${accountId}-${driveFile.id}`,
      name: driveFile.name,
      size: driveFile.size,
      mime_type: driveFile.mimeType,
      account_id: accountId,
      drive_file_id: driveFile.id,
      parent_id: driveFile.parents?.[0],
      modified_time: driveFile.modifiedTime,
      created_time: driveFile.createdTime,
      thumbnail_link: driveFile.thumbnailLink,
      web_view_link: driveFile.webViewLink,
      download_link: driveFile.downloadUrl,
      indexed_at: Date.now()
    };
  }

  /**
   * Upload a file to Drive with resumable upload
   */
  async uploadFile(
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    if (!this.drive) throw new Error('Drive client not initialized');

    try {
      const fileMetadata = {
        name: fileName
      };

      const media = {
        mimeType,
        body: fileBuffer
      };

      // For large files, we should use resumable uploads
      if (fileBuffer.length > 5 * 1024 * 1024) { // 5MB threshold
        return this.uploadLargeFile(fileName, fileBuffer, mimeType, onProgress);
      }

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id'
      });

      return response.data.id || '';
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload file to Drive');
    }
  }

  /**
   * Upload large file with resumable upload
   */
  private async uploadLargeFile(
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    if (!this.drive) throw new Error('Drive client not initialized');

    const fileMetadata = {
      name: fileName
    };

    const media = {
      mimeType,
      body: fileBuffer
    };

    // Use resumable upload for large files
    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id',
      // Enable resumable upload
      uploadType: 'resumable'
    });

    return response.data.id || '';
  }

  /**
   * Download a file from Drive
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    if (!this.drive) throw new Error('Drive client not initialized');

    try {
      const response = await this.drive.files.get({
        fileId,
        alt: 'media'
      }, {
        responseType: 'stream'
      });

      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        
        response.data.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        
        response.data.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        
        response.data.on('error', (error: Error) => {
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      throw new Error('Failed to download file from Drive');
    }
  }

  /**
   * Get download URL for a file
   */
  private getDownloadUrl(fileId: string, mimeType: string): string | undefined {
    // Google Docs, Sheets, Slides need to be exported
    if (mimeType.includes('google-apps')) {
      return undefined; // Will need special handling for export
    }
    
    return `https://drive.google.com/uc?id=${fileId}&export=download`;
  }

  /**
   * Delete a file from Drive
   */
  async deleteFile(fileId: string): Promise<void> {
    if (!this.drive) throw new Error('Drive client not initialized');

    try {
      await this.drive.files.delete({
        fileId
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file from Drive');
    }
  }

  /**
   * Create a folder in Drive
   */
  async createFolder(name: string, parentId?: string): Promise<string> {
    if (!this.drive) throw new Error('Drive client not initialized');

    try {
      const fileMetadata: any = {
        name,
        mimeType: 'application/vnd.google-apps.folder'
      };

      if (parentId) {
        fileMetadata.parents = [parentId];
      }

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id'
      });

      return response.data.id || '';
    } catch (error) {
      console.error('Error creating folder:', error);
      throw new Error('Failed to create folder in Drive');
    }
  }

  /**
   * Check available space for upload
   */
  async getAvailableSpace(): Promise<number> {
    const quota = await this.getQuota();
    return quota.bytesTotal - quota.bytesUsed;
  }
}
