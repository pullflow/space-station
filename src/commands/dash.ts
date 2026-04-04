import { intro, spinner, note } from '@clack/prompts';
import type { Config } from '../config';
import { colors, symbols } from '../ui/theme';
import { listPRs, listIssues, PRData } from '../utils/github';
import { getPlanets } from '../utils/planets';
import { getBranch, getStatus } from '../utils/git';
import pc from 'picocolors';

export async function dashCommand(config: Config) {
  // Clear screen and move cursor to top-left
  const clear = '\x1b[2J\x1b[3J\x1b[H';
  
  const refreshInterval = 30000; // 30 seconds

  const formatLabel = (label: string) => {
    if (label.startsWith('on-')) {
      const planetName = label.replace('on-', '').toLowerCase();
      const planetColor = (colors.planet as any)[planetName];
      const planetIcon = (symbols as any)[planetName];
      
      if (planetColor && planetIcon) {
        return planetColor(`${planetIcon}${planetName}`);
      }
    }
    return pc.cyan(`[${label}]`);
  };

  async function render() {
    process.stdout.write(clear);
    console.log(colors.primary(` 🛸 SPACE STATION MISSION DASHBOARD`));
    console.log(colors.dim(`  Refreshing every 30s • Last update: ${new Date().toLocaleTimeString()}\n`));

    try {
      const [prs, issues] = await Promise.all([
        listPRs(config.repo, 'all'),
        listIssues(config.repo)
      ]);

      const planets = getPlanets(config);

      // --- Planets Section ---
      console.log(pc.bold(pc.blue(`  ${symbols.status} PLANETS`)));
      for (const planet of planets) {
        const branch = await getBranch(planet.dir);
        const gitStatus = await getStatus(planet.dir);
        
        let statusIcon = colors.success(symbols.success);
        let statusText = pc.green('Ready');
        
        if (gitStatus) {
          statusIcon = colors.warning(symbols.warning);
          const lines = gitStatus.split('\n').filter(l => l.trim() !== '');
          statusText = pc.yellow(`Active (${lines.length} changes)`);
        }

        const planetPR = prs.find(pr => pr.headRefName === branch);
        let prInfo = colors.dim(' (No PR)');
        if (planetPR) {
          prInfo = pc.cyan(` (PR #${planetPR.number})`);
        }

        const planetColor = (colors.planet as any)[planet.name] || colors.planet.unknown;
        const planetIcon = (symbols as any)[planet.name] || symbols.unknown;
        
        console.log(`    ${planetColor(planetIcon)} ${planetColor(planet.name.padEnd(8))} ${pc.white(branch.padEnd(20))} ${statusIcon} ${statusText}${prInfo}`);
      }

      console.log('');

      // --- Issues Section ---
      console.log(pc.bold(pc.magenta(`  ${symbols.issue} ISSUES (${issues.length})`)));
      if (issues.length === 0) {
        console.log(colors.dim('    No open issues assigned to you.'));
      } else {
        issues.forEach(issue => {
          const labels = issue.labels.map((l: any) => formatLabel(l.name)).join(' ');
          console.log(`    ${colors.success(`#${issue.number.toString().padEnd(5)}`)} ${pc.white(issue.title)} ${labels}`);
        });
      }

      console.log('');

      // --- PRs Section ---
      console.log(pc.bold(pc.yellow(`  ${symbols.pr} PULL REQUESTS (${prs.length})`)));
      if (prs.length === 0) {
        console.log(colors.dim('    No open PRs found.'));
      } else {
        prs.forEach(pr => {
          const labels = pr.labels.map((l: any) => formatLabel(l.name)).join(' ');
          
          // CI/CD state
          let ciStatus = '';
          if (pr.statusCheckRollup && pr.statusCheckRollup.length > 0) {
            const states = pr.statusCheckRollup.map(s => s.state || s.conclusion || s.status);
            if (states.includes('FAILURE') || states.includes('failure') || states.includes('action_required')) {
              ciStatus = colors.error(` ${symbols.error}CI FAIL`);
            } else if (states.includes('PENDING') || states.includes('pending') || states.includes('in_progress')) {
              ciStatus = colors.warning(` ${symbols.loading}CI PENDING`);
            } else {
              ciStatus = colors.success(` ${symbols.success}CI PASS`);
            }
          }

          console.log(`    ${colors.success(`#${pr.number.toString().padEnd(5)}`)} ${pc.white(pr.title)} ${labels}${ciStatus}`);
        });
      }

      console.log(`\n  ${colors.dim('Press Ctrl+C to exit dashboard')}`);
    } catch (error: any) {
      console.log(colors.error(`\n  Error fetching dashboard data: ${error.message}`));
    }
  }

  // Initial render
  await render();

  // Refresh loop
  const interval = setInterval(async () => {
    await render();
  }, refreshInterval);

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    clearInterval(interval);
    process.exit(0);
  });
}
