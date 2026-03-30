import { spawn } from 'child_process';
import { join } from 'path';
import { Config } from '../config';
import { colors } from '../ui/theme';
import { intro, outro, spinner } from '@clack/prompts';

export async function consoleCommand(config: Config, projectRoot: string) {
  intro(colors.primary('Launching Space Station Command Center 🛰️'));

  const s = spinner();
  s.start('Preparing Mission Control (Isolated Environment)...');

  const launcherScript = join(projectRoot, 'bridge-launch.sh');
  const ssDir = config.SPACESTATION_DIR.replace(/^~/, process.env.HOME || '');
  const planetsList = config.PLANETS.join(',');

  // The launcher handles all the complex tmux orchestration in one shot
  const launchCommand = `bash "${launcherScript}" "${projectRoot}" "${ssDir}" "${planetsList}"`;

  const appleScript = `
    tell application "iTerm"
      activate
      set newWindow to (create window with default profile)
      tell current session of newWindow
        write text "${launchCommand.replace(/"/g, '\\"')}"
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
      s.stop(colors.success('Command Center active! (Socket: SpaceStation)'));
      outro(colors.info('Shift focus to iTerm2. Window 0 = Menu | Window 1 = Planets (2x2 Grid).'));
    } else {
      s.stop(colors.error(`AppleScript exited with code ${code}`));
    }
  });
}
