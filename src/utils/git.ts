import { run } from './shell';
import { join } from 'path';
import { existsSync } from 'fs';

export async function git(args: string[], cwd?: string) {
  const result = await run('git', args, cwd);
  if (result.exitCode !== 0) {
    throw new Error(`Git command failed: git ${args.join(' ')}\n${result.stderr}`);
  }
  return result;
}

export async function getBranch(cwd: string): Promise<string> {
  const { stdout: branch } = await run('git', ['branch', '--show-current'], cwd);
  if (branch) return branch;

  const { stdout: hash } = await run('git', ['rev-parse', '--short', 'HEAD'], cwd);
  return hash ? `(detached at ${hash})` : 'unknown';
}

export async function getStatus(cwd: string): Promise<string> {
  const { stdout } = await run('git', ['status', '--porcelain', '-uno'], cwd);
  return stdout;
}

export async function fetchHub(hubDir: string): Promise<void> {
  // Ensure fetch spec is set so origin/* branches are available
  await run('git', ['config', 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*'], hubDir);
  await git(['fetch', 'origin'], hubDir);
}

export async function fetchBranch(cwd: string, branch: string = 'main'): Promise<void> {
  // Ensure fetch spec is set (if it's the hub, or if the planet inherits it)
  await run('git', ['config', 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*'], cwd);
  
  // Fetch origin branch. This updates FETCH_HEAD in the current directory.
  // If we're on the branch, it will update it if FETCH_HEAD is merged.
  await git(['fetch', 'origin', branch], cwd);
  
  // Try to update the local branch ref if it's not checked out elsewhere
  await run('git', ['fetch', 'origin', `${branch}:${branch}`], cwd).catch(() => {
    // Ignore failure if it's checked out elsewhere
  });
}

export async function initHub(repoUrl: string, hubDir: string): Promise<number> {
  const { exitCode } = await run('git', ['clone', '--bare', repoUrl, hubDir]);
  if (exitCode === 0) {
    await run('git', ['config', 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*'], hubDir);
  }
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

  const result = await run('git', ['worktree', 'add', '--detach', planetDir, branch], hubDir);

  // Bare repos set core.bare=true which propagates to worktrees via
  // extensions.worktreeConfig. Override it so git recognises the worktree.
  if (result.exitCode === 0) {
    await run('git', ['config', '--worktree', 'core.bare', 'false'], planetDir);
  }

  return result;
}

export async function removeWorktree(hubDir: string, planetDir: string): Promise<void> {
  await git(['worktree', 'remove', planetDir], hubDir);
}

export async function pruneWorktrees(hubDir: string): Promise<void> {
  await git(['worktree', 'prune'], hubDir);
}

export async function checkout(branch: string, cwd: string): Promise<void> {
  await git(['checkout', branch], cwd);
}

export async function pull(cwd: string): Promise<void> {
  await git(['pull', 'origin', 'main'], cwd);
}

export async function resetHard(target: string, cwd: string): Promise<void> {
  await git(['reset', '--hard', target], cwd);
}

export async function mergeMain(cwd: string): Promise<number> {
  const { exitCode } = await run('git', ['merge', 'origin/main', '--no-edit'], cwd);
  return exitCode;
}
