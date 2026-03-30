import { spinner, note, confirm, isCancel } from '@clack/prompts';
import { Config } from '../config';
import { colors } from '../ui/theme';
import { basename } from 'path';
import { getStatus, checkout, pull } from '../utils/git';
import { PLANET_NAMES } from '../utils/planets';

export async function resetCommand(config: Config) {
  const currentDir = basename(process.cwd()).toLowerCase();
  if (!PLANET_NAMES.includes(currentDir)) {
    console.error(colors.error(`Error: reset must be run from a planet folder (${PLANET_NAMES.join(', ')})`));
    return;
  }

  const status = await getStatus(process.cwd());
  if (status) {
    const proceed = await confirm({
      message: 'Git status is not clean. Resetting will lose uncommitted changes. Proceed?',
      initialValue: false,
    });
    if (isCancel(proceed) || !proceed) return;
  }

  const s = spinner();
  s.start(`Resetting ${currentDir} to latest main...`);
  
  await checkout('main', process.cwd());
  await pull(process.cwd());
  
  s.stop(colors.success(`${currentDir} successfully reset to latest main`));
}
