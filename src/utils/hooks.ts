import { existsSync, appendFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import type { PRData } from './github';

export type HookEvent =
  | 'pr_assigned'
  | 'pr_review_requested'
  | 'pr_approved'
  | 'pr_checks_passed'
  | 'pr_checks_failed';

interface HookContext {
  event: HookEvent;
  repo: string;
  pr: PRData;
  extra?: Record<string, string>;
}

export interface DashboardState {
  prs: Map<number, PRSnapshot>;
}

interface PRSnapshot {
  assignees: string[];
  reviewRequests: string[];
  reviewDecision: string;
  checksState: 'passing' | 'failing' | 'pending' | 'none';
  reviews: { login: string; state: string }[];
}

function getChecksState(pr: PRData): PRSnapshot['checksState'] {
  if (!pr.statusCheckRollup || pr.statusCheckRollup.length === 0) return 'none';
  const states = pr.statusCheckRollup.map(s => (s.state || s.conclusion || s.status || '').toUpperCase());
  if (states.some(s => ['FAILURE', 'ERROR', 'ACTION_REQUIRED', 'START_UP_FAILURE', 'STALE', 'TIMED_OUT'].includes(s))) return 'failing';
  if (states.every(s => ['SUCCESS', 'COMPLETED', 'NEUTRAL', 'SKIPPED'].includes(s))) return 'passing';
  return 'pending';
}

function snapshotPR(pr: PRData): PRSnapshot {
  return {
    assignees: (pr.assignees || []).map(a => a.login).sort(),
    reviewRequests: (pr.reviewRequests || []).map(r => r.login).sort(),
    reviewDecision: pr.reviewDecision || '',
    checksState: getChecksState(pr),
    reviews: (pr.reviews || []).map(r => ({ login: r.author.login, state: r.state })),
  };
}

function buildEnv(ctx: HookContext): Record<string, string> {
  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    SS_HOOK_EVENT: ctx.event,
    SS_REPO: ctx.repo,
    SS_PR_NUMBER: String(ctx.pr.number),
    SS_PR_URL: ctx.pr.url,
    SS_PR_TITLE: ctx.pr.title,
    SS_PR_AUTHOR: ctx.pr.author?.login || '',
    SS_PR_BRANCH: ctx.pr.headRefName,
    SS_PR_DRAFT: String(ctx.pr.isDraft),
    SS_PR_STATE: ctx.pr.state,
    SS_PR_ASSIGNEES: (ctx.pr.assignees || []).map(a => a.login).join(','),
  };
  if (ctx.extra) {
    for (const [k, v] of Object.entries(ctx.extra)) {
      env[k] = v;
    }
  }
  return env;
}

function getHooksDir(spaceStationDir: string): string {
  return join(spaceStationDir, 'hooks');
}

function logToFile(hooksDir: string, message: string) {
  const logPath = join(hooksDir, '.log');
  const timestamp = new Date().toISOString();
  appendFileSync(logPath, `[${timestamp}] ${message}\n`);
}

async function executeHook(hooksDir: string, ctx: HookContext) {
  const hookPath = join(hooksDir, `${ctx.event}.sh`);
  if (!existsSync(hookPath)) return;

  const stat = statSync(hookPath);
  const isExecutable = (stat.mode & 0o111) !== 0;
  if (!isExecutable) {
    logToFile(hooksDir, `SKIP ${ctx.event}: ${hookPath} is not executable (chmod +x)`);
    return;
  }

  logToFile(hooksDir, `RUN ${ctx.event} PR#${ctx.pr.number}`);

  try {
    const proc = Bun.spawn(['sh', hookPath], {
      env: buildEnv(ctx),
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    if (stdout.trim()) logToFile(hooksDir, `  stdout: ${stdout.trim()}`);
    if (stderr.trim()) logToFile(hooksDir, `  stderr: ${stderr.trim()}`);
    logToFile(hooksDir, `  exit: ${exitCode}`);
  } catch (err: any) {
    logToFile(hooksDir, `  ERROR: ${err.message}`);
  }
}

export function createDashboardState(): DashboardState {
  return { prs: new Map() };
}

export async function detectAndFireHooks(
  prs: PRData[],
  prevState: DashboardState,
  repo: string,
  spaceStationDir: string,
  currentUser?: string,
): Promise<DashboardState> {
  const hooksDir = getHooksDir(spaceStationDir);
  if (!existsSync(hooksDir)) return snapshotAll(prs);

  const newState: DashboardState = { prs: new Map() };

  for (const pr of prs) {
    const snap = snapshotPR(pr);
    newState.prs.set(pr.number, snap);

    const prev = prevState.prs.get(pr.number);
    if (!prev) continue; // first time seeing this PR, no event

    const ctx = (event: HookEvent, extra?: Record<string, string>): HookContext => ({
      event, repo, pr, extra,
    });

    // PR_ASSIGNED: new assignee that is current user
    if (currentUser) {
      const wasAssigned = prev.assignees.includes(currentUser);
      const nowAssigned = snap.assignees.includes(currentUser);
      if (!wasAssigned && nowAssigned) {
        executeHook(hooksDir, ctx('pr_assigned'));
      }
    }

    // PR_REVIEW_REQUESTED: new review request for current user
    if (currentUser) {
      const wasRequested = prev.reviewRequests.includes(currentUser);
      const nowRequested = snap.reviewRequests.includes(currentUser);
      if (!wasRequested && nowRequested) {
        executeHook(hooksDir, ctx('pr_review_requested'));
      }
    }

    // PR_APPROVED: review decision changed to APPROVED
    if (prev.reviewDecision !== 'APPROVED' && snap.reviewDecision === 'APPROVED') {
      const approver = snap.reviews.find(r => r.state === 'APPROVED')?.login || '';
      executeHook(hooksDir, ctx('pr_approved', { SS_PR_REVIEWER: approver }));
    }

    // PR_CHECKS_PASSED
    if (prev.checksState !== 'passing' && snap.checksState === 'passing') {
      executeHook(hooksDir, ctx('pr_checks_passed'));
    }

    // PR_CHECKS_FAILED
    if (prev.checksState !== 'failing' && snap.checksState === 'failing') {
      executeHook(hooksDir, ctx('pr_checks_failed'));
    }
  }

  return newState;
}

const ALL_HOOKS: HookEvent[] = [
  'pr_assigned',
  'pr_review_requested',
  'pr_approved',
  'pr_checks_passed',
  'pr_checks_failed',
];

export interface HookInfo {
  event: HookEvent;
  active: boolean;
  executable: boolean;
}

export function getActiveHooks(spaceStationDir: string): HookInfo[] {
  const hooksDir = getHooksDir(spaceStationDir);
  return ALL_HOOKS.map(event => {
    const hookPath = join(hooksDir, `${event}.sh`);
    if (!existsSync(hookPath)) {
      return { event, active: false, executable: false };
    }
    const stat = statSync(hookPath);
    const executable = (stat.mode & 0o111) !== 0;
    return { event, active: true, executable };
  });
}

function snapshotAll(prs: PRData[]): DashboardState {
  const state: DashboardState = { prs: new Map() };
  for (const pr of prs) {
    state.prs.set(pr.number, snapshotPR(pr));
  }
  return state;
}
