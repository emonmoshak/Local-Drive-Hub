'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Upload, File, Image, FileText, FolderOpen } from 'lucide-react';

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  targetAccount?: string;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[], targetAccount: string) => void;
  accounts: Array<{ id: string; email: string; name: string; quota_bytes_used?: number; quota_bytes_total?: number }>;
  isUploading: boolean;
}

export default function UploadModal({ 
  isOpen, 
  onClose, 
  onUpload, 
  accounts,
  isUploading 
}: UploadModalProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [targetAccount, setTargetAccount] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFiles = (files: File[]) => {
    const newUploadFiles: UploadFile[] = files.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      progress: 0,
      status: 'pending' as const
    }));
    
    setUploadFiles(prev => [...prev, ...newUploadFiles]);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleUpload = () => {
    if (uploadFiles.length === 0 || !targetAccount) return;
    
    const files = uploadFiles.map(uf => uf.file);
    onUpload(files, targetAccount);
  };

  const handleClose = () => {
    setUploadFiles([]);
    setTargetAccount('');
    setDragActive(false);
    onClose();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-5 h-5 text-blue-400" />;
    } else if (file.type.includes('text') || file.type.includes('document')) {
      return <FileText className="w-5 h-5 text-blue-600" />;
    } else {
      return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAvailableSpace = (account: { quota_bytes_used?: number; quota_bytes_total?: number }) => {
    if (!account.quota_bytes_total || !account.quota_bytes_used) return 'Unknown';
    const available = account.quota_bytes_total - account.quota_bytes_used;
    return formatFileSize(available);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Upload Files</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Account Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Target Account
            </label>
            <select
              value={targetAccount}
              onChange={(e) => setTargetAccount(e.target.value)}
              className="input"
              required
            >
              <option value="">Choose an account...</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.email} (Available: {getAvailableSpace(account)})
                </option>
              ))}
            </select>
          </div>

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center">
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Drag & drop files here
              </h3>
              <p className="text-gray-500 mb-4">or click to browse</p>
              <button
                onClick={handleFileSelect}
                className="btn btn-primary"
                type="button"
              >
                Browse Files
              </button>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => {
              if (e.target.files) {
                handleFiles(Array.from(e.target.files));
              }
            }}
            className="hidden"
          />

          {/* File List */}
          {uploadFiles.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Files to upload ({uploadFiles.length})
              </h4>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {uploadFiles.map(uploadFile => (
                  <div
                    key={uploadFile.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {getFileIcon(uploadFile.file)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {uploadFile.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(uploadFile.file.size)}
                        </p>
                      </div>
                    </div>
                    
                    {uploadFile.status === 'uploading' && (
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadFile.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {uploadFile.progress}%
                        </span>
                      </div>
                    )}
                    
                    {uploadFile.status === 'pending' && (
                      <button
                        onClick={() => removeFile(uploadFile.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    
                    {uploadFile.status === 'completed' && (
                      <span className="text-green-500 text-sm">✓</span>
                    )}
                    
                    {uploadFile.status === 'error' && (
                      <span className="text-red-500 text-sm">✗</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {uploadFiles.length > 0 && (
              <span>
                Total size: {formatFileSize(uploadFiles.reduce((sum, f) => sum + f.file.size, 0))}
              </span>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="btn btn-secondary"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              className="btn btn-primary"
              disabled={uploadFiles.length === 0 || !targetAccount || isUploading}
            >
              {isUploading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Uploading...
                </span>
              ) : (
                `Upload ${uploadFiles.length} file${uploadFiles.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
