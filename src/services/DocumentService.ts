import { google } from 'googleapis';
import { OAuth2Client } from 'googleapis-common';
import { IDocumentService } from '../interfaces/IDocumentService.js';

/**
 * DocumentService: Responsible ONLY for Google Docs operations
 * SRP: Handles document operations, nothing else
 */
export class DocumentService implements IDocumentService {
  private readonly docs;
  private readonly drive;

  /**
   * Constructor receives authenticated client (Dependency Injection)
   * DIP: Depends on abstraction (OAuth2Client), not concrete implementation
   */
  constructor(private authClient: OAuth2Client) {
    this.docs = google.docs({ version: 'v1', auth: authClient });
    this.drive = google.drive({ version: 'v3', auth: authClient });
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
      const fs = await import('fs');
      const path = await import('path');

      // Read the file
      const fileName = path.basename(filePath);

      // Upload to Drive
      const driveResponse = await this.drive.files.create({
        requestBody: {
          name: fileName,
          mimeType: 'image/jpeg', // Adjust based on file type
        },
        media: {
          mimeType: 'image/jpeg',
          body: fs.createReadStream(filePath),
        },
        fields: 'id, webContentLink',
      });

      const fileId = driveResponse.data.id!;

      // Make file publicly accessible
      await this.drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      // Get the public URL
      const imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

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
    formatting: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      foregroundColor?: { red: number; green: number; blue: number };
    }
  ): Promise<void> {
    try {
      const requests: any[] = [];
      const textStyle: any = {};
      const fields: string[] = [];

      // Build text style object based on provided formatting
      if (formatting.bold !== undefined) {
        textStyle.bold = formatting.bold;
        fields.push('bold');
      }
      if (formatting.italic !== undefined) {
        textStyle.italic = formatting.italic;
        fields.push('italic');
      }
      if (formatting.underline !== undefined) {
        textStyle.underline = formatting.underline;
        fields.push('underline');
      }
      if (formatting.foregroundColor) {
        textStyle.foregroundColor = {
          color: {
            rgbColor: formatting.foregroundColor,
          },
        };
        fields.push('foregroundColor');
      }

      // Create the update request
      requests.push({
        updateTextStyle: {
          range: {
            startIndex: startIndex,
            endIndex: endIndex,
          },
          textStyle: textStyle,
          fields: fields.join(','),
        },
      });

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
}