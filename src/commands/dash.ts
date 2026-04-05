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
    const { color: colorFn, bg: bgFn } = colors.getPillColors(label);
    
    if (label.startsWith('on-')) {
      const planetName = label.replace('on-', '').toLowerCase();
      const planetColor = (colors.planet as any)[planetName];
      const bgPlanetColor = (colors.bgPlanet as any)[planetName];
      const planetIcon = (symbols as any)[planetName]?.trim() || '';
      
      if (planetColor && planetIcon && bgPlanetColor) {
        return colors.multiPill(` ${planetIcon} `, ` ${planetName} `, planetColor, bgPlanetColor, pc.black, pc.bgBlack);
      }
    }
    
    return colors.pill(` ${label} `, colorFn, bgFn);
  };

  async function render() {
    try {
      // Fetch everything upfront
      const [prs, issues, planetsData] = await Promise.all([
        listPRs(config.repo, 'all'),
        listIssues(config.repo),
        Promise.all(getPlanets(config).map(async (planet) => {
          const [branch, gitStatus] = await Promise.all([
            getBranch(planet.dir),
            getStatus(planet.dir)
          ]);
          return { ...planet, branch, gitStatus };
        }))
      ]);

      // Only clear and render once we have all the data
      process.stdout.write(clear);
      console.log(colors.primary(` 🛸 SPACE STATION MISSION DASHBOARD`));
      console.log(colors.dim(`  Refreshing every 30s • Last update: ${new Date().toLocaleTimeString()}\n`));

      // --- Planets Section ---
      console.log(pc.bold(pc.blue(`  ${symbols.status} PLANETS`)));
      for (const planet of planetsData) {
        let statusIcon = colors.success(symbols.success);
        let statusText = pc.green('Ready');
        
        if (planet.gitStatus) {
          statusIcon = colors.warning(symbols.warning);
          const lines = planet.gitStatus.split('\n').filter(l => l.trim() !== '');
          statusText = pc.yellow(`Active (${lines.length})`);
        }

        const planetPR = prs.find(pr => pr.headRefName === planet.branch);
        let prInfo = colors.dim(' (No PR)');
        if (planetPR) {
          prInfo = pc.cyan(` (PR #${planetPR.number})`);
        }

        const planetColor = (colors.planet as any)[planet.name] || colors.planet.unknown;
        const planetIcon = (symbols as any)[planet.name] || symbols.unknown;
        
        // Layout: Icon Name Status Branch PR
        process.stdout.write(`    ${planetColor(planetIcon)} ${planetColor(planet.name.padEnd(10))} ${statusIcon} ${statusText.padEnd(12)} ${pc.white(planet.branch.padEnd(35))} ${prInfo}\n`);
      }

      console.log('');

      // --- Issues Section ---
      console.log(pc.bold(pc.magenta(`  ${symbols.issue} ISSUES `)) + pc.magenta(issues.length));
      if (issues.length === 0) {
        console.log(colors.dim('    No open issues assigned to you.'));
      } else {
        issues.forEach(issue => {
          const labels = issue.labels.map((l: any) => formatLabel(l.name)).join(' ');
          const title = issue.title.length > 60 ? issue.title.slice(0, 57) + '...' : issue.title;
          console.log(`    ${pc.bold(pc.magenta(`#${issue.number.toString().padEnd(5)}`))} ${pc.white(title.padEnd(60))} ${labels}`);
        });
      }

      console.log('');

      // --- PRs Section ---
      console.log(pc.bold(pc.yellow(`  ${symbols.pr} PULL REQUESTS `)) + pc.yellow(prs.length));
      if (prs.length === 0) {
        console.log(colors.dim('    No open PRs found.'));
      } else {
        prs.forEach(pr => {
          const labels = pr.labels.map((l: any) => formatLabel(l.name)).join(' ');
          const title = pr.title.length > 60 ? pr.title.slice(0, 57) + '...' : pr.title;
          
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

          console.log(`    ${pc.bold(pc.yellow(`#${pr.number.toString().padEnd(5)}`))} ${pc.white(title.padEnd(60))} ${labels}${ciStatus}`);
        });
      }

      console.log(`\n  ${colors.dim('Press Ctrl+C to exit dashboard')}`);
    } catch (error: any) {
      // Don't clear on error if we haven't already, so previous data stays visible if possible
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
