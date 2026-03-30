#!/bin/bash

# 🛰️ Space Station - Atomic Mission Control Orchestrator
# This script uses a single multi-command tmux call for 100% reliable layout.

PROJECT_ROOT="$1"
SPACESTATION_DIR="$2"
PLANETS_JSON="$3"

cd "$PROJECT_ROOT"

# Resolve absolute paths
TMUX_CONFIG="$(pwd)/tmux.conf"
SS_BINARY="$(pwd)/ss"
SESSION="SpaceStation"
SOCKET="SpaceStation"

# Parse planets
IFS=',' read -ra PLANETS <<< "$PLANETS_JSON"
P1_DIR="$SPACESTATION_DIR/${PLANETS[0]}"
P2_DIR="$SPACESTATION_DIR/${PLANETS[1]}"
P3_DIR="$SPACESTATION_DIR/${PLANETS[2]}"
P4_DIR="$SPACESTATION_DIR/${PLANETS[3]}"

# Base tmux command with isolated socket and config
TMUX="tmux -L $SOCKET -f $TMUX_CONFIG"

# 1. Kill any existing session on this socket
$TMUX kill-session -t "$SESSION" 2>/dev/null

# 2. Launch the entire bridge in one atomic transaction
# Window 0: Interactive Menu
# Window 1: 2x2 Planet Grid (Tiled)
$TMUX \
  new-session -d -s "$SESSION" -n "Menu" "$SS_BINARY" \; \
  new-window -t "$SESSION":1 -n "Planets" -c "$P1_DIR" \; \
  split-window -h -t "$SESSION":1.0 -c "$P2_DIR" \; \
  split-window -v -t "$SESSION":1.0 -c "$P3_DIR" \; \
  split-window -v -t "$SESSION":1.1 -c "$P4_DIR" \; \
  select-layout -t "$SESSION":1 tiled \; \
  select-window -t "$SESSION":0 \; \
  attach-session -t "$SESSION"
