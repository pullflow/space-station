import { Command } from 'commander';
import { intro, outro, select, isCancel } from '@clack/prompts';
import { getAsciiLogo } from './ui/ascii';
import { colors, symbols } from './ui/theme';
import { loadConfig } from './config';
import { join } from 'path';

// Command imports
import { statusCommand } from './commands/status';
import { initCommand } from './commands/init';
import { setupCommand } from './commands/setup';
import { prsCommand } from './commands/prs';
import { issuesCommand } from './commands/issues';
import { resetCommand } from './commands/reset';
import { consoleCommand } from './commands/console';
import { dockCommand } from './commands/dock';

const program = new Command();
const projectRoot = process.cwd();

async function main() {
  program
    .name('ss')
    .description('🛸 Space Station - Manage multiple parallel repo clones')
    .version('2.0.0');

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

  // Load config once for dynamic planet commands
  let config: ReturnType<typeof loadConfig> | undefined;
  try {
    config = loadConfig(projectRoot);
  } catch (e) {}

  // If no arguments, show interactive menu
  if (process.argv.length <= 2) {
    const logo = await getAsciiLogo();
    console.log(logo);
    intro(colors.primary('Welcome to Space Station v2.0.0 🛰️'));

    // If no config exists, go straight to init (which auto-proceeds to setup)
    if (!config) {
      await initCommand(projectRoot);
      return;
    }

    const choice = await select({
      message: 'What would you like to do?',
      options: [
        { value: 'console', label: '🖥️  Launch Console' },
        { value: 'status', label: '📊 Show status' },
        { value: 'prs', label: '🔀 Manage PRs' },
        { value: 'issues', label: '📋 View Issues' },
        { value: 'exit', label: '🚪 Exit' },
      ],
    });

    if (isCancel(choice) || choice === 'exit') {
      outro('Safe travels, commander! 🛸');
      return;
    }

    if (choice === 'console') await consoleCommand(config, projectRoot);
    if (choice === 'status') await statusCommand(config);
    if (choice === 'prs') await prsCommand(config, projectRoot);
    if (choice === 'issues') await issuesCommand(config);
    
    outro('Mission accomplished! 🚀');
    return;
  }

  await program.parseAsync(process.argv);
}

main().catch(err => {
  console.error(colors.error(`\n💥 Error: ${err.message}`));
  process.exit(1);
});
