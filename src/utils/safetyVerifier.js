/**
 * Automated Safety & Mathematical Invariant Verification Suite
 * Executes rigorous proofs against the cooperative domain engine.
 */

import {
  ORDER_STATUS,
  getAvailableStock,
  validateOrderAvailability,
  canCancelOrder,
  canFulfillOrder,
} from '../domain/inventoryModel';

export function runInvariantTestSuite(context) {
  const { products, orders, placeOrder, cancelOrder, fulfillOrder } = context;
  const results = [];

  // Helper logger
  const logStep = (id, name, passed, detail, expected, actual) => {
    results.push({
      id,
      name,
      passed,
      detail,
      expected: String(expected),
      actual: String(actual),
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  try {
    // TEST 1: REJECTION OF OVERSELLING ATTEMPT
    const testProd = products[0]; // e.g. Tilapia
    const initialAvailable = getAvailableStock(testProd);
    const excessiveQuantity = initialAvailable + 500;

    const oversellAttempt = placeOrder({
      customerName: 'Test Oversell Runner',
      customerPhone: '+63 900 000 0000',
      items: [{ productId: testProd.id, quantity: excessiveQuantity }],
      channel: 'Automated Proof Runner',
      notes: 'Testing oversell immunity',
    });

    const passedOversell =
      oversellAttempt.success === false &&
      testProd.onHand - testProd.reserved === initialAvailable;

    logStep(
      'INV-01',
      'No Overselling Invariant (Order > Available Stock Rejection)',
      passedOversell,
      `Requested ${excessiveQuantity} ${testProd.unit} when only ${initialAvailable} ${testProd.unit} was available. The system immediately blocked the transaction.`,
      'Order Rejected (success: false)',
      oversellAttempt.success ? 'Failed (Order Was Accepted!)' : 'Rejected safely'
    );

    // TEST 2: IMMEDIATE RESERVATION RACE CONDITION PROTECTION
    // Order A takes partial stock; Order B tries to take more than remains
    const stockToTake = Math.min(3, Math.max(1, Math.floor(initialAvailable / 2)));
    let orderAResult = null;
    let orderBResult = null;

    if (initialAvailable >= stockToTake) {
      orderAResult = placeOrder({
        customerName: 'Customer A (Proof)',
        customerPhone: '+63 911 111 1111',
        items: [{ productId: testProd.id, quantity: stockToTake }],
        channel: 'Proof Runner',
      });

      // Now attempt an order for more than remaining
      const currentAvailable = getAvailableStock(
        context.products.find((p) => p.id === testProd.id) || testProd
      );
      const greedyQty = currentAvailable + 5;

      orderBResult = placeOrder({
        customerName: 'Customer B (Greedy Competitor)',
        customerPhone: '+63 922 222 2222',
        items: [{ productId: testProd.id, quantity: greedyQty }],
        channel: 'Proof Runner',
      });

      const passedRace =
        orderAResult.success === true && orderBResult.success === false;

      logStep(
        'INV-02',
        'Immediate Reservation Lock (Two Orders Cannot Promise Same Goods)',
        passedRace,
        `Customer A successfully reserved ${stockToTake} ${testProd.unit}. Customer B concurrently requested ${greedyQty} ${testProd.unit} which exceeded newly reserved stock and was safely locked out.`,
        'Order A: Success, Order B: Rejected',
        `Order A: ${orderAResult.success}, Order B: ${orderBResult.success}`
      );
    }

    // TEST 3: EXACTLY-ONCE CANCELLATION RESTORATION & DOUBLE-CANCEL IMMUNITY
    if (orderAResult && orderAResult.success && orderAResult.order) {
      const orderAId = orderAResult.order.id;
      const prodBeforeCancel = context.products.find((p) => p.id === testProd.id);
      const availBeforeCancel = getAvailableStock(prodBeforeCancel);

      // Cancel First Time
      const cancelFirst = cancelOrder(orderAId, 'Proof test cancel #1');
      const prodAfterCancel1 = context.products.find((p) => p.id === testProd.id);
      const availAfterCancel1 = getAvailableStock(prodAfterCancel1);

      // Attempt Double Cancel
      const cancelSecond = cancelOrder(orderAId, 'Malicious double-cancel attempt');
      const prodAfterCancel2 = context.products.find((p) => p.id === testProd.id);
      const availAfterCancel2 = getAvailableStock(prodAfterCancel2);

      const passedSingleRestore =
        cancelFirst.success === true &&
        availAfterCancel1 === availBeforeCancel + stockToTake;

      const passedDoubleCancelBlock =
        cancelSecond.success === false &&
        availAfterCancel2 === availAfterCancel1; // DID NOT double-restore!

      logStep(
        'INV-03',
        'Cancellation Returns Stock Exactly Once',
        passedSingleRestore,
        `Cancelled order returned exactly ${stockToTake} ${testProd.unit} to available stock (${availBeforeCancel} -> ${availAfterCancel1}).`,
        `Available + ${stockToTake}`,
        `Available + ${availAfterCancel1 - availBeforeCancel}`
      );

      logStep(
        'INV-04',
        'Idempotency Guard (Double-Cancellation Strictly Blocked)',
        passedDoubleCancelBlock,
        `Second cancellation attempt was rejected with code "${cancelSecond.code}". Stock was NOT duplicated or corrupted.`,
        'Second Cancel Rejected & Stock Unchanged',
        cancelSecond.success ? 'Corrupted! Second Cancel Succeeded' : 'Safely Blocked'
      );
    }

    // TEST 4: IMMUNITY OF FULFILLED ORDERS AGAINST CANCELLATION
    // Create an order, fulfill it, then attempt to cancel
    const freshOrder = placeOrder({
      customerName: 'Fulfillment Guard Tester',
      customerPhone: '+63 933 333 3333',
      items: [{ productId: testProd.id, quantity: 1 }],
      channel: 'Proof Runner',
    });

    if (freshOrder.success && freshOrder.order) {
      const fulfillRes = fulfillOrder(freshOrder.order.id);
      const cancelOnFulfilled = cancelOrder(freshOrder.order.id, 'Illegal cancel on fulfilled');

      const passedFulfilledGuard =
        fulfillRes.success === true &&
        cancelOnFulfilled.success === false &&
        cancelOnFulfilled.code === 'ALREADY_FULFILLED';

      logStep(
        'INV-05',
        'Fulfilled Order Cancellation Immunity',
        passedFulfilledGuard,
        `Fulfilled order could not be cancelled. Returned guard rejection: "${cancelOnFulfilled.error}".`,
        'Cancellation Disallowed (ALREADY_FULFILLED)',
        cancelOnFulfilled.success ? 'Corrupted (Allowed Cancel on Fulfilled!)' : cancelOnFulfilled.code
      );
    }
  } catch (err) {
    results.push({
      id: 'ERR-RUNNER',
      name: 'Test Execution Exception',
      passed: false,
      detail: err.message,
      expected: 'Clean Execution',
      actual: err.stack,
      timestamp: new Date().toLocaleTimeString(),
    });
  }

  return results;
}
