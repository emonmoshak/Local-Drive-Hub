# LocalDriveHub 🔄

A personal, local-first multi-Google Drive backup tool that runs on localhost. Built with Next.js, this application allows you to connect multiple Google Drive accounts, backup large amounts of files, and restore them after system wipes.

## 🎯 Features

- **Multi-Account Support**: Connect up to 4 Google Drive accounts
- **Local-First**: All data and tokens stored locally with encryption
- **Secure**: OAuth tokens encrypted with user-supplied passphrase
- **Large File Support**: Resumable uploads for reliability
- **Bulk Operations**: Download multiple files as ZIP archives
- **Modern UI**: Clean, responsive interface with grid and list views
- **Auto-Sharding**: Automatically distributes uploads across accounts with available space

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Google Cloud Console project with Drive API enabled
- Google OAuth 2.0 credentials

### 1. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Drive API
4. Go to "Credentials" > "Create Credentials" > "OAuth 2.0 Client ID"
5. Set application type to "Web application"
6. Add authorized redirect URI: `http://localhost:3000/api/auth/callback`
7. Note down your Client ID and Client Secret

### 2. Installation

```bash
# Clone or navigate to the project directory
cd localdrivehub

# Install dependencies
npm install

# Create environment file
cp env.example .env.local

# Edit .env.local with your Google OAuth credentials
```

### 3. Environment Configuration

Edit `.env.local`:

```env
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_here
```

### 4. Start the Application

```bash
npm run dev
```

Navigate to `http://localhost:3000`

## 📋 Usage Guide

### First Time Setup

1. **Create Master Passphrase**: When connecting your first account, you'll create a master passphrase that encrypts all OAuth tokens
2. **Connect Google Accounts**: Add up to 4 Google Drive accounts using the "Connect Account" button
3. **Sync Files**: The app will automatically index files from all connected accounts

### Backing Up Files

1. **Upload Files**: Use the Upload button to add files to your Google Drive accounts
2. **Auto-Sharding**: Files are automatically distributed to accounts with available space
3. **Progress Tracking**: Monitor upload progress in real-time
4. **Resumable Uploads**: Large file uploads can resume if interrupted

### Restoring Files

1. **Browse Files**: View all files across accounts in a unified interface
2. **Search**: Find files quickly using the search functionality
3. **Download**: Download individual files or select multiple for bulk ZIP download
4. **Account Badges**: See which account each file belongs to

### Account Management

1. **View Storage**: Monitor storage usage across all connected accounts
2. **Refresh Tokens**: Tokens are automatically refreshed when needed
3. **Remove Accounts**: Disconnect accounts when no longer needed

## 🔐 Security Features

- **Local Encryption**: All OAuth tokens encrypted with PBKDF2 + AES-256-GCM
- **No Cloud Dependencies**: Everything runs locally on your machine
- **Secure Storage**: SQLite database with encrypted sensitive data
- **Session Management**: Automatic token refresh and validation

## 🛠️ Architecture

```
┌─────────────────┐   ┌──────────────────┐   ┌─────────────────┐
│   Next.js App   │──▶│  Google Drive    │◀──│  Local SQLite   │
│   (Frontend)    │   │  API             │   │  Database       │
└─────────────────┘   └──────────────────┘   └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐   ┌──────────────────┐   ┌─────────────────┐
│   OAuth Flow    │   │  File Upload/    │   │  Encrypted      │
│   Management    │   │  Download        │   │  Token Storage  │
└─────────────────┘   └──────────────────┘   └─────────────────┘
```

## 📁 Project Structure

```
localdrivehub/
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   │   ├── auth/      # OAuth endpoints
│   │   │   ├── accounts/  # Account management
│   │   │   ├── files/     # File listing
│   │   │   ├── upload/    # File upload
│   │   │   └── download/  # File download
│   │   ├── globals.css    # Global styles
│   │   ├── layout.tsx     # Root layout
│   │   └── page.tsx       # Main dashboard
│   ├── components/        # React components
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   ├── FileGrid.tsx
│   │   ├── ConnectAccountModal.tsx
│   │   └── UploadModal.tsx
│   └── lib/              # Core utilities
│       ├── database.ts   # SQLite operations
│       ├── encryption.ts # Crypto utilities
│       ├── google-auth.ts # OAuth management
│       └── google-drive.ts # Drive API client
├── localdrivehub.db      # SQLite database (created automatically)
└── package.json
```

## 🔧 API Endpoints

### Authentication
- `GET /api/auth/start` - Start OAuth flow
- `GET /api/auth/callback` - OAuth callback handler

### Account Management
- `GET /api/accounts` - List connected accounts
- `PUT /api/accounts` - Refresh account tokens
- `DELETE /api/accounts?id={id}` - Remove account

### File Operations
- `GET /api/files` - List files (with optional search/refresh)
- `POST /api/upload` - Upload files
- `GET /api/download` - Download single file
- `GET /api/download?bulk=true&fileIds[]={id}` - Bulk download as ZIP

## 🚨 Important Notes

### Security Considerations
- Keep your master passphrase safe - losing it means losing access to all accounts
- The app is designed for local use only - don't expose it to the internet
- OAuth tokens are encrypted locally and never sent to external servers

### Limitations
- Maximum 4 accounts in MVP version
- No real-time sync - manual refresh required
- Large file uploads may take time depending on internet connection

### Backup Strategy
1. **Regular Exports**: Export your encrypted account data periodically
2. **Passphrase Safety**: Store your master passphrase securely (password manager)
3. **Database Backup**: Keep backups of `localdrivehub.db` file

## 🔄 Reinstall & Restore Process

After a system wipe:

1. **Reinstall Application**: Follow the installation steps
2. **Set Environment**: Configure Google OAuth credentials
3. **Restore Database**: Copy your backed-up `localdrivehub.db` file
4. **Enter Passphrase**: Use your master passphrase to decrypt tokens
5. **Refresh Accounts**: The app will automatically refresh expired tokens
6. **Download Files**: Browse and restore your files as needed

## 🐛 Troubleshooting

### Common Issues

**"Failed to connect account"**
- Check Google OAuth credentials in `.env.local`
- Ensure redirect URI is correctly configured in Google Console
- Verify the Google Drive API is enabled

**"Invalid passphrase"**
- Ensure you're using the exact passphrase from initial setup
- Passphrase is case-sensitive

**"Insufficient storage space"**
- Check account storage quotas in the sidebar
- Consider adding another Google account
- Clean up unnecessary files in Google Drive

**"Token refresh failed"**
- Re-enter your passphrase when prompted
- Check internet connection
- Account may need to be reconnected

## 📝 Development

### Running in Development

```bash
npm run dev     # Start development server
npm run build   # Build for production
npm run start   # Start production server
npm run lint    # Run linting
```

### Environment Variables

Required for development:
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret
- `NEXTAUTH_URL` - Application URL (http://localhost:3000)
- `NEXTAUTH_SECRET` - Random secret for session encryption

## 📄 License

This project is for personal use. Please respect Google's Terms of Service when using their APIs.

## 🙏 Support

For issues or questions:
1. Check the troubleshooting section
2. Review Google Drive API documentation
3. Ensure all environment variables are correctly set

---

**Note**: This is a local-first application designed for personal backup needs. It's not intended for production hosting or multi-user scenarios.