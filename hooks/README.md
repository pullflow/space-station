# Space Station Hooks

Drop executable `.sh` scripts here to run automatically when the dashboard detects events.
The shebang line determines the interpreter — use bash, python, node, etc.

## Available Hooks

| File | Trigger | Key Env Vars |
|------|---------|-------------|
| `pr_assigned.sh` | PR assigned to you | `SS_PR_NUMBER`, `SS_PR_URL`, `SS_PR_TITLE`, `SS_PR_AUTHOR`, `SS_PR_BRANCH` |
| `pr_review_requested.sh` | Review requested from you | same as above |
| `pr_approved.sh` | PR approved | same + `SS_PR_REVIEWER` |
| `pr_checks_passed.sh` | All CI checks pass | same as above |
| `pr_checks_failed.sh` | Any CI check fails | same as above |

All hooks also receive: `SS_REPO`, `SS_HOOK_EVENT`, `SS_PR_DRAFT`, `SS_PR_STATE`.

## Example: Auto-approve assigned PRs

```bash
#!/usr/bin/env bash
# hooks/pr_assigned.sh
ss prs approve "$SS_PR_NUMBER"
```

## Notes

- Scripts must be executable: `chmod +x hooks/pr_assigned.sh`
- Hooks run async and don't block the dashboard
- Output is logged to `hooks/.log`
- Same event won't re-fire until state changes again
- Hook scripts are gitignored — they stay local to your machine
