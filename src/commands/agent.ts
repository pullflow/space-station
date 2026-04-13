import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { intro, outro, spinner, note } from '@clack/prompts';
import type { Config } from '../config';
import { getPlanetsDir } from '../config';
import { colors, symbols } from '../ui/theme';
import { runInteractive } from '../utils/shell';

export async function agentCommand(config: Config, planetName?: string) {
  const planetsDir = getPlanetsDir(config);
  let targetDir: string | undefined;
  let resolvedPlanetName: string | undefined;

  if (planetName) {
    targetDir = join(planetsDir, planetName);
    resolvedPlanetName = planetName;
    if (!existsSync(targetDir)) {
      console.error(colors.error(`${symbols.error} Planet '${planetName}' not found at ${targetDir}`));
      return;
    }
  } else {
    // Try to detect if we are in a planet directory
    const cwd = process.cwd();
    const envPlanetPath = join(cwd, '.env.planet');
    
    if (existsSync(envPlanetPath)) {
      try {
        const content = readFileSync(envPlanetPath, 'utf8');
        const nameMatch = content.match(/^SS_PLANET_NAME=(.+)$/m);
        if (nameMatch) {
          resolvedPlanetName = nameMatch[1];
          targetDir = cwd;
        }
      } catch (e) {
        // Fallback to path detection
      }
    }

    if (!targetDir) {
      // Fallback: check if CWD is a subdirectory of any planet
      for (const p of config.planets) {
        const pDir = join(planetsDir, p);
        if (cwd.startsWith(pDir)) {
          targetDir = pDir;
          resolvedPlanetName = p;
          break;
        }
      }
    }
  }

  if (!targetDir || !resolvedPlanetName) {
    console.error(colors.error(`${symbols.error} Not in a planet directory and no planet name provided.`));
    console.log(colors.dim(`Use 'ss agent <planet>' or run this from within a planet folder.`));
    return;
  }

  intro(`${colors.primary(`${symbols.agent} Launching Agent on`)} ${colors.info(resolvedPlanetName)}`);
  
  const agentParts = config.default_agent.split(' ');
  const cmd = agentParts[0];
  const args = agentParts.slice(1);

  if (!cmd) {
    console.error(colors.error(`${symbols.error} No default agent command configured.`));
    return;
  }
  
  // Launch the agent process
  const exitCode = await runInteractive(cmd, args, targetDir, {
    env: {
      ...process.env,
      SS_PLANET_NAME: resolvedPlanetName,
    }
  });

  if (exitCode === 0) {
    outro(colors.success(`Agent session on ${resolvedPlanetName} concluded.`));
  } else {
    outro(colors.warning(`Agent session on ${resolvedPlanetName} exited with code ${exitCode}.`));
  }
}
