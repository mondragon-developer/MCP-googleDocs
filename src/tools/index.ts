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

export const insertTableToDocTool = {
  name: 'insert_table_to_doc',
  description: 'Inserts a native Google Docs table with data at a specific position. Creates actual table cells that support formatting, resizing, and sorting.',
  inputSchema: zodToJsonSchema(
    z.object({
      documentId: z.string().describe('The ID of the document'),
      index: z.number().int().min(1).describe('Position in document where table should be inserted (1 = start)'),
      rows: z.number().int().min(1).describe('Number of rows in the table'),
      columns: z.number().int().min(1).describe('Number of columns in the table'),
      data: z.array(z.array(z.string())).describe('2D array of cell contents (row-major order)'),
      headerRow: z.boolean().optional().describe('Format first row as header (bold text, light gray background)'),
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

// ==================== DRIVE TOOLS ====================

export const listDriveFilesTool = {
  name: 'list_drive_files',
  description: 'Lists files and folders in Google Drive. Can list contents of a specific folder or search with a query.',
  inputSchema: zodToJsonSchema(
    z.object({
      folderId: z.string().optional().describe('Folder ID to list contents of (omit for root)'),
      pageSize: z.number().int().min(1).max(100).optional().describe('Number of files to return (default 20, max 100)'),
      pageToken: z.string().optional().describe('Token for pagination (from previous response)'),
      query: z.string().optional().describe('Search query in Google Drive query syntax'),
    })
  ),
};

export const uploadFileTool = {
  name: 'upload_file',
  description: 'Uploads a local file to Google Drive. Supports any file type.',
  inputSchema: zodToJsonSchema(
    z.object({
      filePath: z.string().describe('Local file path to upload'),
      folderId: z.string().optional().describe('Folder ID to upload to (omit for root)'),
      fileName: z.string().optional().describe('Custom name for the file (defaults to original filename)'),
    })
  ),
};

export const downloadFileTool = {
  name: 'download_file',
  description: 'Downloads a file from Google Drive to a local path',
  inputSchema: zodToJsonSchema(
    z.object({
      fileId: z.string().describe('The ID of the file to download'),
      destinationPath: z.string().describe('Local path where the file should be saved'),
    })
  ),
};

export const getFileContentTool = {
  name: 'get_file_content',
  description: 'Gets the text content of a file in Google Drive (works with Google Docs, text files, etc.)',
  inputSchema: zodToJsonSchema(
    z.object({
      fileId: z.string().describe('The ID of the file to read'),
    })
  ),
};

export const convertPdfToDocTool = {
  name: 'convert_pdf_to_doc',
  description: 'Converts a PDF file to a Google Doc using OCR. Useful for extracting text from scanned documents.',
  inputSchema: zodToJsonSchema(
    z.object({
      filePath: z.string().describe('Local path to the PDF file'),
      folderId: z.string().optional().describe('Folder ID to save the converted doc to'),
    })
  ),
};

export const extractPdfTextTool = {
  name: 'extract_pdf_text',
  description: 'Extracts text content from a PDF file using Google OCR. Returns the extracted text directly.',
  inputSchema: zodToJsonSchema(
    z.object({
      filePath: z.string().describe('Local path to the PDF file'),
    })
  ),
};

export const createFolderTool = {
  name: 'create_folder',
  description: 'Creates a new folder in Google Drive',
  inputSchema: zodToJsonSchema(
    z.object({
      name: z.string().describe('Name of the folder to create'),
      parentId: z.string().optional().describe('Parent folder ID (omit for root)'),
    })
  ),
};

export const deleteFileTool = {
  name: 'delete_file',
  description: 'Deletes a file or folder from Google Drive',
  inputSchema: zodToJsonSchema(
    z.object({
      fileId: z.string().describe('The ID of the file or folder to delete'),
    })
  ),
};

export const getFileMetadataTool = {
  name: 'get_file_metadata',
  description: 'Gets metadata about a file in Google Drive (name, size, type, dates, etc.)',
  inputSchema: zodToJsonSchema(
    z.object({
      fileId: z.string().describe('The ID of the file'),
    })
  ),
};

export const searchFilesTool = {
  name: 'search_files',
  description: 'Searches for files in Google Drive by name or content',
  inputSchema: zodToJsonSchema(
    z.object({
      searchQuery: z.string().describe('Search query (searches file names and content)'),
      mimeType: z.string().optional().describe('Filter by MIME type (e.g., "application/pdf", "image/jpeg")'),
      pageSize: z.number().int().min(1).max(100).optional().describe('Number of results (default 20, max 100)'),
    })
  ),
};

export const makeFilePublicTool = {
  name: 'make_file_public',
  description: 'Makes a file publicly accessible and returns a shareable URL',
  inputSchema: zodToJsonSchema(
    z.object({
      fileId: z.string().describe('The ID of the file to make public'),
    })
  ),
};

export const insertLinkToDocTool = {
  name: 'insert_link_to_doc',
  description: 'Inserts a clickable hyperlink into a Google Document. Useful for adding video links or any URL.',
  inputSchema: zodToJsonSchema(
    z.object({
      documentId: z.string().describe('The ID of the document'),
      index: z.number().int().min(1).describe('Position in document where link should be inserted (1 = start)'),
      text: z.string().describe('The display text for the link'),
      url: z.string().url().describe('The URL the link points to'),
    })
  ),
};