import { existsSync, readFileSync, realpathSync, statSync, lstatSync } from 'fs';
import { join, dirname } from 'path';
import type { Config } from '../config';
import { findProjectRoot, getPlanetsDir } from '../config';
import { detectPlanet } from '../utils/planets';
import { colors, symbols } from '../ui/theme';
import { VERSION } from '../utils/version';
import pc from 'picocolors';

type Status = 'ok' | 'warn' | 'fail' | 'info';

const issues: string[] = [];

function header(title: string) {
  console.log('');
  console.log(pc.bold(pc.cyan(title)));
  console.log(colors.dim('─'.repeat(title.length)));
}

function line(status: Status, label: string, value?: string, hint?: string) {
  const sym =
    status === 'ok' ? colors.success(symbols.success.trim()) :
    status === 'warn' ? colors.warning(symbols.warning.trim()) :
    status === 'fail' ? colors.error(symbols.error.trim()) :
    colors.info(symbols.info.trim());
  const v = value !== undefined ? '  ' + colors.dim(value) : '';
  console.log(`  ${sym} ${label}${v}`);
  if (hint) console.log(`      ${colors.dim('↳ ' + hint)}`);
  if (status === 'fail' || status === 'warn') {
    issues.push(`${label}${hint ? ' — ' + hint : ''}`);
  }
}

export async function doctorCommand(config: Config | null, projectRoot: string, loadError: Error | null = null) {
  issues.length = 0;
  console.log('');
  console.log(colors.primary(`  ${symbols.loading} Space Station Doctor`) + ' ' + colors.dim(`v${VERSION}`));

  // A — Environment
  header('A. Environment');
  line('info', 'cwd', process.cwd());
  let realCwd = process.cwd();
  try { realCwd = realpathSync(process.cwd()); } catch {}
  if (realCwd !== process.cwd()) line('info', 'cwd (realpath)', realCwd);
  for (const k of ['SS_PATH', 'SS_ROOT', 'SS_CONFIG_PATH', 'SS_PLANET_NAME']) {
    line('info', k, process.env[k] ?? '(unset)');
  }
  line('info', 'projectRoot (findProjectRoot)', projectRoot);

  const anySsVar = !!(process.env.SS_PATH || process.env.SS_ROOT || process.env.SS_CONFIG_PATH);
  const cwdHasYaml = existsSync(join(process.cwd(), 'ss.yaml'));
  const guessRoot = cwdHasYaml ? process.cwd() : (process.env.SS_PATH || projectRoot);
  const fixHint = `Add to ~/.zshrc (or ~/.bashrc):  export SS_PATH="${guessRoot}"  then \`source ~/.zshrc\` (or open new terminal).`;
  if (!anySsVar && !cwdHasYaml) {
    line('fail', 'SS_PATH / SS_ROOT / SS_CONFIG_PATH',
      'all unset and no ss.yaml in cwd — `ss` from a planet folder cannot locate ss.yaml',
      fixHint);
  } else if (!anySsVar && cwdHasYaml) {
    line('warn', 'SS_PATH', 'unset (works here because ss.yaml is in cwd, but `ss` from planet folders will fail)',
      fixHint);
  } else {
    line('ok', 'SS_* env var set');
  }

  // B — Config
  header('B. Config');
  if (loadError) {
    line('fail', 'ss.yaml load', loadError.message, 'Run `ss init` or fix ss.yaml');
  } else if (!config) {
    line('fail', 'config', 'no config loaded', 'Run `ss init`');
  } else {
    line('ok', 'ss.yaml loaded');
    line('info', 'spacestation_dir', config.spacestation_dir);
    if (!existsSync(config.spacestation_dir)) {
      line('fail', 'spacestation_dir exists', undefined, 'Path missing on disk');
    } else if (!statSync(config.spacestation_dir).isDirectory()) {
      line('fail', 'spacestation_dir is dir', undefined, 'Not a directory');
    } else {
      line('ok', 'spacestation_dir exists');
    }
    const pdir = getPlanetsDir(config);
    line('info', 'planets dir', pdir);
    if (!existsSync(pdir)) {
      line('fail', 'planets dir exists', undefined, 'Run `ss setup`');
    } else {
      line('ok', 'planets dir exists');
    }
    line('info', 'configured planets', config.planets.join(', ') || '(none)');
  }

  // C — Planet inventory
  if (config) {
    header('C. Planet inventory');
    const pdir = getPlanetsDir(config);
    for (const p of config.planets) {
      const dir = join(pdir, p);
      if (!existsSync(dir)) {
        line('fail', p, 'missing dir', `Run \`ss setup\` to create ${dir}`);
        continue;
      }
      let real = dir;
      try { real = realpathSync(dir); } catch {}
      const envPath = join(dir, '.env.planet');
      if (!existsSync(envPath)) {
        line('warn', p, 'no .env.planet', 'Auto-detect from cwd will fall back to path matching only');
      } else {
        try {
          const content = readFileSync(envPath, 'utf8');
          const m = content.match(/^SS_PLANET_NAME=(.+)$/m);
          if (!m) {
            line('fail', p, '.env.planet missing SS_PLANET_NAME', 'Re-run `ss setup`');
          } else if (m[1] !== p) {
            line('fail', p, `.env.planet SS_PLANET_NAME=${m[1]} != ${p}`, 'Edit .env.planet or rename dir');
          } else {
            line('ok', p, real === dir ? real : `${dir} → ${real}`);
          }
        } catch (e: any) {
          line('fail', p, `.env.planet unreadable: ${e.message}`);
        }
      }
    }
  }

  // D — Detection from cwd
  header('D. Planet detection from cwd');
  if (!config) {
    line('fail', 'detectPlanet', 'cannot run — no config loaded');
  } else {
    const result = detectPlanet(config);
    if (result) {
      line('ok', 'detected', `${result.name} (${result.dir})`);
    } else {
      line('fail', 'detected', 'null', 'Below: trace of why each step failed');

      // Walk-up trace for .env.planet
      console.log('  ' + colors.dim('Walk-up scan for .env.planet:'));
      let cur = process.cwd();
      let foundEnv = false;
      while (cur !== dirname(cur)) {
        const envPath = join(cur, '.env.planet');
        if (existsSync(envPath)) {
          foundEnv = true;
          try {
            const content = readFileSync(envPath, 'utf8');
            const m = content.match(/^SS_PLANET_NAME=(.+)$/m);
            console.log(`    ${colors.warning('•')} ${envPath} ${m ? `→ SS_PLANET_NAME=${m[1]} (no match in regex?)` : '— missing SS_PLANET_NAME line'}`);
          } catch (e: any) {
            console.log(`    ${colors.error('•')} ${envPath} unreadable: ${e.message}`);
          }
          break;
        }
        cur = dirname(cur);
      }
      if (!foundEnv) console.log(`    ${colors.dim('• none found walking up from cwd')}`);

      // Path-based check
      const pdir = getPlanetsDir(config);
      try {
        const realCwd2 = realpathSync(process.cwd());
        let underUnknown: string | null = null;
        if (realCwd2.startsWith(realpathSync(pdir) + '/') || realCwd2 === realpathSync(pdir)) {
          const rest = realCwd2.slice(realpathSync(pdir).length + 1);
          const first = rest.split('/')[0];
          if (first && !config.planets.includes(first)) underUnknown = first;
        }
        if (underUnknown) {
          line('fail', 'cwd is under planets/' + underUnknown, undefined, `Add "${underUnknown}" to ss.yaml planets list, or rename dir`);
        } else {
          line('info', 'cwd not under any planets/<configured-planet>');
        }
      } catch {
        line('warn', 'realpath check', 'failed (planets dir missing?)');
      }
    }
  }

  // E — Summary
  header('E. Summary');
  if (issues.length === 0) {
    console.log('  ' + colors.success(`${symbols.success.trim()} All checks passed.`));
  } else {
    console.log('  ' + colors.warning(`${symbols.warning.trim()} ${issues.length} issue${issues.length === 1 ? '' : 's'}:`));
    issues.forEach((i, idx) => console.log(`    ${idx + 1}. ${i}`));
  }
  console.log('');
}
