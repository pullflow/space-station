import { spinner } from '@clack/prompts';
import type { Config } from '../config';
import { getPlanets } from '../utils/planets';
import { getBranch, getStatus } from '../utils/git';
import { listPRs, listIssues } from '../utils/github';
import type { PRData } from '../utils/github';
import { colors, symbols } from '../ui/theme';
import pc from 'picocolors';

function section(title: string) {
  const bar = '─'.repeat(36);
  console.log('');
  console.log(pc.bold(pc.cyan(`  ${title}`)));
  console.log(pc.dim(`  ${bar}`));
}

function row(label: string, value: string) {
  console.log(`  ${label.padEnd(28)}${value}`);
}

export async function dockCommand(config: Config) {
  // Header
  console.clear();
  console.log('');
  console.log(colors.primary('  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓'));
  console.log(colors.primary('  ┃       SPACE STATION — DOCK           ┃'));
  console.log(colors.primary('  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛'));

  const s = spinner();
  s.start('Loading mission data...');

  const [planets, prs, issues] = await Promise.all([
    Promise.resolve(getPlanets(config)),
    listPRs(config.repo, 'all'),
    listIssues(config.repo),
  ]);

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

  const planetData = await Promise.all(
    planets.map(async p => {
      const [branch, dirty] = await Promise.all([
        getBranch(p.dir),
        getStatus(p.dir)
      ]);
      return { planet: p, branch, dirty };
    })
  );

  s.stop('');

  // Planets
  section('PLANETS');
  for (const { planet, branch, dirty } of planetData) {
    const planetColor = (colors.planet as any)[planet.name] || colors.planet.unknown;
    const branchStr = branch.length > 25 ? branch.slice(0, 22) + '...' : branch;
    const pr = prs.find(p => p.headRefName === branch);
    
    let stateStr = colors.success(`${symbols.success} free`);
    if (dirty) {
      stateStr = colors.warning(`${symbols.warning} active`);
    } else if (pr) {
      stateStr = colors.info(`${symbols.computer} in use`);
    }

    let prStr = '';
    if (pr) {
      const prIcon = pr.isDraft ? symbols.prDraft : symbols.pr;
      const reviewPill = getReviewPill(pr);
      prStr = colors.info(` ${prIcon}${pr.number}${reviewPill}`);
    }

    console.log(
      `  ${planetColor(planet.emoji)} ${planetColor(planet.name.padEnd(10))} ${pc.dim(branchStr)} ${stateStr.padEnd(14)}${prStr}`
    );
  }

  // PRs
  section('PULL REQUESTS');
  if (prs.length === 0) {
    console.log(pc.dim('  No open PRs'));
  } else {
    for (const pr of prs.slice(0, 8)) {
      const prIcon = pr.isDraft ? symbols.prDraft : symbols.pr;
      const reviewStatus = getReviewPill(pr);
      const num = colors.info(`${prIcon} ${pr.number}${reviewStatus}`.padEnd(30));
      const title = pr.title.length > 60 ? pr.title.slice(0, 58) + '…' : pr.title;
      console.log(`  ${num} ${title}`);
    }
    if (prs.length > 8) console.log(pc.dim(`  󰇘 and ${prs.length - 8} more`));
  }

  // Issues
  section('ISSUES');
  if (issues.length === 0) {
    console.log(pc.dim('  No assigned issues'));
  } else {
    for (const issue of issues.slice(0, 8)) {
      const num = colors.warning(`${symbols.issue} ${issue.number}`.padEnd(10));
      const title = issue.title.length > 60 ? issue.title.slice(0, 58) + '…' : issue.title;
      console.log(`  ${num} ${title}`);
    }
    if (issues.length > 8) console.log(pc.dim(`  󰇘 and ${issues.length - 8} more`));
  }

  // Keyboard shortcuts
  section('SHORTCUTS');
  const shortcuts: [string, string][] = [
    ['ss status', 'Planet overview'],
    ['ss prs', 'Browse & checkout PRs'],
    ['ss issues', 'View assigned issues'],
    ['ss reset <planet>', 'Reset planet to main'],
    ['ss console', 'Relaunch console'],
    ['prefix + hjkl', 'Navigate panes'],
    ['prefix + r', 'Reload tmux config'],
    ['Ctrl + Tab', 'Next window'],
    ['Ctrl + Shift + Tab', 'Previous window'],
  ];
  for (const [key, desc] of shortcuts) {
    console.log(`  ${colors.info(key.padEnd(22))} ${pc.dim(desc)}`);
  }

  console.log('');
}
