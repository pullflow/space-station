import { intro, outro, spinner, note } from '@clack/prompts';
import { Config } from '../config';
import { colors, symbols } from '../ui/theme';
import { basename } from 'path';
import { runInteractive } from '../utils/shell';
import { PLANET_NAMES } from '../utils/planets';

export async function agentCommand(config: Config, type?: string, number?: string) {
  const currentDir = basename(process.cwd()).toLowerCase();
  if (!PLANET_NAMES.includes(currentDir)) {
    console.error(colors.error(`Error: agent must be run from a planet folder (${PLANET_NAMES.join(', ')})`));
    return;
  }

  const planetName = currentDir;
  const humanName = planetName.charAt(0).toUpperCase() + planetName.slice(1);
  const emoji = (symbols as any)[planetName] || symbols.unknown;

  const agentCmd = config.DEFAULT_AGENT;
  let name = `${emoji} ${humanName}`;
  let focus = '';

  if (type && number) {
    focus = `focus on gh ${type} ${number}`;
    if (type === 'issue') name += ` #${number}`;
  }

  intro(colors.agent(`Initiating agent ${agentCmd} for ${name}...`));

  const args = ['--name', name];
  if (focus) args.push(focus);

  await runInteractive(agentCmd, args);

  outro(colors.success('Agent mission completed!'));
}
