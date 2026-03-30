import { run } from './shell';

export interface Dependency {
  name: string;
  command: string;
  args: string[];
  required: boolean;
  hint: string;
}

export const DEPENDENCIES: Dependency[] = [
  {
    name: 'Git',
    command: 'git',
    args: ['--version'],
    required: true,
    hint: 'Install via: brew install git'
  },
  {
    name: 'GitHub CLI',
    command: 'gh',
    args: ['--version'],
    required: true,
    hint: 'Install via: brew install gh && gh auth login'
  },
  {
    name: 'Bun',
    command: 'bun',
    args: ['--version'],
    required: true,
    hint: 'Install via: curl -fsSL https://bun.sh/install | bash'
  },
  {
    name: 'Docker',
    command: 'docker',
    args: ['--version'],
    required: true,
    hint: 'Install Docker Desktop or Colima'
  }
];

export async function checkDependency(dep: Dependency): Promise<{ installed: boolean; version?: string }> {
  const { stdout, exitCode } = await run(dep.command, dep.args);
  if (exitCode === 0) {
    return { installed: true, version: stdout.split('\n')[0] };
  }
  return { installed: false };
}
