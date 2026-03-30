import { spinner } from '@clack/prompts';
import { Config } from '../config';
import { colors } from '../ui/theme';
import { join } from 'path';
import { checkout, pull } from '../utils/git';
import { run } from '../utils/shell';

export async function planetCommand(config: Config, planetName: string) {
  const planetDir = join(config.SPACESTATION_DIR, planetName);
  const s = spinner();
  
  s.start(`Traveling to ${planetName}...`);
  
  // Reset planet
  await checkout('main', planetDir);
  await pull(planetDir);
  
  s.stop(colors.success(`Arrived on ${planetName} (updated to latest main)`));
  
  s.start(`Opening in ${config.EDITOR}...`);
  await run(config.EDITOR, ['.'], planetDir);
  s.stop(colors.success('Editor opened. Happy coding, commander!'));
}
