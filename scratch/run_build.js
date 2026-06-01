// scratch/run_build.js
const { execSync } = require('child_process');
const path = require('path');

const projectDir = 'C:\\Users\\ali59\\Desktop\\REDC';

try {
  console.log('Running npm run build...');
  execSync('npm run build', {
    cwd: projectDir,
    stdio: 'inherit'
  });
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed with errors.');
  process.exit(1);
}
