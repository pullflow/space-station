import { intro, outro, spinner, select, isCancel, note } from '@clack/prompts';
import { Config } from '../config';
import { colors } from '../ui/theme';
import { listPRs, getPRDetails } from '../utils/github';
import { getPlanets, PLANET_NAMES } from '../utils/planets';
import { fetchHub, checkout, mergeMain } from '../utils/git';
import { join } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

export async function prsCommand(config: Config, projectRoot: string, prNumber?: string, planetName?: string) {
  if (prNumber) {
    await checkoutPR(config, projectRoot, parseInt(prNumber), planetName);
    return;
  }

  intro(colors.primary('Your Pull Requests'));
  
  const s = spinner();
  s.start('Fetching PRs from the cosmos...');
  const prs = await listPRs(config.REPO, 'all');
  s.stop('PRs fetched');

  if (prs.length === 0) {
    note('No open PRs found assigned to you or authored by you.', 'GitHub');
    return;
  }

  const choice = await select({
    message: 'Select a PR to explore or checkout:',
    options: prs.map(pr => ({
      value: pr.number.toString(),
      label: `#${pr.number}: ${pr.title}`,
      hint: pr.state
    })),
  });

  if (isCancel(choice)) return;

  const planetChoice = await select({
    message: 'Which planet should this PR land on?',
    options: [
      { value: 'earth', label: '3️⃣ Earth' },
      { value: 'mercury', label: '1️⃣ Mercury' },
      { value: 'venus', label: '2️⃣ Venus' },
      { value: 'mars', label: '4️⃣ Mars' },
    ],
  });

  if (isCancel(planetChoice)) return;

  await checkoutPR(config, projectRoot, parseInt(choice as string), planetChoice as string);
}

async function checkoutPR(config: Config, projectRoot: string, prNumber: number, planetName: string = 'earth') {
  const s = spinner();
  s.start(`Fetching details for PR #${prNumber}...`);
  
  const pr = await getPRDetails(prNumber, config.REPO);
  if (!pr) {
    s.stop(colors.error(`Could not find PR #${prNumber}`));
    return;
  }

  const planetDir = join(config.SPACESTATION_DIR, planetName);
  const hubDir = join(config.SPACESTATION_DIR, '.hub');

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
  s.start(`Opening ${config.EDITOR}...`);
  const editorArgs = config.EDITOR === 'cursor' ? ['--new-window', planetDir, prFile] : [planetDir, prFile];
  await Bun.spawn([config.EDITOR, ...editorArgs]);
  s.stop(colors.success('Editor opened'));
}
