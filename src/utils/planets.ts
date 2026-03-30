import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
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
  'mercury': '1️⃣',
  'venus': '2️⃣',
  'earth': '3️⃣',
  'mars': '4️⃣',
  'jupiter': '5️⃣',
  'saturn': '6️⃣',
  'uranus': '7️⃣',
  'neptune': '8️⃣',
};

export function getPlanets(config: Config): Planet[] {
  const baseDir = getPlanetsDir(config);
  if (!existsSync(baseDir)) return [];
  
  const planetsFromConfig = config.planets.map(p => p.toLowerCase());
  
  return readdirSync(baseDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && planetsFromConfig.includes(dirent.name.toLowerCase()))
    .map(dirent => {
      const name = dirent.name.toLowerCase();
      const emoji = PLANET_EMOJIS[name] || '🔘';
      
      return {
        name,
        dir: join(baseDir, dirent.name),
        emoji
      };
    });
}
