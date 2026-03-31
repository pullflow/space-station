import { intro, outro, spinner, select, isCancel } from '@clack/prompts';
import { existsSync } from 'fs';
import { join } from 'path';
import type { Config } from '../config';
import { getPlanetsDir } from '../config';
import { colors } from '../ui/theme';
import { getStatus, checkout, pull } from '../utils/git';
import { linkPlanet } from './setup';

export async function resetCommand(config: Config, projectRoot: string, planetArg?: string, force = false) {
  const planetsDir = getPlanetsDir(config);

  let planetName = planetArg?.toLowerCase();

  if (!planetName) {
    const choice = await select({
      message: 'Which planet do you want to reset?',
      options: config.planets.map(p => ({ value: p, label: p })),
    });
    if (isCancel(choice)) return;
    planetName = choice as string;
  }

  if (!config.planets.includes(planetName)) {
    console.error(colors.error(`Unknown planet: ${planetName}. Valid planets: ${config.planets.join(', ')}`));
    return;
  }

  const planetDir = join(planetsDir, planetName);
  if (!existsSync(planetDir)) {
    console.error(colors.error(`Planet directory not found: ${planetDir}. Run \`ss setup\` first.`));
    return;
  }

  intro(colors.primary(`Resetting ${planetName}...`));

  const status = await getStatus(planetDir);
  if (status && !force) {
    console.error(colors.error(`${planetName} has uncommitted changes. Use --force to override.`));
    outro(colors.error('Reset aborted.'));
    return;
  }

  const s = spinner();
  s.start(`Resetting ${planetName} to latest main...`);
  await checkout('main', planetDir);
  await pull(planetDir);
  s.stop(colors.success(`${planetName} reset to latest main`));

  s.start(`Linking ${planetName}...`);
  await linkPlanet(config, planetName, planetDir, planetsDir, projectRoot, s);
  s.stop(colors.success(`${planetName} linked`));

  outro(colors.primary('Done.'));
}
