#!/usr/bin/env node

/**
 * i18n Parity Validator
 * Ensures 100% strict parity of translation keys across ar.json, fr.json, and en.json.
 * Exits with code 1 if any key is missing or empty in any language.
 */

const fs = require('fs');
const path = require('path');

const locales = ['ar', 'fr', 'en'];
const messagesDir = path.join(__dirname, '..', 'src', 'messages');

function loadLocale(locale) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`[i18n-validator] Error: Locale file not found: ${filePath}`);
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`[i18n-validator] Error parsing JSON for locale "${locale}":`, err.message);
    process.exit(1);
  }
}

function extractLeaves(obj, prefix = '') {
  const leaves = {};
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(leaves, extractLeaves(val, fullKey));
    } else {
      leaves[fullKey] = val;
    }
  }
  return leaves;
}

const data = {};
const leaves = {};
const allKeys = new Set();

for (const loc of locales) {
  data[loc] = loadLocale(loc);
  leaves[loc] = extractLeaves(data[loc]);
  Object.keys(leaves[loc]).forEach((k) => allKeys.add(k));
}

const sortedKeys = Array.from(allKeys).sort();
const missingByLocale = { ar: [], fr: [], en: [] };
const emptyByLocale = { ar: [], fr: [], en: [] };

for (const key of sortedKeys) {
  for (const loc of locales) {
    if (!(key in leaves[loc])) {
      missingByLocale[loc].push(key);
    } else {
      const val = leaves[loc][key];
      if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) {
        emptyByLocale[loc].push(key);
      }
    }
  }
}

let hasErrors = false;

for (const loc of locales) {
  if (missingByLocale[loc].length > 0) {
    hasErrors = true;
    console.error(`\n[i18n-validator] FAIL: Locale "${loc}" is missing ${missingByLocale[loc].length} key(s):`);
    missingByLocale[loc].forEach((k) => console.error(`  - ${k}`));
  }
  if (emptyByLocale[loc].length > 0) {
    hasErrors = true;
    console.error(`\n[i18n-validator] FAIL: Locale "${loc}" has ${emptyByLocale[loc].length} empty value(s):`);
    emptyByLocale[loc].forEach((k) => console.error(`  - ${k}`));
  }
}

if (hasErrors) {
  console.error('\n[i18n-validator] Strict parity check failed. Please sync missing keys across ar.json, fr.json, and en.json before building.\n');
  process.exit(1);
}

console.log(`[i18n-validator] OK: 100% strict parity verified across ${locales.join(', ')} (${sortedKeys.length} keys total).`);
