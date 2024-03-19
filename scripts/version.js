const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');

exec(`cd "${root}" && npm run release`);

const text = fs.readFileSync(path.resolve(root, 'package.json')).toString();
const json = JSON.parse(text);
const { version } = json;

const pkgsRoot = path.resolve(root, 'packages');
const pkgs = fs.readdirSync(pkgsRoot);

pkgs.forEach((pkg) => {
    const sh = `cd "${path.resolve(pkgsRoot, pkg)}" && npm version ${version}`;
    console.log(sh);
    exec(sh);
});
