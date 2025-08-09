'use client';

import { useState } from 'react';
import { 
  Grid, 
  List, 
  Download, 
  Share2, 
  MoreHorizontal,
  FileText,
  Image,
  File,
  Folder,
  FileSpreadsheet,
  Presentation
} from 'lucide-react';

interface FileItem {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  account_id: string;
  modified_time: string;
  account?: {
    email: string;
    name: string;
  };
}

interface FileGridProps {
  files: FileItem[];
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onFileSelect: (file: FileItem) => void;
  onFileDownload: (file: FileItem) => void;
}

export default function FileGrid({ 
  files, 
  viewMode, 
  onViewModeChange, 
  onFileSelect, 
  onFileDownload 
}: FileGridProps) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getFileIcon = (mimeType: string, size: 'sm' | 'lg' = 'sm') => {
    const iconSize = size === 'lg' ? 'w-12 h-12' : 'w-5 h-5';
    
    if (mimeType.includes('folder')) {
      return <Folder className={`${iconSize} text-blue-500`} />;
    } else if (mimeType.includes('image')) {
      return <Image className={`${iconSize} text-blue-400`} />;
    } else if (mimeType.includes('sheet') || mimeType.includes('excel')) {
      return <FileSpreadsheet className={`${iconSize} text-green-500`} />;
    } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      return <Presentation className={`${iconSize} text-orange-500`} />;
    } else if (mimeType.includes('document') || mimeType.includes('text')) {
      return <FileText className={`${iconSize} text-blue-600`} />;
    } else {
      return <File className={`${iconSize} text-gray-500`} />;
    }
  };

  const getFileIconBackground = (mimeType: string): string => {
    if (mimeType.includes('image')) return 'bg-blue-50';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'bg-green-50';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'bg-orange-50';
    if (mimeType.includes('document') || mimeType.includes('text')) return 'bg-blue-50';
    return 'bg-gray-50';
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Files</h2>
          <p className="text-gray-500">{files.length} files</p>
        </div>

        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex items-center border border-gray-200 rounded-lg">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-2 ${
                viewMode === 'grid'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-2 ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Files Display */}
      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Folder className="w-16 h-16 mb-4" />
          <h3 className="text-lg font-medium mb-2">No files found</h3>
          <p>Connect a Google Drive account or upload files to get started</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {files.map(file => (
            <FileCard 
              key={file.id} 
              file={file} 
              selected={selectedFiles.has(file.id)}
              onSelect={() => toggleFileSelection(file.id)}
              onClick={() => onFileSelect(file)}
              onDownload={() => onFileDownload(file)}
              getFileIcon={getFileIcon}
              getFileIconBackground={getFileIconBackground}
              formatFileSize={formatFileSize}
              formatDate={formatDate}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
            <div className="col-span-5">Name</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-2">Modified</div>
            <div className="col-span-2">Account</div>
            <div className="col-span-1">Actions</div>
          </div>
          {files.map(file => (
            <FileRow 
              key={file.id} 
              file={file}
              selected={selectedFiles.has(file.id)}
              onSelect={() => toggleFileSelection(file.id)}
              onClick={() => onFileSelect(file)}
              onDownload={() => onFileDownload(file)}
              getFileIcon={getFileIcon}
              formatFileSize={formatFileSize}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FileCardProps {
  file: FileItem;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onDownload: () => void;
  getFileIcon: (mimeType: string, size?: 'sm' | 'lg') => JSX.Element;
  getFileIconBackground: (mimeType: string) => string;
  formatFileSize: (bytes: number) => string;
  formatDate: (dateString: string) => string;
}

function FileCard({ 
  file, 
  selected, 
  onSelect, 
  onClick, 
  onDownload, 
  getFileIcon, 
  getFileIconBackground, 
  formatFileSize, 
  formatDate 
}: FileCardProps) {
  return (
    <div 
      className={`card p-4 cursor-pointer hover:shadow-lg transition-all duration-200 ${
        selected ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={onClick}
    >
      <div className="relative">
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-0 right-0 w-4 h-4"
        />
        
        <div className={`w-full h-32 rounded-lg ${getFileIconBackground(file.mime_type)} flex items-center justify-center mb-3`}>
          {getFileIcon(file.mime_type, 'lg')}
        </div>
        
        <h3 className="font-medium text-gray-900 truncate mb-1" title={file.name}>
          {file.name}
        </h3>
        
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>{formatFileSize(file.size)}</span>
          <span>{formatDate(file.modified_time)}</span>
        </div>
        
        {file.account && (
          <div className="mt-2">
            <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full truncate max-w-full">
              {file.account.email}
            </span>
          </div>
        )}
        
        <div className="flex justify-end mt-3 space-x-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            className="p-1 text-gray-400 hover:text-blue-500 rounded"
          >
            <Download className="w-4 h-4" />
          </button>
          <button className="p-1 text-gray-400 hover:text-blue-500 rounded">
            <Share2 className="w-4 h-4" />
          </button>
          <button className="p-1 text-gray-400 hover:text-blue-500 rounded">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface FileRowProps {
  file: FileItem;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onDownload: () => void;
  getFileIcon: (mimeType: string, size?: 'sm' | 'lg') => JSX.Element;
  formatFileSize: (bytes: number) => string;
  formatDate: (dateString: string) => string;
}

function FileRow({ 
  file, 
  selected, 
  onSelect, 
  onClick, 
  onDownload, 
  getFileIcon, 
  formatFileSize, 
  formatDate 
}: FileRowProps) {
  return (
    <div 
      className={`grid grid-cols-12 gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${
        selected ? 'bg-blue-50' : ''
      }`}
      onClick={onClick}
    >
      <div className="col-span-5 flex items-center space-x-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4"
        />
        <div className="flex-shrink-0">
          {getFileIcon(file.mime_type)}
        </div>
        <span className="font-medium text-gray-900 truncate" title={file.name}>
          {file.name}
        </span>
      </div>
      
      <div className="col-span-2 flex items-center text-sm text-gray-600">
        {formatFileSize(file.size)}
      </div>
      
      <div className="col-span-2 flex items-center text-sm text-gray-600">
        {formatDate(file.modified_time)}
      </div>
      
      <div className="col-span-2 flex items-center">
        {file.account && (
          <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full truncate max-w-full">
            {file.account.email}
          </span>
        )}
      </div>
      
      <div className="col-span-1 flex items-center justify-end space-x-2">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          className="p-1 text-gray-400 hover:text-blue-500 rounded"
        >
          <Download className="w-4 h-4" />
        </button>
        <button className="p-1 text-gray-400 hover:text-blue-500 rounded">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
