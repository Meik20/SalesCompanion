/**
 * Auto Git Push Helper
 * Automatically commits and pushes changes to remote repository
 * Usage: node git-auto-push.js "commit message"
 */

const { execSync } = require('child_process');
const path = require('path');

function gitPush(message = 'Auto-update') {
  try {
    const projectRoot = path.join(__dirname, '..');
    const commitMessage = message || `Auto-commit: ${new Date().toISOString()}`;

    console.log('\n='.repeat(60));
    console.log('Git Auto-Push');
    console.log('='.repeat(60));

    // Change to project root
    process.chdir(projectRoot);

    // Check if it's a git repository
    try {
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    } catch {
      console.error('[FAIL] Not a git repository');
      return false;
    }

    console.log('[OK] Git repository found');

    // Stage all changes
    console.log('[*] Staging changes...');
    execSync('git add -A', { stdio: 'pipe' });
    console.log('[OK] Changes staged');

    // Check if there are changes to commit
    try {
      execSync('git diff-index --quiet --cached HEAD', { stdio: 'pipe' });
      console.log('[INFO] No changes to commit');
      return true;
    } catch {
      // Changes exist, proceed with commit
    }

    // Create commit
    console.log(`[*] Committing: "${commitMessage}"`);
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'pipe' });
    console.log('[OK] Commit created');

    // Push to remote
    console.log('[*] Pushing to remote...');
    execSync('git push', { stdio: 'pipe' });
    console.log('[OK] Pushed to remote');

    console.log('='.repeat(60));
    console.log('Git push successful!');
    console.log('='.repeat(60) + '\n');

    return true;
  } catch (error) {
    console.error('[ERROR] Git operation failed:');
    console.error(error.message);
    console.log('='.repeat(60) + '\n');
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  const message = process.argv[2] || 'Auto-update from server';
  const success = gitPush(message);
  process.exit(success ? 0 : 1);
}

module.exports = { gitPush };
