import type { PRData, LearnedStyle } from '../types.js';

export function extractStyleFromPRs(prs: PRData[], owner: string, repo: string): LearnedStyle {
  const bodies = prs.map(pr => pr.body).filter(Boolean);
  const titles = prs.map(pr => pr.title);

  return {
    sections: extractCommonSections(bodies),
    usesCheckboxes: bodies.some(b => /\[[ x]\]/.test(b)),
    usesBulletPoints: bodies.some(b => /^[\s]*[-*]\s/m.test(b)),
    usesNumberedLists: bodies.some(b => /^\s*\d+\.\s/m.test(b)),
    titlePattern: detectTitlePattern(titles),
    titlePrefixExamples: extractTitlePrefixes(titles),
    averageBodyLength: avg(bodies.map(b => b.length)),
    averageLineCount: avg(bodies.map(b => b.split('\n').length)),
    mentionsTickets: bodies.some(b => /[A-Z]+-\d+/.test(b)),
    ticketPattern: detectTicketPattern([...bodies, ...titles]),
    tone: analyzeTone(bodies),
    usesFirstPerson: bodies.some(b => /\b(I |I'|my |we |we'|our )/i.test(b)),
    usesEmojis: bodies.some(b => hasEmoji(b)) || titles.some(t => hasEmoji(t)),
    alwaysIncludes: extractCommonPhrases(bodies),
    sampleCount: prs.length,
    lastUpdated: new Date().toISOString(),
    repositoryInfo: { owner, repo },
  };
}

function extractCommonSections(bodies: string[]): string[] {
  const counts = new Map<string, number>();
  for (const body of bodies) {
    const headers = body.match(/^#{1,3}\s+.+$/gm) || [];
    for (const h of headers) counts.set(h.trim(), (counts.get(h.trim()) || 0) + 1);
  }
  const threshold = bodies.length * 0.3;
  return Array.from(counts.entries())
    .filter(([, c]) => c >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s);
}

function detectTitlePattern(titles: string[]): string | null {
  const conventional = titles.filter(t => 
    /^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert)(\(.+\))?:\s/.test(t)
  ).length;
  if (conventional > titles.length * 0.5) return 'conventional';
  
  const ticketPrefix = titles.filter(t => /^\[?[A-Z]+-\d+\]?\s/.test(t)).length;
  if (ticketPrefix > titles.length * 0.5) return 'ticket-prefix';
  
  return null;
}

function extractTitlePrefixes(titles: string[]): string[] {
  const prefixes = new Set<string>();
  for (const title of titles) {
    const conv = title.match(/^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert):/);
    if (conv) prefixes.add(conv[1] + ':');
  }
  return Array.from(prefixes);
}

function avg(nums: number[]): number {
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
}

function detectTicketPattern(texts: string[]): string | null {
  const combined = texts.join(' ');
  if (/JIRA-\d+/.test(combined)) return 'JIRA-\\d+';
  if (/[A-Z]{2,}-\d+/.test(combined)) return '[A-Z]{2,}-\\d+';
  return null;
}

function analyzeTone(bodies: string[]): 'formal' | 'casual' | 'mixed' {
  let formal = 0, casual = 0;
  for (const b of bodies) {
    if (/\b(This PR|This commit|This change)\b/i.test(b)) formal++;
    if (/\b(I |we |gonna|wanna|lol)\b/i.test(b)) casual++;
  }
  if (formal > bodies.length * 0.5) return 'formal';
  if (casual > bodies.length * 0.3) return 'casual';
  return 'mixed';
}

function hasEmoji(text: string): boolean {
  return /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u.test(text);
}

function extractCommonPhrases(bodies: string[]): string[] {
  const phrases = ['## Description', '## Testing', '## Changes', 'Fixes #', 'Closes #'];
  return phrases.filter(p => bodies.filter(b => b.includes(p)).length > bodies.length * 0.5);
}
