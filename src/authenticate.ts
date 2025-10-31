import { google } from 'googleapis';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';
import { fileURLToPath } from 'url';

/**
 * Authentication Helper Script
 * Run this ONCE to generate your token.json file
 */

const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive.file',
];

// Get the directory of this module file, then navigate to project root
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(MODULE_DIR, '..');
const TOKEN_PATH = path.join(PROJECT_ROOT, 'token.json');
const CREDENTIALS_PATH = path.join(PROJECT_ROOT, 'credentials.json');

/**
 * Load OAuth2 credentials from credentials.json
 */
async function loadCredentials() {
  try {
    const content = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ Error: credentials.json not found!');
    console.error('Please download it from Google Cloud Console and place it in the project root.');
    process.exit(1);
  }
}

/**
 * Get new token from user
 */
async function getNewToken(oAuth2Client: any): Promise<void> {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('\n🔐 AUTHORIZATION REQUIRED\n');
  console.log('Please visit this URL to authorize the application:\n');
  console.log('👉', authUrl, '\n');
  console.log('After authorization, you will get a code.');
  console.log('Paste the code here: ');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question('', async (code) => {
      rl.close();
      try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        
        // Save token to file
        await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
        console.log('\n✅ Token saved to token.json');
        console.log('✅ Authentication successful!\n');
        resolve();
      } catch (error) {
        console.error('❌ Error retrieving access token:', error);
        reject(error);
      }
    });
  });
}

/**
 * Main authentication flow
 */
async function authenticate() {
  console.log('🚀 Google Workspace MCP Authentication\n');

  // Load credentials
  const credentials = await loadCredentials();
  const { client_id, client_secret, redirect_uris } = credentials.installed;

  // Create OAuth2 client
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we already have a token
  try {
    const token = await fs.readFile(TOKEN_PATH, 'utf-8');
    oAuth2Client.setCredentials(JSON.parse(token));
    console.log('✅ Already authenticated! token.json exists.\n');
    console.log('If you want to re-authenticate, delete token.json and run this script again.\n');
    return;
  } catch (error) {
    // No token found, need to authenticate
    await getNewToken(oAuth2Client);
  }
}

// Run authentication
authenticate().catch(console.error);
