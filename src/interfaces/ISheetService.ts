/**
 * Interface for Google Sheets operations
 */
export interface ISheetService {
  createSpreadsheet(title: string): Promise<{ spreadsheetId: string; title: string }>;
  readSheet(spreadsheetId: string, range: string): Promise<any[][]>;
  writeSheet(spreadsheetId: string, range: string, values: any[][]): Promise<void>;
  formatCells(
    spreadsheetId: string,
    range: string,
    formatting: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      foregroundColor?: { red: number; green: number; blue: number };
      backgroundColor?: { red: number; green: number; blue: number };
    }
  ): Promise<void>;
} 
