/**
 * Common formatting interfaces and utilities
 * Eliminates code duplication and improves type safety
 */

/**
 * RGB Color definition
 */
export interface RGBColor {
  red: number;
  green: number;
  blue: number;
}

/**
 * Text formatting options (common across Docs, Sheets, Slides)
 */
export interface TextFormatting {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  foregroundColor?: RGBColor;
}

/**
 * Cell formatting options (Sheets-specific, extends text formatting)
 */
export interface CellFormatting extends TextFormatting {
  backgroundColor?: RGBColor;
}

/**
 * FormattingHelper: Shared utility for building formatting objects
 */
export class FormattingHelper {
  /**
   * Builds a text formatting object with only specified properties
   * Filters out undefined values for cleaner API calls
   */
  static buildTextFormatting(formatting: TextFormatting): {
    style: any;
    fields: string[];
  } {
    const style: any = {};
    const fields: string[] = [];

    if (formatting.bold !== undefined) {
      style.bold = formatting.bold;
      fields.push('bold');
    }
    if (formatting.italic !== undefined) {
      style.italic = formatting.italic;
      fields.push('italic');
    }
    if (formatting.underline !== undefined) {
      style.underline = formatting.underline;
      fields.push('underline');
    }
    if (formatting.foregroundColor) {
      style.foregroundColor = formatting.foregroundColor;
      fields.push('foregroundColor');
    }

    return { style, fields };
  }

  /**
   * Builds a cell formatting object for Sheets
   * Separates text formatting from cell formatting
   */
  static buildCellFormatting(formatting: CellFormatting): {
    textFormat: any;
    cellFormat: any;
    hasTextFormat: boolean;
    hasCellFormat: boolean;
  } {
    const textFormat: any = {};
    const cellFormat: any = {};

    // Text formatting
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

    // Cell formatting (background color)
    if (formatting.backgroundColor) {
      cellFormat.backgroundColor = formatting.backgroundColor;
    }

    return {
      textFormat,
      cellFormat,
      hasTextFormat: Object.keys(textFormat).length > 0,
      hasCellFormat: Object.keys(cellFormat).length > 0,
    };
  }

  /**
   * Validates RGB color values (0-1 range)
   */
  static validateColor(color: RGBColor): void {
    const components = ['red', 'green', 'blue'] as const;
    for (const component of components) {
      const value = color[component];
      if (value < 0 || value > 1) {
        throw new Error(
          `Invalid ${component} value: ${value}. Must be between 0 and 1.`
        );
      }
    }
  }
}
