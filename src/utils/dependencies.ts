import { run } from './shell';
import { spinner } from '@clack/prompts';
import { colors } from '../ui/theme';
import { join } from 'path';

export async function checkSystemDependencies() {
  const s = spinner();
  s.start('Checking system dependencies (Homebrew, Tmux, iTerm2)...');

  // 1. Check for Homebrew
  const brewCheck = await run('which', ['brew']);
  if (brewCheck.exitCode !== 0) {
    s.stop(colors.error('Homebrew is not installed. Please install it from https://brew.sh'));
    return false;
  }

  // 2. Check and Install Tmux
  const tmuxCheck = await run('which', ['tmux']);
  if (tmuxCheck.exitCode !== 0) {
    s.message('Installing tmux via Homebrew...');
    await run('brew', ['install', 'tmux']);
  }

  // 3. Check and Install iTerm2
  const itermCheck = await run('ls', ['-d', '/Applications/iTerm.app']);
  if (itermCheck.exitCode !== 0) {
    s.message('Installing iTerm2 via Homebrew Cask...');
    await run('brew', ['install', '--cask', 'iterm2']);
  }

  // 4. Check for Powerline-compatible fonts
  const fontCheck = await run('mdfind', ['kind:font', '"JetBrainsMono Nerd Font"']);
  if (fontCheck.stdout.length === 0) {
    s.message('Installing "font-jetbrains-mono-nerd-font"...');
    await run('brew', ['install', '--cask', 'font-jetbrains-mono-nerd-font']);
  }

  // 5. Configure iTerm2 Preferences Folder
  s.message('Configuring iTerm2 to use local Space Station settings...');
  const projectRoot = process.cwd();
  const iterm2Folder = join(projectRoot, 'iterm2');
  
  await run('defaults', ['write', 'com.googlecode.iterm2.plist', 'PrefsCustomFolder', '-string', iterm2Folder]);
  await run('defaults', ['write', 'com.googlecode.iterm2.plist', 'LoadPrefsFromCustomFolder', '-bool', 'true']);
  await run('defaults', ['write', 'com.googlecode.iterm2.plist', 'NoSyncNeverRemindPrefsChangesLostForFile', '-bool', 'true']);

  s.stop(colors.success('System dependencies and iTerm2 linked. 🚀'));
  return true;
}
