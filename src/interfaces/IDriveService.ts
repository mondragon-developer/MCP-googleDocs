/**
 * Interface for Google Drive operations
 * ISP: Focused only on Drive operations
 */

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  parents?: string[];
}

export interface DriveListResult {
  files: DriveFileInfo[];
  nextPageToken?: string;
}

export interface IDriveService {
  /**
   * Lists files and folders in Google Drive
   * @param folderId - Optional folder ID to list contents of (defaults to root)
   * @param pageSize - Number of files to return (default 20, max 100)
   * @param pageToken - Token for pagination
   * @param query - Optional search query (Google Drive query syntax)
   */
  listFiles(
    folderId?: string,
    pageSize?: number,
    pageToken?: string,
    query?: string
  ): Promise<DriveListResult>;

  /**
   * Uploads a file to Google Drive
   * @param filePath - Local file path to upload
   * @param folderId - Optional folder ID to upload to
   * @param fileName - Optional custom name for the file
   */
  uploadFile(
    filePath: string,
    folderId?: string,
    fileName?: string
  ): Promise<DriveFileInfo>;

  /**
   * Downloads a file from Google Drive
   * @param fileId - The ID of the file to download
   * @param destinationPath - Local path to save the file
   */
  downloadFile(fileId: string, destinationPath: string): Promise<string>;

  /**
   * Gets file content as text (for text-based files)
   * @param fileId - The ID of the file to read
   */
  getFileContent(fileId: string): Promise<string>;

  /**
   * Converts a PDF to Google Docs format using OCR
   * @param filePath - Local path to the PDF file
   * @param folderId - Optional folder ID to upload to
   */
  convertPdfToGoogleDoc(
    filePath: string,
    folderId?: string
  ): Promise<{ documentId: string; name: string }>;

  /**
   * Extracts text from a PDF (via Google Docs OCR conversion)
   * @param filePath - Local path to the PDF file
   */
  extractTextFromPdf(filePath: string): Promise<string>;

  /**
   * Creates a folder in Google Drive
   * @param name - Name of the folder
   * @param parentId - Optional parent folder ID
   */
  createFolder(name: string, parentId?: string): Promise<DriveFileInfo>;

  /**
   * Deletes a file or folder from Google Drive
   * @param fileId - The ID of the file/folder to delete
   */
  deleteFile(fileId: string): Promise<void>;

  /**
   * Gets file metadata
   * @param fileId - The ID of the file
   */
  getFileMetadata(fileId: string): Promise<DriveFileInfo>;
}
