import { google } from 'googleapis';
import { OAuth2Client } from 'googleapis-common';
import { IDocumentService } from '../interfaces/IDocumentService.js';
import { DriveUploadHelper } from '../utils/DriveUploadHelper.js';
import { FormattingHelper, TextFormatting } from '../utils/FormattingHelper.js';

/**
 * DocumentService: Responsible ONLY for Google Docs operations
 * SRP: Handles document operations, nothing else
 */
export class DocumentService implements IDocumentService {
  private readonly docs;
  private readonly driveHelper;

  /**
   * Constructor receives authenticated client (Dependency Injection)
   * DIP: Depends on abstraction (OAuth2Client), not concrete implementation
   */
  constructor(private authClient: OAuth2Client) {
    this.docs = google.docs({ version: 'v1', auth: authClient });
    this.driveHelper = new DriveUploadHelper(authClient);
  }

  /**
   * Creates a new Google Document
   * @param title - The title for the new document
   * @returns Object with documentId and title
   */
  async createDocument(title: string): Promise<{ documentId: string; title: string }> {
    try {
      const response = await this.docs.documents.create({
        requestBody: {
          title: title,
        },
      });

      return {
        documentId: response.data.documentId!,
        title: response.data.title!,
      };
    } catch (error) {
      throw new Error(`Failed to create document: ${error}`);
    }
  }

  /**
   * Reads the entire content of a Google Document
   * @param documentId - The ID of the document to read
   * @returns Plain text content of the document
   */
  async readDocument(documentId: string): Promise<string> {
    try {
      const response = await this.docs.documents.get({
        documentId: documentId,
      });

      // Extract text from document structure
      const content = response.data.body?.content || [];
      let text = '';

      for (const element of content) {
        if (element.paragraph) {
          const paragraphElements = element.paragraph.elements || [];
          for (const elem of paragraphElements) {
            if (elem.textRun?.content) {
              text += elem.textRun.content;
            }
          }
        }
      }

      return text;
    } catch (error) {
      throw new Error(`Failed to read document: ${error}`);
    }
  }

  /**
   * Updates a document by replacing all content with new text
   * @param documentId - The ID of the document to update
   * @param text - The new text content
   */
  async updateDocument(documentId: string, text: string): Promise<void> {
    try {
      // First, get the document to find its length
      const doc = await this.docs.documents.get({ documentId });
      const contentLength = doc.data.body?.content?.[0]?.endIndex || 1;

      const requests: any[] = [];

      // Only delete content if there's something to delete
      // A new/empty document has contentLength of 2 (just the newline)
      if (contentLength > 2) {
        requests.push({
          deleteContentRange: {
            range: {
              startIndex: 1,
              endIndex: contentLength - 1,
            },
          },
        });
      }

      // Insert the new text
      requests.push({
        insertText: {
          location: {
            index: 1,
          },
          text: text,
        },
      });

      await this.docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: requests,
        },
      });
    } catch (error) {
      throw new Error(`Failed to update document: ${error}`);
    }
  }

  /**
   * Inserts an image into a document at a specific position
   * @param documentId - The ID of the document
   * @param imageUrl - Public URL of the image to insert
   * @param index - Position in document where image should be inserted
   */
  async insertImage(documentId: string, imageUrl: string, index: number): Promise<void> {
    try {
      await this.docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: [
            {
              insertInlineImage: {
                uri: imageUrl,
                location: {
                  index: index,
                },
              },
            },
          ],
        },
      });
    } catch (error) {
      throw new Error(`Failed to insert image: ${error}`);
    }
  }

  /**
   * Inserts a local image file into a document by uploading to Drive first
   * @param documentId - The ID of the document
   * @param filePath - Local file path to the image
   * @param index - Position in document where image should be inserted
   */
  async insertLocalImage(documentId: string, filePath: string, index: number): Promise<void> {
    try {
      // Upload file securely and get public URL (includes path validation)
      const imageUrl = await this.driveHelper.uploadImageAndGetPublicUrl(filePath);

      // Insert the image using the existing method
      await this.insertImage(documentId, imageUrl, index);
    } catch (error) {
      throw new Error(`Failed to insert local image: ${error}`);
    }
  }

  /**
   * Formats text in a document (bold, italic, underline, color)
   * @param documentId - The ID of the document
   * @param startIndex - Start position of text to format
   * @param endIndex - End position of text to format
   * @param formatting - Formatting options (bold, italic, underline, foregroundColor)
   */
  async formatText(
    documentId: string,
    startIndex: number,
    endIndex: number,
    formatting: TextFormatting
  ): Promise<void> {
    try {
      // Validate color if provided
      if (formatting.foregroundColor) {
        FormattingHelper.validateColor(formatting.foregroundColor);
      }

      const { style, fields } = FormattingHelper.buildTextFormatting(formatting);

      // Convert formatting to Google Docs format (needs nested color structure)
      const textStyle: any = { ...style };
      if (style.foregroundColor) {
        textStyle.foregroundColor = {
          color: {
            rgbColor: style.foregroundColor,
          },
        };
      }

      // Create the update request
      const requests = [{
        updateTextStyle: {
          range: {
            startIndex: startIndex,
            endIndex: endIndex,
          },
          textStyle: textStyle,
          fields: fields.join(','),
        },
      }];

      await this.docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: requests,
        },
      });
    } catch (error) {
      throw new Error(`Failed to format text: ${error}`);
    }
  }

  /**
   * Inserts a native Google Docs table with data at a specific position
   * @param documentId - The ID of the document
   * @param index - Position in document where table should be inserted
   * @param rows - Number of rows in the table
   * @param columns - Number of columns in the table
   * @param data - 2D array of cell contents (row-major order)
   * @param headerRow - Whether to format the first row as a header
   */
  async insertTable(
    documentId: string,
    index: number,
    rows: number,
    columns: number,
    data: string[][],
    headerRow: boolean = false
  ): Promise<void> {
    try {
      // Step 1: Insert an empty table
      const insertTableRequest = {
        insertTable: {
          rows: rows,
          columns: columns,
          location: {
            index: index,
          },
        },
      };

      await this.docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: [insertTableRequest],
        },
      });

      // Step 2: Get the document to find the table structure and cell positions
      const doc = await this.docs.documents.get({ documentId });
      const body = doc.data.body?.content || [];

      // Find the table we just inserted (should be near the index)
      let table: any = null;
      for (const element of body) {
        if (element.table && element.startIndex != null && element.startIndex >= index) {
          table = element;
          break;
        }
      }

      if (!table) {
        throw new Error('Failed to find the inserted table in document');
      }

      // Step 3: Build requests to insert text into each cell and apply header formatting
      const requests: any[] = [];
      const headerCellRanges: { startIndex: number; endIndex: number }[] = [];

      // Iterate through table rows and cells to insert text
      const tableRows = table.table.tableRows || [];
      for (let rowIdx = 0; rowIdx < tableRows.length && rowIdx < data.length; rowIdx++) {
        const row = tableRows[rowIdx];
        const tableCells = row.tableCells || [];

        for (let colIdx = 0; colIdx < tableCells.length && colIdx < data[rowIdx].length; colIdx++) {
          const cell = tableCells[colIdx];
          const cellContent = data[rowIdx][colIdx];

          if (cellContent && cellContent.length > 0) {
            // Find the paragraph inside the cell to get the insert index
            const cellElements = cell.content || [];
            for (const cellElement of cellElements) {
              if (cellElement.paragraph && cellElement.startIndex !== undefined) {
                const insertIndex = cellElement.startIndex;

                // Insert text into the cell
                requests.push({
                  insertText: {
                    location: {
                      index: insertIndex,
                    },
                    text: cellContent,
                  },
                });

                // Track header row cell ranges for formatting
                if (headerRow && rowIdx === 0) {
                  headerCellRanges.push({
                    startIndex: insertIndex,
                    endIndex: insertIndex + cellContent.length,
                  });
                }
                break;
              }
            }
          }
        }
      }

      // Execute text insertion requests (in reverse order to maintain correct indices)
      if (requests.length > 0) {
        // Reverse the requests to insert from end to start (preserves indices)
        requests.reverse();

        await this.docs.documents.batchUpdate({
          documentId: documentId,
          requestBody: {
            requests: requests,
          },
        });
      }

      // Step 4: Re-fetch document and apply borders + header formatting
      const updatedDoc = await this.docs.documents.get({ documentId });
      const updatedBody = updatedDoc.data.body?.content || [];

      // Find the table again
      let updatedTable: any = null;
      for (const element of updatedBody) {
        if (element.table && element.startIndex != null && element.startIndex >= index) {
          updatedTable = element;
          break;
        }
      }

      if (updatedTable) {
        const formattingRequests: any[] = [];
        const tableStartIndex = updatedTable.startIndex;
        const tableRows = updatedTable.table.tableRows || [];
        const numRows = tableRows.length;
        const numCols = tableRows[0]?.tableCells?.length || columns;

        // Define border style - solid black 1pt border
        const borderStyle = {
          color: {
            color: {
              rgbColor: {
                red: 0,
                green: 0,
                blue: 0,
              },
            },
          },
          width: {
            magnitude: 1,
            unit: 'PT',
          },
          dashStyle: 'SOLID',
        };

        // Apply borders to ALL cells in the table
        for (let rowIdx = 0; rowIdx < numRows; rowIdx++) {
          for (let colIdx = 0; colIdx < numCols; colIdx++) {
            formattingRequests.push({
              updateTableCellStyle: {
                tableCellStyle: {
                  borderTop: borderStyle,
                  borderBottom: borderStyle,
                  borderLeft: borderStyle,
                  borderRight: borderStyle,
                },
                tableRange: {
                  tableCellLocation: {
                    tableStartLocation: {
                      index: tableStartIndex,
                    },
                    rowIndex: rowIdx,
                    columnIndex: colIdx,
                  },
                  rowSpan: 1,
                  columnSpan: 1,
                },
                fields: 'borderTop,borderBottom,borderLeft,borderRight',
              },
            });
          }
        }

        // Apply header formatting if requested
        if (headerRow) {
          const firstRow = tableRows[0];
          if (firstRow) {
            const headerCells = firstRow.tableCells || [];
            for (let colIdx = 0; colIdx < headerCells.length; colIdx++) {
              const cell = headerCells[colIdx];

              // Apply bold formatting to header row text
              const cellElements = cell.content || [];
              for (const cellElement of cellElements) {
                if (cellElement.paragraph) {
                  const paragraphElements = cellElement.paragraph.elements || [];
                  for (const elem of paragraphElements) {
                    if (elem.textRun && elem.startIndex !== undefined && elem.endIndex !== undefined) {
                      // Only format if there's actual text (not just newline)
                      if (elem.textRun.content && elem.textRun.content.trim().length > 0) {
                        formattingRequests.push({
                          updateTextStyle: {
                            range: {
                              startIndex: elem.startIndex,
                              endIndex: elem.endIndex,
                            },
                            textStyle: {
                              bold: true,
                            },
                            fields: 'bold',
                          },
                        });
                      }
                    }
                  }
                }
              }

              // Apply light gray background to header cells
              formattingRequests.push({
                updateTableCellStyle: {
                  tableCellStyle: {
                    backgroundColor: {
                      color: {
                        rgbColor: {
                          red: 0.9,
                          green: 0.9,
                          blue: 0.9,
                        },
                      },
                    },
                  },
                  tableRange: {
                    tableCellLocation: {
                      tableStartLocation: {
                        index: tableStartIndex,
                      },
                      rowIndex: 0,
                      columnIndex: colIdx,
                    },
                    rowSpan: 1,
                    columnSpan: 1,
                  },
                  fields: 'backgroundColor',
                },
              });
            }
          }
        }

        if (formattingRequests.length > 0) {
          await this.docs.documents.batchUpdate({
            documentId: documentId,
            requestBody: {
              requests: formattingRequests,
            },
          });
        }
      }
    } catch (error) {
      throw new Error(`Failed to insert table: ${error}`);
    }
  }
}