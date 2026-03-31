import { intro, outro, spinner } from '@clack/prompts';
import { existsSync, mkdirSync, readdirSync, symlinkSync, rmSync, lstatSync, readFileSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import type { Config } from '../config';
import { getPlanetsDir } from '../config';
import { colors } from '../ui/theme';
import { run } from '../utils/shell';
import { initHub, addWorktree, fetchHub } from '../utils/git';
import { getPlanetPorts } from '../utils/ports';
import { checkSystemDependencies } from '../utils/dependencies';

export async function setupCommand(config: Config, projectRoot: string) {
  const repoUrl = `https://github.com/${config.repo}.git`;
  const planetsDir = getPlanetsDir(config);
  const hubDir = join(planetsDir, '.hub');

  if (!existsSync(planetsDir)) {
    mkdirSync(planetsDir, { recursive: true });
  }

  intro(colors.primary('Orchestrating the Space Station Hub (Worktree Environment)'));

  // 0. Verify System Dependencies
  if (!await checkSystemDependencies(projectRoot)) {
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

  // 2. Ensure _shared exists with default SPACE-STATION.md
  ensurePlanetShared(planetsDir);

  // 3. Setup each planet
  for (const planetName of config.planets) {
    const planetDir = join(planetsDir, planetName);

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

    await linkPlanet(config, planetName, planetDir, planetsDir, projectRoot, s);

    s.stop(colors.success(`${planetName} ready`));
  }

  // 4. Symlink space-station shared/ files into all planets
  await symlinkShared(config);

  outro(colors.primary('Infrastructure mission complete. Ready for parallel operations. 🛰️'));
}

// linkPlanet runs the full planet linking sequence:
//   drop .env.planet → update .gitignore → symlink _shared → run bin/ss-setup hook
// Called by both setup and reset.
export async function linkPlanet(
  config: Config,
  planetName: string,
  planetDir: string,
  planetsDir: string,
  projectRoot: string,
  s?: ReturnType<typeof spinner>,
) {
  const ports = getPlanetPorts(config, planetName);

  // 1. Write .env.planet
  const envPlanetPath = join(planetDir, '.env.planet');
  writeFileSync(envPlanetPath, [
    `SS_PLANET_NAME=${planetName}`,
    `SS_PLANET_BASE_PORT=${ports.BASE_PORT}`,
  ].join('\n') + '\n');

  // 2. Ensure SS-managed files are gitignored in the planet
  const gitignorePath = join(planetDir, '.gitignore');
  const gitignoreEntries = ['.env.planet', 'SPACE-STATION.md'];
  let gitignoreContent = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf8') : '';
  let gitignoreChanged = false;
  for (const entry of gitignoreEntries) {
    if (!gitignoreContent.split('\n').includes(entry)) {
      gitignoreContent = gitignoreContent.trimEnd() + '\n' + entry + '\n';
      gitignoreChanged = true;
    }
  }
  if (gitignoreChanged) {
    writeFileSync(gitignorePath, gitignoreContent);
  }

  // 3. Symlink planets/_shared into the planet
  const planetSharedDir = join(planetsDir, '_shared');
  if (existsSync(planetSharedDir)) {
    const sharedFiles = readdirSync(planetSharedDir).filter(f => f !== '.keep' && f !== '.gitignore');
    for (const file of sharedFiles) {
      const targetPath = join(planetDir, file);
      const sourcePath = join(planetSharedDir, file);
      const relativeSource = relative(planetDir, sourcePath);
      if (existsSync(targetPath) && lstatSync(targetPath).isSymbolicLink()) {
        rmSync(targetPath);
      }
      try { symlinkSync(relativeSource, targetPath); } catch (e) {}
    }
  }

  // 4. Run space-station-init.sh hook if the planet repo provides one
  const hookCandidates = [
    join(planetDir, 'space-station-init.sh'),
    join(planetDir, 'scripts', 'space-station-init.sh'),
  ];
  const setupHook = hookCandidates.find(existsSync);
  if (setupHook) {
    s?.message(`Running space-station-init.sh for ${planetName}...`);
    await run('bash', [setupHook], planetDir, {
      env: { ...process.env, PLANET_DIR: planetDir, SS_ROOT: projectRoot },
    });
  }

  // 5. Handle generic templates in shared/templates
  const templateDir = join(projectRoot, 'shared', 'templates');
  if (existsSync(templateDir)) {
    const templates = readdirSync(templateDir);
    for (const templateFile of templates) {
      const templatePath = join(templateDir, templateFile);
      if (lstatSync(templatePath).isFile()) {
        let content = readFileSync(templatePath, 'utf8');
        content = content.replace(/{{PLANET_NAME}}/g, planetName);
        content = content.replace(/{{PLANET_INDEX}}/g, (ports.PLANET_INDEX ?? 0).toString());
        content = content.replace(/{{BASE_PORT}}/g, (ports.BASE_PORT ?? 0).toString());
        for (const [key, val] of Object.entries(ports)) {
          content = content.replace(new RegExp(`{{${key}}}`, 'g'), val.toString());
        }
        writeFileSync(join(planetDir, templateFile), content);
      }
    }
  }
}

function ensurePlanetShared(planetsDir: string) {
  const planetSharedDir = join(planetsDir, '_shared');
  if (!existsSync(planetSharedDir)) {
    mkdirSync(planetSharedDir, { recursive: true });
  }
  const defaultMd = join(planetSharedDir, 'SPACE-STATION.md');
  if (!existsSync(defaultMd)) {
    writeFileSync(defaultMd, readDefaultSpaceStationMd());
  }
}

function readDefaultSpaceStationMd(): string {
  // Prefer the checked-in file next to this install if present
  const checked = join(__dirname, '../../planets/_shared/SPACE-STATION.md');
  if (existsSync(checked)) return readFileSync(checked, 'utf8');
  return DEFAULT_SPACE_STATION_MD;
}

export async function symlinkSharedCommand(config: Config) {
  await symlinkShared(config);
}

async function symlinkShared(config: Config) {
  const sharedDir = join(config.spacestation_dir, 'shared');
  if (!existsSync(sharedDir)) return;

  const s = spinner();
  s.start('Symlinking shared resources...');

  const planetsDir = getPlanetsDir(config);
  if (!existsSync(planetsDir)) {
    s.stop(colors.error('Planets directory not found. Please run `ss setup` first.'));
    return;
  }

  const planetNames = new Set(config.planets.map(p => p.toLowerCase()));
  const planets = readdirSync(planetsDir)
    .filter(d => planetNames.has(d.toLowerCase()) && lstatSync(join(planetsDir, d)).isDirectory());

  const sharedFiles = readdirSync(sharedDir).filter(f =>
    f !== '.keep' &&
    f !== 'templates' &&
    !f.endsWith('.template') &&
    f !== '.env.local'
  );

  for (const planet of planets) {
    const planetPath = join(planetsDir, planet);
    for (const file of sharedFiles) {
      const targetPath = join(planetPath, file);
      const sourcePath = join(sharedDir, file);
      const relativeSource = relative(planetPath, sourcePath);
      if (existsSync(targetPath) && lstatSync(targetPath).isSymbolicLink()) {
        rmSync(targetPath);
      }
      try { symlinkSync(relativeSource, targetPath); } catch (e) {}
    }
  }

  s.stop(colors.success('Shared resources symlinked'));
}

const DEFAULT_SPACE_STATION_MD = `# Space Station

This planet is part of the **Space Station** — a multi-agent orchestration layer using git worktrees for parallel development.

## Planet Identity

SS drops a \`.env.planet\` file into this directory on every setup and reset:

\`\`\`sh
SS_PLANET_NAME=mercury
SS_PLANET_BASE_PORT=8000
\`\`\`

Source it wherever you need planet-specific values (ports, names, etc.).

## Setup Hook

If your repo needs custom initialization (e.g. rewriting ports in \`.env.local\`), add an executable script at either:

\`\`\`
space-station-init.sh
scripts/space-station-init.sh
\`\`\`

SS checks both locations (in that order) and calls the first one it finds, after dropping \`.env.planet\` and symlinking shared files. The following environment variables are available:

\`\`\`sh
PLANET_DIR   # absolute path to this planet directory
SS_ROOT      # absolute path to the space station root
\`\`\`

Example \`space-station-init.sh\`:

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail
source "$PLANET_DIR/.env.planet"

sed -i.bak "s/^PORT=.*/PORT=\${SS_PLANET_BASE_PORT}/" .env.local
rm -f .env.local.bak
\`\`\`

## Shared Files

Anything in \`planets/_shared/\` is symlinked into every planet on setup. Edit files there to propagate changes to all planets.

## Key Commands

\`\`\`sh
ss list          # Show all planets and branches
ss reset <p>     # Reset a planet to main (re-runs linking)
ss agent <p>     # Launch agent on a planet
\`\`\`
`;
