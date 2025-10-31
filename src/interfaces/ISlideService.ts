 /**
 * Interface for Google Slides operations
 */
export interface ISlideService {
  createPresentation(title: string): Promise<{ presentationId: string; title: string }>;
  readPresentation(presentationId: string): Promise<any>;
  addSlide(presentationId: string): Promise<string>;
  addTextToSlide(presentationId: string, slideId: string, text: string): Promise<void>;
  insertImageToSlide(presentationId: string, slideId: string, imageUrl: string): Promise<void>;
  insertLocalImageToSlide(presentationId: string, slideId: string, filePath: string): Promise<void>;
  formatTextInSlide(
    presentationId: string,
    objectId: string,
    startIndex: number,
    endIndex: number,
    formatting: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      foregroundColor?: { red: number; green: number; blue: number };
    }
  ): Promise<void>;
}
