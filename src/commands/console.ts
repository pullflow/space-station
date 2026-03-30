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

  // We'll build a script to set up the 2x2 grid
  // Window 0: The Interactive Menu
  // Window 1: The Planet Grid (2x2)
  
  const planets = config.PLANETS; // Ordered nearest to sun: mercury, venus, earth, mars
  const ssDir = config.SPACESTATION_DIR.replace(/^~/, process.env.HOME || '');

  // Construct tmux commands for the 2x2 grid in window 1
  const tmuxCommands = [
    `new-session -d -s ${sessionName} -n "Menu" "${ssBinary}"`,
    `new-window -t ${sessionName}:1 -n "Planets"`,
  ];

  if (planets.length >= 1) {
    const p1Dir = join(ssDir, planets[0]);
    tmuxCommands.push(`send-keys -t ${sessionName}:1.0 "cd ${p1Dir} && clear" C-m`);
  }

  if (planets.length >= 2) {
    const p2Dir = join(ssDir, planets[1]);
    tmuxCommands.push(`split-window -h -t ${sessionName}:1.0 "cd ${p2Dir} && clear && exec $SHELL"`);
  }

  if (planets.length >= 3) {
    const p3Dir = join(ssDir, planets[2]);
    tmuxCommands.push(`split-window -v -t ${sessionName}:1.0 "cd ${p3Dir} && clear && exec $SHELL"`);
  }

  if (planets.length >= 4) {
    const p4Dir = join(ssDir, planets[3]);
    tmuxCommands.push(`split-window -v -t ${sessionName}:1.1 "cd ${p4Dir} && clear && exec $SHELL"`);
  }

  // Ensure we select the first window (the menu) on launch
  tmuxCommands.push(`select-window -t ${sessionName}:0`);

  const fullTmuxCommand = `tmux -f ${tmuxConfig} ${tmuxCommands.join(' \\; ')}`;

  const appleScript = `
    tell application "iTerm"
      activate
      set newWindow to (create window with default profile)
      tell current session of newWindow
        write text "${fullTmuxCommand.replace(/"/g, '\\"')}"
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
      s.stop(colors.success('Command Center active! Window 1 orchestrated (2x2 Grid).'));
      outro(colors.info('Shift focus to iTerm2. Window 0 = Menu | Window 1 = Planets.'));
    } else {
      s.stop(colors.error(`AppleScript exited with code ${code}`));
    }
  });
}
