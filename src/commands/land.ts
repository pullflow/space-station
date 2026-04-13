import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { intro, outro, spinner, select, isCancel } from '@clack/prompts';
import type { Config } from '../config';
import { getPlanetsDir } from '../config';
import { colors, symbols } from '../ui/theme';
import { resetCommand } from './reset';
import { agentCommand } from './agent';

export async function landCommand(config: Config, projectRoot: string, planetArg?: string) {
  const planetsDir = getPlanetsDir(config);
  let resolvedPlanetName: string | undefined = planetArg;

  if (!resolvedPlanetName) {
    // Try to detect if we are in a planet directory
    const cwd = process.cwd();
    const envPlanetPath = join(cwd, '.env.planet');
    
    if (existsSync(envPlanetPath)) {
      try {
        const content = readFileSync(envPlanetPath, 'utf8');
        const nameMatch = content.match(/^SS_PLANET_NAME=(.+)$/m);
        if (nameMatch) {
          resolvedPlanetName = nameMatch[1];
        }
      } catch (e) {
        // Fallback to path detection
      }
    }

    if (!resolvedPlanetName) {
      // Fallback: check if CWD is a subdirectory of any planet
      for (const p of config.planets) {
        const pDir = join(planetsDir, p);
        if (cwd.startsWith(pDir)) {
          resolvedPlanetName = p;
          break;
        }
      }
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
