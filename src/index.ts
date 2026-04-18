import { Command } from 'commander';
import { intro, outro, select, isCancel } from '@clack/prompts';
import { getAsciiLogo } from './ui/ascii';
import { colors, symbols } from './ui/theme';
import { loadConfig, findProjectRoot } from './config';
import { join } from 'path';
import { checkForUpdates, promptForUpdate } from './utils/updates';
import { VERSION } from './utils/version';

// Command imports
import { statusCommand } from './commands/status';
import { initCommand } from './commands/init';
import { setupCommand, symlinkSharedCommand } from './commands/setup';
import { prsCommand } from './commands/prs';
import { issuesCommand } from './commands/issues';
import { dashCommand } from './commands/dash';
import { resetCommand } from './commands/reset';
import { consoleCommand } from './commands/console';
import { dockCommand } from './commands/dock';
import { agentCommand } from './commands/agent';
import { landCommand } from './commands/land';
import { doctorCommand } from './commands/doctor';

const program = new Command();

async function main() {
  const projectRoot = findProjectRoot();

  program
    .name('ss')
    .description(`${symbols.loading} Space Station - Manage multiple parallel repo clones`)
    .version(VERSION);

  program
    .command('status')
    .alias('ls')
    .alias('list')
    .description('Show status of all planets')
    .action(async () => {
      const config = loadConfig(projectRoot);
      await statusCommand(config);
    });

  program
    .command('dash')
    .description('Active issues and PRs dashboard with live refresh')
    .action(async () => {
      const config = loadConfig(projectRoot);
      await dashCommand(config);
    });

  program
    .command('console')
    .alias('cc')
    .alias('bridge')
    .description('Launch the Space Station Command Center (tmux 2x2 grid)')
    .action(async () => {
      const config = loadConfig(projectRoot);
      await consoleCommand(config, projectRoot);
    });

  program
    .command('dock')
    .description('Mission dashboard: status, PRs, issues, and shortcuts')
    .action(async () => {
      const config = loadConfig(projectRoot);
      await dockCommand(config);
    });

  program
    .command('init')
    .description('Initialize Space Station environment')
    .action(async () => {
      await initCommand(projectRoot);
    });

  program
    .command('setup')
    .description('Setup/create all planets and symlink shared files')
    .action(async () => {
      const config = loadConfig(projectRoot);
      await setupCommand(config, projectRoot);
    });

  program
    .command('symlink')
    .description('Symlink shared files to all planets')
    .action(async () => {
      const config = loadConfig(projectRoot);
      await symlinkSharedCommand(config);
    });

  program
    .command('prs [number] [planet]')
    .description('List or checkout PRs')
    .action(async (number, planet) => {
      const config = loadConfig(projectRoot);
      await prsCommand(config, projectRoot, number, planet);
    });

  program
    .command('issues')
    .description('Show assigned issues')
    .action(async () => {
      const config = loadConfig(projectRoot);
      await issuesCommand(config);
    });

  program
    .command('reset [planet]')
    .description('Reset a planet to latest main')
    .option('-f, --force', 'Reset even if the planet has uncommitted changes')
    .action(async (planet, opts) => {
      const config = loadConfig(projectRoot);
      await resetCommand(config, projectRoot, planet, opts.force ?? false);
    });

  program
    .command('agent [planet]')
    .alias('ag')
    .alias('a')
    .description('Launch agent on a planet (auto-detects if in planet folder)')
    .action(async (planet) => {
      const config = loadConfig(projectRoot);
      await agentCommand(config, planet);
    });

  program
    .command('land [planet]')
    .alias('l')
    .description('Reset a planet and launch agent (auto-detects if in planet folder)')
    .action(async (planet) => {
      const config = loadConfig(projectRoot);
      await landCommand(config, projectRoot, planet);
    });

  program
    .command('doctor')
    .alias('dx')
    .description('Diagnose Space Station setup and planet detection from cwd')
    .action(async () => {
      let cfg: ReturnType<typeof loadConfig> | null = null;
      let loadError: Error | null = null;
      try { cfg = loadConfig(projectRoot); } catch (e: any) { loadError = e; }
      await doctorCommand(cfg, projectRoot, loadError);
    });

  // Load config once for dynamic planet commands
  let config: ReturnType<typeof loadConfig> | undefined;
  try {
    config = loadConfig(projectRoot);
  } catch (e) {}

  // If no arguments, show interactive menu
  if (process.argv.length <= 2) {
    const logo = await getAsciiLogo();
    console.log(logo);
    console.log(colors.dim(`  v${VERSION}`));
    // If no config exists, go straight to init (which auto-proceeds to setup)
    if (!config) {
      await initCommand(projectRoot);
      return;
    }

    await promptForUpdate();

    const choice = await select({
      message: 'What would you like to do?',
      options: [
        { value: 'console', label: `${symbols.console} Launch Console` },
        { value: 'status', label: `${symbols.status} Show status` },
        { value: 'prs', label: `${symbols.pr} Manage PRs` },
        { value: 'issues', label: `${symbols.issue} View Issues` },
        { value: 'exit', label: `${symbols.exit} Exit` },
      ],
    });

    if (isCancel(choice) || choice === 'exit') {
      outro(`Safe travels, commander! ${symbols.loading}`);
      return;
    }

    if (choice === 'console') await consoleCommand(config, projectRoot);
    if (choice === 'status') await statusCommand(config);
    if (choice === 'prs') await prsCommand(config, projectRoot);
    if (choice === 'issues') await issuesCommand(config);
    
    outro(`Mission accomplished! ${symbols.rocket}`);
    return;
  }

  await program.parseAsync(process.argv);
}

main().catch(err => {
  console.error(colors.error(`\n${symbols.error} Error: ${err.message}`));
  process.exit(1);
});
