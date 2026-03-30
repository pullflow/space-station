import { spinner } from '@clack/prompts';
import type { Config } from '../config';
import { colors } from '../ui/theme';
import { basename } from 'path';
import { run } from '../utils/shell';
import { PLANET_NAMES } from '../utils/planets';

export async function landCommand(config: Config) {
  const currentDir = basename(process.cwd()).toLowerCase();
  if (!PLANET_NAMES.includes(currentDir)) {
    console.error(colors.error(`Error: land must be run from a planet folder (${PLANET_NAMES.join(', ')})`));
    return;
  }

  const s = spinner();
  s.start(`Opening ${currentDir} in ${config.editor}...`);
  
  await run(config.editor, ['.'], process.cwd());
  
  s.stop(colors.success(`Landed on ${currentDir}!`));
}
