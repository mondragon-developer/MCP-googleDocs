import { google } from 'googleapis';
import { OAuth2Client } from 'googleapis-common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * DriveUploadHelper: Shared utility for uploading files to Google Drive
 * Eliminates code duplication across services
 */
export class DriveUploadHelper {
  private readonly drive;

  constructor(private authClient: OAuth2Client) {
    this.drive = google.drive({ version: 'v3', auth: authClient });
  }

  /**
   * Validates that a file path is safe (prevents path traversal attacks)
   * @param filePath - The file path to validate
   * @param allowedBaseDir - Optional base directory to restrict access to
   * @throws Error if path is invalid or outside allowed directory
   */
  validateFilePath(filePath: string, allowedBaseDir?: string): string {
    // Resolve to absolute path to eliminate relative components like ../
    const resolvedPath = path.resolve(filePath);

    // If a base directory is specified, ensure the file is within it
    if (allowedBaseDir) {
      const resolvedBase = path.resolve(allowedBaseDir);
      if (!resolvedPath.startsWith(resolvedBase)) {
        throw new Error('Invalid file path: access denied (outside allowed directory)');
      }
    }

    // Check if file exists and is accessible
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Ensure it's a file, not a directory
    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${filePath}`);
    }

    return resolvedPath;
  }

  /**
   * Detects MIME type from file extension
   * @param fileName - The name of the file
   * @returns MIME type string
   */
  getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();

    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Uploads a local image file to Google Drive and returns public URL
   * @param filePath - Local file path to the image
   * @param allowedBaseDir - Optional base directory to restrict uploads to
   * @returns Public URL of the uploaded file
   */
  async uploadImageAndGetPublicUrl(
    filePath: string,
    allowedBaseDir?: string
  ): Promise<string> {
    try {
      // Validate file path for security
      const validatedPath = this.validateFilePath(filePath, allowedBaseDir);
      const fileName = path.basename(validatedPath);
      const mimeType = this.getMimeType(fileName);

      // Upload to Drive
      const driveResponse = await this.drive.files.create({
        requestBody: {
          name: fileName,
          mimeType: mimeType,
        },
        media: {
          mimeType: mimeType,
          body: fs.createReadStream(validatedPath),
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

      // Return the public URL
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    } catch (error) {
      throw new Error(`Failed to upload image: ${error}`);
    }
  }
}
