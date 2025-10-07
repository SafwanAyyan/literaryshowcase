// Robust Prisma build step for CI/Vercel.
// - Generates client
// - If migrations exist, attempts `migrate deploy`
//   - On P3005 (non-empty DB with no baseline), falls back to `db push` (no --accept-data-loss)
// - If no migrations, runs `db push`
// Exits non-zero on failure, logs clearly.

'use strict';

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

function run(cmd) {
  console.log(`[prisma-build] ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

function hasMigrations() {
  try {
    const migrationsDir = path.resolve(process.cwd(), 'prisma', 'migrations');
    if (!fs.existsSync(migrationsDir)) return false;
    const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
    // consider only directories excluding .DS_Store, etc.
    return entries.some((e) => e.isDirectory());
  } catch {
    return false;
  }
}

function isP3005(err) {
  const msg = String(err?.message || err);
  return msg.includes('P3005') || msg.includes('The database schema is not empty');
}

(async function main() {
  try {
    // Generate Prisma client (no engine binaries needed in Vercel)
    run('prisma generate --no-engine');

    const migrationsExist = hasMigrations();

    if (migrationsExist) {
      try {
        run('prisma migrate deploy');
        console.log('[prisma-build] migrate deploy completed.');
        return;
      } catch (e) {
        if (isP3005(e)) {
          console.warn('[prisma-build] P3005 detected during migrate deploy (non-empty DB with no baseline). Falling back to `prisma db push`.');
          // We already generated, so skip client generation here
          run('prisma db push --skip-generate');
          console.log('[prisma-build] db push fallback completed.');
          return;
        }
        throw e;
      }
    } else {
      // No migrations found; push the schema
      console.log('[prisma-build] No migrations found. Running `prisma db push`.');
      run('prisma db push --skip-generate');
      console.log('[prisma-build] db push completed.');
      return;
    }
  } catch (err) {
    console.error('[prisma-build] Failed:', err?.message || err);
    process.exit(1);
  }
})();