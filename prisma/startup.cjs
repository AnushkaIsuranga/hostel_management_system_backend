const { spawn } = require('node:child_process');

const retryAttempts = Number.parseInt(process.env.STARTUP_DB_RETRY_ATTEMPTS ?? '10', 10);
const retryDelayMs = Number.parseInt(process.env.STARTUP_DB_RETRY_DELAY_MS ?? '5000', 10);

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function runNodeScript(scriptPath, args, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}.`));
    });
  });
}

async function runWithRetry(stepName, callback) {
  let attempt = 1;

  while (attempt <= retryAttempts) {
    try {
      await callback();
      return;
    } catch (error) {
      if (attempt === retryAttempts) {
        throw error;
      }

      console.error(`${stepName} attempt ${attempt} of ${retryAttempts} failed. Retrying in ${retryDelayMs}ms.`);
      console.error(error);
      await sleep(retryDelayMs);
      attempt += 1;
    }
  }
}

async function main() {
  await runWithRetry('Prisma migrate deploy', () =>
    runNodeScript('node_modules/prisma/build/index.js', ['migrate', 'deploy'], 'Prisma migrate deploy'),
  );

  await runWithRetry('Prisma seed', () =>
    runNodeScript('node_modules/tsx/dist/cli.mjs', ['prisma/seed.ts'], 'Prisma seed'),
  );

  require('../dist/main.js');
}

main().catch((error) => {
  console.error('Application startup failed.');
  console.error(error);
  process.exit(1);
});