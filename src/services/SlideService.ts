import { google } from 'googleapis';
import { OAuth2Client } from 'googleapis-common';
import { ISlideService } from '../interfaces/ISlideService.js';

/**
 * SlideService: Responsible ONLY for Google Slides operations
 * SRP: Handles presentation operations
 */
export class SlideService implements ISlideService {
  private readonly slides;

  constructor(private authClient: OAuth2Client) {
    this.slides = google.slides({ version: 'v1', auth: authClient });
  }

  /**
   * Creates a new Google Slides presentation
   * @param title - The title for the new presentation
   * @returns Object with presentationId and title
   */
  async createPresentation(title: string): Promise<{ presentationId: string; title: string }> {
    try {
      const response = await this.slides.presentations.create({
        requestBody: {
          title: title,
        },
      });

      return {
        presentationId: response.data.presentationId!,
        title: response.data.title!,
      };
    } catch (error) {
      throw new Error(`Failed to create presentation: ${error}`);
    }
  }

  /**
   * Reads presentation metadata and structure
   * @param presentationId - The ID of the presentation
   * @returns Full presentation object with slides and layout info
   */
  async readPresentation(presentationId: string): Promise<any> {
    try {
      const response = await this.slides.presentations.get({
        presentationId: presentationId,
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to read presentation: ${error}`);
    }
  }

  /**
   * Adds a new blank slide to the presentation
   * @param presentationId - The ID of the presentation
   * @returns The ID of the newly created slide
   */
  async addSlide(presentationId: string): Promise<string> {
    try {
      // Generate unique ID for the new slide
      const slideId = `slide_${Date.now()}`;

      await this.slides.presentations.batchUpdate({
        presentationId: presentationId,
        requestBody: {
          requests: [
            {
              createSlide: {
                objectId: slideId,
                slideLayoutReference: {
                  predefinedLayout: 'BLANK', // Other options: TITLE, TITLE_AND_BODY, etc.
                },
              },
            },
          ],
        },
      });

      return slideId;
    } catch (error) {
      throw new Error(`Failed to add slide: ${error}`);
    }
  }

  /**
   * Adds text to a specific slide
   * @param presentationId - The ID of the presentation
   * @param slideId - The ID of the slide to add text to
   * @param text - The text content to add
   */
  async addTextToSlide(
    presentationId: string,
    slideId: string,
    text: string
  ): Promise<void> {
    try {
      // Generate unique ID for the text box
      const textBoxId = `textbox_${Date.now()}`;

      await this.slides.presentations.batchUpdate({
        presentationId: presentationId,
        requestBody: {
          requests: [
            {
              createShape: {
                objectId: textBoxId,
                shapeType: 'TEXT_BOX',
                elementProperties: {
                  pageObjectId: slideId,
                  size: {
                    height: { magnitude: 3000000, unit: 'EMU' },
                    width: { magnitude: 6000000, unit: 'EMU' },
                  },
                  transform: {
                    scaleX: 1,
                    scaleY: 1,
                    translateX: 500000,
                    translateY: 500000,
                    unit: 'EMU',
                  },
                },
              },
            },
            {
              insertText: {
                objectId: textBoxId,
                text: text,
              },
            },
          ],
        },
      });
    } catch (error) {
      throw new Error(`Failed to add text to slide: ${error}`);
    }
  }

  /**
   * Inserts an image into a specific slide
   * @param presentationId - The ID of the presentation
   * @param slideId - The ID of the slide to add the image to
   * @param imageUrl - Public URL of the image
   */
  async insertImageToSlide(
    presentationId: string,
    slideId: string,
    imageUrl: string
  ): Promise<void> {
    try {
      // Generate unique ID for the image
      const imageId = `image_${Date.now()}`;

      await this.slides.presentations.batchUpdate({
        presentationId: presentationId,
        requestBody: {
          requests: [
            {
              createImage: {
                objectId: imageId,
                url: imageUrl,
                elementProperties: {
                  pageObjectId: slideId,
                  size: {
                    height: { magnitude: 3000000, unit: 'EMU' }, // EMU = English Metric Units
                    width: { magnitude: 4000000, unit: 'EMU' },
                  },
                  transform: {
                    scaleX: 1,
                    scaleY: 1,
                    translateX: 1000000,
                    translateY: 1000000,
                    unit: 'EMU',
                  },
                },
              },
            },
          ],
        },
      });
    } catch (error) {
      throw new Error(`Failed to insert image to slide: ${error}`);
    }
  }

  /**
   * Inserts a local image file into a slide by uploading to Drive first
   * @param presentationId - The ID of the presentation
   * @param slideId - The ID of the slide
   * @param filePath - Local file path to the image
   */
  async insertLocalImageToSlide(
    presentationId: string,
    slideId: string,
    filePath: string
  ): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const drive = google.drive({ version: 'v3', auth: this.authClient });

      // Read the file
      const fileBuffer = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);

      // Upload to Drive
      const driveResponse = await drive.files.create({
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
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      // Get the public URL
      const imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

      // Insert the image using the existing method
      await this.insertImageToSlide(presentationId, slideId, imageUrl);
    } catch (error) {
      throw new Error(`Failed to insert local image to slide: ${error}`);
    }
  }

  /**
   * Formats text in a slide text box (bold, italic, underline, color)
   * @param presentationId - The ID of the presentation
   * @param objectId - The ID of the text box/shape containing the text
   * @param startIndex - Start position of text to format
   * @param endIndex - End position of text to format
   * @param formatting - Formatting options (bold, italic, underline, foregroundColor)
   */
  async formatTextInSlide(
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
          opaqueColor: {
            rgbColor: formatting.foregroundColor,
          },
        };
        fields.push('foregroundColor');
      }

      // Create the update request
      requests.push({
        updateTextStyle: {
          objectId: objectId,
          textRange: {
            type: 'FIXED_RANGE',
            startIndex: startIndex,
            endIndex: endIndex,
          },
          style: textStyle,
          fields: fields.join(','),
        },
      });

      await this.slides.presentations.batchUpdate({
        presentationId: presentationId,
        requestBody: {
          requests: requests,
        },
      });
    } catch (error) {
      throw new Error(`Failed to format text in slide: ${error}`);
    }
  }
}