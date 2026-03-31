import { execFileSync } from 'child_process';
import { join } from 'path';
import type { Config } from '../config';
import { getPlanetsDir } from '../config';
import { colors } from '../ui/theme';
import { confirm, intro, outro, isCancel, note } from '@clack/prompts';
import { getAsciiLogo } from '../ui/ascii';

export async function consoleCommand(config: Config, projectRoot: string) {
  const logo = await getAsciiLogo();
  console.log(logo);
  intro(colors.primary('Space Station — Command Center'));

  const planetsDir = getPlanetsDir(config);

  // Keyboard shortcuts
  note(
    [
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

  outro(colors.success('Launching...'));

  const launcherScript = join(projectRoot, 'launchpad.sh');
  const planetsList = config.planets.join(',');

  execFileSync('bash', [launcherScript, projectRoot, planetsDir, planetsList, config.default_agent], {
    stdio: 'inherit',
  });
}
