import { spinner, note } from '@clack/prompts';
import type { Config } from '../config';
import { getPlanets } from '../utils/planets';
import { getBranch, getStatus } from '../utils/git';
import { listPRs } from '../utils/github';
import type { PRData } from '../utils/github';
import { colors, symbols } from '../ui/theme';
import pc from 'picocolors';

export async function statusCommand(config: Config) {
  const s = spinner();
  s.start('Scanning the universe...');
  
  const planets = getPlanets(config);
  const prs = await listPRs(config.repo, 'all');
  
  const getReviewPill = (pr: PRData) => {
    if (pr.reviewDecision === 'APPROVED') {
      const approver = pr.reviews?.find((r: any) => r.state === 'APPROVED')?.author?.login || '???';
      return ` ${colors.pill(` \uf00c ${approver} `, colors.success, pc.bgGreen)}`;
    }
    
    if (pr.reviewRequests && pr.reviewRequests.length > 0) {
      const requested = pr.reviewRequests[0]?.login || '???';
      return ` ${colors.pill(` \uf110 ${requested} `, colors.warning, pc.bgYellow)}`;
    }
    
    return '';
  };

  s.stop('Universe scan complete');

  let outputLines = [];
  
  for (const planet of planets) {
    const branch = await getBranch(planet.dir);
    const gitStatus = await getStatus(planet.dir);
    const planetPR = prs.find(pr => pr.headRefName === branch);
    
    let statusLabel = colors.success(`${symbols.success} Available`);
    if (gitStatus) {
      const lines = gitStatus.split('\n').filter(l => l.trim() !== '');
      statusLabel = colors.warning(`${symbols.warning} Active:${lines.length}`);
    } else if (planetPR) {
      statusLabel = colors.info(`${symbols.computer} In Use`);
    }

    let prInfo = '';
    if (planetPR) {
      const prIcon = planetPR.isDraft ? symbols.prDraft : symbols.pr;
      const reviewPill = getReviewPill(planetPR);
      prInfo = ` ${colors.success(`${prIcon} ${planetPR.number}${reviewPill} (${planetPR.state})`)}`;
    }


    const planetColor = (colors.planet as any)[planet.name] || colors.planet.unknown;
    
    outputLines.push(`${planetColor(planet.emoji)} ${planetColor(planet.name.padEnd(10))}: ${colors.info(branch)}${prInfo} [${statusLabel}]`);
  }

  note(outputLines.join('\n'), 'Planetary Status');
}
