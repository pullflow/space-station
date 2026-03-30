import { execFileSync, execSync } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import type { Config } from '../config';
import { getPlanetsDir } from '../config';
import { colors } from '../ui/theme';
import { confirm, intro, outro, isCancel, note } from '@clack/prompts';
import { getAsciiLogo } from '../ui/ascii';

const PLUGINS = [
  { name: 'tpm',               repo: 'tmux-plugins/tpm' },
  { name: 'tmux',              repo: 'catppuccin/tmux' },
  { name: 'tmux-dark-notify',  repo: 'erikw/tmux-dark-notify' },
  { name: 'tmux-pomodoro-plus', repo: 'olimorris/tmux-pomodoro-plus' },
];

function checkPlugins(pluginsDir: string) {
  return PLUGINS.map(p => ({
    ...p,
    installed: existsSync(join(pluginsDir, p.name)),
  }));
}

export async function consoleCommand(config: Config, projectRoot: string) {
  const logo = await getAsciiLogo();
  console.log(logo);
  intro(colors.primary('Space Station — Command Center'));

  const planetsDir = getPlanetsDir(config);
  const pluginsDir = join(projectRoot, 'resources', 'plugins');

  // Plugin status
  const plugins = checkPlugins(pluginsDir);
  const missing = plugins.filter(p => !p.installed);

  const pluginLines = plugins
    .map(p => `  ${p.installed ? colors.success('✓') : colors.error('✗')}  ${p.name}`)
    .join('\n');

  note(pluginLines, 'Plugins');

  if (missing.length > 0) {
    const shouldInstall = await confirm({
      message: `${missing.length} plugin(s) missing. Clone them now?`,
    });

    if (isCancel(shouldInstall)) { outro('Aborted.'); return; }

    if (shouldInstall) {
      for (const p of missing) {
        const dest = join(pluginsDir, p.name);
        console.log(colors.dim(`  Cloning ${p.repo}...`));
        execSync(`git clone --depth=1 https://github.com/${p.repo} "${dest}"`, { stdio: 'inherit' });
      }
    }
  }

  // Keyboard shortcuts
  note(
    [
      `  ${colors.info('prefix + I')}       Install / update plugins`,
      `  ${colors.info('prefix + hjkl')}    Navigate panes`,
      `  ${colors.info('prefix + %  "')}    Split pane`,
      `  ${colors.info('prefix + r')}       Reload config`,
      `  ${colors.info('prefix + p/n')}     Previous / next window`,
    ].join('\n'),
    'Tmux Shortcuts'
  );

  // Command hints
  note(
    [
      `  ${colors.info('ss prs')}           Browse & checkout PRs`,
      `  ${colors.info('ss issues')}        View assigned issues`,
      `  ${colors.info('ss status')}        Planet status overview`,
      `  ${colors.info('ss <planet>')}      Jump to a planet`,
      `  ${colors.info('ss reset')}         Reset planet to main`,
    ].join('\n'),
    'Commands'
  );

  const launch = await confirm({ message: 'Launch 2x2 planet grid?' });
  if (isCancel(launch) || !launch) { outro('Aborted.'); return; }

  outro(colors.success('Launching... (prefix + I to install plugins on first run)'));

  const launcherScript = join(projectRoot, 'bridge-launch.sh');
  const planetsList = config.planets.join(',');

  execFileSync('bash', [launcherScript, projectRoot, planetsDir, planetsList, config.default_agent], {
    stdio: 'inherit',
  });
}
