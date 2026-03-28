# Space Station launch.sh
# This file is sourced when running `ss launch`
# Add any aliases, functions, or environment variables you want in the Space Station shell
# Note: `ss` is already aliased automatically

# Agent aliases
#export DEFAULT_AGENT="claude"
# For more autonomous agent experience:
export DEFAULT_AGENT="claude --allow-dangerously-skip-permissions --permission-mode bypassPermissions --effort low"
export EDITOR="zed"

alias default_agent="$DEFAULT_AGENT"
alias resume="$DEFAULT_AGENT --resume"
alias cont="$DEFAULT_AGENT --continue"

# Space Station subcommand aliases
alias help="ss help"
alias list="ss list"
alias config="ss config"
alias init="ss init"
alias setup="ss setup"
alias symlink="ss symlink"
alias issues="ss issues"
alias issue="ss issue"
alias sync="ss sync"
alias prs="ss prs"
alias agent="ss agent"
alias land="ss land"
alias reset="ss reset"

# Planet aliases
alias mercury="ss mercury"
alias venus="ss venus"
alias earth="ss earth"
alias mars="ss mars"

alias mer="ss mercury"
alias ven="ss venus"
alias mar="ss mars"
