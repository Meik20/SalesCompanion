#!/usr/bin/env node

/**
 * Auto-Git Push Helper
 * 
 * Automatically commits and pushes all changes to Git
 * Usage: npm run git:push "Your commit message"
 *        node server/auto-git-push.js "Your commit message"
 */

const { execSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const commitMessage = args[0] || `Auto-commit: ${new Date().toISOString()}`;
const force = args.includes('--force');
const dryRun = args.includes('--dry-run');

const projectRoot = path.resolve(__dirname, '..');

function log(message, color = 'reset') {
  const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function run(cmd, silent = false) {
  try {
    const output = execSync(cmd, { 
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return output.trim();
  } catch (error) {
    if (!silent) {
      log(`❌ Command failed: ${cmd}`, 'red');
      log(error.message, 'red');
    }
    throw error;
  }
}

async function autoGitPush() {
  try {
    log('\n🔄 Auto-Git Push Started', 'cyan');
    log('='.repeat(60), 'cyan');

    // 1. Check if we're in a git repository
    try {
      run('git rev-parse --git-dir', true);
    } catch (e) {
      log('❌ Not a git repository!', 'red');
      process.exit(1);
    }

    // 2. Get current branch
    const branch = run('git rev-parse --abbrev-ref HEAD', true);
    log(`📍 Branch: ${branch}`, 'cyan');

    // 3. Check for changes
    const status = run('git status --porcelain', true);
    if (!status) {
      log('✅ No changes to commit', 'green');
      return;
    }

    // 4. Check if auto-push is enabled or forced
    const autoPushEnabled = process.env.AUTO_PUSH === 'true' || force;
    const shouldPush = autoPushEnabled ? 'AUTO-ENABLED' : 'DISABLED';
    log(`🔐 Auto-push: ${shouldPush}`, autoPushEnabled ? 'green' : 'yellow');

    if (dryRun) {
      log('\n📋 DRY-RUN MODE - No changes will be committed', 'yellow');
      log(`\n📊 Changes to commit:\n${status}`, 'yellow');
      log(`\n💬 Commit message: "${commitMessage}"`, 'yellow');
      return;
    }

    // 5. Stage all changes
    log('\n📦 Staging changes...', 'cyan');
    run('git add -A');
    const stagedFiles = run('git diff --cached --name-only', true).split('\n').filter(Boolean);
    log(`✅ Staged ${stagedFiles.length} file(s)`, 'green');

    // 6. Check if there's anything to commit
    try {
      run('git diff-index --quiet --cached HEAD', true);
      log('✅ All changes are staged', 'green');
    } catch (e) {
      log('✅ Changes ready for commit', 'green');
    }

    // 7. Commit changes
    log('\n💾 Creating commit...', 'cyan');
    const fullMessage = `${commitMessage}\n\n[Auto-Push] ${new Date().toISOString()}`;
    try {
      run(`git commit -m "${commitMessage}"`);
      const commitHash = run('git rev-parse --short HEAD', true);
      log(`✅ Committed: ${commitHash}`, 'green');
    } catch (error) {
      log('⚠️  Nothing to commit or commit failed', 'yellow');
      return;
    }

    // 8. Push to remote (if enabled)
    if (autoPushEnabled) {
      log('\n🚀 Pushing to remote...', 'cyan');
      try {
        run(`git push origin ${branch}`);
        log(`✅ Pushed to origin/${branch}`, 'green');
      } catch (error) {
        log(`❌ Push failed: ${error.message}`, 'red');
        log('\n💡 Tip: Set AUTO_PUSH=true to enable automatic push', 'yellow');
        log('   Windows: $env:AUTO_PUSH = "true"', 'yellow');
        log('   Linux/Mac: export AUTO_PUSH=true', 'yellow');
        if (force) {
          throw error;
        }
      }
    } else {
      log('\n⏸️  Auto-push is disabled', 'yellow');
      log('💡 To enable: set AUTO_PUSH=true environment variable', 'yellow');
      log('   Then run: git push origin ' + branch, 'yellow');
    }

    log('\n'.repeat(1), 'reset');
    log('✅ Auto-Git Push Completed', 'green');
    log('='.repeat(60) + '\n', 'green');

  } catch (error) {
    log('\n❌ Error during auto-git push:', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  autoGitPush().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { autoGitPush, run, log };
