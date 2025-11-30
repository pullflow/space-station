# 🛸 Space Station

A workspace for managing multiple parallel clones of the [coagency](https://github.com/pullflow/coagency) repository.

## Why Spaces?

Instead of constantly switching branches, spaces lets you work on multiple features/PRs simultaneously by maintaining separate clones:

```
spaces/
├── coagency-a/      # Working on feature X
├── coagency-b/      # Reviewing PR Y
├── coagency-c/      # Bug fix Z
├── coagency-d/      # Available
├── coagency-e/      # Available
├── coagency-main/   # Always on main branch
└── shared/          # Shared env files (symlinked to all spaces)
```

## Quick Start

```bash
# 1. Initialize your environment (adds ss to PATH, sets up aliases)
./ss init

# 2. Add your env files to ./shared/
#    - .env.local
#    - .env.preflight.local
#    - .env.production.local

# 3. Clone repos and link env files
ss setup

# 4. Check status of all spaces
ss
```

## Commands

| Command | Description |
|---------|-------------|
| `ss` | Show status of all spaces (branch, changes, PR info) |
| `ss init` | Initialize environment (PATH, aliases, check env files) |
| `ss setup` | Clone all spaces, install deps, symlink env files |
| `ss [a\|b\|c\|d\|e\|main]` | Open a space in Cursor |
| `ss pr` | List open PRs (authored by you or awaiting review) |
| `ss pr <number> [space]` | Checkout PR in a space (default: main) |
| `ss reset <space>` | Reset a space to latest main |
| `ss issues` | Show open issues assigned to you |
| `ss sync` | Sync GitHub issues to todo.md |

## Status Output

When you run `ss` with no arguments, you'll see:

```
🛸 Space Station

coagency-a: feature-branch [Active:3] PR#123(OPEN) ✓2/⧗1/✗0 ✓Checks
coagency-b: main [Available] No PR
...
```

- **Active:N** - N uncommitted changes
- **Available** - Clean git status
- **PR#N** - Associated pull request
- **✓/⧗/✗** - Approved/Pending/Changes Requested reviews
- **Checks** - CI status (✓ passing, ✗ failing, ⧗ pending)

## Shared Environment Files

All spaces share the same env files via symlinks:

```
shared/
├── .env.local
├── .env.preflight.local
├── .env.production.local
└── env/
    └── .env
```

Edit once in `shared/`, changes apply to all spaces.

## Workflow Example

```bash
# Start work on a new PR
ss pr 456 a              # Checkout PR #456 in space a
ss a                     # Open space a in Cursor

# While waiting for review, work on something else
ss pr 789 b              # Checkout PR #789 in space b
ss b                     # Open space b in Cursor

# Check status of everything
ss                       # See all spaces at a glance

# Done with a PR? Reset the space
ss reset a               # Reset space a to main
```

## Prerequisites

- [GitHub CLI](https://cli.github.com/) (`gh`) - authenticated
- [pnpm](https://pnpm.io/)
- [jq](https://stedolan.github.io/jq/)
- [Cursor](https://cursor.sh/) (or change `EDITOR` in the script)

## Aliases

`ss init` adds this alias to your `~/.zshrc`:

```bash
alias cl="claude --dangerously-skip-permissions"
```

