# mcp-pr-description

An MCP (Model Context Protocol) server that generates PR descriptions by learning from your team's merged PRs.

## Features

- **Learns your team's style** — Analyzes merged PRs to understand structure, tone, and patterns
- **Generates PRs in that style** — Uses git diff, branch name, and commits to create matching PRs
- **Saves to file** — Outputs `PR_DESCRIPTION.md` ready to copy-paste

## Installation

```bash
# Clone and build
git clone <repo-url>
cd mcp-pr-description
npm install
npm run build

# Or install globally (after publishing)
npm install -g mcp-pr-description
```

## Setup

### 1. Get a GitHub Token

Create a [GitHub Personal Access Token](https://github.com/settings/tokens) with `repo` scope.

### 2. Configure MCP

Add to your MCP config file:

**VS Code (Augment/Claude extension):** `~/.vscode/mcp.json`
**Cursor:** `~/.cursor/mcp.json`  
**Claude Desktop:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "pr-description": {
      "command": "node",
      "args": ["/path/to/mcp-pr-description/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

## Usage

In your AI assistant, use natural language:

```
"Learn our team's PR style"
→ Analyzes last 20 merged PRs, saves patterns to .pr-style.json

"Generate a PR for my changes"
→ Creates PR title + description based on your git changes

"Save the PR description"
→ Writes PR_DESCRIPTION.md to your repo root
```

## Tools

| Tool | Description |
|------|-------------|
| `learn_pr_style` | Analyze merged PRs and learn team patterns |
| `generate_pr` | Generate PR from current git diff |
| `save_pr_description` | Save PR to `PR_DESCRIPTION.md` |
| `get_pr_style` | Display learned style patterns |

## How It Works

1. **Learn** — Fetches your last N merged PRs via GitHub API
2. **Extract** — Identifies patterns: sections, tone, title format, ticket references
3. **Cache** — Saves style to `.pr-style.json` (commit this for team sharing)
4. **Generate** — Uses cached style + current git info to build PR prompt
5. **Save** — Writes final PR to `PR_DESCRIPTION.md`

## Output Files

- `.pr-style.json` — Cached team style (add to repo for team sharing)
- `PR_DESCRIPTION.md` — Generated PR description (copy to GitHub)

## Development

```bash
npm run dev      # Watch mode
npm run build    # Build for production
npm start        # Run server
```

## License

MIT
