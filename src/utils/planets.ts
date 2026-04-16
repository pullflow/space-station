import { readdirSync, existsSync, readFileSync, realpathSync } from 'fs';
import { join, dirname, sep } from 'path';
import { symbols } from '../ui/theme';
import type { Config } from '../config';
import { getPlanetsDir } from '../config';

export interface Planet {
  name: string;
  dir: string;
  emoji: string;
}

export const PLANET_NAMES = [
  'mercury', 
  'venus', 
  'earth', 
  'mars', 
  'jupiter', 
  'saturn', 
  'uranus', 
  'neptune'
];

const PLANET_EMOJIS: { [key: string]: string } = {
  'mercury': symbols.mercury,
  'venus': symbols.venus,
  'earth': symbols.earth,
  'mars': symbols.mars,
  'jupiter': symbols.jupiter,
  'saturn': symbols.saturn,
  'uranus': symbols.uranus,
  'neptune': symbols.neptune,
};

export function getPlanets(config: Config): Planet[] {
  const baseDir = getPlanetsDir(config);
  if (!existsSync(baseDir)) return [];
  
  const planetsFromConfig = config.planets.map(p => p.toLowerCase());
  
  return readdirSync(baseDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && planetsFromConfig.includes(dirent.name.toLowerCase()))
    .map(dirent => {
      const name = dirent.name.toLowerCase();
      const emoji = PLANET_EMOJIS[name] || symbols.unknown;
      
      return {
        name,
        dir: join(baseDir, dirent.name),
        emoji
      };
    });
}

export function detectPlanet(config: Config): { name: string; dir: string } | null {
  const cwd = process.cwd();
  let currentDir = cwd;

  // 1. Walk up looking for .env.planet (SS-managed, authoritative)
  while (currentDir !== dirname(currentDir)) {
    const envPath = join(currentDir, '.env.planet');
    if (existsSync(envPath)) {
      try {
        const content = readFileSync(envPath, 'utf8');
        const nameMatch = content.match(/^SS_PLANET_NAME=(.+)$/m);
        if (nameMatch && nameMatch[1]) {
          return {
            name: nameMatch[1],
            dir: currentDir
          };
        }
      } catch (e) {
        // Ignore errors and keep walking/falling back
      }
    }
    currentDir = dirname(currentDir);
  }

  // 2. Check environment variable (set if already in an ss-launched session)
  if (process.env.SS_PLANET_NAME && config.planets.includes(process.env.SS_PLANET_NAME)) {
    const planetsDir = getPlanetsDir(config);
    return {
      name: process.env.SS_PLANET_NAME,
      dir: join(planetsDir, process.env.SS_PLANET_NAME)
    };
  }

  // 3. Fallback: Path-based detection against known planets
  try {
    const realCwd = realpathSync(cwd);
    const planetsDir = getPlanetsDir(config);

    for (const p of config.planets) {
      const pDir = join(planetsDir, p);
      if (!existsSync(pDir)) continue;

      const realPDir = realpathSync(pDir);
      // Check if realCwd is realPDir or a subdirectory of it
      if (realCwd === realPDir || realCwd.startsWith(realPDir + sep)) {
        return {
          name: p,
          dir: realPDir
        };
      }
    }
  } catch (e) {
    // Ignore realpath errors
  }

  return null;
}
