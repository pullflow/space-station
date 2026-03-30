import { run } from './shell';
import { join } from 'path';
import { existsSync } from 'fs';

export async function getBranch(cwd: string): Promise<string> {
  const { stdout: branch } = await run('git', ['branch', '--show-current'], cwd);
  if (branch) return branch;

  const { stdout: hash } = await run('git', ['rev-parse', '--short', 'HEAD'], cwd);
  return hash ? `(detached at ${hash})` : 'unknown';
}

export async function getStatus(cwd: string): Promise<string> {
  const { stdout } = await run('git', ['status', '--porcelain'], cwd);
  return stdout;
}

export async function fetchHub(hubDir: string): Promise<void> {
  await run('git', ['fetch', 'origin'], hubDir);
}

export async function initHub(repoUrl: string, hubDir: string): Promise<number> {
  const { exitCode } = await run('git', ['clone', '--bare', repoUrl, hubDir]);
  return exitCode;
}

export async function addWorktree(hubDir: string, planetDir: string, branch: string = 'main'): Promise<number> {
  const { exitCode } = await addWorktreeFull(hubDir, planetDir, branch);
  return exitCode;
}

async function addWorktreeFull(hubDir: string, planetDir: string, branch: string = 'main') {
  // Check if branch exists in hub, if not create it from origin
  const { exitCode: branchCheck } = await run('git', ['rev-parse', '--verify', branch], hubDir);
  
  if (branchCheck !== 0) {
    await run('git', ['branch', branch, `origin/${branch}`], hubDir);
  }

  return await run('git', ['worktree', 'add', '--detach', planetDir, branch], hubDir);
}

export async function removeWorktree(hubDir: string, planetDir: string): Promise<void> {
  await run('git', ['worktree', 'remove', planetDir], hubDir);
}

export async function pruneWorktrees(hubDir: string): Promise<void> {
  await run('git', ['worktree', 'prune'], hubDir);
}

export async function checkout(branch: string, cwd: string): Promise<void> {
  await run('git', ['checkout', branch], cwd);
}

export async function pull(cwd: string): Promise<void> {
  await run('git', ['pull', 'origin', 'main'], cwd);
}

export async function mergeMain(cwd: string): Promise<number> {
  const { exitCode } = await run('git', ['merge', 'origin/main', '--no-edit'], cwd);
  return exitCode;
}
