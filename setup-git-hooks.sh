#!/bin/bash
# Git hooks setup for automatic commits
# Usage: cd SalesCompanion && bash setup-git-hooks.sh

REPO_ROOT=$(pwd)
HOOKS_DIR=".git/hooks"

echo "Setting up Git hooks for automatic commits..."
echo ""

# Create post-merge hook (runs after git pull)
cat > "$HOOKS_DIR/post-merge" << 'HOOK_EOF'
#!/bin/bash
echo "[Git Hook] Post-merge detected"
echo "[*] Auto-committing changes..."
git add -A 2>/dev/null
if ! git diff-index --quiet --cached HEAD 2>/dev/null; then
    git commit -m "Auto-commit after merge: $(date +'%Y-%m-%d %H:%M:%S')" 2>/dev/null
    echo "[OK] Changes auto-committed"
fi
HOOK_EOF

chmod +x "$HOOKS_DIR/post-merge"
echo "[OK] Post-merge hook installed"

# Create post-commit hook (runs after every commit)
cat > "$HOOKS_DIR/post-commit" << 'HOOK_EOF'
#!/bin/bash
if [ "$AUTO_PUSH" = "true" ]; then
    echo "[Git Hook] Auto-push enabled, pushing to remote..."
    git push origin HEAD 2>/dev/null || echo "[WARN] Push failed"
fi
HOOK_EOF

chmod +x "$HOOKS_DIR/post-commit"
echo "[OK] Post-commit hook installed"

# Create pre-commit hook (runs before commit - for validation)
cat > "$HOOKS_DIR/pre-commit" << 'HOOK_EOF'
#!/bin/bash
echo "[Git Hook] Pre-commit checks..."
# Add any validation here
HOOK_EOF

chmod +x "$HOOKS_DIR/pre-commit"
echo "[OK] Pre-commit hook installed"

echo ""
echo "================================================"
echo "Git hooks have been installed!"
echo "================================================"
echo ""
echo "To enable auto-push, use:"
echo "  export AUTO_PUSH=true"
echo ""
echo "To disable auto-push:"
echo "  export AUTO_PUSH=false"
echo ""
