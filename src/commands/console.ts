import { spawn } from 'child_process';
import { join } from 'path';
import { Config } from '../config';
import { colors } from '../ui/theme';
import { intro, outro, spinner } from '@clack/prompts';

export async function consoleCommand(config: Config, projectRoot: string) {
  intro(colors.primary('Launching Space Station Command Center 🛰️'));

  const s = spinner();
  s.start('Orchestrating Planet Grid (2x2)...');

  const tmuxConfig = './tmux.conf'; 
  const ssBinary = './ss';
  const sessionName = 'SpaceStation';
  const socketName = 'SpaceStation'; // Use a dedicated socket for isolation

  const planets = config.PLANETS;
  const ssDir = config.SPACESTATION_DIR.replace(/^~/, process.env.HOME || '');

  // We use -L to specify a unique socket name. 
  // This prevents interference with any other running tmux sessions/servers.
  const tmuxBase = `tmux -L ${socketName} -f ${tmuxConfig}`;

  const commands = [
    `cd "${projectRoot}"`,
    `${tmuxBase} kill-session -t ${sessionName} 2>/dev/null`,
    `${tmuxBase} new-session -d -s ${sessionName} -n "Menu" "${ssBinary}"`,
    `${tmuxBase} new-window -t ${sessionName}:1 -n "Planets"`,
  ];

  if (planets.length >= 1) {
    const p1Dir = join(ssDir, planets[0]);
    commands.push(`${tmuxBase} send-keys -t ${sessionName}:1.0 "cd ${p1Dir} && clear" C-m`);
  }

  if (planets.length >= 2) {
    const p2Dir = join(ssDir, planets[1]);
    commands.push(`${tmuxBase} split-window -h -t ${sessionName}:1.0 "cd ${p2Dir} && clear && exec $SHELL"`);
  }

  if (planets.length >= 3) {
    const p3Dir = join(ssDir, planets[2]);
    commands.push(`${tmuxBase} split-window -v -t ${sessionName}:1.0 "cd ${p3Dir} && clear && exec $SHELL"`);
  }

  if (planets.length >= 4) {
    const p4Dir = join(ssDir, planets[3]);
    commands.push(`${tmuxBase} split-window -v -t ${sessionName}:1.1 "cd ${p4Dir} && clear && exec $SHELL"`);
  }

  commands.push(`${tmuxBase} select-window -t ${sessionName}:0`);
  commands.push(`${tmuxBase} attach-session -t ${sessionName}`);

  const appleScriptLines = commands.map(cmd => `write text "${cmd.replace(/"/g, '\\"')}"`).join('\n        ');

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
      s.stop(colors.success('Command Center active! Isolated on socket "SpaceStation".'));
      outro(colors.info('Shift focus to iTerm2. Window 0 = Menu | Window 1 = Planets.'));
    } else {
      s.stop(colors.error(`AppleScript exited with code ${code}`));
    }
  });
}
