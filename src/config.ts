import { z } from 'zod';
import { existsSync, readFileSync, writeFileSync, lstatSync } from 'fs';
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

const CONFIG_FILENAME = 'ss.yaml';

export function findProjectRoot(): string {
  // 1. Explicit config path via env var
  if (process.env.SS_CONFIG_PATH) {
    if (existsSync(process.env.SS_CONFIG_PATH)) {
      // If it's a directory, use it. If it's a file, use its parent.
      return lstatSync(process.env.SS_CONFIG_PATH).isDirectory() 
        ? process.env.SS_CONFIG_PATH 
        : join(process.env.SS_CONFIG_PATH, '..');
    }
  }

  // 2. Explicit root via env var
  if (process.env.SS_ROOT && existsSync(process.env.SS_ROOT)) {
    return process.env.SS_ROOT;
  }

  // 3. User's SS_PATH from .zshrc
  if (process.env.SS_PATH && existsSync(process.env.SS_PATH)) {
    return process.env.SS_PATH;
  }

  // 4. Fallback to current directory
  return process.cwd();
}

export function getPlanetsDir(config: Config): string {
  return join(config.spacestation_dir, 'planets');
}

export function loadConfig(projectRoot: string): Config {
  let yamlPath = join(projectRoot, CONFIG_FILENAME);

  // If SS_CONFIG_PATH is a direct file path, use it instead of joining
  if (process.env.SS_CONFIG_PATH && existsSync(process.env.SS_CONFIG_PATH) && lstatSync(process.env.SS_CONFIG_PATH).isFile()) {
    yamlPath = process.env.SS_CONFIG_PATH;
  }

  if (!existsSync(yamlPath)) {
    throw new Error(`${CONFIG_FILENAME} not found. Please run \`ss init\` first or set SS_CONFIG_PATH/SS_ROOT.`);
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
  let yamlPath = join(projectRoot, CONFIG_FILENAME);

  // If SS_CONFIG_PATH is a direct file path, use it instead of joining
  if (process.env.SS_CONFIG_PATH && existsSync(process.env.SS_CONFIG_PATH) && lstatSync(process.env.SS_CONFIG_PATH).isFile()) {
    yamlPath = process.env.SS_CONFIG_PATH;
  }

  writeFileSync(yamlPath, stringify(config), 'utf8');
}
