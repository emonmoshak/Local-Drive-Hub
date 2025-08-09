import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// OAuth2 configuration
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];

const REDIRECT_URI = 'http://localhost:3000/api/auth/callback';

export interface GoogleCredentials {
  client_id: string;
  client_secret: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export class GoogleAuthManager {
  private oauth2Client: OAuth2Client;
  private credentials: GoogleCredentials;

  constructor(credentials: GoogleCredentials) {
    this.credentials = credentials;
    this.oauth2Client = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
      REDIRECT_URI
    );
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent' // Force consent to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code: string): Promise<TokenResponse> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Failed to obtain access and refresh tokens');
      }

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope || '',
        token_type: tokens.token_type || 'Bearer',
        expiry_date: tokens.expiry_date || Date.now() + 3600000 // 1 hour default
      };
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      if (!credentials.access_token) {
        throw new Error('Failed to refresh access token');
      }

      return credentials.access_token;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Get user info from Google
   */
  async getUserInfo(accessToken: string): Promise<UserInfo> {
    try {
      this.oauth2Client.setCredentials({
        access_token: accessToken
      });

      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const { data } = await oauth2.userinfo.get();

      if (!data.id || !data.email || !data.name) {
        throw new Error('Incomplete user info received from Google');
      }

      return {
        id: data.id,
        email: data.email,
        name: data.name,
        picture: data.picture || undefined
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      throw new Error('Failed to get user information from Google');
    }
  }

  /**
   * Get Drive API client with authenticated credentials
   */
  getDriveClient(accessToken: string) {
    this.oauth2Client.setCredentials({
      access_token: accessToken
    });

    return google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Validate access token
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      this.oauth2Client.setCredentials({
        access_token: accessToken
      });

      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      await oauth2.userinfo.get();
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Get Google OAuth credentials from environment
 */
export function getGoogleCredentials(): GoogleCredentials {
  const client_id = process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;

  if (!client_id || !client_secret) {
    throw new Error('Google OAuth credentials not found in environment variables');
  }

  return { client_id, client_secret };
}

/**
 * Create a new GoogleAuthManager instance
 */
export function createGoogleAuthManager(): GoogleAuthManager {
  const credentials = getGoogleCredentials();
  return new GoogleAuthManager(credentials);
}
