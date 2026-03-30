import { run } from './shell';

export interface PRData {
  number: number;
  title: string;
  state: string;
  headRefName: string;
  url: string;
  body: string;
  statusCheckRollup?: any[];
  reviews?: any[];
  reviewRequests?: any[];
}

export async function listPRs(repo: string, filter: 'authored' | 'review' | 'all' = 'all'): Promise<PRData[]> {
  let search = 'state:open ';
  if (filter === 'authored') search += 'author:@me ';
  else if (filter === 'review') search += 'review-requested:@me ';
  else search += 'author:@me OR review-requested:@me ';

  const { stdout, exitCode } = await run('gh', [
    'pr', 'list',
    '-R', repo,
    '--search', search,
    '--json', 'number,title,state,headRefName,url,body',
    '--limit', '100'
  ]);

  if (exitCode !== 0) return [];
  try {
    return JSON.parse(stdout);
  } catch {
    return [];
  }
}

export async function getPRDetails(number: number, repo: string): Promise<PRData | null> {
  const { stdout, exitCode } = await run('gh', [
    'pr', 'view',
    number.toString(),
    '-R', repo,
    '--json', 'number,title,state,headRefName,url,body,statusCheckRollup,reviews,reviewRequests'
  ]);

  if (exitCode !== 0) return null;
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

export async function listIssues(repo: string): Promise<any[]> {
  const { stdout, exitCode } = await run('gh', [
    'issue', 'list',
    '-R', repo,
    '--assignee', '@me',
    '--state', 'open',
    '--json', 'number,title,labels',
    '--limit', '100'
  ]);

  if (exitCode !== 0) return [];
  try {
    return JSON.parse(stdout);
  } catch {
    return [];
  }
}
