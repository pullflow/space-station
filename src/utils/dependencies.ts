import { run } from './shell';
import { spinner, select, isCancel } from '@clack/prompts';
import { colors } from '../ui/theme';
import { join, basename } from 'path';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';

export async function checkSystemDependencies() {
  const s = spinner();
  const projectRoot = process.cwd();

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
  s.stop(colors.success('Core tools verified.'));

  // 4. Handle Nerd Font Selection/Installation
  s.start('Searching for Nerd Fonts...');
  const fontCheck = await run('mdfind', ['kind:font', '"Nerd Font"']);
  const fontPaths = fontCheck.stdout.split('\n').filter(p => p.trim() !== '');
  s.stop(colors.success(`Found ${fontPaths.length} Nerd Font files.`));

  let selectedFont = 'JetBrainsMonoNerdFontComplete-Regular';

  if (fontPaths.length > 0) {
    // Extract unique family names from paths (approximation)
    const families = new Set<string>();
    fontPaths.forEach(p => {
      const b = basename(p).replace(/\.(ttf|otf)$/i, '');
      // Clean up common suffixes to guess the family name iTerm2 likes
      const family = b.split('-')[0].split(' ')[0];
      if (family) families.add(family);
    });

    const choice = await select({
      message: 'Which Nerd Font would you like to use for the Space Station?',
      options: [
        { value: 'default', label: '🚀 Install/Use JetBrains Mono Nerd Font (Recommended)' },
        ...Array.from(families).map(f => ({ value: f, label: `󰛖  Use existing: ${f}` }))
      ]
    });

    if (isCancel(choice)) return false;

    if (choice !== 'default') {
      // Find a specific regular-style font file for this family to guess the iTerm2 string
      const matchedPath = fontPaths.find(p => p.includes(choice as string) && (p.toLowerCase().includes('regular') || p.toLowerCase().includes('mono')));
      if (matchedPath) {
        selectedFont = basename(matchedPath).replace(/\.(ttf|otf)$/i, '');
      } else {
        selectedFont = choice as string;
      }
    } else {
      await installDefaultFont(s);
    }
  } else {
    s.message('No Nerd Fonts detected.');
    await installDefaultFont(s);
  }

  // 5. Configure iTerm2 Preferences Folder & Selected Font
  s.start('Configuring iTerm2 with your preferences...');
  const iterm2Folder = join(projectRoot, 'iterm2');
  const plistPath = join(iterm2Folder, 'com.googlecode.iterm2.plist');

  if (existsSync(plistPath)) {
    let plistContent = readFileSync(plistPath, 'utf8');
    // Inject the selected font and size (defaulting to 14)
    plistContent = plistContent.replace(
      /<key>Normal Font<\/key>\s*<string>.*<\/string>/,
      `<key>Normal Font</key>\n\t\t\t<string>${selectedFont} 14</string>`
    );
    writeFileSync(plistPath, plistContent);
  }
  
  await run('defaults', ['write', 'com.googlecode.iterm2.plist', 'PrefsCustomFolder', '-string', iterm2Folder]);
  await run('defaults', ['write', 'com.googlecode.iterm2.plist', 'LoadPrefsFromCustomFolder', '-bool', 'true']);
  await run('defaults', ['write', 'com.googlecode.iterm2.plist', 'NoSyncNeverRemindPrefsChangesLostForFile', '-bool', 'true']);

  s.stop(colors.success(`System dependencies and iTerm2 linked using "${selectedFont}". 🚀`));
  return true;
}

async function installDefaultFont(s: any) {
  s.message('Ensuring JetBrains Mono Nerd Font is installed...');
  const brewCheck = await run('brew', ['list', '--cask', 'font-jetbrains-mono-nerd-font']);
  if (brewCheck.exitCode !== 0) {
    await run('brew', ['tap', 'homebrew/cask-fonts']);
    await run('brew', ['install', '--cask', 'font-jetbrains-mono-nerd-font']);
  }
}
