// scratch/run_db_push.js
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectDir = 'C:\\Users\\ali59\\Desktop\\REDC';

// Load environment variables manually
const envPath = path.join(projectDir, '.env');
if (fs.existsSync(envPath)) {
  const envConfig = require('dotenv').config({ path: envPath });
  console.log('Dotenv loaded from project root.');
} else {
  console.error('.env file not found in', projectDir);
}

try {
  console.log('Running npx prisma db push...');
  execSync('npx prisma db push', {
    cwd: projectDir,
    stdio: 'inherit',
    env: process.env
  });
  
  console.log('Running npx prisma generate...');
  execSync('npx prisma generate', {
    cwd: projectDir,
    stdio: 'inherit',
    env: process.env
  });
  
  console.log('Prisma db push and generate completed successfully.');
} catch (error) {
  console.error('Error running Prisma commands:', error);
  process.exit(1);
}
