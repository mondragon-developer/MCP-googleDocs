import { google } from 'googleapis';
import { OAuth2Client } from 'googleapis-common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { IGoogleAuth } from '../interfaces/IGoogleAuth.js';

/**
 * GoogleAuthService: Responsible ONLY for authentication
 * SRP: Handles authentication, nothing else
 */
export class GoogleAuthService implements IGoogleAuth {
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/presentations',
    'https://www.googleapis.com/auth/drive.file',
  ];

  // Get the directory of this module file, then navigate to project root
  private readonly MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
  private readonly PROJECT_ROOT = path.resolve(this.MODULE_DIR, '..', '..');
  private readonly TOKEN_PATH = path.join(this.PROJECT_ROOT, 'token.json');
  private readonly CREDENTIALS_PATH = path.join(this.PROJECT_ROOT, 'credentials.json');
  
  private oAuth2Client: OAuth2Client | null = null;

  /**
   * Gets authenticated OAuth2 client
   * Handles token loading, generation, and saving
   */
  async getAuthenticatedClient(): Promise<OAuth2Client> {
    if (this.oAuth2Client) {
      return this.oAuth2Client;
    }

    // Load credentials
    const credentials = await this.loadCredentials();
    const { client_id, client_secret, redirect_uris } = credentials.installed;
    
    this.oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    // Try to load existing token
    try {
      const token = await fs.readFile(this.TOKEN_PATH, 'utf-8');
      this.oAuth2Client.setCredentials(JSON.parse(token));
    } catch (error) {
      // No token found, need to generate one
      await this.generateNewToken();
    }

    return this.oAuth2Client;
  }

  /**
   * Checks if we have valid saved credentials
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      await fs.access(this.TOKEN_PATH);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Loads OAuth2 credentials from file
   * Private method - implementation detail
   */
  private async loadCredentials(): Promise<any> {
    try {
      const content = await fs.readFile(this.CREDENTIALS_PATH, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(
        'credentials.json not found. Please download it from Google Cloud Console.'
      );
    }
  }

  /**
   * Generates new authentication token through OAuth2 flow
   * Private method - encapsulates token generation logic
   */
  private async generateNewToken(): Promise<void> {
    if (!this.oAuth2Client) {
      throw new Error('OAuth2 client not initialized');
    }

    const authUrl = this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.SCOPES,
    });

    console.log('\n🔐 Authorization required!');
    console.log('Please visit this URL to authorize the application:\n');
    console.log(authUrl);
    console.log('\nAfter authorization, paste the code here:');

    // In a real MCP server, we'd handle this differently
    // For now, we'll provide instructions
    throw new Error(
      'Please run the authentication flow first. See the authorization URL above.'
    );
  }
}