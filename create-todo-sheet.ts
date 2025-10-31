#!/usr/bin/env node
/**
 * Example script to create a Google Spreadsheet with project todos
 * This demonstrates how to use the Google Workspace MCP services directly
 */

import { GoogleAuthService } from './src/services/GoogleAuthService.js';
import { SheetService } from './src/services/SheetService.js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  try {
    console.log('🔐 Authenticating with Google...');
    const authService = new GoogleAuthService();
    const authClient = await authService.getAuthenticatedClient();

    console.log('📊 Initializing Sheet Service...');
    const sheetService = new SheetService(authClient);

    // Create a new spreadsheet
    console.log('📝 Creating spreadsheet...');
    const result = await sheetService.createSpreadsheet('Project Todo List');
    console.log(`✅ Spreadsheet created: ${result.title}`);
    console.log(`🔗 URL: https://docs.google.com/spreadsheets/d/${result.spreadsheetId}/edit`);

    // Read todos from CSV
    const csvPath = path.join(process.cwd(), 'project-todos.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    // Parse CSV into 2D array
    const rows = csvContent.split('\n').map(line => {
      // Simple CSV parsing (handle commas in quotes if needed)
      return line.split(',').map(cell => cell.trim());
    });

    // Write data to sheet
    console.log('✍️  Writing todos to sheet...');
    await sheetService.writeSheet(result.spreadsheetId, 'Sheet1!A1', rows);

    console.log('✅ Todo list successfully created in Google Sheets!');
    console.log(`📊 Total todos: ${rows.length - 1}`); // Subtract header row

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
