#!/bin/bash

# 🐝 Aegis Hive Control Center - v2.0 (2026 Edition)
# Managing 7 Antigravity Nodes + Claude Code + Codex Bridge

# --- Configuration ---
ACCOUNTS=(
    "querico.auto@gmail.com"  # Node 1
    "sask8gal@gmail.com"     # Node 2
    "sassong4l@gmail.com"    # Node 3 (Master Hub: Claude/GPT)
    "gal@flow-it.biz"        # Node 4
    "gal@joya-tech.net"      # Node 5
    "sasson1009@gmail.com"   # Node 6
    "perootapp@gmail.com"    # Node 7
)

CLAUDE_USER="sassong4l@gmail.com"
BRAIN_FILE=".ag_brain.md"
REGISTRY_FILE=".ag_registry.json"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
YELLOW='\033[1;33m'
NC='\033[0m'

# --- Logic ---

function show_help() {
    echo -e "${PURPLE}HIVE CONTROL SYSTEM - COMMANDS:${NC}"
    echo "  switch [1-7]  - Rotate Antigravity account, Sync Git, & Update Identity"
    echo "  lock [file]   - Tag a file as 'Under Construction' by the active Node"
    echo "  unlock [file] - Release file for other Agents (Claude/Antigravity)"
    echo "  status        - View Brain Objectives and Lock Registry"
    echo "  sync          - Immediate Git push of Brain and Code state"
    echo "  check         - Verify Hive infrastructure integrity"
}

# Identity & Context Manager
function switch_node() {
    NODE_ID=$1
    if [[ -z "$NODE_ID" || $NODE_ID -lt 1 || $NODE_ID -gt 7 ]]; then
        echo -e "${RED}Error: Choose Node 1 to 7.${NC}"
        return
    fi
    
    EMAIL=${ACCOUNTS[$((NODE_ID-1))]}
    echo -e "${BLUE}🔄 Synchronizing Hive State before transition...${NC}"

    # 1. Atomic Sync: Ensuring the next node sees exactly what happened
    git add $BRAIN_FILE $REGISTRY_FILE
    git commit -m "chore(hive): auto-sync state - handover to Node $NODE_ID ($EMAIL)" --allow-empty

    # 2. Google Identity Switch (Antigravity Core)
    echo -e "${YELLOW}🔑 Setting Google Account to: $EMAIL...${NC}"
    gcloud config set account "$EMAIL" 2>/dev/null
    
    # 3. Environment Injection
    export HIVE_NODE=$NODE_ID
    export ACTIVE_EMAIL=$EMAIL
    
    # 4. Master Hub Logic
    if [ "$EMAIL" == "$CLAUDE_USER" ]; then
        echo -e "${PURPLE}⭐ MASTER HUB ACTIVE: Claude Code & GPT Context are now synced.${NC}"
    fi

    echo -e "${GREEN}✅ NODE $NODE_ID ACTIVE. Open Antigravity and continue task.${NC}"
}

# Registry Management
function lock_file() {
    FILE=$1
    if [ -z "$FILE" ]; then echo "Usage: hive lock [filename]"; return; fi
    echo "{\"file\": \"$FILE\", \"locked_by\": \"Node_$HIVE_NODE\", \"timestamp\": \"$(date)\"}" >> "$REGISTRY_FILE"
    echo -e "${RED}🔒 Resource LOCKED: $FILE${NC}"
}

function unlock_file() {
    FILE=$1
    if [ -z "$FILE" ]; then echo "Usage: hive unlock [filename]"; return; fi
    # Remove the line with the filename
    sed -i '' "/$FILE/d" "$REGISTRY_FILE" 2>/dev/null || sed -i "/$FILE/d" "$REGISTRY_FILE"
    echo -e "${GREEN}🔓 Resource RELEASED: $FILE${NC}"
}

function show_status() {
    echo -e "${PURPLE}=== 🧠 GLOBAL BRAIN STATE ===${NC}"
    if [ -f "$BRAIN_FILE" ]; then
        # Print current objective section
        sed -n '/## 🎯 CURRENT OBJECTIVE/,/##/p' "$BRAIN_FILE" | head -n -1
    else
        echo -e "${RED}Warning: .ag_brain.md not found!${NC}"
    fi
    
    echo -e "\n${YELLOW}=== 📋 LOCKED IN REGISTRY ===${NC}"
    if [ -s "$REGISTRY_FILE" ]; then
        cat "$REGISTRY_FILE"
    else
        echo "No locked files. All resources available."
    fi
}

function verify_hive() {
    echo -e "${BLUE}Verifying Hive Infrastructure...${NC}"
    FILES=(".ag_brain.md" ".ag_registry.json" ".ag_protocols/sync_protocol.md")
    for f in "${FILES[@]}"; do
        [ -f "$f" ] && echo -e "  ${GREEN}✓ $f${NC}" || echo -e "  ${RED}✗ $f (Missing)${NC}"
    done
}

# --- Router ---
case "$1" in
    switch) switch_node "$2" ;;
    lock)   lock_file "$2" ;;
    unlock) unlock_file "$2" ;;
    status) show_status ;;
    sync)   git add . && git commit -m "hive: manual sync" && git push ;;
    check)  verify_hive ;;
    *)      show_help ;;
esac