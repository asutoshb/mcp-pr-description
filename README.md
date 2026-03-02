# mcp-pr-description

An MCP (Model Context Protocol) server that generates PR descriptions by learning from your team's merged PRs.

## Features

- **Learns your team's style** — Analyzes merged PRs to understand structure, tone, and patterns
- **Generates PRs in that style** — Uses git diff, branch name, and commits to create matching PRs
- **Saves to file** — Outputs `PR_DESCRIPTION.md` ready to copy-paste

## Installation

```bash
# Clone and build
git clone https://github.com/asutoshb/mcp-pr-description.git
cd mcp-pr-description
npm install
npm run build

# Or install globally
npm install -g mcp-pr-description
```

## Setup

### 1. Get a GitHub Token

Create a [GitHub Personal Access Token](https://github.com/settings/tokens) with `repo` scope.

### 2. Configure MCP

Add to your MCP config file:

**VS Code (Augment):** Settings → search "augment mcp" → Edit in settings.json
**Cursor:** `~/.cursor/mcp.json`
**Claude Desktop:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "pr-description": {
      "command": "npx",
      "args": ["mcp-pr-description"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

> **Note:** Using `npx` automatically resolves the package location. No need to specify a file path.

## Usage

In **Augment** or **Cursor**, simply ask:

```
"Generate PR description"
```

### Other Prompts You Can Use

```
"Write PR description"
"Create a PR for my changes"
"Generate PR for this branch"
"Write PR description comparing to develop"
"Generate PR description and save it"
```

> 💡 Use natural language — the AI understands variations of these prompts!

The AI will automatically:
1. Learn your team's PR style (from last 10 merged PRs)
2. Generate a PR title and description based on your current branch
3. Save it to `PR_DESCRIPTION.md`

## Tools

| Tool | Description |
|------|-------------|
| `learn_pr_style` | Analyze merged PRs and learn team patterns |
| `generate_pr` | Generate PR from current git diff |
| `save_pr_description` | Save PR to `PR_DESCRIPTION.md` |
| `get_pr_style` | Display learned style patterns |

## How It Works

1. **Learn** — Fetches your last 10 merged PRs via GitHub API
2. **Extract** — Identifies patterns: sections, tone, title format, ticket references
3. **Cache** — Saves style to `.pr-style.json` (commit this for team sharing)
4. **Generate** — Uses cached style + current git info to build PR prompt
5. **Save** — Writes final PR to `PR_DESCRIPTION.md`

## Default Template

For new repos with no merged PRs, the tool uses this default format:

```markdown
## 🎯 What
Brief description of the changes made.

## 🤔 Why
Reason for making these changes.

## 🔧 Changes
- Change 1
- Change 2

## 🧪 Testing
How the changes were tested.

## 🎫 Jira Ticket
[PROJ-XXX](https://your-org.atlassian.net/browse/PROJ-XXX)

## 📸 Screenshots
Add screenshots if applicable.

## 📝 Notes
Any additional context or notes (optional).
```

> 💡 Once you have merged PRs, run `learn_pr_style` to learn your team's actual format.

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
