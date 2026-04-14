import { run } from './shell';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { colors, symbols } from '../ui/theme';
import { confirm, isCancel, spinner } from '@clack/prompts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cliSourceDir = join(__dirname, '..', '..');

export async function checkForUpdates(): Promise<boolean> {
  try {
    // 1. Fetch latest from origin
    await run('git', ['fetch', 'origin', 'main'], cliSourceDir);
    
    // 2. Check if we are behind origin/main
    const { stdout: localHash } = await run('git', ['rev-parse', 'HEAD'], cliSourceDir);
    const { stdout: remoteHash } = await run('git', ['rev-parse', 'origin/main'], cliSourceDir);
    
    return localHash.trim() !== remoteHash.trim();
  } catch (e) {
    return false;
  }
}

export async function updateCLI(): Promise<boolean> {
  const s = spinner();
  s.start('Updating Space Station CLI...');
  
  try {
    // 1. Pull latest changes
    await run('git', ['pull', 'origin', 'main'], cliSourceDir);
    
    // 2. No build step needed since it's running via bun/tsx usually, 
    // but if it was npm installed we might need more.
    // Assuming source-based/linked for now based on project structure.
    
    s.stop(colors.success('Update complete! Please restart the CLI.'));
    return true;
  } catch (e: any) {
    s.stop(colors.error(`Update failed: ${e.message}`));
    return false;
  }
}

export async function promptForUpdate() {
  const hasUpdate = await checkForUpdates();
  if (hasUpdate) {
    console.log(colors.warning(`\n${symbols.warning} A new version of Space Station is available!`));
    const shouldUpdate = await confirm({
      message: 'Would you like to update now?',
      initialValue: true
    });
    
    if (!isCancel(shouldUpdate) && shouldUpdate) {
      const success = await updateCLI();
      if (success) {
        process.exit(0);
      }
    }
  }
}
