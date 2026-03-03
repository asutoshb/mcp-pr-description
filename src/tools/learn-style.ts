import { GitHubAdapter } from '../adapters/github.js';
import { extractStyleFromPRs } from '../utils/style-extractor.js';
import { saveCachedStyle, formatStyleForDisplay } from '../utils/style-cache.js';
import { getRepositoryRoot, getRemoteUrl } from '../utils/git.js';

export interface LearnStyleResult {
  success: boolean;
  message: string;
  displayText: string;
}

export async function learnPRStyle(count: number = 10, cwd?: string): Promise<LearnStyleResult> {
  try {
    const repoRoot = await getRepositoryRoot(cwd);
    const remoteUrl = await getRemoteUrl(cwd);
    
    const repoInfo = GitHubAdapter.parseRemoteUrl(remoteUrl);
    if (!repoInfo) {
      return {
        success: false,
        message: `Could not parse GitHub repository from: ${remoteUrl}`,
        displayText: '❌ Not a GitHub repository or invalid remote URL',
      };
    }

    if (!process.env.GITHUB_TOKEN) {
      return {
        success: false,
        message: 'GITHUB_TOKEN not set',
        displayText: '❌ GITHUB_TOKEN environment variable is required',
      };
    }

    const github = new GitHubAdapter();
    const { owner, repo } = repoInfo;
    
    const hasAccess = await github.verifyAccess(owner, repo);
    if (!hasAccess) {
      return {
        success: false,
        message: `No access to ${owner}/${repo}`,
        displayText: `❌ Cannot access ${owner}/${repo}. Check your GITHUB_TOKEN.`,
      };
    }

    const prs = await github.fetchMergedPRs(owner, repo, count);
    
    if (prs.length === 0) {
      return {
        success: false,
        message: 'No merged PRs found',
        displayText: '⚠️ No merged PRs found in repository',
      };
    }

    const style = extractStyleFromPRs(prs, owner, repo);
    await saveCachedStyle(repoRoot, style);

    return {
      success: true,
      message: `Learned from ${prs.length} PRs`,
      displayText: [
        `✅ Learned PR style from ${prs.length} merged PRs!`,
        '',
        formatStyleForDisplay(style),
        '',
        `📁 Saved to: ${repoRoot}/.pr-style.json`,
      ].join('\n'),
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: msg,
      displayText: `❌ Error: ${msg}`,
    };
  }
}
