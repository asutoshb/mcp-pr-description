# mcp-pr-description

An MCP (Model Context Protocol) server that generates PR descriptions by learning from your team's merged PRs.

## Features

- **Learns your team's style** — Analyzes merged PRs to understand structure, tone, and patterns
- **Generates PRs in that style** — Uses git diff, branch name, and commits to create matching PRs
- **Saves automatically** — When you ask to "generate PR description", the agent writes `PR_DESCRIPTION.md` in your repo (no separate save step)
- **Compare to main or upstream** — Optionally diff against the branch your current branch was cut from (`compareToUpstream`) for feature-branch PRs
- **Works with your workspace** — Uses MCP roots or `MCP_PR_WORKSPACE` so the server runs in the correct repo

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
        "GITHUB_TOKEN": "ghp_your_token_here",
        "MCP_PR_WORKSPACE": "/absolute/path/to/your/repo"
      }
    }
  }
}
```

- **GITHUB_TOKEN** — Required for `learn_pr_style` (GitHub API). Create a [token](https://github.com/settings/tokens) with `repo` scope.
- **MCP_PR_WORKSPACE** — Optional if your client sends [MCP roots](https://modelcontextprotocol.io/docs/concepts/roots). If you see `fatal: not a git repository`, set this to your repo path (e.g. `/Users/you/my-project`). Restart the client after changing the config.

> **Note:** Using `npx` automatically resolves the package location. No need to specify a file path.

## Usage

In **Cursor** or **Augment**, ask:

```
"Generate PR description"
```

The AI will **generate a title and description and save them to `PR_DESCRIPTION.md`** in one flow. You don’t need to ask to “save” separately.

### Other prompts

```
"Write PR description"
"Create a PR for my changes"
"Generate PR for this branch"
```

> 💡 Use natural language — the AI understands variations.

What happens when you ask:
1. **generate_pr** — Gets branch name, commits, and file changes (and optional diff). Uses learned style from `.pr-style.json` if present.
2. **AI composes** — Title and body in your team’s style.
3. **save_pr_description** — Writes `PR_DESCRIPTION.md` in your repo. The agent is instructed to always do this for “generate PR description” requests.

## Tools

| Tool | Description |
|------|-------------|
| `learn_pr_style` | Analyze merged PRs and learn team patterns. Saves to `.pr-style.json`. Run once per repo (or when style changes). |
| `generate_pr` | Get PR context (branch, commits, files). Agent then composes title/body and calls `save_pr_description`. Options: `baseBranch` (default `main`), `includeDiff`, `compareToUpstream` (diff vs branch this was cut from). |
| `save_pr_description` | Save title + body to `PR_DESCRIPTION.md`. Called by the agent after `generate_pr`. |
| `get_pr_style` | Show the learned PR style for this repo. |

### generate_pr options

| Option | Default | Description |
|--------|--------|-------------|
| `baseBranch` | `main` | Base branch to compare against (for diff and commits). |
| `includeDiff` | `false` | If `true`, include the full code diff in the context (larger prompt). |
| `compareToUpstream` | `false` | If `true`, compare against the **upstream** of the current branch (the branch it was cut from). Falls back to `baseBranch` if no upstream is set. Use when opening a PR into a feature branch rather than `main`. |

## How It Works

1. **Learn** — `learn_pr_style` fetches your last 10 merged PRs via GitHub API and extracts structure, tone, and patterns.
2. **Cache** — Saves to `.pr-style.json` in the repo (commit it for team sharing).
3. **Generate** — When you ask for a PR description, the agent calls `generate_pr` (with optional `compareToUpstream`), gets branch/commits/files (and optionally diff), then composes title and body using the cached style or the default template.
4. **Save** — The agent calls `save_pr_description` with that title and body, writing `PR_DESCRIPTION.md` in your repo.

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
