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

  const planets = config.PLANETS;
  const ssDir = config.SPACESTATION_DIR.replace(/^~/, process.env.HOME || '');

  // We'll use a single shell string to:
  // 1. Kill any existing session
  // 2. Start a new detached session
  // 3. Orchestrate windows and panes
  // 4. Finally attach
  
  const setupCommand = [
    `tmux -f ${tmuxConfig} kill-session -t ${sessionName} 2>/dev/null`,
    `tmux -f ${tmuxConfig} new-session -d -s ${sessionName} -n "Menu" "${ssBinary}"`,
    `tmux -f ${tmuxConfig} new-window -t ${sessionName}:1 -n "Planets"`,
  ].join('; ');

  const gridCommands = [];
  if (planets.length >= 1) {
    const p1Dir = join(ssDir, planets[0]);
    gridCommands.push(`tmux send-keys -t ${sessionName}:1.0 "cd ${p1Dir} && clear" C-m`);
  }

  if (planets.length >= 2) {
    const p2Dir = join(ssDir, planets[1]);
    gridCommands.push(`tmux split-window -h -t ${sessionName}:1.0 "cd ${p2Dir} && clear && exec $SHELL"`);
  }

  if (planets.length >= 3) {
    const p3Dir = join(ssDir, planets[2]);
    gridCommands.push(`tmux split-window -v -t ${sessionName}:1.0 "cd ${p3Dir} && clear && exec $SHELL"`);
  }

  if (planets.length >= 4) {
    const p4Dir = join(ssDir, planets[3]);
    gridCommands.push(`tmux split-window -v -t ${sessionName}:1.1 "cd ${p4Dir} && clear && exec $SHELL"`);
  }

  const finalizeCommand = [
    ...gridCommands,
    `tmux select-window -t ${sessionName}:0`,
    `tmux attach-session -t ${sessionName}`
  ].join('; ');

  const fullCommand = `${setupCommand}; ${finalizeCommand}`;

  const appleScript = `
    tell application "iTerm"
      activate
      set newWindow to (create window with default profile)
      tell current session of newWindow
        write text "${fullCommand.replace(/"/g, '\\"')}"
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
