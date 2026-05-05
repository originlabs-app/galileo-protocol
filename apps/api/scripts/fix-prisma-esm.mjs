#!/usr/bin/env node
/**
 * Adds .js extensions to relative imports in compiled Prisma client files.
 *
 * Prisma 7 generates TypeScript files with extensionless relative imports
 * (designed for bundlers with moduleResolution: bundler). When compiled by tsc
 * and run directly by Node.js ESM, the missing .js extensions cause
 * ERR_MODULE_NOT_FOUND at runtime.
 *
 * This script post-processes dist/generated/prisma/**\/*.js after tsc.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const TARGET_DIR = 'dist/generated/prisma';

if (!existsSync(TARGET_DIR)) {
  console.log(`fix-prisma-esm: ${TARGET_DIR} not found, skipping`);
  process.exit(0);
}

let fixed = 0;

function processDir(dir) {
  for (const name of readdirSync(dir)) {
    const fullPath = join(dir, name);
    if (statSync(fullPath).isDirectory()) {
      processDir(fullPath);
      continue;
    }
    if (!name.endsWith('.js')) continue;

    const src = readFileSync(fullPath, 'utf8');
    const out = src.replace(/from ['"](\.[^'"]+)['"]/g, (match, importPath) => {
      if (/\.(js|mjs|cjs|json)$/.test(importPath)) return match;
      return match.replace(importPath, importPath + '.js');
    });

    if (out !== src) {
      writeFileSync(fullPath, out);
      fixed++;
    }
  }
}

processDir(TARGET_DIR);
console.log(`fix-prisma-esm: patched ${fixed} file(s) in ${TARGET_DIR}`);
