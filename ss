#!/bin/bash

# Get the directory where this script lives
SPACES_DIR="~/coagency/spaces"
REPO="pullflow/coagency"
EDITOR="cursor"

# Change to the script directory
cd "$SPACES_DIR"

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

# Function to show status for all spaces
show_status() {
    for dir in coagency-*/; do
        if [ -d "$dir" ]; then
            cd "$dir"
            space_name="${dir%/}"
            branch=$(git branch --show-current)

            # Git status
            status=$(git status --porcelain)
            if [ -z "$status" ]; then
                git_status="${GREEN}Available${NC}"
            else
                changed_count=$(echo "$status" | wc -l | tr -d ' ')
                git_status="${YELLOW}Active:${changed_count}${NC}"
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

                echo -e "${BLUE}${space_name}${NC}: ${branch} [${git_status}] ${pr_info} ${reviews_info} ${checks_info}"
            else
                echo -e "${BLUE}${space_name}${NC}: ${branch} [${git_status}] ${RED}No PR${NC}"
            fi
            cd ..
        fi
    done
}

# Function to show open issues assigned to the current user
show_issues() {
    echo -e "${BLUE}Fetching open issues assigned to you in ${REPO}...${NC}"
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
    local todo_file="$SPACES_DIR/todo.md"

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

# Function to open a space in Zed
open_space() {
    local space="coagency-$1"
    echo -e "${BLUE}Opening space '${space}' in $EDITOR...${NC}"
    $EDITOR "$space"
}

# Function to list PRs authored by user or awaiting their review
list_prs() {
    echo -e "${BLUE}Fetching PRs authored by you or awaiting your review in ${REPO}...${NC}"
    
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

# Function to checkout a PR in a space
checkout_pr() {
    local pr_number=$1
    local space=${2:-main}  # Default to "main" if not provided
    local space_dir="coagency-${space}"

    if [ ! -d "$space_dir" ]; then
        echo -e "${RED}Error: Space directory '${space_dir}' does not exist${NC}"
        exit 1
    fi

    echo -e "${BLUE}Checking out PR #${pr_number} in space '${space}'...${NC}"
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

    # Run pnpm install
    echo -e "${BLUE}Running pnpm install...${NC}"
    pnpm install

    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}Warning: pnpm install failed, but continuing...${NC}"
    else
        echo -e "${GREEN}Dependencies installed successfully${NC}"
    fi

    # Run pnpm build
    echo -e "${BLUE}Running pnpm build...${NC}"
    pnpm build

    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}Warning: pnpm build failed, but continuing...${NC}"
    else
        echo -e "${GREEN}Build completed successfully${NC}"
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
    echo -e "${BLUE}Opening space in $EDITOR...${NC}"
    # Open a new window with the directory and PR file - this prevents opening previous files
    if [[ "$EDITOR" == *"cursor"* ]]; then
        $EDITOR --new-window "$(pwd)" "$pr_file_path"
    else
        $EDITOR "$pr_file_path"
    fi

    # Return to spaces folder
    cd "$SPACES_DIR"
    echo -e "${GREEN}Successfully checked out PR #${pr_number} in space '${space}'${NC}"
}

# Function to reset a space
reset_space() {
    local space=$1
    local space_dir="coagency-${space}"

    if [ ! -d "$space_dir" ]; then
        echo -e "${RED}Error: Space directory '${space_dir}' does not exist${NC}"
        exit 1
    fi

    echo -e "${BLUE}Resetting space '${space}'...${NC}"
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
        echo -e "${GREEN}Successfully reset space '${space}' to latest main${NC}"
    else
        echo -e "${RED}Error: Failed to pull from origin${NC}"
        cd ..
        exit 1
    fi

    cd ..
}

# Function to initialize user environment
init_spaces() {
    local zshrc="$HOME/.zshrc"
    local changes_made=false
    local env_local_files=(".env.local" ".env.preflight.local" ".env.production.local")

    echo -e "${BLUE}Initializing spaces environment...${NC}"
    echo ""

    # 1. Add cl alias to ~/.zshrc
    local cl_alias='alias cl="claude --dangerously-skip-permissions"'
    if grep -q 'alias cl=' "$zshrc" 2>/dev/null; then
        echo -e "${GREEN}✓ cl alias already exists in ~/.zshrc${NC}"
    else
        echo -e "${BLUE}Adding cl alias to ~/.zshrc...${NC}"
        echo "" >> "$zshrc"
        echo "# Claude CLI alias (added by ss init)" >> "$zshrc"
        echo "$cl_alias" >> "$zshrc"
        echo -e "${GREEN}✓ Added: ${cl_alias}${NC}"
        changes_made=true
    fi

    # 2. Add SPACES_DIR to PATH in ~/.zshrc
    local expanded_spaces_dir="${SPACES_DIR/#\~/$HOME}"
    if grep -q "PATH=.*${expanded_spaces_dir}" "$zshrc" 2>/dev/null || grep -q "PATH=.*\$SPACES_DIR" "$zshrc" 2>/dev/null; then
        echo -e "${GREEN}✓ SPACES_DIR already in PATH in ~/.zshrc${NC}"
    else
        echo -e "${BLUE}Adding SPACES_DIR to PATH in ~/.zshrc...${NC}"
        echo "" >> "$zshrc"
        echo "# Spaces directory (added by ss init)" >> "$zshrc"
        echo "export PATH=\"\$PATH:${expanded_spaces_dir}\"" >> "$zshrc"
        echo -e "${GREEN}✓ Added ${expanded_spaces_dir} to PATH${NC}"
        changes_made=true
    fi

    echo ""

    # 3. Create shared directory and prompt about env files
    local shared_dir="$SPACES_DIR/shared"
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
        echo -e "These files will be symlinked to all spaces when you run ${GREEN}ss setup${NC}"
    else
        echo -e "${GREEN}✓ All env files present in ./shared${NC}"
    fi

    echo ""

    # 4. Remind user to source if changes were made
    if [ "$changes_made" = true ]; then
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}Run this to apply changes:${NC}"
        echo -e "    ${GREEN}source ~/.zshrc${NC}"
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    fi

    echo -e "${GREEN}Init complete!${NC}"
}

# Function to setup all spaces
setup_spaces() {
    local spaces=("a" "b" "c" "d" "e" "main")
    local repo_url="https://github.com/${REPO}.git"
    local shared_env_dir="$SPACES_DIR/shared/env"
    local shared_dir="$SPACES_DIR/shared"
    # List of env files to manage (in order of priority for copying)
    local env_files=(".env" ".env.local" ".env.preflight.local" ".env.production.local")
    local env_local_files=(".env.local" ".env.preflight.local" ".env.production.local")

    # Check that required .env*.local files exist in shared
    local missing_env_files=()
    for env_file in "${env_local_files[@]}"; do
        if [ ! -f "$shared_dir/$env_file" ]; then
            missing_env_files+=("$env_file")
        fi
    done

    if [ ${#missing_env_files[@]} -gt 0 ]; then
        echo -e "${RED}Error: Missing required env files in ./shared:${NC}"
        for f in "${missing_env_files[@]}"; do
            echo -e "    ${RED}$f${NC}"
        done
        echo ""
        echo -e "${YELLOW}Please add your env files to:${NC}"
        echo -e "    ${YELLOW}${shared_dir}/${NC}"
        echo ""
        echo -e "Run ${GREEN}ss init${NC} to check your setup."
        return 1
    fi

    echo -e "${BLUE}Setting up spaces...${NC}"
    echo ""

    # Create shared/env directory
    echo -e "${BLUE}Creating shared env directory...${NC}"
    mkdir -p "$shared_env_dir"
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to create shared env directory${NC}"
        return 1
    fi

    # Create shared directory (for .env.local etc.)
    mkdir -p "$shared_dir"

    # Create shared env files if they don't exist
    for env_file in "${env_files[@]}"; do
        local shared_env_file=""
        if [ "$env_file" = ".env" ]; then
            shared_env_file="$shared_env_dir/$env_file"
        else
            shared_env_file="$shared_dir/$env_file"
        fi

        if [ ! -f "$shared_env_file" ]; then
            # Try to copy from first existing space's env file
            local found_env=""
            for space in "${spaces[@]}"; do
                local space_dir="coagency-${space}"
                if [ -f "$space_dir/$env_file" ] && [ ! -L "$space_dir/$env_file" ]; then
                    found_env="$space_dir/$env_file"
                    break
                fi
            done

            if [ -n "$found_env" ]; then
                echo -e "${BLUE}Copying ${env_file} from existing space to shared location...${NC}"
                cp "$found_env" "$shared_env_file"
            else
                # For .env, check if repo has it tracked in git
                if [ "$env_file" = ".env" ]; then
                    # After cloning, we'll copy from the repo
                    echo -e "${BLUE}Will create shared ${env_file} after cloning...${NC}"
                else
                    echo -e "${BLUE}Creating empty shared ${env_file} file...${NC}"
                    touch "$shared_env_file"
                fi
            fi
        else
            echo -e "${GREEN}Shared ${env_file} already exists${NC}"
        fi
    done

    echo ""

    # Setup each space
    for space in "${spaces[@]}"; do
        local space_dir="coagency-${space}"
        echo -e "${BLUE}Setting up space: ${space_dir}${NC}"

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

        # Run pnpm install
        echo -e "${BLUE}  Running pnpm install...${NC}"
        pnpm install
        if [ $? -ne 0 ]; then
            echo -e "${YELLOW}  Warning: pnpm install failed${NC}"
        else
            echo -e "${GREEN}  Dependencies installed${NC}"
        fi

        # If .env was just cloned and shared .env doesn't exist, copy it
        if [ ! -f "$shared_env_dir/.env" ] && [ -f ".env" ] && [ ! -L ".env" ]; then
            echo -e "${BLUE}  Copying .env from repo to shared location...${NC}"
            cp ".env" "$shared_env_dir/.env"
        fi

        # Link all env files
        for env_file in "${env_files[@]}"; do
            local shared_env_file=""
            local expected_link=""
            if [ "$env_file" = ".env" ]; then
                shared_env_file="$shared_env_dir/$env_file"
                expected_link="../shared/env/$env_file"
            else
                shared_env_file="$shared_dir/$env_file"
                expected_link="../shared/$env_file"
            fi

            # Ensure shared file exists (create empty if needed)
            if [ ! -f "$shared_env_file" ]; then
                touch "$shared_env_file"
            fi

            if [ -f "$env_file" ] && [ ! -L "$env_file" ]; then
                # Backup existing env file if it's different from shared
                if [ -f "$shared_env_file" ] && ! cmp -s "$env_file" "$shared_env_file" 2>/dev/null; then
                    echo -e "${YELLOW}  Backing up existing ${env_file} to ${env_file}.backup...${NC}"
                    cp "$env_file" "${env_file}.backup"
                fi
                rm "$env_file"
            fi

            if [ ! -L "$env_file" ]; then
                echo -e "${BLUE}  Linking ${env_file} to shared location...${NC}"
                ln -sf "$expected_link" "$env_file"
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}  ${env_file} linked successfully${NC}"
                else
                    echo -e "${RED}  Error: Failed to link ${env_file}${NC}"
                fi
            else
                # Verify the symlink points to the right place
                local link_target=$(readlink "$env_file")
                if [ "$link_target" != "$expected_link" ]; then
                    echo -e "${YELLOW}  ${env_file} symlink points elsewhere, updating...${NC}"
                    rm "$env_file"
                    ln -sf "$expected_link" "$env_file"
                else
                    echo -e "${GREEN}  ${env_file} already linked correctly${NC}"
                fi
            fi
        done

        cd "$SPACES_DIR"
        echo ""
    done

    echo -e "${GREEN}Setup complete!${NC}"
}

# Main script logic
if [ $# -eq 0 ]; then
    # No arguments: show status
    show_status
elif [ "$1" = "init" ]; then
    init_spaces
elif [ "$1" = "setup" ]; then
    setup_spaces
elif [ "$1" = "issues" ]; then
    show_issues
elif [ "$1" = "sync" ]; then
    sync_issues
elif [ "$1" = "pr" ]; then
    # PR command
    if [ $# -lt 2 ]; then
        # No PR number provided, list PRs
        list_prs
    else
        # PR number provided, checkout the PR
        pr_number=$2
        space=${3:-main}  # Default to "main" if not provided
        if [[ ! "$space" =~ ^(a|b|c|d|e|main)$ ]]; then
            echo -e "${RED}Error: Invalid space name. Use: a, b, c, d, e, or main${NC}"
            exit 1
        fi
        checkout_pr "$pr_number" "$space"
    fi
elif [ "$1" = "reset" ] || [ "$1" = "-r" ]; then
    # Reset command
    if [ $# -ne 2 ]; then
        echo -e "${RED}Usage: $0 reset|-r [a|b|main]${NC}"
        exit 1
    fi
    reset_space "$2"
else
    # Open space in Zed
    if [[ "$1" =~ ^(a|b|c|d|e|main)$ ]]; then
        open_space "$1"
    else
        echo -e "${RED}Error: Invalid space name. Use: a, b, c, d, e, or main${NC}"
        echo -e "${YELLOW}Usage:${NC}"
        echo -e "  $0                    - Show status of all spaces"
        echo -e "  $0 init               - Initialize environment (add alias, PATH, check env files)"
        echo -e "  $0 setup              - Setup/create all spaces, install deps, link envs"
        echo -e "  $0 issues             - Show open issues assigned to you"
        echo -e "  $0 sync               - Sync GitHub issues to todo.md"
        echo -e "  $0 pr [number] [space] - List PRs or checkout PR in space (default: main)"
        echo -e "  $0 [a|b|c|d|e|main]   - Open space in Zed"
        echo -e "  $0 reset|-r [a|b|c|d|e|main] - Reset space to latest main"
        exit 1
    fi
fi
