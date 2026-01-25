#!/bin/bash

# 🐝 HIVE CLI - The Aegis Remote Control
# Based on External Agent Guidance (Section 4)

BRAIN_FILE=".ag_brain.md"
REGISTRY_FILE=".ag_registry.json"

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# פונקציה להחלפת משתמש וסנכרון
switch_node() {
  NODE_ID=$1
  if [ -z "$NODE_ID" ]; then echo "Usage: ./hive.sh switch [node_id]"; return; fi
  
  echo -e "${BLUE}--- Switching to Hive Node $NODE_ID ---${NC}"
  
  # 1. סנכרון מצב (משיכת שינויים מהמוח)
  git add .ag_brain.md .ag_registry.json
  git commit -m "[HIVE] Sync state before Node $NODE_ID takeover" --allow-empty
  
  # 2. החלפת חשבון (פקודת גוגל קלאוד)
  if command -v gcloud &> /dev/null; then
    gcloud config set account "user$NODE_ID@gmail.com"
  fi
  
  # 3. הזרקת קונטקסט לטרמינל עבור Claude Code
  export CLAUDE_CODE_CONTEXT="You are now Node $NODE_ID. Read .ag_brain.md immediately."
  
  echo -e "${GREEN}Node $NODE_ID is ready. Brain is synced.${NC}"
}

# פונקציה לבדיקת "בריאות" הכוורת
status() {
  echo -e "${BLUE}=== 🧠 HIVE MASTER STATE ===${NC}"
  if [ -f "$BRAIN_FILE" ]; then
    cat "$BRAIN_FILE" | grep "CURRENT OBJECTIVE" -A 10
  else
    echo -e "${RED}Error: Brain file not found!${NC}"
  fi
}

# פונקציות ניהול נעילות (שמירה על פונקציונליות הרישום)
lock() {
    FILE=$1
    if [ -z "$FILE" ]; then echo "Usage: ./hive.sh lock [filename]"; return; fi
    [ ! -f "$REGISTRY_FILE" ] && echo "{}" > "$REGISTRY_FILE"
    tmp=$(mktemp)
    # שימוש ב-NODE_ID מהסביבה או ברירת מחדל
    NODE_NAME="Node_${HIVE_NODE:-Unknown}"
    jq --arg f "$FILE" --arg n "$NODE_NAME" --arg t "$(date)" \
       '. + {($f): {locked_by: $n, timestamp: $t}}' "$REGISTRY_FILE" > "$tmp" && mv "$tmp" "$REGISTRY_FILE"
    echo -e "${RED}🔒 Resource LOCKED: $FILE${NC}"
}

unlock() {
    FILE=$1
    if [ -z "$FILE" ]; then echo "Usage: ./hive.sh unlock [filename]"; return; fi
    tmp=$(mktemp)
    jq "del(.\"$FILE\")" "$REGISTRY_FILE" > "$tmp" && mv "$tmp" "$REGISTRY_FILE"
    echo -e "${GREEN}🔓 Resource RELEASED: $FILE${NC}"
}

# Main Execution Logic
case "$1" in
  switch) switch_node $2 ;;
  status) status ;;
  lock) lock $2 ;;
  unlock) unlock $2 ;;
  *) echo "Usage: ./hive.sh {switch|status|lock|unlock} [args]" ;;
esac