import { intro, select, isCancel } from '@clack/prompts';
import type { Config } from '../config';
import { getPlanetsDir } from '../config';
import { colors, symbols } from '../ui/theme';
import { resetCommand } from './reset';
import { agentCommand } from './agent';
import { detectPlanet } from '../utils/planets';

export async function landCommand(config: Config, projectRoot: string, planetArg?: string) {
  let resolvedPlanetName: string | undefined = planetArg;

  if (!resolvedPlanetName) {
    const detected = detectPlanet(config);
    if (detected) {
      resolvedPlanetName = detected.name;
    }
  }

  if (!resolvedPlanetName) {
    const choice = await select({
      message: 'Which planet do you want to land on?',
      options: config.planets.map(p => ({ value: p, label: p })),
    });
    if (isCancel(choice)) return;
    resolvedPlanetName = choice as string;
  }

  intro(`${colors.primary(`${symbols.rocket} Landing on`)} ${colors.info(resolvedPlanetName)}`);

  // 1. Reset the planet (forced)
  // Note: resetCommand already does its own intro/outro if not careful, 
  // but let's see if we can call it directly.
  // The resetCommand has its own intro() calls.
  await resetCommand(config, projectRoot, resolvedPlanetName, true);

  // 2. Launch the agent
  await agentCommand(config, resolvedPlanetName);
}
