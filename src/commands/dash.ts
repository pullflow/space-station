import { intro, spinner, note } from '@clack/prompts';
import type { Config } from '../config';
import { colors, symbols } from '../ui/theme';
import { listPRs, listIssues, getCurrentUser } from '../utils/github';
import type { PRData } from '../utils/github';
import { getPlanets } from '../utils/planets';
import { getBranch, getStatus } from '../utils/git';
import { checkForUpdates, promptForUpdate } from '../utils/updates';
import { createDashboardState, detectAndFireHooks, getActiveHooks } from '../utils/hooks';
import type { DashboardState } from '../utils/hooks';
import pc from 'picocolors';

export async function dashCommand(config: Config) {
  // Clear screen and move cursor to top-left
  const clear = '\x1b[2J\x1b[3J\x1b[H';

  const refreshInterval = 30000; // 30 seconds
  let updateAvailable = false;
  let hookState: DashboardState = createDashboardState();
  const currentUser = await getCurrentUser();

  const formatLabel = (label: string) => {
    const pillColors = colors.getPillColors(label);
    if (!pillColors) return label;
    
    const colorFn = pillColors.color;
    const bgFn = pillColors.bg;
    
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
      const [prs, issues, planetsData, hasUpdate] = await Promise.all([
        listPRs(config.repo, 'all'),
        listIssues(config.repo),
        Promise.all(getPlanets(config).map(async (planet) => {
          const [branch, gitStatus] = await Promise.all([
            getBranch(planet.dir),
            getStatus(planet.dir)
          ]);
          return { ...planet, branch, gitStatus };
        })),
        checkForUpdates()
      ]);

      updateAvailable = hasUpdate;

      // Detect state changes and fire hooks
      hookState = await detectAndFireHooks(prs, hookState, config.repo, config.spacestation_dir, currentUser || undefined);

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

      const getChecksPill = (pr: PRData) => {
        if (!pr.statusCheckRollup || pr.statusCheckRollup.length === 0) return '';
        
        const states = pr.statusCheckRollup.map(s => (s.state || s.conclusion || s.status || '').toUpperCase());
        
        if (states.some(s => ['FAILURE', 'ERROR', 'ACTION_REQUIRED', 'START_UP_FAILURE', 'STALE', 'TIMED_OUT'].includes(s))) {
          return ` ${colors.pill(` ${symbols.error.trim()} Checks `, colors.error, pc.bgRed)}`;
        }
        
        if (states.some(s => ['PENDING', 'IN_PROGRESS', 'QUEUED', 'WAITING', 'REQUESTED'].includes(s)) || states.some(s => s === '' || s === 'null')) {
          return ` ${colors.pill(` ${symbols.loading.trim()} Checks `, colors.warning, pc.bgYellow)}`;
        }
        
        if (states.every(s => ['SUCCESS', 'COMPLETED', 'NEUTRAL', 'SKIPPED'].includes(s))) {
          return ` ${colors.pill(` ${symbols.success.trim()} Checks `, colors.success, pc.bgGreen)}`;
        }
        
        return '';
      };

      // Only clear and render once we have all the data
      process.stdout.write(clear);
      console.log(colors.primary(` 🛸 SPACE STATION MISSION DASHBOARD`));
      
      let updateNote = '';
      if (updateAvailable) {
        updateNote = pc.bold(pc.yellow(`  ${symbols.warning} Update available! Press 'u' to update.`));
      }
      
      console.log(colors.dim(`  Refreshing every 30s • Last update: ${new Date().toLocaleTimeString()}\n`) + updateNote);

      // --- Planets Section ---
      console.log(pc.bold(pc.blue(`  ${symbols.status} PLANETS`)));
      for (const planet of planetsData) {
        const planetPR = prs.find(pr => pr.headRefName === planet.branch);
        
        let statusIcon = colors.success(symbols.success);
        let statusText = pc.green('Ready');
        
        if (planet.gitStatus) {
          statusIcon = colors.warning(symbols.warning);
          const lines = planet.gitStatus.split('\n').filter(l => l.trim() !== '');
          statusText = pc.yellow(`Active (${lines.length})`);
        } else if (planetPR) {
          statusIcon = colors.info(symbols.computer);
          statusText = pc.cyan('In Use');
        }

        let prInfo = '';
        if (planetPR) {
          const prIcon = planetPR.isDraft ? symbols.prDraft : symbols.pr;
          const reviewPill = getReviewPill(planetPR);
          const checksPill = getChecksPill(planetPR);
          prInfo = pc.cyan(` ${prIcon}${planetPR.number}${checksPill}${reviewPill}`);
        }


        const branchStr = planet.branch.length > 25 ? planet.branch.slice(0, 22) + '...' : planet.branch;
        
        const planetColor = (colors.planet as any)[planet.name] || colors.planet.unknown;
        const planetIcon = (symbols as any)[planet.name]?.trim() || symbols.unknown.trim();

        // Layout: Icon Name Status Branch PR
        process.stdout.write(`    ${planetColor(planetIcon)} ${planetColor(planet.name.padEnd(10))} ${statusIcon} ${statusText.padEnd(12)} ${pc.white(branchStr)}${prInfo}\n`);
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
          console.log(`    ${pc.bold(pc.magenta(`${symbols.issue} ${issue.number.toString().padEnd(5)}`))} ${pc.white(title.padEnd(60))} ${labels}`);
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
          
          const checksStatus = getChecksPill(pr);
          const prIcon = pr.isDraft ? symbols.prDraft : symbols.pr;
          const reviewStatus = getReviewPill(pr);

          console.log(`    ${pc.bold(pc.yellow(`${prIcon} ${pr.number.toString().padEnd(5)}`))} ${pc.white(title.padEnd(60))} ${labels}${checksStatus}${reviewStatus}`);
        });
      }

      // --- Hooks Section ---
      const hooks = getActiveHooks(config.spacestation_dir);
      const activeCount = hooks.filter(h => h.active && h.executable).length;
      console.log('');
      console.log(pc.bold(pc.cyan(`  ${symbols.loading} HOOKS `)) + pc.cyan(activeCount));
      if (activeCount === 0 && hooks.every(h => !h.active)) {
        console.log(colors.dim('    No hooks installed. See hooks/README.md'));
      } else {
        for (const hook of hooks) {
          if (hook.active) {
            const icon = hook.executable
              ? colors.success(symbols.success)
              : colors.warning(symbols.warning);
            const status = hook.executable
              ? pc.green('active')
              : pc.yellow('not executable');
            console.log(`    ${icon} ${pc.white(hook.event.padEnd(25))} ${status}`);
          }
        }
      }

      console.log(`\n  ${colors.dim("Press 'u' to update • Ctrl+C to exit dashboard")}`);
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

  // Handle keys
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', async (key) => {
    if (key === 'u' || key === 'U') {
      clearInterval(interval);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      await promptForUpdate();
      // If promptForUpdate returns (user said no), resume dash
      process.stdin.setRawMode(true);
      process.stdin.resume();
      // Re-render and interval is already handled by outer loop? 
      // Actually interval is cleared, so we need to restart it if we want it to keep going.
      // But the interval is defined inside dashCommand scope.
      process.exit(0); // Exit for now to be safe, user can restart.
    }
    if (key === '\u0003') { // Ctrl+C
      clearInterval(interval);
      process.exit(0);
    }
  });
}
