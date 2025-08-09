'use client';

import { useState } from 'react';
import { X, Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';

interface ConnectAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (passphrase: string) => void;
  isConnecting: boolean;
  error?: string;
}

export default function ConnectAccountModal({ 
  isOpen, 
  onClose, 
  onConnect, 
  isConnecting, 
  error 
}: ConnectAccountModalProps) {
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passphrase.trim()) {
      onConnect(passphrase);
    }
  };

  const handleClose = () => {
    setPassphrase('');
    setShowPassphrase(false);
    setIsFirstTime(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Connect Google Account
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-900 mb-1">
                  Secure Local Storage
                </h3>
                <p className="text-sm text-blue-700">
                  Your Google tokens will be encrypted with this passphrase and stored locally. 
                  Keep your passphrase safe - you'll need it to access your accounts.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* First Time Setup Toggle */}
            <div className="mb-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isFirstTime}
                  onChange={(e) => setIsFirstTime(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  This is my first account (create new passphrase)
                </span>
              </label>
            </div>

            {/* Passphrase Input */}
            <div className="mb-6">
              <label 
                htmlFor="passphrase" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                {isFirstTime ? 'Create Passphrase' : 'Enter Passphrase'}
              </label>
              <div className="relative">
                <input
                  id="passphrase"
                  type={showPassphrase ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder={isFirstTime ? 'Create a strong passphrase' : 'Enter your passphrase'}
                  className="input pr-10"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {isFirstTime && (
                <p className="text-xs text-gray-500 mt-1">
                  Use at least 8 characters with letters, numbers, and symbols
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 btn btn-secondary"
                disabled={isConnecting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 btn btn-primary"
                disabled={isConnecting || !passphrase.trim()}
              >
                {isConnecting ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Connecting...
                  </span>
                ) : (
                  'Connect Account'
                )}
              </button>
            </div>
          </form>

          {/* Instructions */}
          <div className="mt-6 text-xs text-gray-500">
            <p className="mb-2">
              <strong>What happens next:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>You'll be redirected to Google to authorize access</li>
              <li>Your tokens will be encrypted and stored locally</li>
              <li>You can then browse and manage your Google Drive files</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
