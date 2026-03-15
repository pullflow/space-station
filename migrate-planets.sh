#!/bin/bash

# 🛸 Space Station - Planet Migration Script
# This script migrates your existing planets to the new proper naming convention:
# planet-a     -> planet-mercury
# planet-b     -> planet-venus
# planet-c     -> planet-mars
# planet-d     -> (removed)
# planet-earth -> (remains)

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "🚀 ${BLUE}Starting planet migration...${NC}"

migrate_planet() {
    local old_name=$1
    local new_name=$2

    if [ -d "$old_name" ]; then
        if [ -d "$new_name" ]; then
            echo -e "${YELLOW}⚠ Target directory '$new_name' already exists. Skipping '$old_name' migration.${NC}"
        else
            echo -e "${GREEN}✓ Renaming $old_name to $new_name...${NC}"
            mv "$old_name" "$new_name"
        fi
    else
        echo -e "  Skipping $old_name (not found)"
    fi
}

# 1. Migrate a, b, c
migrate_planet "planet-a" "planet-mercury"
migrate_planet "planet-b" "planet-venus"
migrate_planet "planet-c" "planet-mars"

# 2. Handle planet-d (deletion)
if [ -d "planet-d" ]; then
    echo -e "${YELLOW}⚠ Found planet-d. Space Station now uses a 4-planet structure.${NC}"
    echo -ne "${YELLOW}Do you want to delete planet-d? (y/n): ${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo -e "${RED}✗ Deleting planet-d...${NC}"
        rm -rf "planet-d"
    else
        echo -e "${BLUE}ℹ Keeping planet-d directory, but it will be ignored by Space Station.${NC}"
    fi
fi

echo ""
echo -e "✅ ${GREEN}Migration complete!${NC}"
echo -e "${BLUE}Please run ${GREEN}ss list${BLUE} to verify your planets.${NC}"
