#!/bin/bash

# 🛰️ Space Station - Atomic Mission Control Orchestrator

PROJECT_ROOT="$1"
PLANETS_DIR="$2"
PLANETS_JSON="$3"
AGENT_CMD="$4"

cd "$PROJECT_ROOT"

TMUX_CONFIG="$PROJECT_ROOT/resources/config/tmux.conf"
PLUGINS_DIR="$PROJECT_ROOT/resources/plugins"
SESSION="SpaceStation"
SOCKET="SpaceStation"

# Bootstrap TPM if not present
if [ ! -d "$PLUGINS_DIR/tpm" ]; then
  git clone https://github.com/tmux-plugins/tpm "$PLUGINS_DIR/tpm"
fi

IFS=',' read -ra PLANETS <<< "$PLANETS_JSON"
P1_DIR="$PLANETS_DIR/${PLANETS[0]}"
P2_DIR="$PLANETS_DIR/${PLANETS[1]}"
P3_DIR="$PLANETS_DIR/${PLANETS[2]}"

# Write a resolved copy of tmux.conf with absolute paths baked in
RESOLVED_CONF="/tmp/ss-tmux.conf"
sed -e "s|\$SS_PLUGINS_DIR|$PLUGINS_DIR|g" "$TMUX_CONFIG" > "$RESOLVED_CONF"

TMUX="tmux -L $SOCKET -f $RESOLVED_CONF"

$TMUX kill-session -t "$SESSION" 2>/dev/null

# Single window, 2x2 grid:
#   Pane 0 (top-left):  SS reference card
#   Pane 1 (top-right): agent in planet 1
#   Pane 2 (bot-left):  agent in planet 2
#   Pane 3 (bot-right): agent in planet 3
$TMUX \
  new-session -d -s "$SESSION" -n "Mission Control" -c "$PROJECT_ROOT" \; \
  send-keys -t "$SESSION":0.0 "cat $PROJECT_ROOT/resources/reference.txt; echo; read" Enter \; \
  split-window -h -t "$SESSION":0.0 -c "$P1_DIR" \; \
  send-keys -t "$SESSION":0.1 "$AGENT_CMD" Enter \; \
  split-window -v -t "$SESSION":0.0 -c "$P2_DIR" \; \
  send-keys -t "$SESSION":0.2 "$AGENT_CMD" Enter \; \
  split-window -v -t "$SESSION":0.1 -c "$P3_DIR" \; \
  send-keys -t "$SESSION":0.3 "$AGENT_CMD" Enter \; \
  select-layout -t "$SESSION":0 tiled \; \
  select-pane -t "$SESSION":0.0 \; \
  attach-session -t "$SESSION"
