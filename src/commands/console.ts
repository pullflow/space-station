import { spawn } from 'child_process';
import { join } from 'path';
import { Config } from '../config';
import { colors } from '../ui/theme';
import { intro, outro, spinner } from '@clack/prompts';

export async function consoleCommand(config: Config, projectRoot: string) {
  intro(colors.primary('Launching Space Station Command Center 🛰️'));

  const s = spinner();
  s.start('Preparing iTerm2 + Tmux environment...');

  const tmuxConfig = join(projectRoot, 'tmux.conf');
  const ssBinary = join(projectRoot, 'ss');

  // AppleScript to launch iTerm2 with our specific configuration
  // 1. Tells iTerm2 to create a new window
  // 2. Uses our local tmux config
  // 3. Immediately runs 'ss' inside tmux to show the menu
  const appleScript = `
    tell application "iTerm"
      activate
      set newWindow to (create window with default profile)
      tell current session of newWindow
        write text "tmux -f ${tmuxConfig} new-session -A -s SpaceStation '${ssBinary}'"
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
      s.stop(colors.success('Command Center active in iTerm2!'));
      outro(colors.info('Shift focus to iTerm2 to begin operations.'));
    } else {
      s.stop(colors.error(`AppleScript exited with code ${code}`));
    }
  });
}
