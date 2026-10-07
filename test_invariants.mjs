import {
  ORDER_STATUS,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_LEDGER,
  getAvailableStock,
  validateOrderAvailability,
  canCancelOrder,
  canFulfillOrder,
} from './src/domain/inventoryModel.js';

console.log('--- RUNNING RIGOROUS COOPERATIVE SYSTEM INVARIANT VERIFICATION ---');

// Test 1: Math Invariant on Initial Catalog
for (const p of INITIAL_PRODUCTS) {
  const avail = getAvailableStock(p);
  if (avail !== p.onHand - p.reserved) {
    throw new Error(`Invariant failed for ${p.name}: Available ${avail} != OnHand ${p.onHand} - Reserved ${p.reserved}`);
  }
}
console.log('✓ Invariant 1 Passed: Available = OnHand - Reserved for all catalog items.');

// Test 2: Rejection of Oversell
const testProd = INITIAL_PRODUCTS[0]; // Tilapia
const availTilapia = getAvailableStock(testProd);
const validation = validateOrderAvailability(
  [{ productId: testProd.id, quantity: availTilapia + 10 }],
  INITIAL_PRODUCTS
);
if (validation.valid) {
  throw new Error('FAILED: validateOrderAvailability permitted oversell quantity!');
}
console.log(`✓ Invariant 2 Passed: Overselling safely blocked. Error: ${validation.errors[0].reason}`);

// Test 3: Idempotent Cancellations Guard
const sampleOrder = {
  id: 'ORD-TEST',
  status: ORDER_STATUS.RESERVED,
  restoredCount: 0,
};
const guard1 = canCancelOrder(sampleOrder);
if (!guard1.allowed) {
  throw new Error('FAILED: Active reserved order could not be cancelled!');
}

// Once cancelled:
sampleOrder.status = ORDER_STATUS.CANCELLED;
sampleOrder.restoredCount = 1;

const guard2 = canCancelOrder(sampleOrder);
if (guard2.allowed || guard2.code !== 'ALREADY_CANCELLED') {
  throw new Error('FAILED: Cancelled order was permitted to be cancelled a second time!');
}
console.log(`✓ Invariant 3 Passed: Double-cancellation strictly blocked with code: ${guard2.code}`);

// Test 4: Fulfilled Order Protection Guard
const fulfilledOrder = {
  id: 'ORD-FULFILLED',
  status: ORDER_STATUS.FULFILLED,
  restoredCount: 0,
};
const guard3 = canCancelOrder(fulfilledOrder);
if (guard3.allowed || guard3.code !== 'ALREADY_FULFILLED') {
  throw new Error('FAILED: Fulfilled order was permitted to be cancelled!');
}
console.log(`✓ Invariant 4 Passed: Fulfilled order cancellation strictly blocked with code: ${guard3.code}`);

console.log('--- ALL MATHEMATICAL INVARIANTS RIGOROUSLY VERIFIED AND PASSED! ---');
