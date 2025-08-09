'use client';

import { useState } from 'react';
import { Search, Bell, Settings, Plus, Upload } from 'lucide-react';

interface TopBarProps {
  onSearch: (query: string) => void;
  onConnectAccount: () => void;
  onUpload: () => void;
  searchQuery: string;
}

export default function TopBar({ onSearch, onConnectAccount, onUpload, searchQuery }: TopBarProps) {
  const [query, setQuery] = useState(searchQuery);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search files, folders..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </form>

      {/* Action Buttons */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onUpload}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Upload className="w-4 h-4" />
          <span>Upload</span>
        </button>
        
        <button
          onClick={onConnectAccount}
          className="btn btn-secondary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Connect Account</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </button>
        </div>

        {/* Settings */}
        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
          <Settings className="w-5 h-5" />
        </button>

        {/* User Profile */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">U</span>
          </div>
          <div className="hidden md:block">
            <div className="text-sm font-medium text-gray-900">User</div>
            <div className="text-xs text-gray-500">LocalDriveHub</div>
          </div>
        </div>
      </div>
    </div>
  );
}
