const { execSync } = require('child_process');

const res = execSync('git diff').toString().trim();

if (res) {
  console.error('\x1B[31mGit workspace not clean.\x1B[0m\n');
  process.exit(1);
}
