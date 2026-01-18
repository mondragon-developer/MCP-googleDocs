/**
 * Interface for Google Docs operations
 * ISP: Focused only on document operations
 */
export interface IDocumentService {
  createDocument(title: string): Promise<{ documentId: string; title: string }>;
  readDocument(documentId: string): Promise<string>;
  updateDocument(documentId: string, text: string): Promise<void>;
  insertImage(
    documentId: string,
    imageUrl: string,
    index: number
  ): Promise<void>;
  insertLocalImage(
    documentId: string,
    filePath: string,
    index: number
  ): Promise<void>;
  formatText(
    documentId: string,
    startIndex: number,
    endIndex: number,
    formatting: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      foregroundColor?: { red: number; green: number; blue: number };
    }
  ): Promise<void>;
  insertTable(
    documentId: string,
    index: number,
    rows: number,
    columns: number,
    data: string[][],
    headerRow?: boolean
  ): Promise<void>;
  insertLink(
    documentId: string,
    index: number,
    text: string,
    url: string
  ): Promise<void>;
}
