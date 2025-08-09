'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import FileGrid from '@/components/FileGrid';
import ConnectAccountModal from '@/components/ConnectAccountModal';
import UploadModal from '@/components/UploadModal';

interface Account {
  id: string;
  email: string;
  name: string;
  quota_bytes_total: number;
  quota_bytes_used: number;
  created_at: number;
  updated_at: number;
}

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

function HomePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const searchParams = useSearchParams();

  // Handle OAuth callback results
  useEffect(() => {
    const error = searchParams.get('error');
    const success = searchParams.get('success');
    const email = searchParams.get('email');

    if (error) {
      const message = searchParams.get('message') || 'An error occurred';
      setNotification({ type: 'error', message });
    } else if (success === 'account_added' && email) {
      setNotification({ type: 'success', message: `Successfully connected ${email}` });
      loadAccounts();
    }
  }, [searchParams]);

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  // Auto-dismiss notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      const data = await response.json();
      
      if (data.success) {
        setAccounts(data.accounts);
      } else {
        setError('Failed to load accounts');
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      setError('Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFiles = async (refresh = false, passphrase?: string) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      
      if (searchQuery) params.append('search', searchQuery);
      if (refresh && passphrase) {
        params.append('refresh', 'true');
        params.append('passphrase', passphrase);
      }

      const response = await fetch(`/api/files?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setFiles(data.files);
      } else {
        setError('Failed to load files');
      }
    } catch (error) {
      console.error('Error loading files:', error);
      setError('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectAccount = async (passphrase: string) => {
    try {
      setIsConnecting(true);
      setError(undefined);

      // Get auth URL
      const response = await fetch('/api/auth/start');
      const data = await response.json();
      
      if (data.success) {
        // Redirect to Google OAuth with passphrase
        const authUrl = new URL(data.authUrl);
        authUrl.searchParams.append('state', btoa(JSON.stringify({ passphrase })));
        
        window.location.href = authUrl.toString();
      } else {
        setError(data.error || 'Failed to start OAuth flow');
      }
    } catch (error) {
      console.error('Error connecting account:', error);
      setError('Failed to connect account');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleUpload = async (files: File[], targetAccountId: string) => {
    try {
      setIsUploading(true);
      
      // Create form data
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('targetAccountId', targetAccountId);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        setNotification({ type: 'success', message: `Successfully uploaded ${files.length} file(s)` });
        setShowUploadModal(false);
        // Refresh files list
        await loadFiles();
      } else {
        setError(data.error || 'Failed to upload files');
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      setError('Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileDownload = async (file: FileItem) => {
    try {
      const response = await fetch(`/api/download?fileId=${file.id}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Failed to download file');
    }
  };

  const handleFileSelect = (file: FileItem) => {
    // TODO: Implement file preview or details
    console.log('Selected file:', file);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    loadFiles();
  };

  const handleRefreshFiles = async () => {
    // TODO: Show modal to get passphrase for refresh
    await loadFiles();
  };

  if (isLoading && accounts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading LocalDriveHub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center justify-between">
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(undefined)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="flex h-screen">
        {/* Sidebar */}
        <Sidebar 
          accounts={accounts} 
          onAccountsRefresh={handleRefreshFiles}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <TopBar
            onSearch={handleSearch}
            onConnectAccount={() => setShowConnectModal(true)}
            onUpload={() => setShowUploadModal(true)}
            searchQuery={searchQuery}
          />

          {/* Welcome Message for No Accounts */}
          {accounts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-white text-2xl font-bold">LDH</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Welcome to LocalDriveHub
                </h2>
                <p className="text-gray-600 mb-8">
                  Connect your Google Drive accounts to start backing up and managing your files locally.
                </p>
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="btn btn-primary text-lg px-8 py-3"
                >
                  Connect Your First Account
                </button>
              </div>
            </div>
          ) : (
            // File Grid
            <FileGrid
              files={files}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onFileSelect={handleFileSelect}
              onFileDownload={handleFileDownload}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <ConnectAccountModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnect={handleConnectAccount}
        isConnecting={isConnecting}
        error={error}
      />

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        accounts={accounts}
        isUploading={isUploading}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading LocalDriveHub...</p>
        </div>
      </div>
    }>
      <HomePage />
    </Suspense>
  );
}