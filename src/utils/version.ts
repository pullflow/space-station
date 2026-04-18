import { createRequire } from 'module';
const require = createRequire(import.meta.url);
export const VERSION: string = require('../../package.json').version;
