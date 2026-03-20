# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

The **space-station** is a multi-agent orchestration layer for the CoAgency monorepo. It uses git worktrees — called **planets** — to run parallel Claude Code agents on different branches simultaneously.

Each planet (`planet-mercury`, `planet-venus`, `planet-earth`, `planet-mars`) is a separate git worktree of the same underlying CoAgency repository, allowing independent agents to work on different issues/PRs concurrently without interfering with each other.

## Structure

```
/space-station
  /planet-{name}/     Git worktrees of the CoAgency monorepo
  /shared/            Shared environment files (.env.local, .env.production.local)
  /logs/              MCP and audit logs
  launch.sh           Sourced by `ss launch` — defines agent aliases and ss subcommand shortcuts
  planet-init.sh      Template script run after checking out a PR or during planet setup
```

## Key Commands (via `ss` CLI)

The `ss` command manages the space station. After running `ss launch`, these aliases are available:

- `ss list` / `list` — Show all planets and their current branches
- `ss issues` / `issues` — Browse GitHub issues
- `ss prs` / `prs` — Browse open PRs
- `ss agent <planet>` — Launch an agent on a planet
- `ss land <planet>` — Land (merge) work from a planet
- `ss reset <planet>` — Reset a planet
- `ss setup` — Initialize all planets
- `ss sync` — Sync planets with main

Planet shortcuts: `mercury`, `venus`, `earth`, `mars` (or `mer`, `ven`, `mar`)

## Working Inside a Planet

When working inside a planet directory, refer to that planet's `CLAUDE.md` for the full CoAgency monorepo development guide (commands, architecture, database schemas, integration patterns, deployment, etc.). All planets share the same `CLAUDE.md` content.

The planet's `.claude/commands/` directory provides slash commands:
- `/welcome` — Show available commands and current branch
- `/issues` — Browse GitHub issues
- `/issue {number}` — Load issue and create plan
- `/plan` — Structured development planning
- `/catch-up` — Review current PR and diff
- `/pr [draft]` — Full PR workflow
- `/resolve-pr` — Address PR review comments
- `/push` — Commit and push changes
- `/grade` — Code quality assessment
- `/db` — Connect to local database
- `/workstream` — Monitor NATS JetStream streams

## Shared Environment

Environment files in `/shared/` are symlinked or referenced by planets:
- `.env.local` — Local development secrets
- `.env.production.local` — Production secrets (local reference only)

## Space status shell env values

This values should be in the shell. If missing, suggest adding to ~/.zshrc.
```sh
export CLAUDE_CODE_USE_VERTEX=1
export CLOUD_ML_REGION=global
export ANTHROPIC_VERTEX_PROJECT_ID=coagency-480322
alias cl="claude --allow-dangerously-skip-permissions --permission-mode bypassPermissions --effort low"
alias clr="claude --allow-dangerously-skip-permissions --permission-mode bypassPermissions --effort low --resume"
```

## Suggestions

Editor: Zed
Model: sonnet-latest
