import { run } from './shell';

export interface PRData {
  number: number;
  title: string;
  state: string;
  headRefName: string;
  url: string;
  body: string;
  isDraft: boolean;
  reviewDecision?: string;
  author?: { login: string };
  assignees?: { login: string }[];
  labels: { name: string }[];
  statusCheckRollup?: {
    state: string;
    status: string;
    conclusion: string;
  }[];
  reviews?: { author: { login: string }; state: string }[];
  reviewRequests?: { login: string }[];
}

export async function listPRs(repo: string, filter: 'authored' | 'review' | 'assigned' | 'all' = 'all'): Promise<PRData[]> {
  let search = 'state:open ';
  if (filter === 'authored') search += 'author:@me ';
  else if (filter === 'review') search += 'review-requested:@me ';
  else if (filter === 'assigned') search += 'assignee:@me ';
  else search += 'author:@me OR review-requested:@me OR assignee:@me ';

  const { stdout, exitCode } = await run('gh', [
    'pr', 'list',
    '-R', repo,
    '--search', search,
    '--json', 'number,title,state,headRefName,url,body,labels,statusCheckRollup,author,assignees,isDraft,reviewDecision,reviews,reviewRequests',
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
    '--json', 'number,title,state,headRefName,url,body,statusCheckRollup,reviews,reviewRequests,author,assignees,isDraft,reviewDecision'
  ]);

  if (exitCode !== 0) return null;
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<string | null> {
  const { stdout, exitCode } = await run('gh', ['api', 'user', '--jq', '.login']);
  if (exitCode !== 0) return null;
  return stdout.trim() || null;
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
