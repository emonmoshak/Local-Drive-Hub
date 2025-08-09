import { NextRequest, NextResponse } from 'next/server';
import { createGoogleAuthManager } from '@/lib/google-auth';

export async function GET(request: NextRequest) {
  try {
    const authManager = createGoogleAuthManager();
    const authUrl = authManager.getAuthUrl();

    return NextResponse.json({ 
      success: true, 
      authUrl 
    });
  } catch (error) {
    console.error('Error starting OAuth flow:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to start OAuth flow. Please check your Google OAuth configuration.' 
      },
      { status: 500 }
    );
  }
}
