import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function writePRDescriptionFile(
  repoRoot: string,
  title: string,
  body: string
): Promise<string> {
  const filename = 'PR_DESCRIPTION.md';
  const filepath = join(repoRoot, filename);
  
  const content = `# ${title}

${body}
`;

  await writeFile(filepath, content, 'utf-8');
  return filepath;
}
