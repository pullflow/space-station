import { intro, text, isCancel, spinner, note, select } from '@clack/prompts';
import { existsSync, copyFileSync, chmodSync } from 'fs';
import { join } from 'path';
import type { Config } from '../config';
import { saveConfig, getPlanetsDir } from '../config';
import { colors } from '../ui/theme';
import { DEPENDENCIES, checkDependency } from '../utils/dependencies';
import { PLANET_NAMES } from '../utils/planets';
import { setupCommand } from './setup';

export async function initCommand(projectRoot: string) {
  intro(colors.primary('🛸 Welcome to the Space Station Setup Wizard'));

  // 1. Dependency Check
  const s = spinner();
  s.start('Checking life support systems (dependencies)...');
  
  const results = await Promise.all(DEPENDENCIES.map(async (dep) => ({
    dep,
    result: await checkDependency(dep)
  })));
  
  s.stop('Dependency check complete');

  let missingRequired = false;
  let depSummary = '';
  
  for (const { dep, result } of results) {
    if (result.installed) {
      depSummary += `${colors.success('✓')} ${dep.name} (${result.version})\n`;
    } else {
      depSummary += `${colors.error('✗')} ${dep.name} - ${colors.dim(dep.hint)}\n`;
      if (dep.required) missingRequired = true;
    }
  }

  note(depSummary, 'System Dependencies');

  if (missingRequired) {
    note(colors.error('Error: Required dependencies are missing. Please install them before proceeding.'), 'Critical Alert');
    return;
  }

  // 2. Configuration Wizard
  const repo = await text({
    message: 'What is your GitHub repository? (owner/repo)',
    placeholder: 'e.g. pullflow/coagency',
    validate: (value) => {
      if (!value?.includes('/')) return 'Please enter in owner/repo format';
    }
  });
  if (isCancel(repo)) return;

  const ssDir = await text({
    message: 'Where is your Space Station directory? (Full path)',
    initialValue: projectRoot,
  });
  if (isCancel(ssDir)) return;

  const planetCountStr = await select({
    message: 'How many parallel environments (planets) do you want?',
    options: [
      { value: '2', label: '2' },
      { value: '4', label: '4 (Default)' },
      { value: '6', label: '6' },
      { value: '8', label: '8' },
    ],
    initialValue: '4',
  });
  if (isCancel(planetCountStr)) return;
  const planetCount = parseInt(planetCountStr as string);

  const config: Config = {
    repo: repo as string,
    spacestation_dir: ssDir as string,
    editor: 'cursor',
    default_agent: 'claude',
    planets: PLANET_NAMES.slice(0, planetCount),
    base_port: 8000,
    port_step: 1000,
  };

  saveConfig(projectRoot, config);
  
  // 3. Project Scaffolding
  const sharedDir = join(ssDir as string, 'shared');
  if (!existsSync(sharedDir)) {
    mkdirSync(sharedDir, { recursive: true });
    // Also create template dir
    mkdirSync(join(sharedDir, 'templates'), { recursive: true });
  }

  const initScript = join(projectRoot, 'planet-init.sh');
  const initExample = join(projectRoot, 'planet-init.sh.example');
  if (!existsSync(initScript) && existsSync(initExample)) {
    copyFileSync(initExample, initScript);
    chmodSync(initScript, 0o755);
  }

  note(`Planets: ${config.planets.join(', ')}\nHub: ${join(getPlanetsDir(config), '.hub')}`, 'Configuration Saved');

  // 4. Auto-proceed to Setup
  await setupCommand(config, projectRoot);
}

function mkdirSync(dir: string, options: { recursive: boolean }) {
  const fs = require('fs');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, options);
  }
}
