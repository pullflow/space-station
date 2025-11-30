# 🛸 Space Station

Manage multiple parallel clones of a repository for simultaneous feature development.

## Why Planets?

Instead of constantly switching branches, Space Station lets you work on multiple features/PRs simultaneously by maintaining separate clones (planets):

```
space-station/
├── planet-a/        # Working on feature X
├── planet-b/        # Reviewing PR Y
├── planet-c/        # Bug fix Z
├── planet-d/        # Available
├── planet-earth/    # Always on main branch 🌍
└── shared/          # Shared env files (symlinked to all planets)
```

## Setup

### Step 1: Clone Space Station

```bash
cd ~/your-project-folder
git clone https://github.com/pullflow/space-station.git
cd space-station
```

### Step 2: Initialize Configuration

```bash
./ss init
```

This creates `ss.conf` and `planet-init.sh` from examples.

### Step 3: Configure

Edit `ss.conf`:
```bash
REPO="owner/repo-name"           # Your GitHub repo
SPACESTATION_DIR="/path/to/space-station"
EDITOR="cursor"                   # Your preferred editor
```

Edit `planet-init.sh` for your project's setup commands (e.g., `pnpm install`).

### Step 4: Add Shared Files

Copy your env files to `./shared/`:
```bash
cp /path/to/.env.local ./shared/
cp /path/to/.env.production.local ./shared/
```

Any files here will be symlinked to all planets.

### Step 5: Setup Planets

```bash
./ss setup
```

This clones 5 copies of your repo (planet-a through planet-earth) and symlinks shared files.

### Step 6: Launch

```bash
./ss
```

You're now in the Space Station shell with 🛸 in your prompt. All commands below work as shortcuts.

## Commands

Inside the Space Station shell, these shortcuts are available:

| Command | Description |
|---------|-------------|
| `list` | Show status of all planets (branch, changes, PR info) |
| `a` / `b` / `c` / `d` / `earth` | Open a planet in your editor |
| `pr` | List open PRs (authored by you or awaiting review) |
| `pr <number> [planet]` | Checkout PR in a planet (default: earth) |
| `reset <planet>` | Reset a planet to latest main |
| `issues` | Show open issues assigned to you |
| `symlink` | Symlink all files from ./shared to all planets |
| `agent` | Launch Claude CLI |
| `config` | Show current configuration |
| `help` | Show all available commands |

All commands also work with `ss` prefix (e.g., `ss list`, `ss pr 123 a`).

## Status Output

When you run `list` (or `ss list`), you'll see:

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

## Shared Files

All planets share the same files via symlinks. Any file you place in `./shared/` will be symlinked to all planets:

```
shared/
├── .env.local
├── .env.production.local
└── any-other-file.json
```

Edit once in `shared/`, changes apply to all planets. Run `ss symlink` anytime to re-link files.

## Workflow Example

```bash
# Check what's available
list                     # See all planets at a glance

# Start work on a new PR
pr 456 a                 # Checkout PR #456 in planet-a
a                        # Open planet-a in editor

# While waiting for review, work on something else
pr 789 b                 # Checkout PR #789 in planet-b
b                        # Open planet-b in editor

# Need AI help? Launch Claude in any planet directory
agent                    # Starts claude CLI

# Check status again
list

# Done with a PR? Reset the planet
reset a                  # Reset planet-a to main
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

## Space Station Shell

Running `./ss` starts a subshell with:

- 🛸 emoji in your prompt (works with Starship)
- All shortcuts available (`list`, `pr`, `a`, `b`, `agent`, etc.)
- Your normal shell config (`.zshrc`) is loaded first

### Customizing with launch.sh

The `launch.sh` file is sourced when you enter the Space Station shell. Edit it to add your own shortcuts:

```bash
# launch.sh

# Agent configuration (default: claude)
export AGENT="claude"
alias agent="$AGENT"

# Add your own project-specific shortcuts
alias dev="pnpm dev"
alias test="pnpm test"
alias logs="tail -f ./logs/dev.log"
```

The default `launch.sh` includes:
- `agent`, `resume`, `cont` - Claude CLI aliases
- `list`, `pr`, `issues`, `reset`, etc. - All ss subcommands
- `a`, `b`, `c`, `d`, `earth` - Planet shortcuts

## Recommended Terminal Layout

Use your terminal's split view to create a 2x2 grid for maximum productivity:

```
┌─────────────────┬─────────────────┐
│  ss             │  planet-a       │
│  (command hub)  │  (feature work) │
├─────────────────┼─────────────────┤
│  planet-earth   │  planet-b       │
│  (main branch)  │  (PR review)    │
└─────────────────┴─────────────────┘
```

- **Top-left**: `ss` - your command hub for status checks and navigation
- **Bottom-left**: `planet-earth` - always on main for quick reference
- **Top-right**: `planet-a` - active feature development
- **Bottom-right**: `planet-b` - PR review or second task

## License

MIT - see [LICENSE](LICENSE)
