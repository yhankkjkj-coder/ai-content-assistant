#!/usr/bin/env node
/**
 * Generate activation codes for AI Content Assistant Pro.
 *
 * Usage:
 *   node scripts/gen-codes.js [count] [tier]
 *
 * Examples:
 *   node scripts/gen-codes.js 20 pro_monthly
 *   node scripts/gen-codes.js 10 pro_lifetime
 *   node scripts/gen-codes.js 50          (default: pro_monthly)
 *
 * Outputs:
 *   1. codes.txt      — the REAL codes (keep secret! sell these)
 *   2. Updated stripe-config.js with hashed codes
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const count = parseInt(process.argv[2]) || 20;
const tier = process.argv[3] || 'pro_monthly';
const prefix = tier === 'pro_lifetime' ? 'LIFE' : 'PRO';

if (!['pro_monthly', 'pro_lifetime'].includes(tier)) {
  console.error('Tier must be pro_monthly or pro_lifetime');
  process.exit(1);
}

console.log(`Generating ${count} ${tier} activation codes...\n`);

const codes = [];
const hashes = {};

for (let i = 0; i < count; i++) {
  // Format: PREFIX-XXXX-XXXX-XXXX (12 random chars)
  const rand = crypto.randomBytes(9).toString('hex').substring(0, 12);
  const code = prefix + '-' + rand.substring(0, 4) + '-' + rand.substring(4, 8) + '-' + rand.substring(8, 12);
  const hash = crypto.createHash('sha256').update(code).digest('hex').substring(0, 16);

  codes.push(code);
  hashes[hash] = { tier: tier, used: false };
}

// Save real codes (KEEP SECRET!)
const codesFile = path.join(__dirname, 'codes.txt');
fs.writeFileSync(codesFile, codes.join('\n') + '\n');
console.log('📝 Real codes saved to: scripts/codes.txt');
console.log('   🔒 KEEP THIS FILE SECRET! These are the codes you sell.\n');

// Update stripe-config.js with hashes
const configPath = path.join(__dirname, '..', 'src', 'stripe-config.js');
let configContent = fs.readFileSync(configPath, 'utf8');

// Replace the ACTIVATION_CODES object
const newCodes = 'var ACTIVATION_CODES = ' + JSON.stringify(hashes, null, 2) + ';';
configContent = configContent.replace(
  /var ACTIVATION_CODES = \{[\s\S]*?\};/,
  newCodes
);

fs.writeFileSync(configPath, configContent);
console.log('✅ Hashed codes written to: src/stripe-config.js');
console.log('   (These are safe to include in the extension)\n');

console.log('═══ Preview (first 3 codes) ═══');
codes.slice(0, 3).forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
if (codes.length > 3) console.log(`  ... and ${codes.length - 3} more`);

console.log(`\n💰 Sell each code for:`);
if (tier === 'pro_monthly') console.log('   ¥9.9/month (or whatever price you set)');
else console.log('   ¥49 lifetime (or whatever price you set)');

console.log('\n📋 How to sell:');
console.log('   1. Post on social media / forums / 朋友圈');
console.log('   2. Buyer pays via WeChat/Alipay/红包');
console.log('   3. Send them one code from codes.txt');
console.log('   4. They enter the code in the extension → Pro unlocked!');
