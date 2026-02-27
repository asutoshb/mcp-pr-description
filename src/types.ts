// Types for PR style learning and generation

export interface PRData {
  number: number;
  title: string;
  body: string;
  mergedAt: string;
  author: string;
  labels: string[];
  additions: number;
  deletions: number;
  changedFiles: number;
}

export interface LearnedStyle {
  sections: string[];
  usesCheckboxes: boolean;
  usesBulletPoints: boolean;
  usesNumberedLists: boolean;
  titlePattern: string | null;
  titlePrefixExamples: string[];
  averageBodyLength: number;
  averageLineCount: number;
  mentionsTickets: boolean;
  ticketPattern: string | null;
  tone: 'formal' | 'casual' | 'mixed';
  usesFirstPerson: boolean;
  usesEmojis: boolean;
  alwaysIncludes: string[];
  sampleCount: number;
  lastUpdated: string;
  repositoryInfo: {
    owner: string;
    repo: string;
  };
}

export interface GitInfo {
  diff: string;
  branchName: string;
  commitMessages: string[];
  stagedFiles: string[];
  repositoryRoot: string;
}

export interface GeneratedPR {
  title: string;
  body: string;
}
