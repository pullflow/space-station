import { intro, outro, spinner, select, isCancel, note } from '@clack/prompts';
import type { Config } from '../config';
import { getPlanetsDir } from '../config';
import { colors, symbols } from '../ui/theme';
import { listPRs, getPRDetails } from '../utils/github';
import type { PRData } from '../utils/github';
import { getPlanets, PLANET_NAMES } from '../utils/planets';
import { fetchHub, checkout, mergeMain } from '../utils/git';
import { join } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import pc from 'picocolors';

export async function prsCommand(config: Config, projectRoot: string, prNumber?: string, planetName?: string) {
  if (prNumber) {
    await checkoutPR(config, projectRoot, parseInt(prNumber), planetName);
    return;
  }

  intro(colors.primary('Your Pull Requests'));
  
  const s = spinner();
  s.start('Fetching PRs from the cosmos...');
  const prs = await listPRs(config.repo, 'all');
  s.stop('PRs fetched');

  if (prs.length === 0) {
    note('No open PRs found assigned to you, authored by you, or requesting your review.', 'GitHub');
    return;
  }

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

  const choice = await select({
    message: 'Select a PR to explore or checkout:',
    options: prs.map(pr => {
      const prIcon = pr.isDraft ? symbols.prDraft : symbols.pr;
      const reviewStatus = getReviewPill(pr);
      return {
        value: pr.number.toString(),
        label: `${prIcon} ${pr.number}${reviewStatus}: ${pr.title}`,
        hint: pr.state
      };
    }),

  });

  if (isCancel(choice)) return;

  const planetChoice = await select({
    message: 'Which planet should this PR land on?',
    options: [
      { value: 'earth', label: `${symbols.earth} Earth` },
      { value: 'mercury', label: `${symbols.mercury} Mercury` },
      { value: 'venus', label: `${symbols.venus} Venus` },
      { value: 'mars', label: `${symbols.mars} Mars` },
    ],
  });

  if (isCancel(planetChoice)) return;

  await checkoutPR(config, projectRoot, parseInt(choice as string), planetChoice as string);
}

async function checkoutPR(config: Config, projectRoot: string, prNumber: number, planetName: string = 'earth') {
  const s = spinner();
  s.start(`Fetching details for PR #${prNumber}...`);
  
  const pr = await getPRDetails(prNumber, config.repo);
  if (!pr) {
    s.stop(colors.error(`Could not find PR #${prNumber}`));
    return;
  }

  const planetsDir = getPlanetsDir(config);
  const planetDir = join(planetsDir, planetName);
  const hubDir = join(planetsDir, '.hub');

  if (!existsSync(planetDir)) {
    s.stop(colors.error(`Planet directory '${planetName}' does not exist. Run 'ss setup' first.`));
    return;
  }

  s.message(`Preparing ${planetName} for PR #${prNumber}...`);
  
  await fetchHub(hubDir);
  await checkout(pr.headRefName, planetDir);
  
  s.message('Merging latest main...');
  const mergeCode = await mergeMain(planetDir);
  if (mergeCode !== 0) {
    note(colors.warning('Merge had conflicts. Please resolve them manually.'), 'Git Merge');
  }

  // Create PR info file
  const localDir = join(planetDir, '.local');
  if (!existsSync(localDir)) mkdirSync(localDir, { recursive: true });
  
  const prFile = join(localDir, `.pr-${prNumber}.md`);
  const prContent = `# PR #${prNumber}: ${pr.title}\n\n**URL:** ${pr.url}\n\n---\n\n${pr.body}`;
  writeFileSync(prFile, prContent);

  s.stop(colors.success(`PR #${prNumber} checked out on ${planetName}`));

  // Open editor
  s.start(`Opening ${config.editor}...`);
  const editorArgs = config.editor === 'cursor' ? ['--new-window', planetDir, prFile] : [planetDir, prFile];
  await Bun.spawn([config.editor, ...editorArgs]);
  s.stop(colors.success('Editor opened'));
}
