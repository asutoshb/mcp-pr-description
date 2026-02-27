import { Octokit } from '@octokit/rest';
import type { PRData } from '../types.js';

export class GitHubAdapter {
  private octokit: Octokit;

  constructor(token?: string) {
    this.octokit = new Octokit({
      auth: token || process.env.GITHUB_TOKEN,
    });
  }

  static parseRemoteUrl(remoteUrl: string): { owner: string; repo: string } | null {
    const sshMatch = remoteUrl.match(/git@github\.com:([^/]+)\/(.+?)(\.git)?$/);
    if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };

    const httpsMatch = remoteUrl.match(/github\.com\/([^/]+)\/(.+?)(\.git)?$/);
    if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] };

    return null;
  }

  async fetchMergedPRs(owner: string, repo: string, count: number = 20): Promise<PRData[]> {
    const { data: pullRequests } = await this.octokit.pulls.list({
      owner,
      repo,
      state: 'closed',
      sort: 'updated',
      direction: 'desc',
      per_page: count * 2,
    });

    const mergedPRs = pullRequests.filter(pr => pr.merged_at !== null).slice(0, count);

    const detailedPRs: PRData[] = await Promise.all(
      mergedPRs.map(async (pr) => {
        try {
          const { data: details } = await this.octokit.pulls.get({
            owner,
            repo,
            pull_number: pr.number,
          });
          return {
            number: pr.number,
            title: pr.title,
            body: pr.body || '',
            mergedAt: pr.merged_at || '',
            author: pr.user?.login || 'unknown',
            labels: pr.labels.map((l) => typeof l === 'string' ? l : l.name),
            additions: details.additions,
            deletions: details.deletions,
            changedFiles: details.changed_files,
          };
        } catch {
          return {
            number: pr.number,
            title: pr.title,
            body: pr.body || '',
            mergedAt: pr.merged_at || '',
            author: pr.user?.login || 'unknown',
            labels: pr.labels.map((l) => typeof l === 'string' ? l : l.name),
            additions: 0,
            deletions: 0,
            changedFiles: 0,
          };
        }
      })
    );

    return detailedPRs;
  }

  async verifyAccess(owner: string, repo: string): Promise<boolean> {
    try {
      await this.octokit.repos.get({ owner, repo });
      return true;
    } catch {
      return false;
    }
  }
}
