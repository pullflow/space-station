import { spinner } from '@clack/prompts';
import type { Config } from '../config';
import { getPlanetsDir } from '../config';
import { colors } from '../ui/theme';
import { join } from 'path';
import { checkout, pull } from '../utils/git';
import { run } from '../utils/shell';

export async function planetCommand(config: Config, planetName: string) {
  const planetDir = join(getPlanetsDir(config), planetName);
  const s = spinner();
  
  s.start(`Traveling to ${planetName}...`);
  
  // Reset planet
  await checkout('main', planetDir);
  await pull(planetDir);
  
  s.stop(colors.success(`Arrived on ${planetName} (updated to latest main)`));
  
  s.start(`Opening in ${config.editor}...`);
  await run(config.editor, ['.'], planetDir);
  s.stop(colors.success('Editor opened. Happy coding, commander!'));
}
