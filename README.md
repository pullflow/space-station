# 🛸 Space Station

Manage multiple parallel clones of a repository for simultaneous feature development.

## Why Planets?

Instead of constantly switching branches, Space Station lets you work on multiple features/PRs simultaneously by maintaining separate clones (planets):

```
universe/
├── planet-a/        # Working on feature X
├── planet-b/        # Reviewing PR Y
├── planet-c/        # Bug fix Z
├── planet-d/        # Available
├── planet-earth/    # Always on main branch 🌍
└── shared/          # Shared env files (symlinked to all planets)
```

## Installation

1. Clone this repo or copy `ss` to your desired location
2. Make it executable: `chmod +x ss`
3. Run init to create config files from examples:

```bash
./ss init
```

4. Edit the generated config files:
   - `ss.conf` - Set your `REPO` and `UNIVERSE_DIR`
   - `planet-init.sh` - Customize for your project's setup (install deps, build, etc.)

5. Run init again to complete setup:

```bash
./ss init
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

# 4. Check status of all planets
ss
```

## Commands

| Command | Description |
|---------|-------------|
| `ss` | Show status of all planets (branch, changes, PR info) |
| `ss init` | Initialize environment (PATH, aliases, check env files) |
| `ss setup` | Clone all planets, install deps, symlink env files |
| `ss [a\|b\|c\|d\|earth]` | Open a planet in your editor |
| `ss pr` | List open PRs (authored by you or awaiting review) |
| `ss pr <number> [planet]` | Checkout PR in a planet (default: earth) |
| `ss reset <planet>` | Reset a planet to latest main |
| `ss issues` | Show open issues assigned to you |
| `ss sync` | Sync GitHub issues to todo.md |

## Status Output

When you run `ss` with no arguments, you'll see:

```
🛸 Space Station

🪐 planet-a: feature-branch [🔧Active:3] PR#123(OPEN) ✓2/⧗1/✗0 ✓Checks
🪐 planet-b: main [✨Available] No PR
...
```

- **🔧Active:N** - N uncommitted changes
- **✨Available** - Clean git status
- **PR#N** - Associated pull request
- **✓/⧗/✗** - Approved/Pending/Changes Requested reviews
- **Checks** - CI status (✓ passing, ✗ failing, ⧗ pending)

## Shared Environment Files

All planets share the same env files via symlinks:

```
shared/
├── .env.local
├── .env.preflight.local
├── .env.production.local
└── env/
    └── .env
```

Edit once in `shared/`, changes apply to all planets.

## Workflow Example

```bash
# Start work on a new PR
ss pr 456 a              # Checkout PR #456 in planet-a
ss a                     # Open planet-a in editor

# While waiting for review, work on something else
ss pr 789 b              # Checkout PR #789 in planet-b
ss b                     # Open planet-b in editor

# Check status of everything
ss                       # See all planets at a glance

# Done with a PR? Reset the planet
ss reset a               # Reset planet-a to main
```

## Prerequisites

The `ss setup` command will check for these dependencies and help you install them:

- **git** - `brew install git`
- **gh** (GitHub CLI) - `brew install gh && gh auth login`
- **jq** - `brew install jq`
- An editor (defaults to [Cursor](https://cursor.sh/))

## Custom Project Setup

Create `planet-init.sh` to define how planets are initialized (runs after checkout/setup):

```bash
cp planet-init.sh.example planet-init.sh
# Edit planet-init.sh for your project
```

Example for Node.js/pnpm:
```bash
pnpm install
pnpm build
```

Example for Python:
```bash
pip install -r requirements.txt
```

## Aliases

`ss init` adds this alias to your `~/.zshrc`:

```bash
alias cl="claude --dangerously-skip-permissions"
```

## License

MIT - see [LICENSE](LICENSE)
