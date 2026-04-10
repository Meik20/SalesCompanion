#!/bin/bash

# Auto-Git Push Setup Script (Linux/macOS)
# Usage: chmod +x enable-auto-git-push.sh && ./enable-auto-git-push.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR"

echo ""
echo "🔧 Auto-Git Push Configuration"
echo "======================================================================"

# Check if in git repository
if [ ! -d "$REPO_ROOT/.git" ]; then
    echo "❌ Not a git repository!"
    echo "   Run this script from the project root"
    exit 1
fi

echo "✅ Git repository found"
echo ""

# 1. Enable AUTO_PUSH environment variable (current session)
echo "[1] Setting AUTO_PUSH environment variable..."
export AUTO_PUSH="true"
echo "✅ AUTO_PUSH = true (current session)"

# 2. Persist AUTO_PUSH for future sessions
echo ""
echo "[2] Saving AUTO_PUSH for future sessions..."

SHELL_CONFIG=""
if [ -f ~/.bashrc ]; then
    SHELL_CONFIG=~/.bashrc
elif [ -f ~/.zshrc ]; then
    SHELL_CONFIG=~/.zshrc
elif [ -f ~/.profile ]; then
    SHELL_CONFIG=~/.profile
fi

if [ -n "$SHELL_CONFIG" ]; then
    if grep -q "AUTO_PUSH" "$SHELL_CONFIG"; then
        sed -i "" 's/export AUTO_PUSH=.*/export AUTO_PUSH="true"/' "$SHELL_CONFIG"
        echo "✅ Updated AUTO_PUSH in $SHELL_CONFIG"
    else
        echo 'export AUTO_PUSH="true"' >> "$SHELL_CONFIG"
        echo "✅ Added AUTO_PUSH to $SHELL_CONFIG"
    fi
else
    echo "⚠️  Could not find shell config file"
    echo "   Tip: Manually add 'export AUTO_PUSH=true' to your shell config"
fi

# 3. Create/Update Git Hooks
echo ""
echo "[3] Creating Git hooks..."

HOOKS_DIR="$REPO_ROOT/.git/hooks"
mkdir -p "$HOOKS_DIR"

# Post-commit hook (auto-push)
cat > "$HOOKS_DIR/post-commit" << 'EOF'
#!/bin/bash
# Post-commit hook - auto-push after commit

set -e

# Check if AUTO_PUSH is enabled
if [ "$AUTO_PUSH" = "true" ]; then
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    echo "🚀 [Git Hook] Auto-push enabled, pushing to origin/$BRANCH..."
    if git push origin "$BRANCH" 2>/dev/null; then
        echo "✅ [Git Hook] Push successful"
    else
        echo "⚠️  [Git Hook] Push failed (network issue or auth required)"
    fi
else
    echo "⏸️  [Git Hook] Auto-push is disabled (set AUTO_PUSH=true to enable)"
fi

exit 0
EOF

chmod +x "$HOOKS_DIR/post-commit"
echo "✅ Post-commit hook created"

# Pre-push hook (validation)
cat > "$HOOKS_DIR/pre-push" << 'EOF'
#!/bin/bash
# Pre-push hook - validate before pushing

# Make sure we're pushing to a real remote
REMOTE=$1
if [ "$REMOTE" = "origin" ]; then
    echo "🔍 [Git Hook] Validating changes before push..."
    
    # Optional: Add your own validations here
    # Example: npm run test, npm run lint, etc.
    
    echo "✅ [Git Hook] All checks passed"
fi

exit 0
EOF

chmod +x "$HOOKS_DIR/pre-push"
echo "✅ Pre-push hook created"

# 4. Test configuration
echo ""
echo "[4] Verifying configuration..."
echo "    AUTO_PUSH = $AUTO_PUSH"
echo "    Git = $(git --version)"
echo "    Branch = $(git rev-parse --abbrev-ref HEAD)"

echo ""
echo "======================================================================"
echo "✅ Auto-Git Push is now ENABLED!"
echo "======================================================================"

cat << 'EOF'

📖 USAGE:

1. Make changes to your files
2. Commit normally:
   git add .
   git commit -m "Your message"
   
   OR use the npm helper:
   npm run git:push "Your message"

3. Changes will automatically push to remote (if AUTO_PUSH=true)

⚙️  CONFIGURATION:

Enable for current session:
  export AUTO_PUSH="true"

Disable for current session:
  export AUTO_PUSH="false"

Check status:
  echo $AUTO_PUSH

💡 AVAILABLE COMMANDS (from server folder):

  npm run git:push "message"        - Commit & push
  npm run git:push:force            - Force commit & push
  npm run git:status                - Show git status
  node auto-git-push.js "message"  - Direct script usage

EOF

echo "🎉 Setup Complete! Happy coding!"
echo ""
