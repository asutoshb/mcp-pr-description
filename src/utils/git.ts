import { exec } from 'child_process';
import { promisify } from 'util';
import type { GitInfo } from '../types.js';

const execAsync = promisify(exec);

async function gitCommand(command: string, cwd?: string): Promise<string> {
  const { stdout } = await execAsync(command, {
    cwd: cwd || process.cwd(),
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout.trim();
}

export async function getRepositoryRoot(cwd?: string): Promise<string> {
  return gitCommand('git rev-parse --show-toplevel', cwd);
}

export async function getBranchName(cwd?: string): Promise<string> {
  return gitCommand('git branch --show-current', cwd);
}

export async function getRemoteUrl(cwd?: string): Promise<string> {
  try {
    return await gitCommand('git remote get-url origin', cwd);
  } catch {
    return gitCommand('git remote get-url upstream', cwd);
  }
}

export async function getUpstreamBranch(cwd?: string): Promise<string | null> {
  try {
    // symbolic-full-name keeps refs like origin/main
    const upstream = await gitCommand(
      'git rev-parse --abbrev-ref --symbolic-full-name @{u}',
      cwd
    );
    return upstream || null;
  } catch {
    return null;
  }
}

export async function resolveBaseBranch(
  cwd?: string,
  baseBranch?: string,
  compareToUpstream?: boolean
): Promise<string> {
  if (compareToUpstream) {
    const upstream = await getUpstreamBranch(cwd);
    if (upstream) return upstream;
  }
  return baseBranch || 'main';
}

export async function getDiff(
  cwd?: string,
  baseBranch?: string,
  compareToUpstream?: boolean
): Promise<string> {
  const base = await resolveBaseBranch(cwd, baseBranch, compareToUpstream);

  try {
    const diff = await gitCommand(`git diff ${base}...HEAD`, cwd);
    if (diff) return diff;
  } catch {
    try {
      const diff = await gitCommand(`git diff origin/${base}...HEAD`, cwd);
      if (diff) return diff;
    } catch {}
  }

  const staged = await gitCommand('git diff --cached', cwd);
  const unstaged = await gitCommand('git diff', cwd);
  return [staged, unstaged].filter(Boolean).join('\n');
}

export async function getCommitMessages(
  cwd?: string,
  baseBranch?: string,
  compareToUpstream?: boolean
): Promise<string[]> {
  const base = await resolveBaseBranch(cwd, baseBranch, compareToUpstream);

  try {
    const log = await gitCommand(`git log ${base}..HEAD --pretty=format:"%s"`, cwd);
    return log.split('\n').filter(Boolean);
  } catch {
    try {
      const log = await gitCommand(`git log origin/${base}..HEAD --pretty=format:"%s"`, cwd);
      return log.split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }
}

export async function getChangeSummary(
  cwd?: string,
  baseBranch?: string,
  compareToUpstream?: boolean
): Promise<string> {
  const base = await resolveBaseBranch(cwd, baseBranch, compareToUpstream);

  try {
    return await gitCommand(`git diff ${base}...HEAD --stat`, cwd);
  } catch {
    try {
      return await gitCommand(`git diff origin/${base}...HEAD --stat`, cwd);
    } catch {
      return await gitCommand('git diff --stat', cwd);
    }
  }
}

export async function getGitInfo(
  cwd?: string,
  baseBranch?: string,
  compareToUpstream?: boolean
): Promise<GitInfo> {
  const [repositoryRoot, branchName, diff, commitMessages] = await Promise.all([
    getRepositoryRoot(cwd),
    getBranchName(cwd),
    getDiff(cwd, baseBranch, compareToUpstream),
    getCommitMessages(cwd, baseBranch, compareToUpstream),
  ]);

  return { repositoryRoot, branchName, diff, commitMessages, stagedFiles: [] };
}
