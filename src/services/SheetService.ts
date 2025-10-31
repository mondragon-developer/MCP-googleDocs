import { google } from 'googleapis';
import { OAuth2Client } from 'googleapis-common';
import { ISheetService } from '../interfaces/ISheetService.js';

/**
 * SheetService: Responsible ONLY for Google Sheets operations
 * SRP: Handles spreadsheet operations
 */
export class SheetService implements ISheetService {
  private readonly sheets;

  constructor(private authClient: OAuth2Client) {
    this.sheets = google.sheets({ version: 'v4', auth: authClient });
  }

  /**
   * Creates a new Google Spreadsheet
   * @param title - The title for the new spreadsheet
   * @returns Object with spreadsheetId and title
   */
  async createSpreadsheet(title: string): Promise<{ spreadsheetId: string; title: string }> {
    try {
      const response = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: title,
          },
        },
      });

      return {
        spreadsheetId: response.data.spreadsheetId!,
        title: response.data.properties?.title!,
      };
    } catch (error) {
      throw new Error(`Failed to create spreadsheet: ${error}`);
    }
  }

  /**
   * Reads data from a spreadsheet range
   * @param spreadsheetId - The ID of the spreadsheet
   * @param range - A1 notation range (e.g., "Sheet1!A1:C10")
   * @returns 2D array of cell values
   * 
   * Example range formats:
   * - "Sheet1!A1:B2" - Specific range
   * - "Sheet1!A:A" - Entire column A
   * - "Sheet1" - Entire sheet
   */
  async readSheet(spreadsheetId: string, range: string): Promise<any[][]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: range,
      });

      return response.data.values || [];
    } catch (error) {
      throw new Error(`Failed to read sheet: ${error}`);
    }
  }

  /**
   * Writes data to a spreadsheet range
   * @param spreadsheetId - The ID of the spreadsheet
   * @param range - A1 notation range (e.g., "Sheet1!A1")
   * @param values - 2D array of values to write
   *
   * Example values:
   * [["Name", "Age"], ["Alice", 30], ["Bob", 25]]
   */
  async writeSheet(spreadsheetId: string, range: string, values: any[][]): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: range,
        valueInputOption: 'RAW', // RAW = values as-is, USER_ENTERED = parse formulas
        requestBody: {
          values: values,
        },
      });
    } catch (error) {
      throw new Error(`Failed to write to sheet: ${error}`);
    }
  }

  /**
   * Formats cells in a spreadsheet (bold, italic, underline, colors)
   * @param spreadsheetId - The ID of the spreadsheet
   * @param range - A1 notation range (e.g., "Sheet1!A1:B2")
   * @param formatting - Formatting options (bold, italic, underline, foregroundColor, backgroundColor)
   */
  async formatCells(
    spreadsheetId: string,
    range: string,
    formatting: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      foregroundColor?: { red: number; green: number; blue: number };
      backgroundColor?: { red: number; green: number; blue: number };
    }
  ): Promise<void> {
    try {
      // Parse the range to extract sheet ID and cell range
      const parsedRange = await this._parseRange(spreadsheetId, range);

      const textFormat: any = {};
      const cellFormat: any = {};

      // Build text format
      if (formatting.bold !== undefined) {
        textFormat.bold = formatting.bold;
      }
      if (formatting.italic !== undefined) {
        textFormat.italic = formatting.italic;
      }
      if (formatting.underline !== undefined) {
        textFormat.underline = formatting.underline;
      }
      if (formatting.foregroundColor) {
        textFormat.foregroundColor = formatting.foregroundColor;
      }

      // Build cell format for background color
      if (formatting.backgroundColor) {
        cellFormat.backgroundColor = formatting.backgroundColor;
      }

      const requests: any[] = [];

      // Add text format request if there's any text formatting
      if (Object.keys(textFormat).length > 0) {
        requests.push({
          repeatCell: {
            range: parsedRange,
            cell: {
              userEnteredFormat: {
                textFormat: textFormat,
              },
            },
            fields: 'userEnteredFormat.textFormat',
          },
        });
      }

      // Add background color request if specified
      if (Object.keys(cellFormat).length > 0) {
        requests.push({
          repeatCell: {
            range: parsedRange,
            cell: {
              userEnteredFormat: cellFormat,
            },
            fields: 'userEnteredFormat.backgroundColor',
          },
        });
      }

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
          requests: requests,
        },
      });
    } catch (error) {
      throw new Error(`Failed to format cells: ${error}`);
    }
  }

  /**
   * Helper method to parse A1 notation range into GridRange
   * @private
   */
  private async _parseRange(spreadsheetId: string, range: string): Promise<any> {
    // Get spreadsheet metadata to find sheet ID
    const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId });

    // Parse sheet name and cell range
    const parts = range.split('!');
    const sheetName = parts[0];
    const cellRange = parts[1] || 'A1';

    // Find the sheet by name
    const sheet = spreadsheet.data.sheets?.find(
      (s: any) => s.properties?.title === sheetName
    );

    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    const sheetId = sheet.properties?.sheetId;

    // Parse cell range (simplified - handles basic A1:B2 format)
    const [startCell, endCell] = cellRange.split(':');
    const startParsed = this._parseCellReference(startCell);
    const endParsed = endCell ? this._parseCellReference(endCell) : startParsed;

    return {
      sheetId: sheetId,
      startRowIndex: startParsed.row,
      endRowIndex: endParsed.row + 1,
      startColumnIndex: startParsed.col,
      endColumnIndex: endParsed.col + 1,
    };
  }

  /**
   * Helper method to parse cell reference like "A1" into row/col indices
   * @private
   */
  private _parseCellReference(cellRef: string): { row: number; col: number } {
    const match = cellRef.match(/^([A-Z]+)(\d+)$/);
    if (!match) {
      throw new Error(`Invalid cell reference: ${cellRef}`);
    }

    const colLetters = match[1];
    const rowNum = parseInt(match[2], 10);

    // Convert column letters to number (A=0, B=1, Z=25, AA=26, etc.)
    let col = 0;
    for (let i = 0; i < colLetters.length; i++) {
      col = col * 26 + (colLetters.charCodeAt(i) - 65 + 1);
    }
    col -= 1; // Zero-indexed

    return {
      row: rowNum - 1, // Zero-indexed
      col: col,
    };
  }
}