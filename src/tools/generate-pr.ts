import { getGitInfo, getChangeSummary, getRepositoryRoot } from '../utils/git.js';
import { loadCachedStyle, formatStyleForDisplay } from '../utils/style-cache.js';
import { writePRDescriptionFile } from '../utils/file-writer.js';
import type { LearnedStyle } from '../types.js';

export interface GeneratePRResult {
  success: boolean;
  prompt?: string;
  filePath?: string;
  message: string;
  hasLearnedStyle: boolean;
}

export async function generatePR(
  baseBranch: string = 'main',
  includeDiff: boolean = false,
  _writeFile: boolean = true,
  cwd?: string,
  compareToUpstream?: boolean
): Promise<GeneratePRResult> {
  try {
    const repoRoot = await getRepositoryRoot(cwd);
    const gitInfo = await getGitInfo(cwd, baseBranch, compareToUpstream);
    const changeSummary = await getChangeSummary(cwd, baseBranch, compareToUpstream);
    const cachedStyle = await loadCachedStyle(repoRoot);

    const prompt = buildPrompt(gitInfo, changeSummary, cachedStyle, includeDiff);

    return {
      success: true,
      prompt,
      message: 'PR context ready',
      hasLearnedStyle: cachedStyle !== null,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: msg,
      hasLearnedStyle: false,
    };
  }
}

export async function savePRDescription(title: string, body: string, cwd?: string): Promise<{
  success: boolean;
  filePath?: string;
  message: string;
}> {
  try {
    const repoRoot = await getRepositoryRoot(cwd);
    const filePath = await writePRDescriptionFile(repoRoot, title, body);
    return {
      success: true,
      filePath,
      message: `PR description saved to ${filePath}`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to save: ${msg}`,
    };
  }
}

function buildPrompt(
  gitInfo: { branchName: string; diff: string; commitMessages: string[] },
  changeSummary: string,
  style: LearnedStyle | null,
  includeDiff: boolean
): string {
  const sections: string[] = [
    'Generate a pull request title and description based on the following.',
    '',
  ];

  if (style) {
    sections.push('## Team PR Style (FOLLOW THIS EXACTLY)');
    sections.push('');
    sections.push(formatStyleForDisplay(style));
    sections.push('');
  } else {
    sections.push('## Default PR Template (no learned style found)');
    sections.push('');
    sections.push('Use this format for the PR description:');
    sections.push('');
    sections.push('```markdown');
    sections.push('## 🎯 What');
    sections.push('Brief description of the changes made.');
    sections.push('');
    sections.push('## 🤔 Why');
    sections.push('Reason for making these changes.');
    sections.push('');
    sections.push('## 🔧 Changes');
    sections.push('- Change 1');
    sections.push('- Change 2');
    sections.push('');
    sections.push('## 🧪 Testing');
    sections.push('How the changes were tested.');
    sections.push('');
    sections.push('## 🎫 Jira Ticket');
    sections.push('[PROJ-XXX](https://your-org.atlassian.net/browse/PROJ-XXX)');
    sections.push('');
    sections.push('## 📸 Screenshots');
    sections.push('Add screenshots if applicable.');
    sections.push('');
    sections.push('## 📝 Notes');
    sections.push('Any additional context or notes (optional).');
    sections.push('```');
    sections.push('');
    sections.push('> 💡 Tip: Run `learn_pr_style` to learn your team\'s PR format from merged PRs.');
    sections.push('');
  }

  sections.push(`## Branch: \`${gitInfo.branchName}\``);
  sections.push('');

  if (gitInfo.commitMessages.length > 0) {
    sections.push('## Commits');
    gitInfo.commitMessages.forEach(m => sections.push(`- ${m}`));
    sections.push('');
  }

  sections.push('## Files Changed');
  sections.push('```');
  sections.push(changeSummary);
  sections.push('```');
  sections.push('');

  if (includeDiff && gitInfo.diff) {
    const maxLen = 6000;
    const diff = gitInfo.diff.length > maxLen 
      ? gitInfo.diff.slice(0, maxLen) + '\n... (truncated)'
      : gitInfo.diff;
    sections.push('## Diff');
    sections.push('```diff');
    sections.push(diff);
    sections.push('```');
    sections.push('');
  }

  sections.push('## Instructions');
  sections.push('1. Generate a **title** (concise) and **description** (full body with sections above).');
  sections.push('2. **You MUST then call `save_pr_description`** with that title and body so the PR is saved to PR_DESCRIPTION.md.');
  sections.push('   Do not respond to the user without calling save_pr_description—the user asked for a PR description and expects a saved file.');
  sections.push('');

  return sections.join('\n');
}

export async function getLearnedStyle(cwd?: string): Promise<{
  success: boolean;
  displayText: string;
}> {
  try {
    const repoRoot = await getRepositoryRoot(cwd);
    const style = await loadCachedStyle(repoRoot);

    if (!style) {
      return {
        success: false,
        displayText: '❌ No learned style. Run `learn_pr_style` first.',
      };
    }

    return {
      success: true,
      displayText: formatStyleForDisplay(style),
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      displayText: `❌ Error: ${msg}`,
    };
  }
}
