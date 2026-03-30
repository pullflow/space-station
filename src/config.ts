import { z } from 'zod';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export const ConfigSchema = z.object({
  REPO: z.string().describe('The GitHub repository in owner/repo format'),
  SPACESTATION_DIR: z.string().describe('The absolute path to your Space Station directory'),
  EDITOR: z.string().default('cursor').describe('The editor command to use'),
  DEFAULT_AGENT: z.string().default('claude').describe('The default agent command to use'),
  
  // General Purpose Orchestration Settings
  PLANETS: z.array(z.string()).default(['mercury', 'venus', 'earth', 'mars']).describe('List of planet names'),
  BASE_PORT: z.number().default(8000).describe('The starting port for the first planet'),
  PORT_STEP: z.number().default(1000).describe('The port offset between each planet'),
});

export type Config = z.infer<typeof ConfigSchema>;

const CONFIG_FILENAME = 'ss.json';
const LEGACY_CONFIG_FILENAME = 'ss.conf';

export function loadConfig(projectRoot: string): Config {
  const jsonPath = join(projectRoot, CONFIG_FILENAME);
  const legacyPath = join(projectRoot, LEGACY_CONFIG_FILENAME);

  let rawConfig: any = {};

  if (existsSync(jsonPath)) {
    try {
      rawConfig = JSON.parse(readFileSync(jsonPath, 'utf8'));
    } catch (e) {
      console.error(`Error parsing ${CONFIG_FILENAME}:`, e);
    }
  } else if (existsSync(legacyPath)) {
    const content = readFileSync(legacyPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
      if (match) {
        rawConfig[match[1]] = match[2];
      }
    });
  }

  if (rawConfig.SPACESTATION_DIR && rawConfig.SPACESTATION_DIR.startsWith('~')) {
    rawConfig.SPACESTATION_DIR = rawConfig.SPACESTATION_DIR.replace('~', homedir());
  } else if (!rawConfig.SPACESTATION_DIR) {
    rawConfig.SPACESTATION_DIR = projectRoot;
  }

  const result = ConfigSchema.safeParse(rawConfig);
  if (!result.success) {
    throw new Error(`Invalid configuration: ${result.error.message}`);
  }

  return result.data;
}

export function saveConfig(projectRoot: string, config: Config) {
  const jsonPath = join(projectRoot, CONFIG_FILENAME);
  writeFileSync(jsonPath, JSON.stringify(config, null, 2), 'utf8');
}
