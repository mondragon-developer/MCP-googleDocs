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
   * Updates a document by replacing ALL content with new text
   * @param documentId - The ID of the document to update
   * @param text - The new text content
   */
  async updateDocument(documentId: string, text: string): Promise<void> {
    try {
      // Get the document to find the TOTAL length (last element's endIndex)
      const doc = await this.docs.documents.get({ documentId });
      const body = doc.data.body?.content || [];

      // Get the last element's endIndex to delete ALL content
      const lastElement = body[body.length - 1];
      const documentEndIndex = lastElement?.endIndex || 1;

      const requests: any[] = [];

      // Only delete content if there's something to delete
      // A new/empty document has endIndex of 2 (just the newline)
      if (documentEndIndex > 2) {
        requests.push({
          deleteContentRange: {
            range: {
              startIndex: 1,
              endIndex: documentEndIndex - 1,
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
   * @param headerRow - Whether to format the first row as a header (bold, centered, gray background)
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
      // Step 1: Insert a newline before the table to avoid cutting existing text
      // Then insert the table after the newline
      await this.docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: { index: index },
                text: '\n',
              },
            },
          ],
        },
      });

      // Step 2: Insert the table after the newline
      const tableIndex = index + 1;
      await this.docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: [
            {
              insertTable: {
                rows: rows,
                columns: columns,
                location: { index: tableIndex },
              },
            },
          ],
        },
      });

      // Step 3: Get the document to find the table structure
      const doc = await this.docs.documents.get({ documentId });
      const body = doc.data.body?.content || [];

      // Find the table we just inserted
      let table: any = null;
      for (const element of body) {
        if (element.table && element.startIndex != null && element.startIndex >= tableIndex) {
          table = element;
          break;
        }
      }

      if (!table) {
        throw new Error('Failed to find the inserted table in document');
      }

      // Step 4: Build requests to insert text into each cell
      // Collect all cell insert positions first, then insert in reverse order
      const cellInserts: { index: number; text: string; isHeader: boolean }[] = [];

      const tableRows = table.table.tableRows || [];
      for (let rowIdx = 0; rowIdx < tableRows.length && rowIdx < data.length; rowIdx++) {
        const row = tableRows[rowIdx];
        const tableCells = row.tableCells || [];

        for (let colIdx = 0; colIdx < tableCells.length && colIdx < (data[rowIdx]?.length || 0); colIdx++) {
          const cell = tableCells[colIdx];
          const cellContent = data[rowIdx][colIdx];

          if (cellContent && cellContent.length > 0) {
            const cellElements = cell.content || [];
            for (const cellElement of cellElements) {
              if (cellElement.paragraph && cellElement.startIndex !== undefined) {
                cellInserts.push({
                  index: cellElement.startIndex,
                  text: cellContent,
                  isHeader: headerRow && rowIdx === 0,
                });
                break;
              }
            }
          }
        }
      }

      // Sort by index descending to insert from end to start (preserves indices)
      cellInserts.sort((a, b) => b.index - a.index);

      // Insert all text content
      if (cellInserts.length > 0) {
        const insertRequests = cellInserts.map(cell => ({
          insertText: {
            location: { index: cell.index },
            text: cell.text,
          },
        }));

        await this.docs.documents.batchUpdate({
          documentId: documentId,
          requestBody: { requests: insertRequests },
        });
      }

      // Step 5: Re-fetch document to get updated indices for formatting
      const updatedDoc = await this.docs.documents.get({ documentId });
      const updatedBody = updatedDoc.data.body?.content || [];

      // Find the table again with updated indices
      let updatedTable: any = null;
      for (const element of updatedBody) {
        if (element.table && element.startIndex != null && element.startIndex >= tableIndex) {
          updatedTable = element;
          break;
        }
      }

      if (!updatedTable) {
        return; // Table exists but can't find it for formatting - still success
      }

      // Step 6: Apply borders to all cells and header formatting
      const formattingRequests: any[] = [];
      const tableStartIndex = updatedTable.startIndex;
      const updatedTableRows = updatedTable.table.tableRows || [];
      const numRows = updatedTableRows.length;
      const numCols = updatedTableRows[0]?.tableCells?.length || columns;

      // Define border style - solid black 1pt border
      const borderStyle = {
        color: {
          color: {
            rgbColor: { red: 0, green: 0, blue: 0 },
          },
        },
        width: { magnitude: 1, unit: 'PT' },
        dashStyle: 'SOLID',
      };

      // Apply borders to ALL cells
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
                  tableStartLocation: { index: tableStartIndex },
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
      if (headerRow && updatedTableRows.length > 0) {
        const firstRow = updatedTableRows[0];
        const headerCells = firstRow.tableCells || [];

        for (let colIdx = 0; colIdx < headerCells.length; colIdx++) {
          const cell = headerCells[colIdx];
          const cellElements = cell.content || [];

          for (const cellElement of cellElements) {
            if (cellElement.paragraph) {
              const paragraphStart = cellElement.startIndex;
              const paragraphEnd = cellElement.endIndex;

              // Center align the paragraph in header cells
              if (paragraphStart !== undefined && paragraphEnd !== undefined) {
                formattingRequests.push({
                  updateParagraphStyle: {
                    range: {
                      startIndex: paragraphStart,
                      endIndex: paragraphEnd,
                    },
                    paragraphStyle: {
                      alignment: 'CENTER',
                    },
                    fields: 'alignment',
                  },
                });
              }

              // Bold the text in header cells
              const paragraphElements = cellElement.paragraph.elements || [];
              for (const elem of paragraphElements) {
                if (elem.textRun && elem.startIndex !== undefined && elem.endIndex !== undefined) {
                  const content = elem.textRun.content || '';
                  if (content.trim().length > 0) {
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

          // Apply gray background to header cells
          formattingRequests.push({
            updateTableCellStyle: {
              tableCellStyle: {
                backgroundColor: {
                  color: {
                    rgbColor: { red: 0.9, green: 0.9, blue: 0.9 },
                  },
                },
              },
              tableRange: {
                tableCellLocation: {
                  tableStartLocation: { index: tableStartIndex },
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

      // Execute all formatting requests
      if (formattingRequests.length > 0) {
        await this.docs.documents.batchUpdate({
          documentId: documentId,
          requestBody: { requests: formattingRequests },
        });
      }
    } catch (error) {
      throw new Error(`Failed to insert table: ${error}`);
    }
  }

  /**
   * Inserts a hyperlink into a document at a specific position
   * Useful for inserting video links or any other URL
   * @param documentId - The ID of the document
   * @param index - Position in document where link should be inserted
   * @param text - The display text for the link
   * @param url - The URL the link points to
   */
  async insertLink(
    documentId: string,
    index: number,
    text: string,
    url: string
  ): Promise<void> {
    try {
      const endIndex = index + text.length;

      // Insert text and apply link formatting in one batch
      await this.docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: [
            // First insert the text
            {
              insertText: {
                location: {
                  index: index,
                },
                text: text,
              },
            },
            // Then apply the link formatting
            {
              updateTextStyle: {
                range: {
                  startIndex: index,
                  endIndex: endIndex,
                },
                textStyle: {
                  link: {
                    url: url,
                  },
                },
                fields: 'link',
              },
            },
          ],
        },
      });
    } catch (error) {
      throw new Error(`Failed to insert link: ${error}`);
    }
  }

  /**
   * Appends text to the end of a document
   * @param documentId - The ID of the document
   * @param text - The text to append
   */
  async appendText(documentId: string, text: string): Promise<void> {
    try {
      // Get document to find the end position
      const doc = await this.docs.documents.get({ documentId });
      const body = doc.data.body?.content || [];
      const lastElement = body[body.length - 1];
      const endIndex = (lastElement?.endIndex || 2) - 1;

      await this.docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: { index: endIndex },
                text: text,
              },
            },
          ],
        },
      });
    } catch (error) {
      throw new Error(`Failed to append text: ${error}`);
    }
  }

  /**
   * Formats titles (lines ending with newline) as bold
   * Finds text patterns that look like titles and makes them bold
   * @param documentId - The ID of the document
   * @param titlePattern - Optional regex pattern to match titles (default: lines followed by blank line or starting with emoji)
   */
  async formatTitles(documentId: string): Promise<{ titlesFormatted: number }> {
    try {
      const doc = await this.docs.documents.get({ documentId });
      const body = doc.data.body?.content || [];

      const requests: any[] = [];
      let titlesFormatted = 0;

      for (const element of body) {
        if (element.paragraph) {
          const paragraphElements = element.paragraph.elements || [];

          for (const elem of paragraphElements) {
            if (elem.textRun && elem.startIndex !== undefined && elem.endIndex !== undefined) {
              const content = elem.textRun.content || '';
              const trimmed = content.trim();

              // Check if this looks like a title:
              // - Starts with emoji
              // - Is short (< 100 chars)
              // - Ends with colon
              // - Is all caps or Title Case with no period at end
              const startsWithEmoji = /^[\u{1F300}-\u{1F9FF}]/u.test(trimmed);
              const endsWithColon = trimmed.endsWith(':');
              const isShortLine = trimmed.length > 0 && trimmed.length < 100 && !trimmed.includes('.');
              const looksLikeHeader = /^[A-Z][^.]*$/.test(trimmed) && trimmed.length < 60;

              if ((startsWithEmoji || endsWithColon || looksLikeHeader) && isShortLine) {
                requests.push({
                  updateTextStyle: {
                    range: {
                      startIndex: elem.startIndex,
                      endIndex: elem.endIndex,
                    },
                    textStyle: { bold: true },
                    fields: 'bold',
                  },
                });
                titlesFormatted++;
              }
            }
          }
        }
      }

      if (requests.length > 0) {
        await this.docs.documents.batchUpdate({
          documentId: documentId,
          requestBody: { requests },
        });
      }

      return { titlesFormatted };
    } catch (error) {
      throw new Error(`Failed to format titles: ${error}`);
    }
  }

  /**
   * Formats the first line of a document as a title (bold and larger)
   * @param documentId - The ID of the document
   * @param fontSize - Optional font size in PT (default: 18)
   */
  async formatFirstLineAsTitle(
    documentId: string,
    fontSize: number = 18
  ): Promise<void> {
    try {
      const doc = await this.docs.documents.get({ documentId });
      const body = doc.data.body?.content || [];

      // Find the first paragraph
      for (const element of body) {
        if (element.paragraph) {
          const paragraphElements = element.paragraph.elements || [];
          if (paragraphElements.length > 0) {
            const firstElem = paragraphElements[0];
            if (firstElem.textRun && firstElem.startIndex !== undefined && firstElem.endIndex !== undefined) {
              await this.docs.documents.batchUpdate({
                documentId: documentId,
                requestBody: {
                  requests: [
                    {
                      updateTextStyle: {
                        range: {
                          startIndex: firstElem.startIndex,
                          endIndex: firstElem.endIndex,
                        },
                        textStyle: {
                          bold: true,
                          fontSize: { magnitude: fontSize, unit: 'PT' },
                        },
                        fields: 'bold,fontSize',
                      },
                    },
                  ],
                },
              });
              return;
            }
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to format first line as title: ${error}`);
    }
  }
}