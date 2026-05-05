#!/usr/bin/env node
/**
 * Compatibility wrapper for the canonical bridge script.
 *
 * Usage:
 *   node scripts/bridge-to-base.mjs --amount=0.04
 *
 * Secrets are loaded by apps/api/scripts/bridge-to-base.mjs from process env or
 * apps/api/.env.local, which is gitignored.
 */

await import('../apps/api/scripts/bridge-to-base.mjs');
