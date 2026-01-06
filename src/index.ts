#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { BlueskyClient } from './client.js';
import { postingTools } from './tools/posting.js';
import { feedTools } from './tools/feeds.js';
import { searchTools } from './tools/search.js';
import { engagementTools } from './tools/engagement.js';

dotenv.config();

const BLUESKY_HANDLE = process.env.BLUESKY_HANDLE;
const BLUESKY_APP_PASSWORD = process.env.BLUESKY_APP_PASSWORD;

if (!BLUESKY_HANDLE || !BLUESKY_APP_PASSWORD) {
  console.error(
    'Error: BLUESKY_HANDLE and BLUESKY_APP_PASSWORD environment variables are required'
  );
  console.error(
    'Please set them in your .env file or environment before running the server'
  );
  process.exit(1);
}

const client = new BlueskyClient({
  handle: BLUESKY_HANDLE,
  appPassword: BLUESKY_APP_PASSWORD,
});

// Login to Bluesky
await client.login(BLUESKY_APP_PASSWORD);

const allTools = {
  ...postingTools,
  ...feedTools,
  ...searchTools,
  ...engagementTools,
};

const server = new Server(
  {
    name: 'bluesky-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Object.entries(allTools).map(([name, tool]) => ({
      name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const tool = allTools[toolName as keyof typeof allTools];

  if (!tool) {
    return {
      content: [
        {
          type: 'text',
          text: `Unknown tool: ${toolName}`,
        },
      ],
      isError: true,
    };
  }

  try {
    const result = await tool.handler(request.params.arguments as any || {}, client);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${toolName}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Bluesky MCP Server running on stdio');
}

runServer().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});
