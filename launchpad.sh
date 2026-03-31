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


IFS=',' read -ra PLANETS <<< "$PLANETS_JSON"
P1_DIR="$PLANETS_DIR/${PLANETS[0]}"
P2_DIR="$PLANETS_DIR/${PLANETS[1]}"
P3_DIR="$PLANETS_DIR/${PLANETS[2]}"

planet_color() {
  local color
  color=$(grep -m1 '^SS_PLANET_COLOR=' "$1/.env.planet" 2>/dev/null | cut -d= -f2)
  case "$color" in
    red|blue|green|yellow|purple|orange|pink|cyan) echo "$color" ;;
    *) echo "default" ;;
  esac
}
P1_COLOR=$(planet_color "$P1_DIR")
P2_COLOR=$(planet_color "$P2_DIR")
P3_COLOR=$(planet_color "$P3_DIR")

# Write a resolved copy of tmux.conf with absolute paths baked in
RESOLVED_CONF="/tmp/ss-tmux.conf"
sed -e "s|\$SS_PLUGINS_DIR|$PLUGINS_DIR|g" "$TMUX_CONFIG" > "$RESOLVED_CONF"

TMUX="tmux -L $SOCKET -f $RESOLVED_CONF"

$TMUX kill-session -t "$SESSION" 2>/dev/null

# Single window, 2x2 grid:
#   Pane 0 (top-left):  ss dock (mission dashboard)
#   Pane 1 (top-right): agent in planet 1
#   Pane 2 (bot-left):  agent in planet 2
#   Pane 3 (bot-right): agent in planet 3
# Create session with pane 0 (top-left: dock)
$TMUX new-session -d -s "$SESSION" -n "Mission Control" -c "$PROJECT_ROOT"
$TMUX send-keys -t "$SESSION":0.0 "cd $PROJECT_ROOT && bun run src/index.ts dock" Enter

# Pane 1 (top-right: planet 1)
PANE1=$($TMUX split-window -h -P -F "#{pane_id}" -t "$SESSION":0.0 -c "$P1_DIR")
$TMUX send-keys -t "$PANE1" "$AGENT_CMD" Enter

# Pane 2 (bottom-left: planet 2)
PANE2=$($TMUX split-window -v -P -F "#{pane_id}" -t "$SESSION":0.0 -c "$P2_DIR")
$TMUX send-keys -t "$PANE2" "$AGENT_CMD" Enter

# Pane 3 (bottom-right: planet 3)
PANE3=$($TMUX split-window -v -P -F "#{pane_id}" -t "$PANE1" -c "$P3_DIR")
$TMUX send-keys -t "$PANE3" "$AGENT_CMD" Enter

$TMUX select-layout -t "$SESSION":0 tiled
$TMUX select-pane -t "$SESSION":0.0

# Send /rename and /color to each planet pane after Claude Code has had time to load
(sleep 2 && \
  tmux -L $SOCKET send-keys -t "$PANE1" "/rename ${PLANETS[0]}" Enter && sleep 0.5 && \
  tmux -L $SOCKET send-keys -t "$PANE1" "/color $P1_COLOR" Enter && sleep 0.5 && \
  tmux -L $SOCKET send-keys -t "$PANE2" "/rename ${PLANETS[1]}" Enter && sleep 0.5 && \
  tmux -L $SOCKET send-keys -t "$PANE2" "/color $P2_COLOR" Enter && sleep 0.5 && \
  tmux -L $SOCKET send-keys -t "$PANE3" "/rename ${PLANETS[2]}" Enter && sleep 0.5 && \
  tmux -L $SOCKET send-keys -t "$PANE3" "/color $P3_COLOR" Enter \
) &

$TMUX attach-session -t "$SESSION"
