// Ensures Prisma's schema directUrl=env("DIRECT_URL") won't fail builds if DIRECT_URL is unset.
// If DIRECT_URL is missing but DATABASE_URL is present, synthesize DIRECT_URL into a local .env for this build.
// This does NOT print secrets and is safe to run in CI.
//
// Note: You chose to keep schema unchanged and add DIRECT_URL in Vercel. This script is an extra safety net.

'use strict';

const fs = require('fs');
const path = require('path');

function appendLine(filePath, line) {
  try {
    fs.appendFileSync(filePath, (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8').endsWith('\n') ? '' : '\n') + line + '\n');
  } catch (err) {
    console.error('[ensure-env] Failed to append to .env:', err?.message || err);
    process.exit(1);
  }
}

(function main() {
  try {
    const direct = process.env.DIRECT_URL ? String(process.env.DIRECT_URL).trim() : '';
    if (direct) {
      console.log('[ensure-env] DIRECT_URL already set in environment.');
      return;
    }

    const db = process.env.DATABASE_URL ? String(process.env.DATABASE_URL).trim() : '';
    if (!db) {
      console.error('[ensure-env] Missing DIRECT_URL and DATABASE_URL. Prisma schema expects DIRECT_URL.');
      console.error('[ensure-env] Set DIRECT_URL in Vercel (recommended: same as DATABASE_URL) or provide both for pooled/non-pooled setups.');
      process.exit(1);
    }

    const envPath = path.resolve(process.cwd(), '.env');
    let hadDirectInFile = false;

    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      hadDirectInFile = /^DIRECT_URL=/m.test(content);
    }

    if (!hadDirectInFile) {
      appendLine(envPath, `DIRECT_URL=${JSON.stringify(db)}`.replace(/^\s+|\s+$/g, ''));
      console.log('[ensure-env] Synthesized DIRECT_URL into .env from DATABASE_URL for build-time Prisma get-config.');
    } else {
      console.log('[ensure-env] .env already defines DIRECT_URL.');
    }
  } catch (e) {
    console.error('[ensure-env] Unexpected error:', e?.message || e);
    process.exit(1);
  }
})();