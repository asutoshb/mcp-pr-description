#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { learnPRStyle } from './tools/learn-style.js';
import { generatePR, savePRDescription, getLearnedStyle } from './tools/generate-pr.js';

const NOT_A_GIT_REPO_HINT =
  '\n\n→ Fix: The MCP server runs outside your repo. In your MCP config (e.g. ~/.cursor/mcp.json), add to this server\'s "env":\n  "MCP_PR_WORKSPACE": "/absolute/path/to/your/repo"\nReplace with your actual repo path (e.g. the folder that contains .git). See README.';

function fallbackCwd(cwdFromArgs?: string): string {
  if (cwdFromArgs && cwdFromArgs.trim()) return cwdFromArgs.trim();
  const env =
    process.env.MCP_PR_WORKSPACE ||
    process.env.CURSOR_WORKSPACE_DIR ||
    process.env.WORKSPACE_FOLDER;
  return env?.trim() || process.cwd();
}

async function resolveWorkspaceCwd(
  server: Server,
  cwdFromArgs?: string
): Promise<string> {
  try {
    const { roots } = await server.listRoots();
    const first = roots?.[0]?.uri;
    if (first && first.startsWith('file://')) {
      return fileURLToPath(first);
    }
  } catch {
    /* client may not support roots/list */
  }
  return fallbackCwd(cwdFromArgs);
}

function addHintIfNotGitRepo(message: string): string {
  if (/not a git repository/i.test(message)) {
    return message + NOT_A_GIT_REPO_HINT;
  }
  return message;
}

const TOOLS = [
  {
    name: 'learn_pr_style',
    description:
      'Learn PR writing style from merged pull requests. ' +
      'Analyzes structure, tone, formatting, and common patterns. ' +
      'Run once per repo. Saves to .pr-style.json. ' +
      'Call this BEFORE generate_pr for best results, or skip for new repos (default template will be used).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        count: {
          type: 'number',
          description: 'Number of PRs to analyze (default: 10)',
          default: 10,
        },
        cwd: {
          type: 'string',
          description: 'Optional: absolute path to repo root. Usually not needed if MCP_PR_WORKSPACE is set or client sends roots.',
        },
      },
    },
  },
  {
    name: 'generate_pr',
    description:
      'Generate PR title and description from current git changes, then save to file. ' +
      'Returns context (branch, commits, files). You MUST compose a title and body from it, then call save_pr_description with that title and body so the user gets PR_DESCRIPTION.md. ' +
      'Do not reply to the user with the PR content without calling save_pr_description first—saving is required for "generate PR description" requests.',
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
        compareToUpstream: {
          type: 'boolean',
          description:
            'If true, compare against the current branch\'s upstream (the branch it was cut from). Falls back to baseBranch/main when no upstream is set.',
          default: false,
        },
        cwd: {
          type: 'string',
          description: 'Optional: absolute path to repo root. Usually not needed if MCP_PR_WORKSPACE is set or client sends roots.',
        },
      },
    },
  },
  {
    name: 'save_pr_description',
    description:
      'Save PR title and description to PR_DESCRIPTION.md. ' +
      'Call this after generate_pr with the title and body you composed—required to complete a "generate PR description" request.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'PR title' },
        body: { type: 'string', description: 'PR description body (markdown)' },
        cwd: {
          type: 'string',
          description: 'Optional: absolute path to repo root.',
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
      properties: {
        cwd: { type: 'string', description: 'Optional: absolute path to repo root.' },
      },
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
        const cwd = await resolveWorkspaceCwd(server, typeof args.cwd === 'string' ? args.cwd : undefined);
        const result = await learnPRStyle(count, cwd);
        const text = result.success ? result.displayText : addHintIfNotGitRepo(result.displayText);
        return {
          content: [{ type: 'text', text }],
          isError: !result.success,
        };
      }

      case 'generate_pr': {
        const baseBranch = typeof args.baseBranch === 'string' ? args.baseBranch : 'main';
        const includeDiff = typeof args.includeDiff === 'boolean' ? args.includeDiff : false;
        const compareToUpstream =
          typeof args.compareToUpstream === 'boolean' ? args.compareToUpstream : false;
        const cwd = await resolveWorkspaceCwd(server, typeof args.cwd === 'string' ? args.cwd : undefined);
        const result = await generatePR(baseBranch, includeDiff, true, cwd, compareToUpstream);

        if (!result.success) {
          return {
            content: [{ type: 'text', text: `❌ ${addHintIfNotGitRepo(result.message)}` }],
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
        const cwd = await resolveWorkspaceCwd(server, typeof args.cwd === 'string' ? args.cwd : undefined);
        const result = await savePRDescription(title, body, cwd);
        const msg = result.success ? result.message : addHintIfNotGitRepo(result.message);
        return {
          content: [{ type: 'text', text: result.success ? `✅ ${msg}` : `❌ ${msg}` }],
          isError: !result.success,
        };
      }

      case 'get_pr_style': {
        const cwd = await resolveWorkspaceCwd(server, typeof args.cwd === 'string' ? args.cwd : undefined);
        const result = await getLearnedStyle(cwd);
        const text = result.success ? result.displayText : addHintIfNotGitRepo(result.displayText);
        return {
          content: [{ type: 'text', text }],
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
