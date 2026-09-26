#!/usr/bin/env node
/**
 * Regenerates the demo-repo's Git history from scratch.
 *
 * The project ships with demo-repo/.git already committed and ready to use.
 * This script exists as a safety net in case that history is ever lost
 * (e.g. a zip/transfer tool that strips dotfiles) or you want to reset the
 * demo back to its original state.
 *
 * Usage:
 *   node scripts/setup-demo-repo.js          (refuses to run if .git already exists)
 *   node scripts/setup-demo-repo.js --force  (deletes and rebuilds it)
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_DIR = path.resolve(__dirname, '..', 'demo-repo');
const GIT_DIR = path.join(REPO_DIR, '.git');
const force = process.argv.includes('--force');

function run(cmd) {
  execSync(cmd, { cwd: REPO_DIR, stdio: 'inherit' });
}

function writeFile(relPath, content) {
  const fullPath = path.join(REPO_DIR, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
}

if (fs.existsSync(GIT_DIR)) {
  if (!force) {
    console.log('demo-repo/.git already exists. Nothing to do.');
    console.log('Run "node scripts/setup-demo-repo.js --force" to delete and rebuild it.');
    process.exit(0);
  }
  fs.rmSync(GIT_DIR, { recursive: true, force: true });
}

fs.mkdirSync(REPO_DIR, { recursive: true });
run('git init -q');
run('git config user.email "dev@whybroke.local"');
run('git config user.name "WhyBroke Demo"');

const CHECKOUT_V1 = `// checkout.js
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function applyDiscount(total, discountPercent) {
  const discount = (total * discountPercent) / 100;
  return Number((total - discount).toFixed(2));
}

function formatOrder(order) {
  return \`Order #\${order.id} - Total: $\${order.total.toFixed(2)}\`;
}

function processOrder(order) {
  const rawTotal = calculateTotal(order.items);
  const total = order.discountPercent
    ? applyDiscount(rawTotal, order.discountPercent)
    : rawTotal;
  const summary = formatOrder({ id: order.id, total });
  return { id: order.id, total, summary };
}

module.exports = { calculateTotal, applyDiscount, formatOrder, processOrder };
`;

const TEST_FILE = `const assert = require('assert');
const { calculateTotal, applyDiscount, formatOrder, processOrder } = require('../src/checkout');

function test(name, fn) {
  try {
    fn();
    console.log(\`PASS: \${name}\`);
  } catch (err) {
    console.error(\`FAIL: \${name}\`);
    console.error(\`  \${err.message}\`);
    process.exitCode = 1;
  }
}

test('calculateTotal sums price * quantity for all items', () => {
  const items = [{ price: 10, quantity: 2 }, { price: 5, quantity: 3 }];
  assert.strictEqual(calculateTotal(items), 35);
});

test('applyDiscount reduces total by the given percentage', () => {
  assert.strictEqual(applyDiscount(100, 10), 90);
});

test('formatOrder returns a string summary', () => {
  const summary = formatOrder({ id: 'A100', total: 45 });
  assert.strictEqual(typeof summary, 'string');
  assert.strictEqual(summary, 'Order #A100 - Total: $45.00');
});

test('processOrder returns a string summary produced by formatOrder', () => {
  const order = { id: 'A101', items: [{ price: 20, quantity: 1 }, { price: 5, quantity: 2 }], discountPercent: 10 };
  const result = processOrder(order);
  assert.strictEqual(result.total, 27);
  assert.strictEqual(typeof result.summary, 'string');
  assert.strictEqual(result.summary, 'Order #A101 - Total: $27.00');
});

if (process.exitCode === 1) {
  console.error('\\nOne or more checkout tests FAILED.');
} else {
  console.log('\\nAll checkout tests PASSED.');
}
`;

writeFile('src/checkout.js', CHECKOUT_V1);
writeFile('test/checkout.test.js', TEST_FILE);
writeFile('README.md', '# Demo Checkout Module\n\nRun tests with: node test/checkout.test.js\n');
run('git add -A');
run('git commit -q -m "Initial checkout module: calculateTotal, applyDiscount, formatOrder, processOrder"');

run('git add -A'); // README already included above; kept for clarity of history shape
run('git commit -q -m "docs: add README describing the checkout module" --allow-empty');

let content = fs.readFileSync(path.join(REPO_DIR, 'src/checkout.js'), 'utf-8');
content = content.replace(
  'module.exports = { calculateTotal, applyDiscount, formatOrder, processOrder };',
  `function applyTax(total, taxPercent) {
  return Number((total + (total * taxPercent) / 100).toFixed(2));
}

module.exports = { calculateTotal, applyDiscount, formatOrder, processOrder, applyTax };`,
);
writeFile('src/checkout.js', content);
run('git add -A');
run('git commit -q -m "feat: add applyTax helper for upcoming tax support"');

content = fs.readFileSync(path.join(REPO_DIR, 'src/checkout.js'), 'utf-8');
content = content.replace(
  `function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}`,
  `function calculateTotal(items) {
  let sum = 0;
  for (const item of items) {
    sum += item.price * item.quantity;
  }
  return sum;
}`,
);
writeFile('src/checkout.js', content);
run('git add -A');
run('git commit -q -m "refactor: rewrite calculateTotal as an explicit loop for readability"');
run('git commit -q -m "docs: expand processOrder documentation" --allow-empty');

// THE REGRESSION
// Built via plain string concatenation (not a nested template literal) to
// avoid ambiguous backslash-escaping of the literal `$` characters below.
const OLD_FORMAT_ORDER = [
  'function formatOrder(order) {',
  '  return `Order #${order.id} - Total: $${order.total.toFixed(2)}`;',
  '}',
].join('\n');
const NEW_FORMAT_ORDER = [
  'function formatOrder(order) {',
  '  return {',
  '    orderId: order.id,',
  '    totalFormatted: `$${order.total.toFixed(2)}`,',
  '  };',
  '}',
].join('\n');

content = fs.readFileSync(path.join(REPO_DIR, 'src/checkout.js'), 'utf-8');
// Using a replacer FUNCTION here (not a plain string) is deliberate: when the
// second argument to String.replace() is a string, sequences like `$$` are
// treated as special replacement patterns (collapsing to a literal single
// `$`), which would silently corrupt the `$${...}` text in NEW_FORMAT_ORDER.
// A function return value is always inserted literally, with no pattern
// interpretation.
content = content.replace(OLD_FORMAT_ORDER, () => NEW_FORMAT_ORDER);
writeFile('src/checkout.js', content);
run('git add -A');
run('git commit -q -m "feat: return structured order summary from formatOrder for the new invoice UI"');

content = fs.readFileSync(path.join(REPO_DIR, 'src/checkout.js'), 'utf-8');
content = content.replace(
  /module\.exports = \{[^}]*\};/,
  `function validateOrder(order) {
  return Array.isArray(order.items) && order.items.length > 0;
}

module.exports = { calculateTotal, applyDiscount, formatOrder, processOrder, applyTax, validateOrder };`,
);
writeFile('src/checkout.js', content);
run('git add -A');
run('git commit -q -m "feat: add validateOrder guard before checkout"');

console.log('\ndemo-repo regenerated with 7 commits. HEAD test should now be failing (this is intentional):');
try {
  run('node test/checkout.test.js');
} catch {
  console.log('(non-zero exit above is expected - the regression is live at HEAD)');
}
