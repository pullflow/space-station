import { Command } from 'commander';
import { intro, outro, select, isCancel } from '@clack/prompts';
import { getAsciiLogo } from './ui/ascii';
import { colors, symbols } from './ui/theme';
import { loadConfig } from './config';
import { join, basename } from 'path';

// Command imports
import { statusCommand } from './commands/status';
import { initCommand } from './commands/init';
import { setupCommand, symlinkSharedCommand } from './commands/setup';
import { prsCommand } from './commands/prs';
import { issuesCommand, syncIssuesCommand } from './commands/issues';
import { agentCommand } from './commands/agent';
import { resetCommand } from './commands/reset';
import { landCommand } from './commands/land';
import { planetCommand } from './commands/planet';
import { getPlanets } from './utils/planets';

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
    .command('sync')
    .description('Sync GitHub issues to todo.md')
    .action(async () => {
      const config = loadConfig(projectRoot);
      await syncIssuesCommand(config);
    });

  program
    .command('agent [type] [number]')
    .description('Run agent (from planet folder)')
    .action(async (type, number) => {
      const config = loadConfig(projectRoot);
      await agentCommand(config, type, number);
    });

  program
    .command('reset')
    .description('Reset current planet to latest main')
    .action(async () => {
      const config = loadConfig(projectRoot);
      await resetCommand(config);
    });

  program
    .command('land')
    .description('Open current planet in editor')
    .action(async () => {
      const config = loadConfig(projectRoot);
      await landCommand(config);
    });

  program
    .command('prompt')
    .description('Return the symbol for the current planet (for shell integration)')
    .action(async () => {
      try {
        const config = loadConfig(projectRoot);
        const planets = getPlanets(config);
        const currentDir = basename(process.cwd()).toLowerCase();
        const currentPlanet = planets.find(p => p.name === currentDir);
        process.stdout.write(currentPlanet ? currentPlanet.emoji : '🛸');
      } catch (e) {
        process.stdout.write('🛸');
      }
    });

  // Load config once for dynamic planet commands
  let config;
  try {
    config = loadConfig(projectRoot);
    // Planet shortcuts based on config
    config.PLANETS.forEach(p => {
      program
        .command(p)
        .description(`Reset and open ${p}`)
        .action(async () => {
          await planetCommand(config, p);
        });
    });
  } catch (e) {}

  // If no arguments, show interactive menu
  if (process.argv.length <= 2) {
    const logo = await getAsciiLogo();
    console.log(logo);
    intro(colors.primary('Welcome to Space Station'));
    
    const choice = await select({
      message: 'What would you like to do?',
      options: [
        { value: 'status', label: '📊 Show status' },
        { value: 'prs', label: '🔀 Manage PRs' },
        { value: 'issues', label: '📋 View Issues' },
        { value: 'sync', label: '🔄 Sync Issues to todo.md' },
        { value: 'symlink', label: '🔗 Symlink shared files' },
        { value: 'setup', label: '⚙️  Setup Planets' },
        { value: 'init', label: '🪄  Run Setup Wizard' },
        { value: 'exit', label: '🚪 Exit' },
      ],
    });

    if (isCancel(choice) || choice === 'exit') {
      outro('Safe travels, commander! 🛸');
      return;
    }

    if (choice === 'init') {
      await initCommand(projectRoot);
      return;
    }

    if (!config) {
      console.error(colors.error('Error: Please run `ss init` first.'));
      return;
    }

    if (choice === 'status') await statusCommand(config);
    if (choice === 'prs') await prsCommand(config, projectRoot);
    if (choice === 'issues') await issuesCommand(config);
    if (choice === 'sync') await syncIssuesCommand(config);
    if (choice === 'symlink') await symlinkSharedCommand(config);
    if (choice === 'setup') await setupCommand(config, projectRoot);
    
    outro('Mission accomplished! 🚀');
    return;
  }

  await program.parseAsync(process.argv);
}

main().catch(err => {
  console.error(colors.error(`\n💥 Error: ${err.message}`));
  process.exit(1);
});
