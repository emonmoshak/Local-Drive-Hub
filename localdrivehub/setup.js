#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function setup() {
  console.log('🚀 LocalDriveHub Setup');
  console.log('=======================\n');

  console.log('This script will help you set up LocalDriveHub with your Google OAuth credentials.\n');

  // Check if .env.local already exists
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const overwrite = await askQuestion('⚠️  .env.local already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('📋 Please provide your Google OAuth credentials:');
  console.log('   (Get these from Google Cloud Console: https://console.cloud.google.com/)\n');

  const clientId = await askQuestion('Google Client ID: ');
  const clientSecret = await askQuestion('Google Client Secret: ');
  
  // Generate a random secret for NextAuth
  const nextAuthSecret = require('crypto').randomBytes(32).toString('hex');

  const envContent = `# Google OAuth Configuration
GOOGLE_CLIENT_ID=${clientId}
GOOGLE_CLIENT_SECRET=${clientSecret}

# Application Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=${nextAuthSecret}

# Database Configuration (optional - defaults to local SQLite)
# DATABASE_PATH=./localdrivehub.db
`;

  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ Configuration saved to .env.local');
    
    console.log('\n📝 Next steps:');
    console.log('   1. Make sure Google Drive API is enabled in your Google Cloud project');
    console.log('   2. Add http://localhost:3000/api/auth/callback as an authorized redirect URI');
    console.log('   3. Run: npm run dev');
    console.log('   4. Open: http://localhost:3000');
    console.log('\n🔐 Important: Keep your master passphrase safe when connecting accounts!');
    
  } catch (error) {
    console.error('❌ Error saving configuration:', error.message);
  }

  rl.close();
}

setup();
