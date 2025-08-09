import { NextRequest, NextResponse } from 'next/server';
import { createGoogleAuthManager } from '@/lib/google-auth';
import { getDatabase } from '@/lib/database';
import { encryptRefreshToken, generateId } from '@/lib/encryption';
import { GoogleDriveManager } from '@/lib/google-drive';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');
    
    let passphrase: string | null = null;
    if (state) {
      try {
        const stateData = JSON.parse(atob(state));
        passphrase = stateData.passphrase;
      } catch (e) {
        console.error('Failed to parse state:', e);
      }
    }

    if (error) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?error=oauth_error&message=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?error=missing_code`);
    }

    if (!passphrase) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?error=missing_passphrase`);
    }

    const authManager = createGoogleAuthManager();
    
    // Exchange code for tokens
    const tokens = await authManager.getTokens(code);
    
    // Get user info
    const userInfo = await authManager.getUserInfo(tokens.access_token);
    
    // Get drive quota
    const driveManager = new GoogleDriveManager(authManager);
    await driveManager.initialize(tokens.access_token);
    const quota = await driveManager.getQuota();
    
    // Encrypt refresh token
    const encryptedRefreshToken = encryptRefreshToken(tokens.refresh_token, passphrase);
    
    // Save account to database
    const database = await getDatabase();
    const account = {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      refresh_token: encryptedRefreshToken,
      access_token: tokens.access_token,
      token_expiry: tokens.expiry_date,
      quota_bytes_total: quota.bytesTotal,
      quota_bytes_used: quota.bytesUsed,
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    await database.saveAccount(account);
    
    // Redirect to success page
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?success=account_added&email=${encodeURIComponent(userInfo.email)}`);
    
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?error=callback_error&message=${encodeURIComponent('Failed to connect account')}`);
  }
}
