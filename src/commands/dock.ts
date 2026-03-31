import { spinner } from '@clack/prompts';
import type { Config } from '../config';
import { getPlanets } from '../utils/planets';
import { getBranch, getStatus } from '../utils/git';
import { listPRs, listIssues } from '../utils/github';
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

  const branches = await Promise.all(
    planets.map(p => getBranch(p.dir))
  );
  const statuses = await Promise.all(
    planets.map(p => getStatus(p.dir))
  );

  s.stop('');

  // Planets
  section('PLANETS');
  for (let i = 0; i < planets.length; i++) {
    const planet = planets[i];
    const branch = branches[i];
    const dirty = statuses[i];
    const planetColor = (colors.planet as any)[planet.name] || colors.planet.unknown;
    const stateStr = dirty
      ? colors.warning(`${symbols.warning} active`)
      : colors.success(`${symbols.success} free`);
    const pr = prs.find(p => p.headRefName === branch);
    const prStr = pr ? colors.info(`${symbols.pr} PR#${pr.number}`) : pc.dim('no PR');
    console.log(
      `  ${planetColor(planet.emoji)} ${planetColor(planet.name.padEnd(10))} ${pc.dim(branch.slice(0, 22).padEnd(22))} ${stateStr.padEnd(14)} ${prStr}`
    );
  }

  // PRs
  section('PULL REQUESTS');
  if (prs.length === 0) {
    console.log(pc.dim('  No open PRs'));
  } else {
    for (const pr of prs.slice(0, 8)) {
      const num = colors.info(`#${pr.number}`.padEnd(6));
      const title = pr.title.length > 40 ? pr.title.slice(0, 38) + '…' : pr.title;
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
      const num = colors.warning(`#${issue.number}`.padEnd(6));
      const title = issue.title.length > 40 ? issue.title.slice(0, 38) + '…' : issue.title;
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
  ];
  for (const [key, desc] of shortcuts) {
    console.log(`  ${colors.info(key.padEnd(22))} ${pc.dim(desc)}`);
  }

  console.log('');
}
