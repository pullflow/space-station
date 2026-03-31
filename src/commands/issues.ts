import { intro, spinner, note } from '@clack/prompts';
import type { Config } from '../config';
import { colors } from '../ui/theme';
import { listIssues } from '../utils/github';

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
