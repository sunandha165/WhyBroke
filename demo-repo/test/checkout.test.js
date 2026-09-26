// checkout.test.js
// Zero-dependency test suite. Runs with plain `node test/checkout.test.js`.
// Uses Node's built-in assert module so it can execute at ANY commit in this
// repo's history without needing npm install - this is what makes it possible
// for WhyBroke to run this same test file against every candidate commit.

const assert = require('assert');
const { calculateTotal, applyDiscount, formatOrder, processOrder } = require('../src/checkout');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(`  ${err.message}`);
    process.exitCode = 1;
  }
}

test('calculateTotal sums price * quantity for all items', () => {
  const items = [
    { price: 10, quantity: 2 },
    { price: 5, quantity: 3 },
  ];
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
  const order = {
    id: 'A101',
    items: [{ price: 20, quantity: 1 }, { price: 5, quantity: 2 }],
    discountPercent: 10,
  };
  const result = processOrder(order);
  assert.strictEqual(result.total, 27);
  // This is the assertion that breaks when formatOrder's return type changes.
  assert.strictEqual(typeof result.summary, 'string');
  assert.strictEqual(result.summary, 'Order #A101 - Total: $27.00');
});

if (process.exitCode === 1) {
  console.error('\nOne or more checkout tests FAILED.');
} else {
  console.log('\nAll checkout tests PASSED.');
}
