import { spinner, note } from '@clack/prompts';
import type { Config } from '../config';
import { getPlanets } from '../utils/planets';
import { getBranch, getStatus } from '../utils/git';
import { listPRs } from '../utils/github';
import { colors, symbols } from '../ui/theme';

export async function statusCommand(config: Config) {
  const s = spinner();
  s.start('Scanning the universe...');
  
  const planets = getPlanets(config);
  const prs = await listPRs(config.repo, 'all');
  
  s.stop('Universe scan complete');

  let outputLines = [];
  
  for (const planet of planets) {
    const branch = await getBranch(planet.dir);
    const gitStatus = await getStatus(planet.dir);
    
    let statusLabel = colors.success(`${symbols.success} Available`);
    if (gitStatus) {
      const lines = gitStatus.split('\n').filter(l => l.trim() !== '');
      statusLabel = colors.warning(`${symbols.warning} Active:${lines.length}`);
    }

    const planetPR = prs.find(pr => pr.headRefName === branch);
    let prInfo = colors.error('No PR');
    if (planetPR) {
      prInfo = colors.success(`PR#${planetPR.number} (${planetPR.state})`);
    }

    const planetColor = (colors.planet as any)[planet.name] || colors.planet.unknown;
    
    outputLines.push(`${planetColor(planet.emoji)} ${planetColor(planet.name.padEnd(10))}: ${colors.info(branch.padEnd(20))} [${statusLabel}] ${prInfo}`);
  }

  note(outputLines.join('\n'), 'Planetary Status');
}
