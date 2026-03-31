# Space Station

This planet is part of the **Space Station** — a multi-agent orchestration layer using git worktrees for parallel development.

## Planet Identity

SS drops a `.env.planet` file into this directory on every setup and reset:

```sh
SS_PLANET_NAME=mercury
SS_PLANET_BASE_PORT=8000
```

Source it wherever you need planet-specific values (ports, names, etc.).

## Setup Hook

If your repo needs custom initialization (e.g. rewriting ports in `.env.local`), add an executable script at either:

```
space-station-init.sh
scripts/space-station-init.sh
```

SS checks both locations (in that order) and calls the first one it finds, after dropping `.env.planet` and symlinking shared files. The following environment variables are available:

```sh
PLANET_DIR   # absolute path to this planet directory
SS_ROOT      # absolute path to the space station root
```

Example `space-station-init.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
source "$PLANET_DIR/.env.planet"

sed -i.bak "s/^PORT=.*/PORT=${SS_PLANET_BASE_PORT}/" .env.local
rm -f .env.local.bak
```

## Shared Files

Anything in `planets/_shared/` is symlinked into every planet on setup. Edit files there to propagate changes to all planets.

## Key Commands

```sh
ss list          # Show all planets and branches
ss reset <p>     # Reset a planet to main (re-runs linking)
ss agent <p>     # Launch agent on a planet
```
