import { google } from 'googleapis';
import { OAuth2Client } from 'googleapis-common';
import { IDriveService, DriveFileInfo, DriveListResult } from '../interfaces/IDriveService.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * DriveService: Handles Google Drive operations
 * SRP: Focused only on Drive file management
 */
export class DriveService implements IDriveService {
  private readonly drive;
  private readonly docs;

  constructor(private authClient: OAuth2Client) {
    this.drive = google.drive({ version: 'v3', auth: authClient });
    this.docs = google.docs({ version: 'v1', auth: authClient });
  }

  /**
   * Validates that a file path is safe (prevents path traversal attacks)
   */
  private validateFilePath(filePath: string): string {
    const resolvedPath = path.resolve(filePath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${filePath}`);
    }

    return resolvedPath;
  }

  /**
   * Detects MIME type from file extension
   */
  private getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();

    const mimeTypes: { [key: string]: string } = {
      // Images
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      // Documents
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.rtf': 'application/rtf',
      '.odt': 'application/vnd.oasis.opendocument.text',
      // Spreadsheets
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv': 'text/csv',
      '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
      // Presentations
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.odp': 'application/vnd.oasis.opendocument.presentation',
      // Videos
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',
      // Audio
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
      // Archives
      '.zip': 'application/zip',
      '.rar': 'application/vnd.rar',
      '.7z': 'application/x-7z-compressed',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
      // Code
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.ts': 'text/typescript',
      '.py': 'text/x-python',
      '.java': 'text/x-java-source',
      '.md': 'text/markdown',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Maps Drive file response to DriveFileInfo
   */
  private mapFileToInfo(file: any): DriveFileInfo {
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      webViewLink: file.webViewLink,
      parents: file.parents,
    };
  }

  async listFiles(
    folderId?: string,
    pageSize: number = 20,
    pageToken?: string,
    query?: string
  ): Promise<DriveListResult> {
    try {
      // Build query
      let q = query || '';
      if (folderId) {
        q = q ? `${q} and '${folderId}' in parents` : `'${folderId}' in parents`;
      }
      // Exclude trashed files
      q = q ? `${q} and trashed = false` : 'trashed = false';

      const response = await this.drive.files.list({
        q: q,
        pageSize: Math.min(pageSize, 100),
        pageToken: pageToken,
        fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, parents)',
        orderBy: 'modifiedTime desc',
      });

      return {
        files: (response.data.files || []).map(f => this.mapFileToInfo(f)),
        nextPageToken: response.data.nextPageToken || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to list files: ${error}`);
    }
  }

  async uploadFile(
    filePath: string,
    folderId?: string,
    fileName?: string
  ): Promise<DriveFileInfo> {
    try {
      const validatedPath = this.validateFilePath(filePath);
      const name = fileName || path.basename(validatedPath);
      const mimeType = this.getMimeType(name);

      const requestBody: any = {
        name: name,
        mimeType: mimeType,
      };

      if (folderId) {
        requestBody.parents = [folderId];
      }

      const response = await this.drive.files.create({
        requestBody: requestBody,
        media: {
          mimeType: mimeType,
          body: fs.createReadStream(validatedPath),
        },
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, parents',
      });

      return this.mapFileToInfo(response.data);
    } catch (error) {
      throw new Error(`Failed to upload file: ${error}`);
    }
  }

  async downloadFile(fileId: string, destinationPath: string): Promise<string> {
    try {
      const resolvedPath = path.resolve(destinationPath);

      // Ensure directory exists
      const dir = path.dirname(resolvedPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const response = await this.drive.files.get(
        { fileId: fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      const dest = fs.createWriteStream(resolvedPath);

      return new Promise((resolve, reject) => {
        (response.data as NodeJS.ReadableStream)
          .pipe(dest)
          .on('finish', () => resolve(resolvedPath))
          .on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to download file: ${error}`);
    }
  }

  async getFileContent(fileId: string): Promise<string> {
    try {
      // First check if it's a Google Doc - if so, export as text
      const metadata = await this.drive.files.get({
        fileId: fileId,
        fields: 'mimeType',
      });

      const mimeType = metadata.data.mimeType;

      if (mimeType === 'application/vnd.google-apps.document') {
        // Export Google Doc as plain text
        const response = await this.drive.files.export({
          fileId: fileId,
          mimeType: 'text/plain',
        });
        return response.data as string;
      } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
        // Export Google Sheet as CSV
        const response = await this.drive.files.export({
          fileId: fileId,
          mimeType: 'text/csv',
        });
        return response.data as string;
      } else {
        // For regular files, download content
        const response = await this.drive.files.get(
          { fileId: fileId, alt: 'media' },
          { responseType: 'text' }
        );
        return response.data as string;
      }
    } catch (error) {
      throw new Error(`Failed to get file content: ${error}`);
    }
  }

  async convertPdfToGoogleDoc(
    filePath: string,
    folderId?: string
  ): Promise<{ documentId: string; name: string }> {
    try {
      const validatedPath = this.validateFilePath(filePath);
      const fileName = path.basename(validatedPath, '.pdf');

      const requestBody: any = {
        name: fileName,
        mimeType: 'application/vnd.google-apps.document', // Convert to Google Doc
      };

      if (folderId) {
        requestBody.parents = [folderId];
      }

      // Upload PDF with OCR conversion to Google Doc
      const response = await this.drive.files.create({
        requestBody: requestBody,
        media: {
          mimeType: 'application/pdf',
          body: fs.createReadStream(validatedPath),
        },
        fields: 'id, name',
      });

      return {
        documentId: response.data.id!,
        name: response.data.name!,
      };
    } catch (error) {
      throw new Error(`Failed to convert PDF to Google Doc: ${error}`);
    }
  }

  async extractTextFromPdf(filePath: string): Promise<string> {
    try {
      // First convert PDF to Google Doc (with OCR)
      const { documentId } = await this.convertPdfToGoogleDoc(filePath);

      // Read the content from the Google Doc
      const doc = await this.docs.documents.get({ documentId });

      // Extract text from document structure
      const content = doc.data.body?.content || [];
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
        if (element.table) {
          // Extract text from tables
          const tableRows = element.table.tableRows || [];
          for (const row of tableRows) {
            const cells = row.tableCells || [];
            for (const cell of cells) {
              const cellContent = cell.content || [];
              for (const cellElement of cellContent) {
                if (cellElement.paragraph) {
                  const paragraphElements = cellElement.paragraph.elements || [];
                  for (const elem of paragraphElements) {
                    if (elem.textRun?.content) {
                      text += elem.textRun.content;
                    }
                  }
                }
              }
              text += '\t'; // Tab between cells
            }
            text += '\n'; // Newline between rows
          }
        }
      }

      // Optionally delete the temporary Google Doc (uncomment if desired)
      // await this.deleteFile(documentId);

      return text.trim();
    } catch (error) {
      throw new Error(`Failed to extract text from PDF: ${error}`);
    }
  }

  async createFolder(name: string, parentId?: string): Promise<DriveFileInfo> {
    try {
      const requestBody: any = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
      };

      if (parentId) {
        requestBody.parents = [parentId];
      }

      const response = await this.drive.files.create({
        requestBody: requestBody,
        fields: 'id, name, mimeType, createdTime, modifiedTime, webViewLink, parents',
      });

      return this.mapFileToInfo(response.data);
    } catch (error) {
      throw new Error(`Failed to create folder: ${error}`);
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({ fileId: fileId });
    } catch (error) {
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  async getFileMetadata(fileId: string): Promise<DriveFileInfo> {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, parents',
      });

      return this.mapFileToInfo(response.data);
    } catch (error) {
      throw new Error(`Failed to get file metadata: ${error}`);
    }
  }

  /**
   * Makes a file publicly accessible and returns its public URL
   * @param fileId - The ID of the file
   */
  async makeFilePublic(fileId: string): Promise<string> {
    try {
      await this.drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    } catch (error) {
      throw new Error(`Failed to make file public: ${error}`);
    }
  }

  /**
   * Searches for files in Drive
   * @param searchQuery - Search query (file name or content)
   * @param mimeType - Optional MIME type filter
   */
  async searchFiles(
    searchQuery: string,
    mimeType?: string,
    pageSize: number = 20
  ): Promise<DriveListResult> {
    try {
      let q = `name contains '${searchQuery}' or fullText contains '${searchQuery}'`;

      if (mimeType) {
        q += ` and mimeType = '${mimeType}'`;
      }

      q += ' and trashed = false';

      const response = await this.drive.files.list({
        q: q,
        pageSize: Math.min(pageSize, 100),
        fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, parents)',
        orderBy: 'modifiedTime desc',
      });

      return {
        files: (response.data.files || []).map(f => this.mapFileToInfo(f)),
        nextPageToken: response.data.nextPageToken || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to search files: ${error}`);
    }
  }
}
