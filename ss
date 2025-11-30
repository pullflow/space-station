#!/bin/bash

# 🛸 Space Station - Manage multiple parallel repo clones

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/ss.conf"
INIT_SCRIPT="$SCRIPT_DIR/planet-init.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Show header
echo -e "${CYAN}🛸 Space Station${NC}"
echo ""

# Allow init to run without config (to help create config)
if [ "$1" = "init" ]; then
    # Init will handle config creation
    :
else
    # Load configuration
    if [ -f "$CONFIG_FILE" ]; then
        source "$CONFIG_FILE"
    else
        echo -e "${RED}❌ Configuration file not found: ${CONFIG_FILE}${NC}"
        echo ""
        echo -e "${YELLOW}Run ${GREEN}ss init${YELLOW} to set up your configuration${NC}"
        exit 1
    fi

    # Validate required config
    if [ -z "$REPO" ]; then
        echo -e "${RED}❌ REPO not set in ${CONFIG_FILE}${NC}"
        exit 1
    fi

    if [ -z "$SPACESTATION_DIR" ]; then
        echo -e "${RED}❌ SPACESTATION_DIR not set in ${CONFIG_FILE}${NC}"
        exit 1
    fi

    # Set defaults
    EDITOR="${EDITOR:-cursor}"

    # Expand ~ in SPACESTATION_DIR
    SPACESTATION_DIR="${SPACESTATION_DIR/#\~/$HOME}"

    # Change to the universe directory
    if [ ! -d "$SPACESTATION_DIR" ]; then
        mkdir -p "$SPACESTATION_DIR"
    fi
    cd "$SPACESTATION_DIR"
fi

# Function to show status for all planets
show_status() {
    for dir in planet-*/; do
        if [ -d "$dir" ]; then
            cd "$dir"
            space_name="${dir%/}"
            branch=$(git branch --show-current)

            # Git status
            status=$(git status --porcelain)
            if [ -z "$status" ]; then
                git_status="${GREEN}✨Available${NC}"
            else
                changed_count=$(echo "$status" | wc -l | tr -d ' ')
                git_status="${YELLOW}🔧Active:${changed_count}${NC}"
            fi

            # Get associated PR
            pr_number=$(gh pr list --head "$branch" --json number -q ".[0].number" 2>/dev/null)
            if [ -n "$pr_number" ]; then
                pr_data=$(gh pr view "$pr_number" --json state,statusCheckRollup,reviews,reviewRequests 2>/dev/null)
                pr_state=$(echo "$pr_data" | jq -r ".state")
                pr_info="${GREEN}PR#${pr_number}${NC}(${pr_state})"

                # Count reviews
                pending_count=$(echo "$pr_data" | jq -r '[.reviewRequests[]?] | length')
                approved_count=$(echo "$pr_data" | jq -r '[.reviews[]? | select(.state == "APPROVED") | .author.login] | unique | length')
                changes_count=$(echo "$pr_data" | jq -r '[.reviews[]? | select(.state == "CHANGES_REQUESTED") | .author.login] | unique | length')

                reviews_info="${GREEN}✓${approved_count}${NC}/${YELLOW}⧗${pending_count}${NC}/${RED}✗${changes_count}${NC}"

                # Check runs status
                check_status=$(echo "$pr_data" | jq -r '[.statusCheckRollup[]? | select(.status != null) | .status] | if length == 0 then "NONE" else (if all(. == "COMPLETED") then "COMPLETED" else "PENDING" end) end')
                check_conclusion=$(echo "$pr_data" | jq -r '[.statusCheckRollup[]? | select(.conclusion != null) | .conclusion] | if length == 0 then "NONE" else (if all(. == "SUCCESS") then "SUCCESS" else (if any(. == "FAILURE") then "FAILURE" else "MIXED" end) end) end')

                if [ "$check_status" = "NONE" ]; then
                    checks_info=""
                elif [ "$check_status" = "PENDING" ]; then
                    checks_info="${YELLOW}⧗Checks${NC}"
                elif [ "$check_conclusion" = "SUCCESS" ]; then
                    checks_info="${GREEN}✓Checks${NC}"
                elif [ "$check_conclusion" = "FAILURE" ]; then
                    checks_info="${RED}✗Checks${NC}"
                else
                    checks_info="${YELLOW}~Checks${NC}"
                fi

                echo -e "🪐 ${BLUE}${space_name}${NC}: ${branch} [${git_status}] ${pr_info} ${reviews_info} ${checks_info}"
            else
                echo -e "🪐 ${BLUE}${space_name}${NC}: ${branch} [${git_status}] ${RED}No PR${NC}"
            fi
            cd ..
        fi
    done
}

# Function to show open issues assigned to the current user
show_issues() {
    echo -e "📋 ${BLUE}Fetching open issues assigned to you in ${REPO}...${NC}"
    issue_json=$(gh issue list -R "$REPO" --state open --assignee "@me" --json number,title,labels --limit 100 2>/dev/null)

    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to query GitHub issues via gh CLI.${NC}"
        return
    fi

    issue_count=$(echo "$issue_json" | jq 'length')

    if [ "$issue_count" -eq 0 ]; then
        echo -e "${GREEN}No open issues assigned to you in ${REPO}.${NC}"
        return
    fi

    echo "$issue_json" | jq -r '.[] | "\(.number)|\(.title)|\([.labels[].name] | join(","))"' | while IFS='|' read -r issue_num issue_title labels; do
        if [[ "$labels" == *"on it"* ]]; then
            # Issue has "on it" label - active work
            echo -e "${YELLOW}#${issue_num}:${NC} ${issue_title} ${GREEN}[on it]${NC}"
        else
            # Issue has no "on it" label
            echo -e "${RED}#${issue_num}:${NC} ${issue_title}"
        fi
    done
}

# Function to sync issues to todo.md
sync_issues() {
    local todo_file="$SPACESTATION_DIR/todo.md"

    if [ ! -f "$todo_file" ]; then
        echo -e "${RED}Error: todo.md not found at ${todo_file}${NC}"
        return 1
    fi

    echo -e "${BLUE}Fetching open issues assigned to you in ${REPO}...${NC}"
    issue_json=$(gh issue list -R "$REPO" --state open --assignee "@me" --json number,title,labels --limit 100 2>/dev/null)

    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to query GitHub issues via gh CLI.${NC}"
        return 1
    fi

    issue_count=$(echo "$issue_json" | jq 'length')

    if [ "$issue_count" -eq 0 ]; then
        echo -e "${GREEN}No open issues assigned to you in ${REPO}.${NC}"
        return 0
    fi

    # Read existing issue numbers from todo.md
    existing_issues=$(grep -oP '#\K\d+(?=:)' "$todo_file" | sort -u)

    # Create a temporary file to collect new issues
    temp_file=$(mktemp)
    added_count=0

    # Process each issue
    echo "$issue_json" | jq -r '.[] | "\(.number)|\(.title)|\([.labels[].name] | join(","))"' | while IFS='|' read -r issue_num issue_title labels; do
        # Check if issue already exists in todo.md
        if echo "$existing_issues" | grep -q "^${issue_num}$"; then
            continue
        fi

        # Format the new todo item
        if [[ "$labels" == *"on it"* ]]; then
            new_item="- [ ] #${issue_num}: ${issue_title} [on it]"
        else
            new_item="- [ ] #${issue_num}: ${issue_title}"
        fi

        # Write to temp file
        echo "$new_item" >> "$temp_file"
        echo -e "${GREEN}Added:${NC} #${issue_num}: ${issue_title}"
        echo "1" >> "${temp_file}.count"
    done

    # Count how many were added
    if [ -f "${temp_file}.count" ]; then
        added_count=$(wc -l < "${temp_file}.count")
        rm "${temp_file}.count"
    fi

    if [ $added_count -eq 0 ]; then
        echo -e "${GREEN}All issues are already in todo.md${NC}"
        rm "$temp_file"
    else
        # Append new issues to the end of todo.md
        cat "$temp_file" >> "$todo_file"
        rm "$temp_file"
        echo -e "${GREEN}Added ${added_count} new issue(s) to todo.md${NC}"
    fi
}

# Function to open a planet
open_planet() {
    local planet="planet-$1"
    echo -e "🪐 ${BLUE}Opening planet '${planet}' in $EDITOR...${NC}"
    $EDITOR "$planet"
}

# Function to list PRs authored by user or awaiting their review
list_prs() {
    echo -e "🔀 ${BLUE}Fetching PRs authored by you or awaiting your review in ${REPO}...${NC}"
    
    # Get PRs authored by the user
    authored_json=$(gh pr list -R "$REPO" --state open --author "@me" --json number,title,labels --limit 100 2>/dev/null)
    authored_status=$?
    
    # Get PRs awaiting review by the user
    review_json=$(gh pr list -R "$REPO" --state open --search "review-requested:@me" --json number,title,labels --limit 100 2>/dev/null)
    review_status=$?
    
    if [ $authored_status -ne 0 ] || [ $review_status -ne 0 ]; then
        echo -e "${RED}Error: Failed to query GitHub PRs via gh CLI.${NC}"
        return 1
    fi
    
    # Combine and deduplicate PRs (a PR might be both authored and awaiting review)
    # Use jq to merge arrays and get unique PRs by number
    all_prs=$(echo -e "$authored_json\n$review_json" | jq -s 'add | unique_by(.number) | sort_by(.number)')
    
    pr_count=$(echo "$all_prs" | jq 'length')
    
    if [ "$pr_count" -eq 0 ]; then
        echo -e "${GREEN}No open PRs authored by you or awaiting your review in ${REPO}.${NC}"
        return 0
    fi
    
    echo "$all_prs" | jq -r '.[] | "\(.number)|\(.title)|\([.labels[].name] | join(","))"' | while IFS='|' read -r pr_num pr_title labels; do
        if [ -n "$labels" ] && [ "$labels" != "" ]; then
            echo -e "${GREEN}#${pr_num}:${NC} ${pr_title} ${BLUE}[${labels}]${NC}"
        else
            echo -e "${GREEN}#${pr_num}:${NC} ${pr_title}"
        fi
    done
}

# Function to checkout a PR in a planet
checkout_pr() {
    local pr_number=$1
    local space=${2:-earth}  # Default to "earth" if not provided
    local space_dir="planet-${space}"

    if [ ! -d "$space_dir" ]; then
        echo -e "${RED}Error: Planet directory '${space_dir}' does not exist${NC}"
        exit 1
    fi

    echo -e "🚀 ${BLUE}Checking out PR #${pr_number} in planet '${space}'...${NC}"
    cd "$space_dir"

    # Get the branch name for the PR
    echo -e "${BLUE}Fetching PR information...${NC}"
    branch_name=$(gh pr view "$pr_number" -R "$REPO" --json headRefName -q '.headRefName' 2>/dev/null)

    if [ $? -ne 0 ] || [ -z "$branch_name" ]; then
        echo -e "${RED}Error: Failed to get branch name for PR #${pr_number}${NC}"
        cd ..
        exit 1
    fi

    echo -e "${GREEN}Branch:${NC} $branch_name"

    # Fetch latest changes
    echo -e "${BLUE}Fetching latest changes...${NC}"
    git fetch origin

    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to fetch from origin${NC}"
        cd ..
        exit 1
    fi

    # Checkout the PR branch
    echo -e "${BLUE}Checking out branch '${branch_name}'...${NC}"
    git checkout "$branch_name"

    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to checkout branch '${branch_name}'${NC}"
        cd ..
        exit 1
    fi

    # Merge main into the PR branch to get latest changes
    echo -e "${BLUE}Merging main into branch '${branch_name}'...${NC}"
    git merge origin/main --no-edit

    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}Warning: Merge had conflicts or failed, but continuing...${NC}"
        echo -e "${YELLOW}You may need to resolve conflicts manually${NC}"
    else
        echo -e "${GREEN}Successfully merged main into branch${NC}"
    fi

    # Run planet init script if it exists
    if [ -f "$SCRIPT_DIR/planet-init.sh" ]; then
        echo -e "🔧 ${BLUE}Running planet-init.sh...${NC}"
        bash "$SCRIPT_DIR/planet-init.sh"
        if [ $? -ne 0 ]; then
            echo -e "${YELLOW}Warning: planet-init.sh had errors, but continuing...${NC}"
        else
            echo -e "${GREEN}Planet initialized successfully${NC}"
        fi
    fi

    # Fetch PR description and save to a file
    echo -e "${BLUE}Fetching PR description...${NC}"
    # Create .local directory if it doesn't exist
    mkdir -p .local
    pr_file=".local/.pr-${pr_number}.md"
    pr_file_path="$(pwd)/${pr_file}"
    pr_data=$(gh pr view "$pr_number" -R "$REPO" --json title,body,number,url 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$pr_data" ]; then
        pr_title=$(echo "$pr_data" | jq -r '.title')
        pr_body=$(echo "$pr_data" | jq -r '.body // ""')
        pr_url=$(echo "$pr_data" | jq -r '.url')
        
        {
            echo "# PR #${pr_number}: ${pr_title}"
            echo ""
            echo "**URL:** ${pr_url}"
            echo ""
            echo "---"
            echo ""
            echo "$pr_body"
        } > "$pr_file"
        
        echo -e "${GREEN}PR description saved to ${pr_file}${NC}"
    else
        # Create a blank file if we can't fetch the PR
        echo "# PR #${pr_number}" > "$pr_file"
        echo -e "${YELLOW}Could not fetch PR description, created blank file${NC}"
    fi

    # Open the folder in the editor with the PR description file
    echo -e "🪐 ${BLUE}Opening planet in $EDITOR...${NC}"
    # Open a new window with the directory and PR file - this prevents opening previous files
    if [[ "$EDITOR" == *"cursor"* ]]; then
        $EDITOR --new-window "$(pwd)" "$pr_file_path"
    else
        $EDITOR "$pr_file_path"
    fi

    # Return to spaces folder
    cd "$SPACESTATION_DIR"
    echo -e "✅ ${GREEN}Successfully checked out PR #${pr_number} in planet '${space}'${NC}"
}

# Function to reset a planet
reset_planet() {
    local space=$1
    local space_dir="planet-${space}"

    if [ ! -d "$space_dir" ]; then
        echo -e "${RED}Error: Planet directory '${space_dir}' does not exist${NC}"
        exit 1
    fi

    echo -e "🔄 ${BLUE}Resetting planet '${space}'...${NC}"
    cd "$space_dir"

    # Check if git status is clean
    status=$(git status --porcelain)
    if [ -n "$status" ]; then
        echo -e "${RED}Error: Git status is not clean. Please commit or stash changes first.${NC}"
        echo "$status"
        cd ..
        exit 1
    fi

    echo -e "${GREEN}Git status is clean${NC}"
    echo -e "${BLUE}Checking out main...${NC}"
    git checkout main

    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to checkout main${NC}"
        cd ..
        exit 1
    fi

    echo -e "${BLUE}Pulling latest from origin...${NC}"
    git pull origin main

    if [ $? -eq 0 ]; then
        echo -e "✅ ${GREEN}Successfully reset planet '${space}' to latest main${NC}"
    else
        echo -e "${RED}Error: Failed to pull from origin${NC}"
        cd ..
        exit 1
    fi

    cd ..
}

# Function to initialize user environment
init_planets() {
    local env_local_files=(".env.local" ".env.preflight.local" ".env.production.local")

    echo -e "🛸 ${BLUE}Initializing Space Station environment...${NC}"
    echo ""

    # 1. Check/create ss.conf from example
    echo -e "${BLUE}Checking configuration files...${NC}"
    if [ -f "$CONFIG_FILE" ]; then
        echo -e "${GREEN}✓ ss.conf exists${NC}"
        source "$CONFIG_FILE"
    else
        if [ -f "$SCRIPT_DIR/ss.conf.example" ]; then
            echo -e "${YELLOW}📋 Creating ss.conf from example...${NC}"
            cp "$SCRIPT_DIR/ss.conf.example" "$CONFIG_FILE"
            # Set SPACESTATION_DIR to the script's directory by default
            sed -i '' "s|^SPACESTATION_DIR=.*|SPACESTATION_DIR=\"$SCRIPT_DIR\"|" "$CONFIG_FILE"
            echo -e "${GREEN}✓ Created ss.conf${NC}"
            echo -e "${GREEN}✓ Set SPACESTATION_DIR to ${SCRIPT_DIR}${NC}"
            echo -e "${YELLOW}⚠ Please edit ss.conf to set your REPO${NC}"
            echo -e "    ${CYAN}$CONFIG_FILE${NC}"
        else
            echo -e "${RED}❌ ss.conf.example not found${NC}"
        fi
    fi

    # 2. Check/create planet-init.sh from example
    if [ -f "$INIT_SCRIPT" ]; then
        echo -e "${GREEN}✓ planet-init.sh exists${NC}"
    else
        if [ -f "$SCRIPT_DIR/planet-init.sh.example" ]; then
            echo -e "${YELLOW}📋 Creating planet-init.sh from example...${NC}"
            cp "$SCRIPT_DIR/planet-init.sh.example" "$INIT_SCRIPT"
            chmod +x "$INIT_SCRIPT"
            echo -e "${GREEN}✓ Created planet-init.sh${NC}"
            echo -e "${YELLOW}⚠ Please edit planet-init.sh for your project's setup commands${NC}"
            echo -e "    ${CYAN}$INIT_SCRIPT${NC}"
        else
            echo -e "${YELLOW}⚠ planet-init.sh.example not found (optional)${NC}"
        fi
    fi

    echo ""

    # If config doesn't have required values, stop here
    if [ -z "$REPO" ]; then
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}Next steps:${NC}"
        echo -e "  1. Edit ${CYAN}ss.conf${NC} to set your REPO (e.g., owner/repo-name)"
        echo -e "  2. Edit ${CYAN}planet-init.sh${NC} for your project setup (optional)"
        echo -e "  3. Run ${GREEN}ss init${NC} again"
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        return 0
    fi

    # Default SPACESTATION_DIR to script directory if not set
    if [ -z "$SPACESTATION_DIR" ]; then
        SPACESTATION_DIR="$SCRIPT_DIR"
    fi

    # Expand ~ in SPACESTATION_DIR
    SPACESTATION_DIR="${SPACESTATION_DIR/#\~/$HOME}"

    # 3. Create shared directory and prompt about env files
    local shared_dir="$SPACESTATION_DIR/shared"
    mkdir -p "$shared_dir"

    echo -e "${BLUE}Checking shared env files...${NC}"
    local missing_files=()
    local existing_files=()

    for env_file in "${env_local_files[@]}"; do
        if [ -f "$shared_dir/$env_file" ]; then
            existing_files+=("$env_file")
        else
            missing_files+=("$env_file")
        fi
    done

    if [ ${#existing_files[@]} -gt 0 ]; then
        echo -e "${GREEN}✓ Found in ./shared:${NC}"
        for f in "${existing_files[@]}"; do
            echo -e "    ${GREEN}$f${NC}"
        done
    fi

    if [ ${#missing_files[@]} -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}⚠ Missing env files in ./shared:${NC}"
        for f in "${missing_files[@]}"; do
            echo -e "    ${RED}$f${NC}"
        done
        echo ""
        echo -e "${BLUE}Please add your env files to:${NC}"
        echo -e "    ${YELLOW}${shared_dir}/${NC}"
        echo ""
        echo -e "These files will be symlinked to all planets when you run ${GREEN}ss setup${NC}"
    else
        echo -e "${GREEN}✓ All env files present in ./shared${NC}"
    fi

    echo ""
    echo -e "✅ ${GREEN}Init complete!${NC}"
    echo ""
    echo -e "${BLUE}Run ${GREEN}ss launch${BLUE} to start a Space Station shell${NC}"
}

# Function to check dependencies
check_deps() {
    local missing_deps=()
    local install_cmds=()

    # Check for git
    if ! command -v git &> /dev/null; then
        missing_deps+=("git")
        install_cmds+=("  brew install git")
    fi

    # Check for gh (GitHub CLI)
    if ! command -v gh &> /dev/null; then
        missing_deps+=("gh (GitHub CLI)")
        install_cmds+=("  brew install gh && gh auth login")
    fi

    # Check for jq
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
        install_cmds+=("  brew install jq")
    fi

    if [ ${#missing_deps[@]} -gt 0 ]; then
        echo -e "${RED}❌ Missing dependencies:${NC}"
        for dep in "${missing_deps[@]}"; do
            echo -e "    ${RED}• $dep${NC}"
        done
        echo ""
        echo -e "${YELLOW}Install with:${NC}"
        for cmd in "${install_cmds[@]}"; do
            echo -e "${GREEN}$cmd${NC}"
        done
        echo ""
        return 1
    fi

    # Check if gh is authenticated
    if ! gh auth status &> /dev/null; then
        echo -e "${RED}❌ GitHub CLI not authenticated${NC}"
        echo -e "${YELLOW}Run:${NC} ${GREEN}gh auth login${NC}"
        return 1
    fi

    echo -e "${GREEN}✅ All dependencies installed${NC}"
    return 0
}

# Function to symlink all files from shared/ to all planets
symlink_shared() {
    local spaces=("a" "b" "c" "d" "earth")
    local shared_dir="$SPACESTATION_DIR/shared"

    echo -e "🔗 ${BLUE}Symlinking shared files to all planets...${NC}"
    echo ""

    # Check if shared directory exists
    if [ ! -d "$shared_dir" ]; then
        echo -e "${RED}Error: shared directory does not exist at ${shared_dir}${NC}"
        echo -e "${YELLOW}Run ${GREEN}ss init${NC} first to create it.${NC}"
        return 1
    fi

    # Get list of files in shared directory (excluding subdirectories for now)
    local shared_files=()
    for f in "$shared_dir"/*; do
        if [ -f "$f" ]; then
            shared_files+=("$(basename "$f")")
        fi
    done

    if [ ${#shared_files[@]} -eq 0 ]; then
        echo -e "${YELLOW}No files found in ${shared_dir}${NC}"
        return 0
    fi

    echo -e "${BLUE}Files to symlink:${NC}"
    for f in "${shared_files[@]}"; do
        echo -e "    ${CYAN}$f${NC}"
    done
    echo ""

    # Symlink to each planet
    for space in "${spaces[@]}"; do
        local space_dir="$SPACESTATION_DIR/planet-${space}"

        if [ ! -d "$space_dir" ]; then
            echo -e "${YELLOW}Skipping planet-${space} (directory doesn't exist)${NC}"
            continue
        fi

        echo -e "🪐 ${BLUE}Symlinking to planet-${space}...${NC}"

        for file in "${shared_files[@]}"; do
            local target_file="$space_dir/$file"
            local expected_link="../shared/$file"

            if [ -f "$target_file" ] && [ ! -L "$target_file" ]; then
                # Backup existing file if it's different from shared
                if ! cmp -s "$target_file" "$shared_dir/$file" 2>/dev/null; then
                    echo -e "${YELLOW}  Backing up existing ${file} to ${file}.backup...${NC}"
                    cp "$target_file" "${target_file}.backup"
                fi
                rm "$target_file"
            fi

            if [ ! -L "$target_file" ]; then
                ln -sf "$expected_link" "$target_file"
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}  ✓ ${file}${NC}"
                else
                    echo -e "${RED}  ✗ Failed to link ${file}${NC}"
                fi
            else
                # Verify the symlink points to the right place
                local link_target=$(readlink "$target_file")
                if [ "$link_target" != "$expected_link" ]; then
                    echo -e "${YELLOW}  Updating ${file} symlink...${NC}"
                    rm "$target_file"
                    ln -sf "$expected_link" "$target_file"
                    echo -e "${GREEN}  ✓ ${file}${NC}"
                else
                    echo -e "${GREEN}  ✓ ${file} (already linked)${NC}"
                fi
            fi
        done
        echo ""
    done

    echo -e "${GREEN}Symlink complete!${NC}"
}

# Function to setup all planets
setup_planets() {
    local spaces=("a" "b" "c" "d" "earth")
    local repo_url="https://github.com/${REPO}.git"
    local shared_dir="$SPACESTATION_DIR/shared"

    # Check dependencies first
    echo -e "🔍 ${BLUE}Checking dependencies...${NC}"
    if ! check_deps; then
        return 1
    fi
    echo ""

    # Create shared directory if it doesn't exist
    mkdir -p "$shared_dir"

    # Explain shared symlink mechanism and get confirmation
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📁 Shared Files Setup${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "Any files you place in ${CYAN}./shared/${NC} will be symlinked to all planets."
    echo -e "This is useful for env files like ${CYAN}.env.local${NC}, ${CYAN}.env.production.local${NC}, etc."
    echo ""
    echo -e "How it works:"
    echo -e "  1. Put your env files in ${CYAN}${shared_dir}/${NC}"
    echo -e "  2. Each planet gets a symlink: ${CYAN}planet-a/.env.local${NC} -> ${CYAN}../shared/.env.local${NC}"
    echo -e "  3. All planets share the same files (edit once, applies everywhere)"
    echo ""

    # Show current files in shared
    local shared_files=()
    for f in "$shared_dir"/*; do
        if [ -f "$f" ]; then
            shared_files+=("$(basename "$f")")
        fi
    done

    if [ ${#shared_files[@]} -gt 0 ]; then
        echo -e "${GREEN}Files currently in ./shared:${NC}"
        for f in "${shared_files[@]}"; do
            echo -e "    ${CYAN}$f${NC}"
        done
    else
        echo -e "${YELLOW}No files currently in ./shared${NC}"
        echo -e "${YELLOW}You can add files later and run ${GREEN}ss symlink${YELLOW} to link them.${NC}"
    fi
    echo ""

    # Ask for confirmation
    echo -e "${BLUE}Continue with setup?${NC} (y/n)"
    read -r confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Setup cancelled. Add your files to ./shared and run ${GREEN}ss setup${YELLOW} again.${NC}"
        return 0
    fi
    echo ""

    echo -e "🌌 ${BLUE}Setting up planets...${NC}"
    echo ""

    # Setup each planet
    for space in "${spaces[@]}"; do
        local space_dir="planet-${space}"
        echo -e "🪐 ${BLUE}Setting up planet: ${space_dir}${NC}"

        # Check if directory exists
        if [ ! -d "$space_dir" ]; then
            echo -e "${YELLOW}  Directory doesn't exist, cloning repository...${NC}"
            git clone "$repo_url" "$space_dir"
            if [ $? -ne 0 ]; then
                echo -e "${RED}  Error: Failed to clone repository${NC}"
                continue
            fi
        else
            echo -e "${GREEN}  Directory exists${NC}"
        fi

        cd "$space_dir"

        # Check if it's a git repository
        if [ ! -d ".git" ]; then
            echo -e "${YELLOW}  Not a git repository, initializing...${NC}"
            git init
            git remote add origin "$repo_url" 2>/dev/null || git remote set-url origin "$repo_url"
            git fetch origin
            git checkout -b main origin/main 2>/dev/null || git checkout main
        else
            # Ensure remote is set correctly
            if ! git remote get-url origin >/dev/null 2>&1; then
                git remote add origin "$repo_url"
            else
                git remote set-url origin "$repo_url"
            fi

            # Ensure we're on main branch and up to date
            echo -e "${BLUE}  Ensuring on main branch...${NC}"
            git fetch origin
            current_branch=$(git branch --show-current 2>/dev/null)
            if [ -z "$current_branch" ]; then
                # No branch checked out, checkout main
                git checkout -b main origin/main 2>/dev/null || git checkout main
            elif [ "$current_branch" != "main" ]; then
                # On different branch, switch to main
                git checkout main 2>/dev/null || git checkout -b main origin/main
            fi
            git pull origin main
        fi

        # Run planet init script if it exists
        if [ -f "$SCRIPT_DIR/planet-init.sh" ]; then
            echo -e "🔧 ${BLUE}  Running planet-init.sh...${NC}"
            bash "$SCRIPT_DIR/planet-init.sh"
            if [ $? -ne 0 ]; then
                echo -e "${YELLOW}  Warning: planet-init.sh had errors${NC}"
            else
                echo -e "${GREEN}  Planet initialized${NC}"
            fi
        fi

        cd "$SPACESTATION_DIR"
        echo ""
    done

    # Symlink all shared files to planets
    symlink_shared

    echo -e "${GREEN}Setup complete!${NC}"
}

# Main script logic
if [ $# -eq 0 ]; then
    # No arguments: show status
    show_status
elif [ "$1" = "init" ]; then
    init_planets
elif [ "$1" = "setup" ]; then
    setup_planets
elif [ "$1" = "issues" ]; then
    show_issues
elif [ "$1" = "sync" ]; then
    sync_issues
elif [ "$1" = "symlink" ]; then
    symlink_shared
elif [ "$1" = "pr" ]; then
    # PR command
    if [ $# -lt 2 ]; then
        # No PR number provided, list PRs
        list_prs
    else
        # PR number provided, checkout the PR
        pr_number=$2
        space=${3:-main}  # Default to "main" if not provided
        if [[ ! "$space" =~ ^(a|b|c|d|earth)$ ]]; then
            echo -e "${RED}Error: Invalid planet name. Use: a, b, c, d, or earth${NC}"
            exit 1
        fi
        checkout_pr "$pr_number" "$space"
    fi
elif [ "$1" = "reset" ] || [ "$1" = "-r" ]; then
    # Reset command
    if [ $# -ne 2 ]; then
        echo -e "${RED}Usage: $0 reset|-r [a|b|c|d|earth]${NC}"
        exit 1
    fi
    reset_planet "$2"
elif [ "$1" = "launch" ]; then
    # Launch a subshell with space station prompt
    echo -e "🚀 ${BLUE}Launching Space Station shell...${NC}"
    echo -e "${YELLOW}Type 'exit' to return to normal shell${NC}"
    echo ""

    # Build the init command to source launch.sh if it exists
    launch_file="$SPACESTATION_DIR/launch.sh"
    init_cmd=""
    if [ -f "$launch_file" ]; then
        init_cmd="source '$launch_file'"

        # Show shortcuts (aliases from launch.sh + ss)
        echo -e "${BLUE}Shortcuts:${NC}"
        echo -e "  ${GREEN}ss${NC} - Space Station CLI"
        # Parse aliases from launch.sh and display them
        grep -E '^alias ' "$launch_file" 2>/dev/null | while read -r line; do
            alias_name=$(echo "$line" | sed -E 's/^alias ([^=]+)=.*/\1/')
            alias_value=$(echo "$line" | sed -E 's/^alias [^=]+=["'"'"']?([^"'"'"']*)["'"'"']?/\1/')
            echo -e "  ${GREEN}${alias_name}${NC} - ${alias_value}"
        done
        echo ""
    fi

    # Always alias ss to the script
    ss_alias="alias ss='$SPACESTATION_DIR/ss'"
    if [ -n "$init_cmd" ]; then
        init_cmd="$init_cmd; $ss_alias"
    else
        init_cmd="$ss_alias"
    fi

    if command -v starship &> /dev/null; then
        # Starship is installed - create custom config that prepends emoji
        ss_starship_config="$SPACESTATION_DIR/.starship-ss.toml"
        if [ ! -f "$ss_starship_config" ]; then
            cat > "$ss_starship_config" << 'STARSHIP_EOF'
# Space Station starship config - prepends 🛸 to your prompt
format = "🛸 $all"
STARSHIP_EOF
        fi
        STARSHIP_CONFIG="$ss_starship_config" zsh -c "$init_cmd; exec zsh -i"
    else
        # No starship - just set PROMPT directly
        PROMPT="🛸 %~ %# " zsh -c "$init_cmd; exec zsh -i"
    fi
else
    # Open planet in editor
    if [[ "$1" =~ ^(a|b|c|d|earth)$ ]]; then
        open_planet "$1"
    else
        echo -e "${RED}Error: Invalid planet name. Use: a, b, c, d, or earth${NC}"
        echo -e "${YELLOW}Usage:${NC}"
        echo -e "  $0                    - Show status of all planets"
        echo -e "  $0 init               - Initialize environment (add alias, PATH, check env files)"
        echo -e "  $0 setup              - Setup/create all planets, install deps, link envs"
        echo -e "  $0 symlink            - Symlink all files from ./shared to all planets"
        echo -e "  $0 launch             - Launch a subshell with 🛸 prompt"
        echo -e "  $0 issues             - Show open issues assigned to you"
        echo -e "  $0 sync               - Sync GitHub issues to todo.md"
        echo -e "  $0 pr [number] [planet] - List PRs or checkout PR in planet (default: earth)"
        echo -e "  $0 [a|b|c|d|earth]    - Open planet in editor"
        echo -e "  $0 reset|-r [a|b|c|d|earth] - Reset planet to latest main"
        exit 1
    fi
fi
