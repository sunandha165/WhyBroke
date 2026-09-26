// checkout.js
// Core checkout logic for the demo e-commerce application.

/**
 * Calculates the total price of all items in the cart.
 * @param {Array<{price: number, quantity: number}>} items
 * @returns {number} total price
 */
function calculateTotal(items) {
  let sum = 0;
  for (const item of items) {
    sum += item.price * item.quantity;
  }
  return sum;
}

/**
 * Applies a percentage discount to a total.
 * @param {number} total
 * @param {number} discountPercent - e.g. 10 for 10%
 * @returns {number} discounted total
 */
function applyDiscount(total, discountPercent) {
  const discount = (total * discountPercent) / 100;
  return Number((total - discount).toFixed(2));
}

/**
 * Formats an order into a structured summary object.
 * @param {{ id: string, total: number }} order
 * @returns {{ orderId: string, totalFormatted: string }}
 */
function formatOrder(order) {
  return {
    orderId: order.id,
    totalFormatted: `$${order.total.toFixed(2)}`,
  };
}

/**
 * Runs the full checkout pipeline for an order: calculates the raw total,
 * applies a discount if one was provided, and formats a human-readable
 * summary of the completed order.
 * @param {{ id: string, items: Array<{price:number, quantity:number}>, discountPercent?: number }} order
 * @returns {{ id: string, total: number, summary: string }}
 */
function processOrder(order) {
  const rawTotal = calculateTotal(order.items);
  const total = order.discountPercent
    ? applyDiscount(rawTotal, order.discountPercent)
    : rawTotal;
  const summary = formatOrder({ id: order.id, total });
  return { id: order.id, total, summary };
}

/**
 * Applies a flat tax rate to a total. Not yet wired into processOrder.
 * @param {number} total
 * @param {number} taxPercent
 * @returns {number}
 */
function applyTax(total, taxPercent) {
  return Number((total + (total * taxPercent) / 100).toFixed(2));
}

/**
 * Validates that an order has at least one item before checkout.
 * @param {{ items: Array<unknown> }} order
 * @returns {boolean}
 */
function validateOrder(order) {
  return Array.isArray(order.items) && order.items.length > 0;
}

module.exports = {
  calculateTotal,
  applyDiscount,
  formatOrder,
  processOrder,
  applyTax,
  validateOrder,
};
