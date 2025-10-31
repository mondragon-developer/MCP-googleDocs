# How to Create a Google Workspace MCP Server

> **Note:** This guide is for developers who want to learn how to build an MCP server from scratch. If you just want to **use** this MCP server, see [README.md](README.md) instead.

## What is an MCP Server?

A Model Context Protocol (MCP) server is a standardized way to extend Claude's capabilities by connecting it to external tools and data sources. This guide will walk you through creating a Google Workspace MCP server from the ground up, explaining the architecture and implementation details.

## Prerequisites

- Node.js (v18 or higher)
- TypeScript knowledge
- A Google Cloud Console account
- Basic understanding of OAuth2 authentication

## Step-by-Step Instructions

### Step 1: Project Setup

1. **Create a new project directory**
   ```bash
   mkdir google-workspace-mcp
   cd google-workspace-mcp
   ```

2. **Initialize a Node.js project**
   ```bash
   npm init -y
   ```

3. **Install required dependencies**
   ```bash
   npm install @modelcontextprotocol/sdk googleapis zod zod-to-json-schema
   npm install --save-dev typescript tsx @types/node
   ```

4. **Configure package.json**
   - Set `"type": "module"` for ES modules
   - Add scripts for building and running:
     ```json
     {
       "scripts": {
         "build": "tsc",
         "start": "node dist/index.js",
         "dev": "tsx src/index.ts",
         "auth": "tsx src/authenticate.ts"
       }
     }
     ```

5. **Create tsconfig.json**
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "ES2022",
       "moduleResolution": "node",
       "outDir": "./dist",
       "rootDir": "./src",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules"]
   }
   ```

### Step 2: Set Up Google Cloud Credentials

1. **Go to Google Cloud Console** (https://console.cloud.google.com)

2. **Create a new project** or select an existing one

3. **Enable APIs**
   - Google Docs API
   - Google Sheets API
   - Google Slides API
   - Google Drive API

4. **Create OAuth2 Credentials**
   - Navigate to "Credentials" → "Create Credentials" → "OAuth client ID"
   - Choose "Desktop application" as application type
   - Download the credentials file
   - Rename it to `credentials.json` and place it in your project root

### Step 3: Create the Project Structure

Create the following folder structure:
```
google-workspace-mcp/
├── src/
│   ├── interfaces/
│   │   ├── IGoogleAuth.ts
│   │   ├── IDocumentService.ts
│   │   ├── ISheetService.ts
│   │   └── ISlideService.ts
│   ├── services/
│   │   ├── GoogleAuthService.ts
│   │   ├── DocumentService.ts
│   │   ├── SheetService.ts
│   │   └── SlideService.ts
│   ├── tools/
│   │   └── index.ts
│   ├── authenticate.ts
│   └── index.ts
├── credentials.json (from Google Cloud)
├── package.json
└── tsconfig.json
```

### Step 4: Implement Authentication Service

**Purpose**: Handle Google OAuth2 authentication

**Key concepts**:
- Loads credentials from `credentials.json`
- Manages token storage in `token.json`
- Provides authenticated OAuth2 client to other services

**File**: `src/services/GoogleAuthService.ts`
- Define required OAuth2 scopes (docs, sheets, presentations, drive)
- Load credentials from file
- Generate and save access tokens
- Return authenticated OAuth2 client

### Step 5: Create Service Interfaces

**Purpose**: Define contracts for each service (SOLID principles - Dependency Inversion)

Create interfaces for:
- **IGoogleAuth**: Authentication methods
- **IDocumentService**: Google Docs operations
- **ISheetService**: Google Sheets operations
- **ISlideService**: Google Slides operations

### Step 6: Implement Service Classes

Each service should:
1. Accept an OAuth2Client via dependency injection
2. Initialize the respective Google API client
3. Implement methods for CRUD operations

**DocumentService** example operations:
- `createDocument(title)` - Create new document
- `readDocument(documentId)` - Read document content
- `updateDocument(documentId, text)` - Update document
- `insertImage(documentId, imageUrl, index)` - Insert image

**SheetService** example operations:
- `createSpreadsheet(title)` - Create new spreadsheet
- `readSheet(spreadsheetId, range)` - Read data from range
- `writeSheet(spreadsheetId, range, values)` - Write data to range

**SlideService** example operations:
- `createPresentation(title)` - Create new presentation
- `readPresentation(presentationId)` - Read presentation data
- `addSlide(presentationId)` - Add new slide
- `insertImageToSlide(presentationId, slideId, imageUrl)` - Insert image

### Step 7: Define MCP Tools

**Purpose**: Define the tools that will be available to Claude

**File**: `src/tools/index.ts`

For each tool, define:
1. **name**: Unique identifier (e.g., "create_document")
2. **description**: Clear explanation of what the tool does
3. **inputSchema**: Zod schema converted to JSON schema using `zodToJsonSchema`

Example:
```typescript
export const createDocumentTool = {
  name: 'create_document',
  description: 'Creates a new Google Document with the specified title',
  inputSchema: zodToJsonSchema(
    z.object({
      title: z.string().describe('The title for the new document'),
    })
  ),
};
```

### Step 8: Create the MCP Server

**File**: `src/index.ts`

The main MCP server class should:

1. **Initialize the Server**
   ```typescript
   import { Server } from "@modelcontextprotocol/sdk/server/index.js";

   this.server = new Server(
     { name: "google-workspace-mcp", version: "1.0.0" },
     { capabilities: { tools: {} } }
   );
   ```

2. **Set up Request Handlers**

   a. **ListTools Handler** - Returns all available tools
   ```typescript
   this.server.setRequestHandler(ListToolsRequestSchema, async () => {
     return {
       tools: [
         createDocumentTool,
         readDocumentTool,
         // ... other tools
       ],
     };
   });
   ```

   b. **CallTool Handler** - Executes tool requests
   ```typescript
   this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
     const { name, arguments: args } = request.params;

     // Route to appropriate service based on tool name
     switch (name) {
       case "create_document":
         const result = await this.documentService.createDocument(args.title);
         return {
           content: [{ type: "text", text: `Document created: ${result.documentId}` }]
         };
       // ... handle other tools
     }
   });
   ```

3. **Connect to Transport**
   ```typescript
   async run() {
     const transport = new StdioServerTransport();
     await this.server.connect(transport);
   }
   ```

### Step 9: Create Authentication Script

**File**: `src/authenticate.ts`

This is a standalone script to generate the `token.json` file:

1. Load credentials from `credentials.json`
2. Create OAuth2 client
3. Generate authorization URL
4. Prompt user to visit URL and enter code
5. Exchange code for tokens
6. Save tokens to `token.json`

**Run this ONCE before using the MCP server**:
```bash
npm run auth
```

### Step 10: Build and Test

1. **Build the TypeScript project**
   ```bash
   npm run build
   ```

2. **Run authentication** (first time only)
   ```bash
   npm run auth
   ```
   - Visit the authorization URL
   - Grant permissions
   - Paste the authorization code
   - `token.json` will be created

3. **Test the server locally**
   ```bash
   npm run dev
   ```

### Step 11: Configure Claude Code to Use Your MCP Server

1. **Add to Claude Code configuration**

   The MCP server configuration is typically in:
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

2. **Add your server**:
   ```json
   {
     "mcpServers": {
       "google-workspace": {
         "command": "node",
         "args": ["/absolute/path/to/google-workspace-mcp/dist/index.js"]
       }
     }
   }
   ```

3. **Restart Claude Code**

## Key Concepts Explained

### MCP Protocol
- **Server**: Your application that implements MCP protocol
- **Transport**: Communication method (stdio, HTTP, etc.)
- **Tools**: Functions Claude can call
- **Resources**: Data sources Claude can access (optional)

### Request Flow
1. Claude sends `ListTools` request → Server returns available tools
2. User asks Claude to perform an action → Claude identifies appropriate tool
3. Claude sends `CallTool` request with arguments
4. Server executes the tool and returns results
5. Claude presents results to user

### Authentication Flow
1. Run `authenticate.ts` script once
2. Script generates OAuth URL
3. User authorizes in browser
4. Token saved to `token.json`
5. MCP server reads `token.json` on startup
6. All API calls use the saved token

## Common Pitfalls to Avoid

1. **Forgetting to run authentication** - You must run `npm run auth` before the server will work
2. **Hardcoding credentials** - Always use `credentials.json` and `token.json`, never commit them to git
3. **Not handling errors** - Wrap API calls in try-catch blocks
4. **Mixing concerns** - Keep authentication, service logic, and MCP protocol handling separate
5. **Missing OAuth scopes** - Ensure all necessary scopes are included in the SCOPES array

## Best Practices

1. **Follow SOLID Principles**
   - Single Responsibility: Each service handles one API
   - Open/Closed: Easy to add new tools without modifying existing code
   - Dependency Inversion: Services depend on interfaces, not concrete implementations

2. **Use TypeScript** for type safety

3. **Validate inputs** using Zod schemas

4. **Provide clear tool descriptions** so Claude understands when to use each tool

5. **Return structured responses** with clear success/error messages

## Testing Your MCP Server

Create test cases for:
- Authentication flow
- Each tool operation
- Error handling
- Edge cases (empty documents, invalid IDs, etc.)

## Extending the Server

To add new functionality:
1. Create a new service class (e.g., `GmailService`)
2. Define its interface
3. Add tool definitions in `src/tools/index.ts`
4. Add tool handlers in the main server class
5. Register tools in the `ListTools` handler

## Resources

- MCP SDK Documentation: https://github.com/modelcontextprotocol/sdk
- Google APIs Node.js Client: https://github.com/googleapis/google-api-nodejs-client
- Google Cloud Console: https://console.cloud.google.com
- Zod Documentation: https://zod.dev

## Conclusion

You now have a complete Google Workspace MCP server that allows Claude to:
- Create, read, and update Google Docs
- Create and manipulate Google Sheets
- Create and manage Google Slides presentations

This server demonstrates the key concepts of building MCP servers: authentication, service architecture, tool definitions, and protocol handling. You can extend this pattern to integrate any external API or service with Claude.
