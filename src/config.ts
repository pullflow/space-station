import { z } from 'zod';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { parse, stringify } from 'yaml';

export const ConfigSchema = z.object({
  repo: z.string().describe('The GitHub repository in owner/repo format'),
  spacestation_dir: z.string().describe('The absolute path to your Space Station directory'),
  editor: z.string().default('cursor').describe('The editor command to use'),
  default_agent: z.string().default('claude').describe('The default agent command to use'),
  planets: z.array(z.string()).default(['mercury', 'venus', 'earth', 'mars']).describe('List of planet names'),
  base_port: z.number().default(8000).describe('The starting port for the first planet'),
  port_step: z.number().default(1000).describe('The port offset between each planet'),
});

export type Config = z.infer<typeof ConfigSchema>;

export function getPlanetsDir(config: Config): string {
  return join(config.spacestation_dir, 'planets');
}

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

  if (rawConfig.spacestation_dir?.startsWith('~')) {
    rawConfig.spacestation_dir = rawConfig.spacestation_dir.replace('~', homedir());
  } else if (!rawConfig.spacestation_dir) {
    rawConfig.spacestation_dir = projectRoot;
  }

  const result = ConfigSchema.safeParse(rawConfig);
  if (!result.success) {
    throw new Error(`Invalid configuration in ${CONFIG_FILENAME}: ${result.error.message}`);
  }

  return result.data;
}

export function saveConfig(projectRoot: string, config: Config) {
  const yamlPath = join(projectRoot, CONFIG_FILENAME);
  writeFileSync(yamlPath, stringify(config), 'utf8');
}
