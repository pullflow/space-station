import { intro, outro, spinner, select, isCancel } from '@clack/prompts';
import { existsSync } from 'fs';
import { join } from 'path';
import type { Config } from '../config';
import { getPlanetsDir } from '../config';
import { colors } from '../ui/theme';
import { getStatus, checkout, fetchBranch, git } from '../utils/git';
import { run } from '../utils/shell';
import { linkPlanet } from './setup';

export async function resetCommand(config: Config, projectRoot: string, planetArg?: string, force = false) {
  const planetsDir = getPlanetsDir(config);
  const hubDir = join(planetsDir, '.hub');

  let planetName = planetArg?.toLowerCase();

  if (!planetName) {
    const choice = await select({
      message: 'Which planet do you want to reset?',
      options: [
        { value: 'all', label: '󰭚 All Planets' },
        ...config.planets.map(p => ({ value: p, label: p }))
      ],
    });
    if (isCancel(choice)) return;
    planetName = choice as string;
  }

  const planetsToReset = planetName === 'all' ? config.planets : [planetName];

  for (const name of planetsToReset) {
    if (!config.planets.includes(name)) {
      console.error(colors.error(`Unknown planet: ${name}. Valid planets: ${config.planets.join(', ')}`));
      continue;
    }

    const planetDir = join(planetsDir, name);
    if (!existsSync(planetDir)) {
      console.error(colors.error(`Planet directory not found: ${planetDir}. Run \`ss setup\` first.`));
      continue;
    }

    intro(colors.primary(`Resetting ${name}...`));

    const status = await getStatus(planetDir);
    if (status && !force) {
      console.error(colors.error(`${name} has uncommitted changes. Use --force to override.`));
      continue;
    }

    const s = spinner();
    s.start(`Fetching latest main and resetting ${name}...`);
    try {
      // 1. Fetch latest main into hub
      await fetchBranch(hubDir, 'main');
      
      // 2. Target branch name for this planet's "main" state
      const newBranch = `${name}/main`;

      // 3. Create and checkout the branch from origin/main
      // Use -B to force create/reset it to the latest origin/main
      await git(['checkout', '-B', newBranch, 'origin/main'], planetDir);

      // 4. Cleanup: Delete any legacy timestamped branches (e.g. mercury/1234567)
      try {
        const { stdout: branches } = await run('git', ['branch', '--list', `${name}/*`], planetDir);
        const branchList = branches.split('\n').filter(b => b.trim() !== '');
        for (const b of branchList) {
          const cleanBranch = b.replace('*', '').trim();
          // Only delete if it's a numeric timestamp branch, keeping our new stable 'main'
          if (cleanBranch !== newBranch && /^\d+$/.test(cleanBranch.split('/')[1])) {
            await run('git', ['branch', '-D', cleanBranch], planetDir);
          }
        }
      } catch (e) {
        // Ignore cleanup errors
      }

      s.stop(colors.success(`${name} reset to ${newBranch}`));

    } catch (error: any) {
      s.stop(colors.error(`Failed to reset ${name}`));
      console.error(colors.error(error.message));
      continue;
    }

    s.start(`Linking ${name}...`);
    try {
      await linkPlanet(config, name, planetDir, planetsDir, projectRoot, s);
      s.stop(colors.success(`${name} linked`));
    } catch (error: any) {
      s.stop(colors.error(`Failed to link ${name}`));
      console.error(colors.error(error.message));
      continue;
    }
  }

  outro(colors.primary('Done.'));
}
