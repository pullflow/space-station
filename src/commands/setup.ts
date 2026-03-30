import { intro, outro, spinner, note } from '@clack/prompts';
import { existsSync, mkdirSync, readdirSync, symlinkSync, rmSync, lstatSync, readFileSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { Config } from '../config';
import { colors } from '../ui/theme';
import { run } from '../utils/shell';
import { initHub, addWorktree, fetchHub } from '../utils/git';
import { getPlanetPorts } from '../utils/ports';
import { checkSystemDependencies } from '../utils/dependencies';

export async function setupCommand(config: Config, projectRoot: string) {
  const repoUrl = `https://github.com/${config.REPO}.git`;
  const hubDir = join(config.SPACESTATION_DIR, '.hub');
  
  intro(colors.primary('Orchestrating the Space Station Hub (Worktree Environment)'));

  // 0. Verify System Dependencies
  if (!await checkSystemDependencies()) {
    outro(colors.error('Missing required system dependencies. Setup aborted.'));
    return;
  }

  const s = spinner();

  // 1. Initialize Hub if it doesn't exist
  if (!existsSync(hubDir)) {
    s.start('Initializing Hub (.hub bare repository)...');
    const exitCode = await initHub(repoUrl, hubDir);
    if (exitCode !== 0) {
      s.stop(colors.error('Failed to initialize Hub'));
      return;
    }
    s.stop(colors.success('Hub initialized'));
  } else {
    s.start('Updating Hub...');
    await fetchHub(hubDir);
    s.stop(colors.success('Hub updated'));
  }

  // 2. Setup Worktrees for each planet defined in config
  for (const planetName of config.PLANETS) {
    const planetDir = join(config.SPACESTATION_DIR, planetName);
    
    s.start(`Preparing ${planetName}...`);
    
    if (!existsSync(planetDir)) {
      s.message(`Creating worktree for ${planetName}...`);
      const exitCode = await addWorktree(hubDir, planetDir, 'main');
      if (exitCode !== 0) {
        s.stop(colors.error(`Failed to create worktree for ${planetName}`));
        continue;
      }
    } else {
      s.message(`${planetName} already exists`);
    }
    
    // 3. Configure Planet (Templating & Port Allocation)
    await configurePlanet(config, planetName, planetDir, projectRoot);
    
    // 4. Run project-specific init script if it exists
    const initScript = join(projectRoot, 'planet-init.sh');
    if (existsSync(initScript)) {
      s.message(`Running project-specific init script for ${planetName}...`);
      await run('bash', [initScript], planetDir);
    }
    
    s.stop(colors.success(`${planetName} ready`));
  }

  // 5. Symlink shared files
  await symlinkShared(config);

  outro(colors.primary('Infrastructure mission complete. Ready for parallel operations. 🛰️'));
}

async function configurePlanet(config: Config, planetName: string, planetDir: string, projectRoot: string) {
  const ports = getPlanetPorts(config, planetName);
  
  // 1. Handle .env.local (Crucial for infrastructure ports)
  const envPath = join(planetDir, '.env.local');
  const sharedTemplatePath = join(config.SPACESTATION_DIR, 'shared', '.env.local.template');
  
  let envContent = '';
  if (existsSync(sharedTemplatePath)) {
    envContent = readFileSync(sharedTemplatePath, 'utf8');
  } else if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf8');
  }

  // Inject standard SS infrastructure environment variables
  const infraVars = [
    `# Space Station Orchestration`,
    `PLANET_NAME=${planetName}`,
    `PLANET_INDEX=${ports.PLANET_INDEX}`,
    `BASE_PORT=${ports.BASE_PORT}`,
    `CADDY_PORT=${ports.CADDY_PORT}`,
    `SHELL_PORT=${ports.SHELL_PORT}`,
    `POSTGRES_PORT=${ports.POSTGRES_PORT}`,
    `NATS_PORT=${ports.NATS_PORT}`,
    `VALKEY_PORT=${ports.VALKEY_PORT}`,
    `# ---`,
  ].join('\n');

  if (envContent) {
    if (envContent.includes('# Space Station Orchestration')) {
      envContent = infraVars + '\n' + envContent.split('# ---')[1]?.trim();
    } else {
      envContent = infraVars + '\n' + envContent;
    }
  } else {
    envContent = infraVars;
  }
  
  // Replace templated variables {{VAR}}
  envContent = envContent.replace(/{{PLANET_NAME}}/g, planetName);
  envContent = envContent.replace(/{{PLANET_INDEX}}/g, ports.PLANET_INDEX.toString());
  envContent = envContent.replace(/{{BASE_PORT}}/g, ports.BASE_PORT.toString());
  
  writeFileSync(envPath, envContent);

  // 2. Handle generic templates in /shared/templates
  const templateDir = join(config.SPACESTATION_DIR, 'shared', 'templates');
  if (existsSync(templateDir)) {
    const templates = readdirSync(templateDir);
    
    for (const templateFile of templates) {
      const templatePath = join(templateDir, templateFile);
      if (lstatSync(templatePath).isFile()) {
        let content = readFileSync(templatePath, 'utf8');
        
        // Universal template replacements
        content = content.replace(/{{PLANET_NAME}}/g, planetName);
        content = content.replace(/{{PLANET_INDEX}}/g, ports.PLANET_INDEX.toString());
        content = content.replace(/{{BASE_PORT}}/g, ports.BASE_PORT.toString());
        
        // Also replace specific ports
        for (const [key, val] of Object.entries(ports)) {
          content = content.replace(new RegExp(`{{${key}}}`, 'g'), val.toString());
        }
        
        const outputPath = join(planetDir, templateFile);
        writeFileSync(outputPath, content);
      }
    }
  }
}

export async function symlinkSharedCommand(config: Config) {
  await symlinkShared(config);
}

async function symlinkShared(config: Config) {
  const sharedDir = join(config.SPACESTATION_DIR, 'shared');
  if (!existsSync(sharedDir)) return;

  const s = spinner();
  s.start('Symlinking shared resources...');

  const planets = readdirSync(config.SPACESTATION_DIR)
    .filter(d => config.PLANETS.map(p => p.toLowerCase()).includes(d.toLowerCase()) && lstatSync(join(config.SPACESTATION_DIR, d)).isDirectory());

  const sharedFiles = readdirSync(sharedDir).filter(f => 
    f !== '.keep' && 
    f !== 'templates' && 
    !f.endsWith('.template') &&
    f !== '.env.local'
  );

  for (const planet of planets) {
    const planetPath = join(config.SPACESTATION_DIR, planet);
    
    for (const file of sharedFiles) {
      const targetPath = join(planetPath, file);
      const sourcePath = join(sharedDir, file);
      const relativeSource = relative(planetPath, sourcePath);

      if (existsSync(targetPath)) {
        if (lstatSync(targetPath).isSymbolicLink()) {
          rmSync(targetPath);
        }
      }
      
      try {
        symlinkSync(relativeSource, targetPath);
      } catch (e) {}
    }
  }

  s.stop(colors.success('Shared resources symlinked'));
}
