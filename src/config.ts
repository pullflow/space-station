import { z } from 'zod';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { parse, stringify } from 'yaml';

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

const CONFIG_FILENAME = 'ss.yaml';

export function loadConfig(projectRoot: string): Config {
  const yamlPath = join(projectRoot, CONFIG_FILENAME);

  if (!existsSync(yamlPath)) {
    throw new Error(`${CONFIG_FILENAME} not found. Please run \`ss init\` first.`);
  }

  let rawConfig: any = {};

  try {
    const content = readFileSync(yamlPath, 'utf8');
    rawConfig = parse(content);
  } catch (e) {
    console.error(`Error parsing ${CONFIG_FILENAME}:`, e);
    throw new Error(`Failed to parse ${CONFIG_FILENAME}`);
  }

  if (rawConfig.SPACESTATION_DIR && rawConfig.SPACESTATION_DIR.startsWith('~')) {
    rawConfig.SPACESTATION_DIR = rawConfig.SPACESTATION_DIR.replace('~', homedir());
  } else if (!rawConfig.SPACESTATION_DIR) {
    rawConfig.SPACESTATION_DIR = projectRoot;
  }

  const result = ConfigSchema.safeParse(rawConfig);
  if (!result.success) {
    throw new Error(`Invalid configuration in ${CONFIG_FILENAME}: ${result.error.message}`);
  }

  return result.data;
}

export function saveConfig(projectRoot: string, config: Config) {
  const yamlPath = join(projectRoot, CONFIG_FILENAME);
  const yamlString = stringify(config);
  writeFileSync(yamlPath, yamlString, 'utf8');
}
