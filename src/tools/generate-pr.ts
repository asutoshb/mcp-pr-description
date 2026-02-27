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
  writeFile: boolean = true
): Promise<GeneratePRResult> {
  try {
    const repoRoot = await getRepositoryRoot();
    const gitInfo = await getGitInfo(undefined, baseBranch);
    const changeSummary = await getChangeSummary(undefined, baseBranch);
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

export async function savePRDescription(title: string, body: string): Promise<{
  success: boolean;
  filePath?: string;
  message: string;
}> {
  try {
    const repoRoot = await getRepositoryRoot();
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
    sections.push('## Note: No learned style found. Run `learn_pr_style` first for better results.');
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
  sections.push('Generate:');
  sections.push('1. **Title** - concise, following team style if available');
  sections.push('2. **Description** - full PR body with appropriate sections');
  sections.push('');
  sections.push('After generating, call `save_pr_description` to save as PR_DESCRIPTION.md');

  return sections.join('\n');
}

export async function getLearnedStyle(): Promise<{
  success: boolean;
  displayText: string;
}> {
  try {
    const repoRoot = await getRepositoryRoot();
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
