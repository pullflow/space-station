#!/bin/bash

# 🛰️ Space Station - Mission Control Orchestrator
# This script is called by iTerm2 to set up the isolated Command Center

PROJECT_ROOT="$1"
SPACESTATION_DIR="$2"
PLANETS_JSON="$3" # Passed as a comma-separated string

cd "$PROJECT_ROOT"

TMUX_CONFIG="./tmux.conf"
SS_BINARY="./ss"
SESSION="SpaceStation"
SOCKET="SpaceStation"

# Base tmux command with isolated socket and config
TMUX="tmux -L $SOCKET -f $TMUX_CONFIG"

# 1. Clean up any existing session
$TMUX kill-session -t "$SESSION" 2>/dev/null

# 2. Start the Menu session (Window 0)
$TMUX new-session -d -s "$SESSION" -n "Menu" "$SS_BINARY"

# 3. Create the Planets window (Window 1)
$TMUX new-window -t "$SESSION":1 -n "Planets"

# 4. Orchestrate the 2x2 Grid
# Split the comma-separated planets
IFS=',' read -ra PLANETS <<< "$PLANETS_JSON"

# Pane 0 (Top Left) - Planet 1
if [ ${#PLANETS[@]} -ge 1 ]; then
    P1_DIR="$SPACESTATION_DIR/${PLANETS[0]}"
    $TMUX send-keys -t "$SESSION":1.0 "cd $P1_DIR && clear" C-m
fi

# Pane 1 (Top Right) - Planet 2
if [ ${#PLANETS[@]} -ge 2 ]; then
    P2_DIR="$SPACESTATION_DIR/${PLANETS[1]}"
    $TMUX split-window -h -t "$SESSION":1.0 "cd $P2_DIR && clear && exec $SHELL"
fi

# Pane 2 (Bottom Left) - Planet 3
if [ ${#PLANETS[@]} -ge 3 ]; then
    P3_DIR="$SPACESTATION_DIR/${PLANETS[2]}"
    $TMUX split-window -v -t "$SESSION":1.0 "cd $P3_DIR && clear && exec $SHELL"
fi

# Pane 3 (Bottom Right) - Planet 4
if [ ${#PLANETS[@]} -ge 4 ]; then
    P4_DIR="$SPACESTATION_DIR/${PLANETS[3]}"
    $TMUX split-window -v -t "$SESSION":1.1 "cd $P4_DIR && clear && exec $SHELL"
fi

# 5. Finalize: Select Menu window and Attach
$TMUX select-window -t "$SESSION":0
$TMUX attach-session -t "$SESSION"
