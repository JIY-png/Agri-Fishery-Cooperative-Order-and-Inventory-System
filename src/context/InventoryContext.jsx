import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import {
  ORDER_STATUS,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_LEDGER,
  getAvailableStock,
  validateOrderAvailability,
  canCancelOrder,
  canFulfillOrder,
} from '../domain/inventoryModel';

const InventoryContext = createContext(null);

export function InventoryProvider({ children }) {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [ledger, setLedger] = useState(INITIAL_LEDGER);
  const [systemAlert, setSystemAlert] = useState(null);

  const showAlert = useCallback((type, message, details = null) => {
    setSystemAlert({
      id: Date.now() + Math.random(),
      type, // 'success' | 'error' | 'warning' | 'info'
      message,
      details,
      timestamp: new Date().toLocaleTimeString(),
    });
  }, []);

  const clearAlert = useCallback(() => {
    setSystemAlert(null);
  }, []);

  /**
   * ATOMIC ORDER RESERVATION
   * Guarantee 1: Zero overselling. Stock is checked against available = (onHand - reserved).
   * Guarantee 2: Committed stock is reserved immediately upon acceptance.
   */
  const placeOrder = useCallback(
    ({ customerName, customerPhone, items, rawText = '', channel = 'Manual', notes = '' }) => {
      // 1. Availability validation check
      const validation = validateOrderAvailability(items, products);
      if (!validation.valid) {
        const errorMsg = validation.errors.map((e) => e.reason).join(' | ');
        showAlert('error', 'Order Rejected: Insufficient Stock!', validation.errors);
        return {
          success: false,
          error: errorMsg,
          details: validation.errors,
        };
      }

      const orderId = `ORD-${1000 + orders.length + 1}`;
      const now = new Date().toISOString();

      let orderTotal = 0;
      const enrichedItems = items.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        const unitPrice = product ? product.price : 0;
        const total = item.quantity * unitPrice;
        orderTotal += total;
        return {
          ...item,
          productName: product ? product.name : item.productName,
          unit: product ? product.unit : 'unit',
          unitPrice,
          totalPrice: total,
        };
      });

      // 2. Atomic state update for Products (Reserve stock immediately)
      const reservationLedgerEntries = [];
      const updatedProducts = products.map((prod) => {
        const requestedItem = items.find((i) => i.productId === prod.id);
        if (!requestedItem) return prod;

        const qty = Number(requestedItem.quantity);
        const prevAvailable = getAvailableStock(prod);
        const newReserved = prod.reserved + qty;
        const newAvailable = Math.max(0, prod.onHand - newReserved);

        reservationLedgerEntries.push({
          id: `LEDGER-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: now,
          type: 'RESERVATION',
          orderId,
          productId: prod.id,
          productName: prod.name,
          changeQty: -qty, // impact on available stock
          reservedImpact: +qty,
          balanceAfter: {
            onHand: prod.onHand,
            reserved: newReserved,
            available: newAvailable,
          },
          note: `Reserved ${qty} ${prod.unit} for Order #${orderId} (${customerName}) [Avail: ${prevAvailable} -> ${newAvailable}]`,
        });

        return {
          ...prod,
          reserved: newReserved,
        };
      });

      // 3. Construct Order record
      const newOrder = {
        id: orderId,
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || 'N/A',
        channel,
        rawText,
        notes,
        createdAt: now,
        status: ORDER_STATUS.RESERVED,
        items: enrichedItems,
        totalAmount: orderTotal,
        restoredCount: 0, // Invariant guard: must remain 0 while active, exactly 1 if cancelled
        timeline: [
          {
            timestamp: now,
            action: 'ORDER_RESERVED',
            note: `Order accepted and ${enrichedItems.length} item(s) reserved immediately.`,
          },
        ],
      };

      // 4. Commit updates atomically
      setProducts(updatedProducts);
      setOrders((prev) => [newOrder, ...prev]);
      setLedger((prev) => [...reservationLedgerEntries, ...prev]);

      showAlert(
        'success',
        `Order ${orderId} successfully accepted! Stock reserved immediately for ${newOrder.customerName}.`,
      );

      return {
        success: true,
        order: newOrder,
      };
    },
    [products, orders.length, showAlert],
  );

  /**
   * ATOMIC ORDER CANCELLATION
   * Guarantee 3: Stock restored to available exactly once.
   * Guarantee 4: Cancelling twice or cancelling fulfilled orders is prevented by design.
   */
  const cancelOrder = useCallback(
    (orderId, reason = 'Customer requested cancellation') => {
      const order = orders.find((o) => o.id === orderId);
      const guard = canCancelOrder(order);

      if (!guard.allowed) {
        showAlert('error', `Cannot Cancel Order ${orderId}`, guard.reason);
        return {
          success: false,
          code: guard.code,
          error: guard.reason,
        };
      }

      // Check double-restore safety flag
      if (order.restoredCount > 0) {
        const errorMsg = 'Invariant violation prevented: This order has already restored stock!';
        showAlert('error', `Security Halt on Order ${orderId}`, errorMsg);
        return {
          success: false,
          code: 'DOUBLE_RESTORE_BLOCKED',
          error: errorMsg,
        };
      }

      const now = new Date().toISOString();
      const cancellationLedgerEntries = [];

      // 1. Restore reserved quantities on products
      const updatedProducts = products.map((prod) => {
        const orderItem = order.items.find((i) => i.productId === prod.id);
        if (!orderItem) return prod;

        const qty = Number(orderItem.quantity);
        const prevAvailable = getAvailableStock(prod);
        const newReserved = Math.max(0, prod.reserved - qty);
        const newAvailable = prod.onHand - newReserved;

        cancellationLedgerEntries.push({
          id: `LEDGER-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: now,
          type: 'CANCELLATION_RESTORE',
          orderId,
          productId: prod.id,
          productName: prod.name,
          changeQty: +qty, // restored to available pool
          reservedImpact: -qty,
          balanceAfter: {
            onHand: prod.onHand,
            reserved: newReserved,
            available: newAvailable,
          },
          note: `Cancelled Order #${orderId}: Restored +${qty} ${prod.unit} to available stock [Avail: ${prevAvailable} -> ${newAvailable}]. Reason: ${reason}`,
        });

        return {
          ...prod,
          reserved: newReserved,
        };
      });

      // 2. Transition order state to CANCELLED and lock restoredCount to 1
      const updatedOrders = orders.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          status: ORDER_STATUS.CANCELLED,
          cancelledAt: now,
          cancellationReason: reason,
          restoredCount: o.restoredCount + 1, // exactly 1 now
          timeline: [
            ...o.timeline,
            {
              timestamp: now,
              action: 'ORDER_CANCELLED',
              note: `Order cancelled. Stock returned to available inventory. Reason: ${reason}`,
            },
          ],
        };
      });

      // 3. Commit state atomically
      setProducts(updatedProducts);
      setOrders(updatedOrders);
      setLedger((prev) => [...cancellationLedgerEntries, ...prev]);

      showAlert(
        'warning',
        `Order ${orderId} cancelled. Reserved stock was safely returned to available inventory.`,
      );

      return {
        success: true,
        restoredItems: order.items,
      };
    },
    [orders, products, showAlert],
  );

  /**
   * ATOMIC ORDER FULFILLMENT
   * Moves goods out of the depot: onHand reduces, reservation releases.
   */
  const fulfillOrder = useCallback(
    (orderId) => {
      const order = orders.find((o) => o.id === orderId);
      const guard = canFulfillOrder(order);

      if (!guard.allowed) {
        showAlert('error', `Cannot Fulfill Order ${orderId}`, guard.reason);
        return {
          success: false,
          code: guard.code,
          error: guard.reason,
        };
      }

      const now = new Date().toISOString();
      const fulfillmentLedgerEntries = [];

      // 1. Physically deduct onHand and release reservation
      const updatedProducts = products.map((prod) => {
        const orderItem = order.items.find((i) => i.productId === prod.id);
        if (!orderItem) return prod;

        const qty = Number(orderItem.quantity);
        const newOnHand = Math.max(0, prod.onHand - qty);
        const newReserved = Math.max(0, prod.reserved - qty);
        const newAvailable = newOnHand - newReserved;

        fulfillmentLedgerEntries.push({
          id: `LEDGER-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: now,
          type: 'FULFILLMENT',
          orderId,
          productId: prod.id,
          productName: prod.name,
          changeQty: 0, // available was already locked; physical onHand decreases
          physicalDeduction: -qty,
          reservedImpact: -qty,
          balanceAfter: {
            onHand: newOnHand,
            reserved: newReserved,
            available: newAvailable,
          },
          note: `Fulfilled Order #${orderId}: Dispatched ${qty} ${prod.unit} from depot. OnHand: ${prod.onHand} -> ${newOnHand}.`,
        });

        return {
          ...prod,
          onHand: newOnHand,
          reserved: newReserved,
        };
      });

      // 2. Mark order as FULFILLED
      const updatedOrders = orders.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          status: ORDER_STATUS.FULFILLED,
          fulfilledAt: now,
          timeline: [
            ...o.timeline,
            {
              timestamp: now,
              action: 'ORDER_FULFILLED',
              note: 'Order dispatched and delivered. Physical inventory deducted.',
            },
          ],
        };
      });

      setProducts(updatedProducts);
      setOrders(updatedOrders);
      setLedger((prev) => [...fulfillmentLedgerEntries, ...prev]);

      showAlert('success', `Order ${orderId} marked as FULFILLED! Physical inventory updated.`);

      return {
        success: true,
      };
    },
    [orders, products, showAlert],
  );

  /**
   * RESTOCK PRODUCT
   * Farmers/Fisherfolk deliver fresh catch or harvest to coop depot.
   */
  const restockProduct = useCallback(
    (productId, quantity, sourceNote = 'Fresh harvest delivery') => {
      const qty = Number(quantity);
      if (qty <= 0) {
        showAlert('error', 'Restock quantity must be greater than zero.');
        return { success: false, error: 'Invalid quantity' };
      }

      const product = products.find((p) => p.id === productId);
      if (!product) {
        showAlert('error', 'Product not found.');
        return { success: false, error: 'Product not found' };
      }

      const now = new Date().toISOString();
      const prevOnHand = product.onHand;
      const newOnHand = prevOnHand + qty;
      const prevAvailable = getAvailableStock(product);
      const newAvailable = newOnHand - product.reserved;

      const ledgerEntry = {
        id: `LEDGER-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: now,
        type: 'RESTOCK',
        productId,
        productName: product.name,
        changeQty: +qty,
        balanceAfter: {
          onHand: newOnHand,
          reserved: product.reserved,
          available: newAvailable,
        },
        note: `Restocked +${qty} ${product.unit} of ${product.name}. Source: ${sourceNote}. [Available: ${prevAvailable} -> ${newAvailable}]`,
      };

      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, onHand: newOnHand } : p)),
      );
      setLedger((prev) => [ledgerEntry, ...prev]);

      showAlert('success', `Restocked +${qty} ${product.unit} of ${product.name}!`);
      return { success: true };
    },
    [products, showAlert],
  );

  /**
   * RESET TO INITIAL DEMO DATA
   */
  const resetData = useCallback(() => {
    setProducts(INITIAL_PRODUCTS);
    setOrders(INITIAL_ORDERS);
    setLedger(INITIAL_LEDGER);
    showAlert('info', 'Cooperative database reset to baseline demo state.');
  }, [showAlert]);

  // Derived overall metrics
  const metrics = useMemo(() => {
    let totalSKUs = products.length;
    let totalOnHandUnits = 0;
    let totalReservedUnits = 0;
    let totalAvailableUnits = 0;
    let lowStockCount = 0;
    let reservedValue = 0;

    products.forEach((p) => {
      totalOnHandUnits += p.onHand;
      totalReservedUnits += p.reserved;
      const avail = getAvailableStock(p);
      totalAvailableUnits += avail;
      reservedValue += p.reserved * p.price;
      if (avail <= p.lowStockThreshold) {
        lowStockCount++;
      }
    });

    const pendingOrdersCount = orders.filter((o) => o.status === ORDER_STATUS.RESERVED).length;
    const fulfilledOrdersCount = orders.filter((o) => o.status === ORDER_STATUS.FULFILLED).length;
    const cancelledOrdersCount = orders.filter((o) => o.status === ORDER_STATUS.CANCELLED).length;

    return {
      totalSKUs,
      totalOnHandUnits,
      totalReservedUnits,
      totalAvailableUnits,
      lowStockCount,
      reservedValue,
      pendingOrdersCount,
      fulfilledOrdersCount,
      cancelledOrdersCount,
      totalOrdersCount: orders.length,
    };
  }, [products, orders]);

  return (
    <InventoryContext.Provider
      value={{
        products,
        orders,
        ledger,
        metrics,
        systemAlert,
        showAlert,
        clearAlert,
        placeOrder,
        cancelOrder,
        fulfillOrder,
        restockProduct,
        resetData,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}
