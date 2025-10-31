import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Tool Definitions for MCP Server
 * OCP: Easy to add new tools without modifying existing ones
 */

// ==================== DOCUMENT TOOLS ====================

export const createDocumentTool = {
  name: 'create_document',
  description: 'Creates a new Google Document with the specified title',
  inputSchema: zodToJsonSchema(
    z.object({
      title: z.string().describe('The title for the new document'),
    })
  ),
};

export const readDocumentTool = {
  name: 'read_document',
  description: 'Reads the entire content of a Google Document',
  inputSchema: zodToJsonSchema(
    z.object({
      documentId: z.string().describe('The ID of the document to read'),
    })
  ),
};

export const updateDocumentTool = {
  name: 'update_document',
  description: 'Updates a Google Document by replacing its content with new text',
  inputSchema: zodToJsonSchema(
    z.object({
      documentId: z.string().describe('The ID of the document to update'),
      text: z.string().describe('The new text content for the document'),
    })
  ),
};

export const insertImageToDocTool = {
  name: 'insert_image_to_doc',
  description: 'Inserts an image into a Google Document at a specific position',
  inputSchema: zodToJsonSchema(
    z.object({
      documentId: z.string().describe('The ID of the document'),
      imageUrl: z.string().url().describe('Public URL of the image to insert'),
      index: z.number().int().min(1).describe('Position in document (1 = start)'),
    })
  ),
};

export const insertLocalImageToDocTool = {
  name: 'insert_local_image_to_doc',
  description: 'Inserts a local image file into a Google Document by uploading it to Drive first',
  inputSchema: zodToJsonSchema(
    z.object({
      documentId: z.string().describe('The ID of the document'),
      filePath: z.string().describe('Local file path to the image'),
      index: z.number().int().min(1).describe('Position in document (1 = start)'),
    })
  ),
};

export const formatTextInDocTool = {
  name: 'format_text_in_doc',
  description: 'Formats text in a Google Document (bold, italic, underline, color)',
  inputSchema: zodToJsonSchema(
    z.object({
      documentId: z.string().describe('The ID of the document'),
      startIndex: z.number().int().min(1).describe('Start position of text to format'),
      endIndex: z.number().int().min(1).describe('End position of text to format'),
      bold: z.boolean().optional().describe('Make text bold'),
      italic: z.boolean().optional().describe('Make text italic'),
      underline: z.boolean().optional().describe('Underline text'),
      foregroundColor: z.object({
        red: z.number().min(0).max(1).describe('Red component (0-1)'),
        green: z.number().min(0).max(1).describe('Green component (0-1)'),
        blue: z.number().min(0).max(1).describe('Blue component (0-1)'),
      }).optional().describe('Text color in RGB format'),
    })
  ),
};

// ==================== SHEET TOOLS ====================

export const createSpreadsheetTool = {
  name: 'create_spreadsheet',
  description: 'Creates a new Google Spreadsheet with the specified title',
  inputSchema: zodToJsonSchema(
    z.object({
      title: z.string().describe('The title for the new spreadsheet'),
    })
  ),
};

export const readSheetTool = {
  name: 'read_sheet',
  description: 'Reads data from a Google Spreadsheet range (e.g., "Sheet1!A1:C10")',
  inputSchema: zodToJsonSchema(
    z.object({
      spreadsheetId: z.string().describe('The ID of the spreadsheet'),
      range: z.string().describe('A1 notation range (e.g., "Sheet1!A1:C10")'),
    })
  ),
};

export const writeSheetTool = {
  name: 'write_sheet',
  description: 'Writes data to a Google Spreadsheet range',
  inputSchema: zodToJsonSchema(
    z.object({
      spreadsheetId: z.string().describe('The ID of the spreadsheet'),
      range: z.string().describe('A1 notation range (e.g., "Sheet1!A1")'),
      values: z.array(z.array(z.any())).describe('2D array of values to write'),
    })
  ),
};

export const formatCellsTool = {
  name: 'format_cells',
  description: 'Formats cells in a Google Spreadsheet (bold, italic, underline, colors)',
  inputSchema: zodToJsonSchema(
    z.object({
      spreadsheetId: z.string().describe('The ID of the spreadsheet'),
      range: z.string().describe('A1 notation range (e.g., "Sheet1!A1:B2")'),
      bold: z.boolean().optional().describe('Make text bold'),
      italic: z.boolean().optional().describe('Make text italic'),
      underline: z.boolean().optional().describe('Underline text'),
      foregroundColor: z.object({
        red: z.number().min(0).max(1).describe('Red component (0-1)'),
        green: z.number().min(0).max(1).describe('Green component (0-1)'),
        blue: z.number().min(0).max(1).describe('Blue component (0-1)'),
      }).optional().describe('Text color in RGB format'),
      backgroundColor: z.object({
        red: z.number().min(0).max(1).describe('Red component (0-1)'),
        green: z.number().min(0).max(1).describe('Green component (0-1)'),
        blue: z.number().min(0).max(1).describe('Blue component (0-1)'),
      }).optional().describe('Background color in RGB format'),
    })
  ),
};

// ==================== SLIDE TOOLS ====================

export const createPresentationTool = {
  name: 'create_presentation',
  description: 'Creates a new Google Slides presentation with the specified title',
  inputSchema: zodToJsonSchema(
    z.object({
      title: z.string().describe('The title for the new presentation'),
    })
  ),
};

export const readPresentationTool = {
  name: 'read_presentation',
  description: 'Reads the structure and content of a Google Slides presentation',
  inputSchema: zodToJsonSchema(
    z.object({
      presentationId: z.string().describe('The ID of the presentation'),
    })
  ),
};

export const addSlideTool = {
  name: 'add_slide',
  description: 'Adds a new blank slide to a Google Slides presentation',
  inputSchema: zodToJsonSchema(
    z.object({
      presentationId: z.string().describe('The ID of the presentation'),
    })
  ),
};

export const addTextToSlideTool = {
  name: 'add_text_to_slide',
  description: 'Adds text content to a specific slide in a presentation',
  inputSchema: zodToJsonSchema(
    z.object({
      presentationId: z.string().describe('The ID of the presentation'),
      slideId: z.string().describe('The ID of the slide'),
      text: z.string().describe('The text content to add to the slide'),
    })
  ),
};

export const insertImageToSlideTool = {
  name: 'insert_image_to_slide',
  description: 'Inserts an image into a specific slide in a presentation',
  inputSchema: zodToJsonSchema(
    z.object({
      presentationId: z.string().describe('The ID of the presentation'),
      slideId: z.string().describe('The ID of the slide'),
      imageUrl: z.string().url().describe('Public URL of the image to insert'),
    })
  ),
};

export const insertLocalImageToSlideTool = {
  name: 'insert_local_image_to_slide',
  description: 'Inserts a local image file into a slide by uploading it to Drive first',
  inputSchema: zodToJsonSchema(
    z.object({
      presentationId: z.string().describe('The ID of the presentation'),
      slideId: z.string().describe('The ID of the slide'),
      filePath: z.string().describe('Local file path to the image'),
    })
  ),
};

export const formatTextInSlideTool = {
  name: 'format_text_in_slide',
  description: 'Formats text in a Google Slides text box (bold, italic, underline, color)',
  inputSchema: zodToJsonSchema(
    z.object({
      presentationId: z.string().describe('The ID of the presentation'),
      objectId: z.string().describe('The ID of the text box/shape containing the text'),
      startIndex: z.number().int().min(0).describe('Start position of text to format'),
      endIndex: z.number().int().min(0).describe('End position of text to format'),
      bold: z.boolean().optional().describe('Make text bold'),
      italic: z.boolean().optional().describe('Make text italic'),
      underline: z.boolean().optional().describe('Underline text'),
      foregroundColor: z.object({
        red: z.number().min(0).max(1).describe('Red component (0-1)'),
        green: z.number().min(0).max(1).describe('Green component (0-1)'),
        blue: z.number().min(0).max(1).describe('Blue component (0-1)'),
      }).optional().describe('Text color in RGB format'),
    })
  ),
};