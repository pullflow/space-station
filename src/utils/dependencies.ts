import { run } from './shell';
import { spinner, select, isCancel } from '@clack/prompts';
import { colors } from '../ui/theme';
import { join } from 'path';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';

export interface Dependency {
  name: string;
  command: string;
  versionCommand: string;
  hint: string;
  required: boolean;
}

export const DEPENDENCIES: Dependency[] = [
  {
    name: 'Homebrew',
    command: 'brew',
    versionCommand: 'brew --version',
    hint: 'Install from https://brew.sh',
    required: true,
  },
  {
    name: 'Git',
    command: 'git',
    versionCommand: 'git --version',
    hint: 'Install from https://git-scm.com',
    required: true,
  },
  {
    name: 'Bun',
    command: 'bun',
    versionCommand: 'bun --version',
    hint: 'Install from https://bun.sh',
    required: true,
  },
  {
    name: 'Tmux',
    command: 'tmux',
    versionCommand: 'tmux -V',
    hint: 'Install via brew install tmux',
    required: false,
  },
];

export async function checkDependency(dep: Dependency) {
  const { exitCode, stdout } = await run('which', [dep.command]);
  if (exitCode !== 0) {
    return { installed: false, version: '' };
  }
  const versionInfo = await run(dep.versionCommand.split(' ')[0] ?? dep.versionCommand, dep.versionCommand.split(' ').slice(1));
  return { installed: true, version: versionInfo.stdout.split('\n')[0] };
}

export async function checkSystemDependencies(projectRoot: string) {
  const s = spinner();

  s.start('Checking system dependencies...');

  // 1. Check for Homebrew
  const brewCheck = await run('which', ['brew']);
  if (brewCheck.exitCode !== 0) {
    s.stop(colors.error('Homebrew is not installed. Please install it from https://brew.sh'));
    return false;
  }

  // 2. Check and install Tmux
  const tmuxCheck = await run('which', ['tmux']);
  if (tmuxCheck.exitCode !== 0) {
    s.message('Installing tmux via Homebrew...');
    await run('brew', ['install', 'tmux']);
  }

  s.stop(colors.success('Core tools verified.'));

  // 3. Install bundled Nerd Fonts
  const fontsDir = join(projectRoot, 'resources', 'fonts');
  const bundledFonts = existsSync(fontsDir)
    ? readdirSync(fontsDir).filter(f => f.match(/\.(ttf|otf)$/i))
    : [];

  if (bundledFonts.length > 0) {
    const families = [...new Set(bundledFonts.map(f => f.replace(/\.(ttf|otf)$/i, '').split('-')[0]))].filter((f): f is string => f !== undefined);

    const choice = await select({
      message: 'Which Nerd Font would you like to use?',
      options: families.map(f => ({ value: f, label: f })),
    });

    if (isCancel(choice)) return false;

    s.start('Installing bundled Nerd Fonts...');
    const userFontsDir = join(process.env.HOME ?? '', 'Library', 'Fonts');
    if (!existsSync(userFontsDir)) mkdirSync(userFontsDir, { recursive: true });
    for (const font of bundledFonts) {
      const dest = join(userFontsDir, font);
      if (!existsSync(dest)) writeFileSync(dest, readFileSync(join(fontsDir, font)));
    }
    s.stop(colors.success('Fonts installed.'));
  }

  return true;
}
