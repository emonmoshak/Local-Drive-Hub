'use client';

import { useState, useEffect } from 'react';
import { HardDrive, Home, Folder, Share2, Star, Clock, Trash2 } from 'lucide-react';

interface Account {
  id: string;
  email: string;
  name: string;
  quota_bytes_total: number;
  quota_bytes_used: number;
}

interface SidebarProps {
  accounts: Account[];
  onAccountsRefresh: () => void;
}

export default function Sidebar({ accounts, onAccountsRefresh }: SidebarProps) {
  const [totalStorage, setTotalStorage] = useState({ used: 0, total: 0 });

  useEffect(() => {
    const total = accounts.reduce((sum, account) => ({
      used: sum.used + (account.quota_bytes_used || 0),
      total: sum.total + (account.quota_bytes_total || 0)
    }), { used: 0, total: 0 });
    
    setTotalStorage(total);
  }, [accounts]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const storagePercentage = totalStorage.total > 0 
    ? (totalStorage.used / totalStorage.total) * 100 
    : 0;

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <HardDrive className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">LocalDriveHub</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <NavItem icon={Home} label="Home" active />
        <NavItem icon={Folder} label="My Files" />
        <NavItem icon={Share2} label="Shared" />
        <NavItem icon={Star} label="Favorites" />
        <NavItem icon={Clock} label="Recent" />
        <NavItem icon={Trash2} label="Trash" />
      </nav>

      {/* Storage Info */}
      <div className="p-4 border-t border-gray-200">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Storage</span>
            <span className="text-sm text-gray-500">
              {storagePercentage.toFixed(1)}% used
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(storagePercentage, 100)}%` }}
            />
          </div>
          
          <div className="text-xs text-gray-500">
            {formatBytes(totalStorage.used)} of {formatBytes(totalStorage.total)}
          </div>
          
          {accounts.length > 0 && (
            <div className="mt-3 space-y-1">
              <div className="text-xs font-medium text-gray-700 mb-1">
                Connected Accounts ({accounts.length})
              </div>
              {accounts.map(account => (
                <div key={account.id} className="text-xs text-gray-600 truncate">
                  {account.email}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface NavItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function NavItem({ icon: Icon, label, active = false, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors duration-200 ${
        active
          ? 'bg-blue-50 text-blue-700 font-medium'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  );
}
