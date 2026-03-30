import { intro, spinner, note, outro } from '@clack/prompts';
import type { Config } from '../config';
import { colors } from '../ui/theme';
import { listIssues } from '../utils/github';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

export async function issuesCommand(config: Config) {
  intro(colors.primary('Your Assigned Issues'));
  
  const s = spinner();
  s.start('Fetching issues from the universe...');
  const issues = await listIssues(config.repo);
  s.stop('Issues fetched');

  if (issues.length === 0) {
    note('No open issues assigned to you.', 'GitHub');
    return;
  }

  let output = '';
  for (const issue of issues) {
    const labels = issue.labels.map((l: any) => l.name).join(', ');
    const labelsStr = labels ? ` ${colors.dim(`[${labels}]`)}` : '';
    output += `${colors.success(`#${issue.number}`)}: ${issue.title}${labelsStr}\n`;
  }

  note(output, 'Issues');
}

export async function syncIssuesCommand(config: Config) {
  const todoFile = join(config.spacestation_dir, 'todo.md');
  if (!existsSync(todoFile)) {
    note(colors.error(`todo.md not found at ${todoFile}`), 'Error');
    return;
  }

  intro(colors.primary('Syncing Issues to todo.md'));
  
  const s = spinner();
  s.start('Fetching latest issues...');
  const issues = await listIssues(config.repo);
  s.stop('Issues fetched');

  const content = readFileSync(todoFile, 'utf8');
  const existingNumbers = new Set([...content.matchAll(/#(\d+):/g)].map(m => m[1]));

  let newItems = '';
  let addedCount = 0;

  for (const issue of issues) {
    if (!existingNumbers.has(issue.number.toString())) {
      const labels = issue.labels.map((l: any) => l.name);
      const onIt = labels.includes('on it') ? ' [on it]' : '';
      newItems += `- [ ] #${issue.number}: ${issue.title}${onIt}\n`;
      addedCount++;
    }
  }

  if (addedCount > 0) {
    writeFileSync(todoFile, content.trim() + '\n\n' + newItems);
    outro(colors.success(`Added ${addedCount} new issue(s) to todo.md`));
  } else {
    outro(colors.info('All issues already present in todo.md'));
  }
}
