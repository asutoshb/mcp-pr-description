import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { LearnedStyle } from '../types.js';

const CACHE_FILENAME = '.pr-style.json';

export async function loadCachedStyle(repoRoot: string): Promise<LearnedStyle | null> {
  const cachePath = join(repoRoot, CACHE_FILENAME);
  if (!existsSync(cachePath)) return null;
  
  try {
    const content = await readFile(cachePath, 'utf-8');
    return JSON.parse(content) as LearnedStyle;
  } catch {
    return null;
  }
}

export async function saveCachedStyle(repoRoot: string, style: LearnedStyle): Promise<void> {
  const cachePath = join(repoRoot, CACHE_FILENAME);
  await writeFile(cachePath, JSON.stringify(style, null, 2), 'utf-8');
}

export function formatStyleForDisplay(style: LearnedStyle): string {
  const lines: string[] = [
    `## Learned PR Style for ${style.repositoryInfo.owner}/${style.repositoryInfo.repo}`,
    `Based on ${style.sampleCount} merged PRs (updated: ${new Date(style.lastUpdated).toLocaleDateString()})`,
    '',
    '### Structure',
    `- Sections: ${style.sections.length > 0 ? style.sections.join(', ') : 'None detected'}`,
    `- Checkboxes: ${style.usesCheckboxes ? 'Yes' : 'No'}`,
    `- Bullet points: ${style.usesBulletPoints ? 'Yes' : 'No'}`,
    `- Average length: ~${style.averageLineCount} lines`,
    '',
    '### Title Style',
    `- Pattern: ${style.titlePattern || 'No consistent pattern'}`,
    `- Prefixes: ${style.titlePrefixExamples.length > 0 ? style.titlePrefixExamples.join(', ') : 'None'}`,
    '',
    '### Tone',
    `- Style: ${style.tone}`,
    `- First person: ${style.usesFirstPerson ? 'Yes' : 'No'}`,
    `- Emojis: ${style.usesEmojis ? 'Yes' : 'No'}`,
  ];

  if (style.mentionsTickets) {
    lines.push('', '### Tickets', `- Pattern: ${style.ticketPattern}`);
  }

  return lines.join('\n');
}
