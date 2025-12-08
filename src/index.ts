#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Import services
import { GoogleAuthService } from "./services/GoogleAuthService.js";
import { DocumentService } from "./services/DocumentService.js";
import { SheetService } from "./services/SheetService.js";
import { SlideService } from "./services/SlideService.js";

// Import tool definitions
import * as tools from "./tools/index.js";

// Import types
import { TextFormatting, CellFormatting, RGBColor } from "./utils/FormattingHelper.js";

/**
 * Main MCP Server
 * DIP: Depends on interfaces (IDocumentService, etc.), not concrete implementations
 */
class GoogleWorkspaceMCPServer {
  private server: Server;
  private authService: GoogleAuthService;
  private documentService: DocumentService | null = null;
  private sheetService: SheetService | null = null;
  private slideService: SlideService | null = null;

  constructor() {
    this.server = new Server(
      {
        name: "google-workspace-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.authService = new GoogleAuthService();
    this.setupHandlers();
  }

  /**
   * Initialize services with authentication
   * Lazy initialization - only create services when needed
   */
  private async initializeServices(): Promise<void> {
    if (this.documentService) {
      return; // Already initialized
    }

    const authClient = await this.authService.getAuthenticatedClient();
    this.documentService = new DocumentService(authClient);
    this.sheetService = new SheetService(authClient);
    this.slideService = new SlideService(authClient);
  }

  /**
   * Ensures services are initialized before use
   * Throws clear error if services are not available
   * After this check, services are guaranteed to be non-null (! is safe to use)
   */
  private ensureServicesInitialized(): void {
    if (!this.documentService || !this.sheetService || !this.slideService) {
      throw new Error('Services not initialized. This should not happen.');
    }
  }

  /**
   * Setup MCP protocol handlers
   * Handles: listing tools and executing tools
   */
  private setupHandlers() {
    // Handler: List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Document tools
          tools.createDocumentTool,
          tools.readDocumentTool,
          tools.updateDocumentTool,
          tools.insertImageToDocTool,
          tools.insertLocalImageToDocTool,
          tools.formatTextInDocTool,
          tools.insertTableToDocTool,
          // Sheet tools
          tools.createSpreadsheetTool,
          tools.readSheetTool,
          tools.writeSheetTool,
          tools.formatCellsTool,
          // Slide tools
          tools.createPresentationTool,
          tools.readPresentationTool,
          tools.addSlideTool,
          tools.addTextToSlideTool,
          tools.insertImageToSlideTool,
          tools.insertLocalImageToSlideTool,
          tools.formatTextInSlideTool,
        ],
      };
    });

    // Handler: Execute a tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        // Initialize services if not already done
        await this.initializeServices();
        this.ensureServicesInitialized();

        const { name, arguments: args } = request.params;

        // Type guard: ensure args exists
        if (!args) {
          throw new Error("No arguments provided");
        }

        // Route to appropriate service based on tool name
        switch (name) {
          // ========== DOCUMENT OPERATIONS ==========
          case "create_document": {
            const { title } = args as { title: string };
            // Safe: ensureServicesInitialized guarantees non-null
            const result = await this.documentService!.createDocument(title);
            return {
              content: [
                {
                  type: "text",
                  text: `Document created successfully!\nDocument ID: ${result.documentId}\nTitle: ${result.title}\nURL: https://docs.google.com/document/d/${result.documentId}/edit`,
                },
              ],
            };
          }

          case "read_document": {
            const { documentId } = args as { documentId: string };
            // Safe: ensureServicesInitialized guarantees non-null
            const content = await this.documentService!.readDocument(
              documentId
            );
            return {
              content: [
                {
                  type: "text",
                  text: `Document Content:\n\n${content}`,
                },
              ],
            };
          }

          case "update_document": {
            const { documentId, text } = args as {
              documentId: string;
              text: string;
            };
            await this.documentService!.updateDocument(documentId, text);
            return {
              content: [
                {
                  type: "text",
                  text: `Document updated successfully!\nURL: https://docs.google.com/document/d/${documentId}/edit`,
                },
              ],
            };
          }

          case "insert_image_to_doc": {
            const { documentId, imageUrl, index } = args as {
              documentId: string;
              imageUrl: string;
              index: number;
            };
            await this.documentService!.insertImage(
              documentId,
              imageUrl,
              index
            );
            return {
              content: [
                {
                  type: "text",
                  text: "Image inserted successfully into document!",
                },
              ],
            };
          }

          case "insert_local_image_to_doc": {
            const { documentId, filePath, index } = args as {
              documentId: string;
              filePath: string;
              index: number;
            };
            await this.documentService!.insertLocalImage(
              documentId,
              filePath,
              index
            );
            return {
              content: [
                {
                  type: "text",
                  text: "Local image uploaded and inserted successfully into document!",
                },
              ],
            };
          }

          case "format_text_in_doc": {
            const { documentId, startIndex, endIndex, bold, italic, underline, foregroundColor } = args as {
              documentId: string;
              startIndex: number;
              endIndex: number;
              bold?: boolean;
              italic?: boolean;
              underline?: boolean;
              foregroundColor?: RGBColor;
            };
            const formatting: TextFormatting = {
              bold,
              italic,
              underline,
              foregroundColor,
            };

            await this.documentService!.formatText(
              documentId,
              startIndex,
              endIndex,
              formatting
            );
            return {
              content: [
                {
                  type: "text",
                  text: "Text formatted successfully in document!",
                },
              ],
            };
          }

          case "insert_table_to_doc": {
            const { documentId, index, rows, columns, data, headerRow } = args as {
              documentId: string;
              index: number;
              rows: number;
              columns: number;
              data: string[][];
              headerRow?: boolean;
            };
            await this.documentService!.insertTable(
              documentId,
              index,
              rows,
              columns,
              data,
              headerRow
            );
            return {
              content: [
                {
                  type: "text",
                  text: `Table inserted successfully!\nRows: ${rows}, Columns: ${columns}${headerRow ? ' (with header formatting)' : ''}\nURL: https://docs.google.com/document/d/${documentId}/edit`,
                },
              ],
            };
          }

          // ========== SHEET OPERATIONS ==========
          case "create_spreadsheet": {
            const { title } = args as { title: string };
            const result = await this.sheetService!.createSpreadsheet(title);
            return {
              content: [
                {
                  type: "text",
                  text: `Spreadsheet created successfully!\nSpreadsheet ID: ${result.spreadsheetId}\nTitle: ${result.title}\nURL: https://docs.google.com/spreadsheets/d/${result.spreadsheetId}/edit`,
                },
              ],
            };
          }

          case "read_sheet": {
            const { spreadsheetId, range } = args as {
              spreadsheetId: string;
              range: string;
            };
            const data = await this.sheetService!.readSheet(
              spreadsheetId,
              range
            );
            return {
              content: [
                {
                  type: "text",
                  text: `Sheet Data:\n\n${JSON.stringify(data, null, 2)}`,
                },
              ],
            };
          }

          case "write_sheet": {
            const { spreadsheetId, range, values } = args as {
              spreadsheetId: string;
              range: string;
              values: any[][];
            };
            await this.sheetService!.writeSheet(spreadsheetId, range, values);
            return {
              content: [
                {
                  type: "text",
                  text: "Data written to sheet successfully!",
                },
              ],
            };
          }

          case "format_cells": {
            const { spreadsheetId, range, bold, italic, underline, foregroundColor, backgroundColor } = args as {
              spreadsheetId: string;
              range: string;
              bold?: boolean;
              italic?: boolean;
              underline?: boolean;
              foregroundColor?: RGBColor;
              backgroundColor?: RGBColor;
            };
            const formatting: CellFormatting = {
              bold,
              italic,
              underline,
              foregroundColor,
              backgroundColor,
            };

            await this.sheetService!.formatCells(
              spreadsheetId,
              range,
              formatting
            );
            return {
              content: [
                {
                  type: "text",
                  text: "Cells formatted successfully!",
                },
              ],
            };
          }

          // ========== SLIDE OPERATIONS ==========
          case "create_presentation": {
            const { title } = args as { title: string };
            const result = await this.slideService!.createPresentation(title);
            return {
              content: [
                {
                  type: "text",
                  text: `Presentation created successfully!\nPresentation ID: ${result.presentationId}\nTitle: ${result.title}\nURL: https://docs.google.com/presentation/d/${result.presentationId}/edit`,
                },
              ],
            };
          }

          case "read_presentation": {
            const { presentationId } = args as { presentationId: string };
            const data = await this.slideService!.readPresentation(
              presentationId
            );
            return {
              content: [
                {
                  type: "text",
                  text: `Presentation Data:\n\n${JSON.stringify(
                    data,
                    null,
                    2
                  )}`,
                },
              ],
            };
          }

          case "add_slide": {
            const { presentationId } = args as { presentationId: string };
            const slideId = await this.slideService!.addSlide(presentationId);
            return {
              content: [
                {
                  type: "text",
                  text: `Slide added successfully!\nSlide ID: ${slideId}`,
                },
              ],
            };
          }

          case "add_text_to_slide": {
            const { presentationId, slideId, text } = args as {
              presentationId: string;
              slideId: string;
              text: string;
            };
            await this.slideService!.addTextToSlide(
              presentationId,
              slideId,
              text
            );
            return {
              content: [
                {
                  type: "text",
                  text: "Text added successfully to slide!",
                },
              ],
            };
          }

          case "insert_image_to_slide": {
            const { presentationId, slideId, imageUrl } = args as {
              presentationId: string;
              slideId: string;
              imageUrl: string;
            };
            await this.slideService!.insertImageToSlide(
              presentationId,
              slideId,
              imageUrl
            );
            return {
              content: [
                {
                  type: "text",
                  text: "Image inserted successfully into slide!",
                },
              ],
            };
          }

          case "insert_local_image_to_slide": {
            const { presentationId, slideId, filePath } = args as {
              presentationId: string;
              slideId: string;
              filePath: string;
            };
            await this.slideService!.insertLocalImageToSlide(
              presentationId,
              slideId,
              filePath
            );
            return {
              content: [
                {
                  type: "text",
                  text: "Local image uploaded and inserted successfully into slide!",
                },
              ],
            };
          }

          case "format_text_in_slide": {
            const { presentationId, objectId, startIndex, endIndex, bold, italic, underline, foregroundColor } = args as {
              presentationId: string;
              objectId: string;
              startIndex: number;
              endIndex: number;
              bold?: boolean;
              italic?: boolean;
              underline?: boolean;
              foregroundColor?: RGBColor;
            };
            const formatting: TextFormatting = {
              bold,
              italic,
              underline,
              foregroundColor,
            };

            await this.slideService!.formatTextInSlide(
              presentationId,
              objectId,
              startIndex,
              endIndex,
              formatting
            );
            return {
              content: [
                {
                  type: "text",
                  text: "Text formatted successfully in slide!",
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Start the MCP server
   */
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Google Workspace MCP Server running on stdio");
  }
}

// Start the server
const server = new GoogleWorkspaceMCPServer();
server.run().catch(console.error);
