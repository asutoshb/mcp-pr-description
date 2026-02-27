#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { learnPRStyle } from './tools/learn-style.js';
import { generatePR, savePRDescription, getLearnedStyle } from './tools/generate-pr.js';

const TOOLS = [
  {
    name: 'learn_pr_style',
    description:
      'Learn PR writing style from merged pull requests. ' +
      'Analyzes structure, tone, formatting, and common patterns. ' +
      'Run once per repo. Saves to .pr-style.json',
    inputSchema: {
      type: 'object' as const,
      properties: {
        count: {
          type: 'number',
          description: 'Number of PRs to analyze (default: 10)',
          default: 10,
        },
      },
    },
  },
  {
    name: 'generate_pr',
    description:
      'Generate PR title and description from current git changes. ' +
      'Uses learned team style if available. ' +
      'Analyzes branch name, commits, and file changes.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        baseBranch: {
          type: 'string',
          description: 'Base branch to compare (default: main)',
          default: 'main',
        },
        includeDiff: {
          type: 'boolean',
          description: 'Include code diff in context (default: false)',
          default: false,
        },
      },
    },
  },
  {
    name: 'save_pr_description',
    description:
      'Save generated PR title and description to PR_DESCRIPTION.md file. ' +
      'Call this after generate_pr to save the output.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'PR title',
        },
        body: {
          type: 'string',
          description: 'PR description body (markdown)',
        },
      },
      required: ['title', 'body'],
    },
  },
  {
    name: 'get_pr_style',
    description: 'Show the learned PR style for this repository.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
];

const server = new Server(
  { name: 'mcp-pr-description', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case 'learn_pr_style': {
        const count = typeof args.count === 'number' ? args.count : 10;
        const result = await learnPRStyle(count);
        return {
          content: [{ type: 'text', text: result.displayText }],
          isError: !result.success,
        };
      }

      case 'generate_pr': {
        const baseBranch = typeof args.baseBranch === 'string' ? args.baseBranch : 'main';
        const includeDiff = typeof args.includeDiff === 'boolean' ? args.includeDiff : false;
        const result = await generatePR(baseBranch, includeDiff);
        
        if (!result.success) {
          return {
            content: [{ type: 'text', text: `❌ ${result.message}` }],
            isError: true,
          };
        }

        const prefix = result.hasLearnedStyle
          ? ''
          : '⚠️ No learned style. Run learn_pr_style first.\n\n';

        return {
          content: [{ type: 'text', text: prefix + (result.prompt || '') }],
          isError: false,
        };
      }

      case 'save_pr_description': {
        const title = typeof args.title === 'string' ? args.title : '';
        const body = typeof args.body === 'string' ? args.body : '';
        
        if (!title || !body) {
          return {
            content: [{ type: 'text', text: '❌ Title and body are required' }],
            isError: true,
          };
        }

        const result = await savePRDescription(title, body);
        return {
          content: [{ type: 'text', text: result.success ? `✅ ${result.message}` : `❌ ${result.message}` }],
          isError: !result.success,
        };
      }

      case 'get_pr_style': {
        const result = await getLearnedStyle();
        return {
          content: [{ type: 'text', text: result.displayText }],
          isError: !result.success,
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `Error: ${msg}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('mcp-pr-description server started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
