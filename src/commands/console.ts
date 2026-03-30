import { spawn } from 'child_process';
import { join } from 'path';
import { Config } from '../config';
import { colors } from '../ui/theme';
import { intro, outro, spinner } from '@clack/prompts';

export async function consoleCommand(config: Config, projectRoot: string) {
  intro(colors.primary('Launching Space Station Command Center 🛰️'));

  const s = spinner();
  s.start('Orchestrating Planet Grid (2x2)...');

  const tmuxConfig = join(projectRoot, 'tmux.conf');
  const ssBinary = join(projectRoot, 'ss');
  const sessionName = 'SpaceStation';
  const socketName = 'SpaceStation';

  const planets = config.PLANETS;
  const ssDir = config.SPACESTATION_DIR.replace(/^~/, process.env.HOME || '');

  // Base command for absolute certainty
  const tmuxBase = `tmux -L ${socketName} -f ${tmuxConfig}`;

  // Use a single line for the basic session setup to avoid race conditions
  // We'll then use send-keys for the rest
  const setupCommands = [
    `${tmuxBase} kill-session -t ${sessionName} 2>/dev/null || true`,
    `${tmuxBase} new-session -d -s ${sessionName} -n "Menu" "${ssBinary}"`,
    `${tmuxBase} new-window -t ${sessionName}:1 -n "Planets"`,
  ];

  const gridCommands = [];
  if (planets.length >= 1) {
    const p1Dir = join(ssDir, planets[0]);
    gridCommands.push(`${tmuxBase} send-keys -t ${sessionName}:1.0 "cd ${p1Dir} && clear" C-m`);
  }

  if (planets.length >= 2) {
    const p2Dir = join(ssDir, planets[1]);
    gridCommands.push(`${tmuxBase} split-window -h -t ${sessionName}:1.0 "cd ${p2Dir} && clear && exec $SHELL"`);
  }

  if (planets.length >= 3) {
    const p3Dir = join(ssDir, planets[2]);
    gridCommands.push(`${tmuxBase} split-window -v -t ${sessionName}:1.0 "cd ${p3Dir} && clear && exec $SHELL"`);
  }

  if (planets.length >= 4) {
    const p4Dir = join(ssDir, planets[3]);
    gridCommands.push(`${tmuxBase} split-window -v -t ${sessionName}:1.1 "cd ${p4Dir} && clear && exec $SHELL"`);
  }

  const commands = [
    `cd "${projectRoot}"`,
    ...setupCommands,
    ...gridCommands,
    `${tmuxBase} select-window -t ${sessionName}:0`,
    `${tmuxBase} attach-session -t ${sessionName}`,
  ];

  // We add a tiny delay between commands in AppleScript to let the tmux server catch up
  const appleScriptLines = commands.map(cmd => `write text "${cmd.replace(/"/g, '\\"')}"\ndelay 0.1`).join('\n        ');

  const appleScript = `
    tell application "iTerm"
      activate
      set newWindow to (create window with default profile)
      tell current session of newWindow
        ${appleScriptLines}
      end tell
    end tell
  `;

  const child = spawn('osascript', ['-e', appleScript]);

  child.on('error', (err) => {
    s.stop(colors.error('Failed to launch iTerm2 via AppleScript'));
    console.error(err);
  });

  child.on('exit', (code) => {
    if (code === 0) {
      s.stop(colors.success('Command Center active!'));
      outro(colors.info('Shift focus to iTerm2. Window 0 = Menu | Window 1 = Planets.'));
    } else {
      s.stop(colors.error(`AppleScript exited with code ${code}`));
    }
  });
}
