# Google Workspace MCP Server - Detailed Setup Guide

> **Note:** This is a detailed version of the setup guide. For a quick start, see [README.md](README.md).

This guide provides comprehensive instructions for setting up and connecting the Google Workspace MCP server to Claude, enabling Claude to create and manage Google Docs, Sheets, and Slides directly.

## What This MCP Server Does

Once configured, this MCP server gives Claude the ability to:
- Create and edit Google Docs
- Create and manage Google Sheets (read/write data)
- Create and manage Google Slides presentations
- Insert images into documents and slides

## Prerequisites

Before you begin, make sure you have:
- Node.js v18 or higher installed
- A Google Account
- Access to Google Cloud Console
- Claude Desktop or Claude Code installed

## Step 1: Install Dependencies

Open a terminal in the project directory and run:

```bash
npm install
```

This will install all required packages including the MCP SDK and Google APIs client.

## Step 2: Set Up Google Cloud Credentials

### 2.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Enter a project name (e.g., "Claude Workspace Integration")
4. Click "Create"

### 2.2 Enable Required APIs

In your Google Cloud project, enable the following APIs:

1. Go to "APIs & Services" → "Library"
2. Search for and enable each of these APIs:
   - **Google Docs API**
   - **Google Sheets API**
   - **Google Slides API**
   - **Google Drive API**

### 2.3 Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - User Type: **External**
   - App name: "Claude Workspace Integration" (or your choice)
   - User support email: Your email
   - Developer contact: Your email
   - Click "Save and Continue" through the rest
4. Back on "Create OAuth client ID":
   - Application type: **Desktop app**
   - Name: "Google Workspace MCP"
   - Click "Create"
5. Click "Download JSON" to download the credentials
6. Rename the downloaded file to `credentials.json`
7. Move `credentials.json` to your project root directory:
   ```
   C:\Users\YOUR_USERNAME\MCPProjects\google-workspace-mcp\credentials.json
   ```

### 2.4 Add Test Users (Important!)

Since your app is in testing mode, you need to add your Google account as a test user:

1. Go to "APIs & Services" → "OAuth consent screen"
2. Scroll down to "Test users"
3. Click "Add Users"
4. Enter your Google account email
5. Click "Save"

## Step 3: Build the Project

Compile the TypeScript code:

```bash
npm run build
```

This creates the compiled JavaScript files in the `dist/` folder.

## Step 4: Authenticate with Google

Run the authentication script (one-time setup):

```bash
npm run auth
```

This will:
1. Display a Google authorization URL
2. Open your browser (or copy the URL manually)
3. Ask you to sign in with your Google account
4. Request permissions to access Docs, Sheets, Slides, and Drive
5. Provide an authorization code

**Steps to complete:**
1. Click "Allow" to grant permissions
2. Copy the authorization code from the browser
3. Paste it back into the terminal
4. Press Enter

A `token.json` file will be created - this contains your access token for the MCP server to use.

**Important:** Never commit `credentials.json` or `token.json` to version control!

## Step 5: Connect to Claude Desktop/Code

### For Windows:

1. Open File Explorer and navigate to:
   ```
   %APPDATA%\Claude\
   ```
   (Or type this in the address bar)

2. Open or create the file `claude_desktop_config.json`

3. Add the following configuration:
   ```json
   {
     "mcpServers": {
       "google-workspace": {
         "command": "node",
         "args": ["C:\\Users\\YOUR_USERNAME\\MCPProjects\\google-workspace-mcp\\dist\\index.js"]
       }
     }
   }
   ```

4. If you already have other MCP servers configured, add the "google-workspace" entry to the existing `mcpServers` object.

### For macOS/Linux:

1. Open Terminal and edit the config file:
   ```bash
   nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. Add the configuration:
   ```json
   {
     "mcpServers": {
       "google-workspace": {
         "command": "node",
         "args": ["/absolute/path/to/google-workspace-mcp/dist/index.js"]
       }
     }
   }
   ```

### For Claude Code (CLI):

To make the MCP available globally in all Claude Code sessions:

1. Create or edit the settings file at `~/.claude/settings.json`:

   **Windows:** `C:\Users\YOUR_USERNAME\.claude\settings.json`
   **macOS/Linux:** `~/.claude/settings.json`

2. Add the following configuration:
   ```json
   {
     "mcpServers": {
       "google-workspace": {
         "command": "node",
         "args": ["/absolute/path/to/google-workspace-mcp/dist/index.js"]
       }
     }
   }
   ```

   **Windows example:**
   ```json
   {
     "mcpServers": {
       "google-workspace": {
         "command": "node",
         "args": ["C:\\Users\\YOUR_USERNAME\\path\\to\\google-workspace-mcp\\dist\\index.js"]
       }
     }
   }
   ```

3. Restart Claude Code and verify with:
   ```bash
   claude mcp list
   ```

## Step 6: Restart Claude

1. Completely quit Claude Desktop/Code (not just close the window)
   - Windows: Right-click the taskbar icon → "Quit"
   - macOS: Cmd+Q or right-click dock icon → "Quit"
2. Reopen Claude
3. The Google Workspace MCP server should now be connected

## Step 7: Verify It's Working

In Claude, try asking:

"Can you list the available MCP tools?"

You should see 11 Google Workspace tools:
- `create_document`
- `read_document`
- `update_document`
- `insert_image_to_doc`
- `create_spreadsheet`
- `read_sheet`
- `write_sheet`
- `create_presentation`
- `read_presentation`
- `add_slide`
- `insert_image_to_slide`

## Example Commands to Try

Once connected, you can ask Claude to:

### Google Docs
- "Create a new Google Doc called 'Meeting Notes'"
- "Read the content of document ID abc123"
- "Update document xyz789 with this text: [your text]"
- "Insert this image URL into my document"

### Google Sheets
- "Create a new spreadsheet called 'Q1 Budget'"
- "Read data from Sheet1!A1:C10 in spreadsheet abc123"
- "Write this data to my spreadsheet in range A1:B5"

### Google Slides
- "Create a new presentation called 'Project Proposal'"
- "Add a new slide to presentation abc123"
- "Insert this image into slide 2 of my presentation"

## Troubleshooting

### "Error: credentials.json not found"
- Make sure you downloaded the OAuth credentials from Google Cloud Console
- Verify the file is named exactly `credentials.json`
- Ensure it's in the project root directory

### "Error: token.json not found"
- Run `npm run auth` to complete the authentication flow
- Make sure you paste the authorization code correctly

### "Invalid grant" or "Token has been expired or revoked"
- Delete `token.json`
- Run `npm run auth` again to re-authenticate

### "Access blocked: This app's request is invalid"
- Make sure you added your Google account as a test user in the OAuth consent screen
- Verify all required APIs are enabled in Google Cloud Console

### "MCP server not showing in Claude"
- Verify the path in `claude_desktop_config.json` is correct and uses double backslashes on Windows
- Make sure you ran `npm run build` to compile the TypeScript
- Completely quit and restart Claude (not just refresh)

### "Cannot find module" errors
- Run `npm install` to ensure all dependencies are installed
- Verify `node_modules` folder exists

## File Structure Overview

```
google-workspace-mcp/
├── dist/                      # Compiled JavaScript (generated by npm run build)
├── node_modules/              # Dependencies (generated by npm install)
├── src/                       # Source code
│   ├── interfaces/            # TypeScript interfaces
│   ├── services/              # Google API service implementations
│   ├── tools/                 # MCP tool definitions
│   ├── authenticate.ts        # One-time auth script
│   └── index.ts              # Main MCP server
├── credentials.json          # OAuth credentials (DO NOT COMMIT)
├── token.json               # Access token (DO NOT COMMIT)
├── package.json
├── tsconfig.json
└── MCP_CREATION_GUIDE.md    # Guide for building MCP servers from scratch
```

## Security Notes

1. **Never commit credentials:**
   - Add to `.gitignore`: `credentials.json` and `token.json`

2. **OAuth consent screen:**
   - Keep your app in "Testing" mode unless you plan to publish it
   - Only add trusted users to the test users list

3. **Token storage:**
   - `token.json` contains your access and refresh tokens
   - Keep this file secure and private
   - If compromised, revoke access in Google Account settings

## Available MCP Tools Reference

| Tool Name | Description | Required Parameters |
|-----------|-------------|---------------------|
| `create_document` | Create a new Google Doc | `title` (string) |
| `read_document` | Read document content | `documentId` (string) |
| `update_document` | Replace document text | `documentId` (string), `text` (string) |
| `insert_image_to_doc` | Insert image into doc | `documentId` (string), `imageUrl` (string), `index` (number) |
| `create_spreadsheet` | Create a new spreadsheet | `title` (string) |
| `read_sheet` | Read data from range | `spreadsheetId` (string), `range` (string) |
| `write_sheet` | Write data to range | `spreadsheetId` (string), `range` (string), `values` (array) |
| `create_presentation` | Create a new presentation | `title` (string) |
| `read_presentation` | Get presentation data | `presentationId` (string) |
| `add_slide` | Add slide to presentation | `presentationId` (string) |
| `insert_image_to_slide` | Insert image into slide | `presentationId` (string), `slideId` (string), `imageUrl` (string) |

## Next Steps

Now that your MCP server is set up, you can:

1. Ask Claude to create and manage Google Workspace documents
2. Automate document creation workflows
3. Use Claude to analyze and update spreadsheet data
4. Create presentations with Claude's help

For more information on building MCP servers from scratch, see `MCP_CREATION_GUIDE.md`.

## Support and Resources

- **MCP SDK Documentation:** https://github.com/modelcontextprotocol/sdk
- **Google APIs Node.js Client:** https://github.com/googleapis/google-api-nodejs-client
- **Google Cloud Console:** https://console.cloud.google.com
- **Claude Code Documentation:** https://docs.claude.com

## Quick Command Reference

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run authentication (first time)
npm run auth

# Start the MCP server (for testing)
npm run start

# Development mode with auto-reload
npm run dev
```

---

Congratulations! You now have Claude integrated with Google Workspace. Try asking Claude to create a document, and watch the magic happen!
