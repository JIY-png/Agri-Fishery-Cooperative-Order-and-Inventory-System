/**
 * Domain Logic & State Machine for Agri-Fishery Cooperative Order & Inventory System
 * 
 * CORE INVARIANTS:
 * 1. Available Stock = OnHand - Reserved
 * 2. Available Stock can NEVER drop below 0 (No Overselling).
 * 3. An order can ONLY be accepted if all requested quantities are <= Available Stock.
 * 4. Cancellation returns reserved stock EXACTLY ONCE.
 * 5. Double-cancelling or cancelling fulfilled orders is strictly disallowed and rejected.
 */

export const ORDER_STATUS = {
  RESERVED: 'RESERVED',
  FULFILLED: 'FULFILLED',
  CANCELLED: 'CANCELLED',
};

export const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Fresh Black Tilapia',
    category: 'fishery',
    unit: 'kg',
    price: 160,
    onHand: 45,
    reserved: 10,
    lowStockThreshold: 15,
    source: 'Lake Sebu Fishpond Cluster',
    icon: '🐟',
    description: 'Freshly harvested daily catch, cleaned and chilled.',
  },
  {
    id: 'prod-2',
    name: 'Yellowfin Tuna Loin',
    category: 'fishery',
    unit: 'kg',
    price: 420,
    onHand: 28,
    reserved: 8,
    lowStockThreshold: 10,
    source: 'Baler Deep Sea Fisherfolk Guild',
    icon: '🦈',
    description: 'Sashimi-grade ocean catch, flash-iced upon landing.',
  },
  {
    id: 'prod-3',
    name: 'Giant Tiger Prawns (Sugpo)',
    category: 'fishery',
    unit: 'kg',
    price: 680,
    onHand: 15,
    reserved: 5,
    lowStockThreshold: 8,
    source: 'Roxas Coastal Mangrove Ponds',
    icon: '🦐',
    description: 'Premium aquaculture tiger prawns, head-on size 16-20.',
  },
  {
    id: 'prod-4',
    name: 'Highland Benguet Tomatoes',
    category: 'agriculture',
    unit: 'kg',
    price: 85,
    onHand: 120,
    reserved: 30,
    lowStockThreshold: 25,
    source: 'Atok Mountain Farmers Federation',
    icon: '🍅',
    description: 'Firm, sun-ripened salad tomatoes, packed in crates.',
  },
  {
    id: 'prod-5',
    name: 'Dinorado Heritage Rice',
    category: 'agriculture',
    unit: 'sack (25kg)',
    price: 1350,
    onHand: 35,
    reserved: 10,
    lowStockThreshold: 10,
    source: 'Mindoro Organic Rice Producers Coop',
    icon: '🌾',
    description: 'Fragrant, naturally milled pinkish grain rice.',
  },
  {
    id: 'prod-6',
    name: 'Carabao Mangoes (Sweet Guimaras)',
    category: 'agriculture',
    unit: 'crate (12kg)',
    price: 950,
    onHand: 20,
    reserved: 4,
    lowStockThreshold: 6,
    source: 'Guimaras Island Growers Alliance',
    icon: '🥭',
    description: 'Export-grade tree-ripened sweet yellow mangoes.',
  },
  {
    id: 'prod-7',
    name: 'Red Creole Onions',
    category: 'agriculture',
    unit: 'kg',
    price: 110,
    onHand: 60,
    reserved: 0,
    lowStockThreshold: 15,
    source: 'Nueva Ecija Cooperative Silos',
    icon: '🧅',
    description: 'Cured pungent red onions with tight skins.',
  },
  {
    id: 'prod-8',
    name: 'Boneless Bangus (Milkfish)',
    category: 'fishery',
    unit: 'kg',
    price: 220,
    onHand: 30,
    reserved: 0,
    lowStockThreshold: 10,
    source: 'Dagupan Brackishwater Assoc',
    icon: '🐡',
    description: 'Deboned, marinated milkfish ready for grilling.',
  },
];

export const INITIAL_ORDERS = [
  {
    id: 'ORD-1001',
    customerName: 'Nanay Corazon (Carinderia Ni Cora)',
    customerPhone: '+63 917 555 0192',
    channel: 'SMS',
    rawText: 'Order po Nanay Cora: 5kg Tilapia at 10kg Kamatis bukas ng umaga.',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    status: ORDER_STATUS.RESERVED,
    items: [
      { productId: 'prod-1', productName: 'Fresh Black Tilapia', quantity: 5, unit: 'kg', unitPrice: 160 },
      { productId: 'prod-4', productName: 'Highland Benguet Tomatoes', quantity: 10, unit: 'kg', unitPrice: 85 },
    ],
    totalAmount: 5 * 160 + 10 * 85,
    restoredCount: 0,
    timeline: [
      {
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        action: 'ORDER_RESERVED',
        note: 'Order confirmed and stock reserved immediately from SMS.',
      },
    ],
  },
  {
    id: 'ORD-1002',
    customerName: 'Seaside Grill & Restobar (Chef Marco)',
    customerPhone: '+63 928 555 4481',
    channel: 'SMS',
    rawText: 'Good pm coop, reserving 8kg Tuna Loin and 5kg Tiger Prawns for weekend dinner.',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    status: ORDER_STATUS.RESERVED,
    items: [
      { productId: 'prod-2', productName: 'Yellowfin Tuna Loin', quantity: 8, unit: 'kg', unitPrice: 420 },
      { productId: 'prod-3', productName: 'Giant Tiger Prawns (Sugpo)', quantity: 5, unit: 'kg', unitPrice: 680 },
    ],
    totalAmount: 8 * 420 + 5 * 680,
    restoredCount: 0,
    timeline: [
      {
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
        action: 'ORDER_RESERVED',
        note: 'Stock reserved for weekend catering.',
      },
    ],
  },
  {
    id: 'ORD-1003',
    customerName: 'Barangay San Isidro Relief Program',
    customerPhone: '+63 945 555 8832',
    channel: 'SMS',
    rawText: 'Urgent: 10 sacks Dinorado Rice and 20kg Tomatoes for feeding drive.',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: ORDER_STATUS.RESERVED,
    items: [
      { productId: 'prod-5', productName: 'Dinorado Heritage Rice', quantity: 10, unit: 'sack (25kg)', unitPrice: 1350 },
      { productId: 'prod-4', productName: 'Highland Benguet Tomatoes', quantity: 20, unit: 'kg', unitPrice: 85 },
    ],
    totalAmount: 10 * 1350 + 20 * 85,
    restoredCount: 0,
    timeline: [
      {
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        action: 'ORDER_RESERVED',
        note: 'Reserved for relief feeding program.',
      },
    ],
  },
  {
    id: 'ORD-1004',
    customerName: 'Mang Tomas Market Stall #4',
    customerPhone: '+63 919 555 2200',
    channel: 'Walk-in / Notebook',
    rawText: 'Walk-in booking for 5kg Tilapia and 4 crates Mangoes.',
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    status: ORDER_STATUS.RESERVED,
    items: [
      { productId: 'prod-1', productName: 'Fresh Black Tilapia', quantity: 5, unit: 'kg', unitPrice: 160 },
      { productId: 'prod-6', productName: 'Carabao Mangoes (Sweet Guimaras)', quantity: 4, unit: 'crate (12kg)', unitPrice: 950 },
    ],
    totalAmount: 5 * 160 + 4 * 950,
    restoredCount: 0,
    timeline: [
      {
        timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
        action: 'ORDER_RESERVED',
        note: 'Reserved manually.',
      },
    ],
  },
];

export const INITIAL_LEDGER = [
  {
    id: 'LEDGER-001',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    type: 'INITIAL_STOCK',
    productId: 'all',
    productName: 'Initial Inventory Snapshot',
    changeQty: 0,
    note: 'System initialization: physical inventory synchronized from warehouse audit.',
  },
  {
    id: 'LEDGER-002',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    type: 'RESERVATION',
    orderId: 'ORD-1001',
    productId: 'prod-1',
    productName: 'Fresh Black Tilapia',
    changeQty: -5,
    reservedImpact: +5,
    note: 'Reserved 5 kg for Nanay Corazon (Carinderia Ni Cora)',
  },
  {
    id: 'LEDGER-003',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    type: 'RESERVATION',
    orderId: 'ORD-1001',
    productId: 'prod-4',
    productName: 'Highland Benguet Tomatoes',
    changeQty: -10,
    reservedImpact: +10,
    note: 'Reserved 10 kg for Nanay Corazon (Carinderia Ni Cora)',
  },
  {
    id: 'LEDGER-004',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    type: 'RESERVATION',
    orderId: 'ORD-1002',
    productId: 'prod-2',
    productName: 'Yellowfin Tuna Loin',
    changeQty: -8,
    reservedImpact: +8,
    note: 'Reserved 8 kg for Seaside Grill & Restobar (Chef Marco)',
  },
  {
    id: 'LEDGER-005',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    type: 'RESERVATION',
    orderId: 'ORD-1002',
    productId: 'prod-3',
    productName: 'Giant Tiger Prawns (Sugpo)',
    changeQty: -5,
    reservedImpact: +5,
    note: 'Reserved 5 kg for Seaside Grill & Restobar (Chef Marco)',
  },
];

/**
 * Pure helper to compute available stock
 */
export function getAvailableStock(product) {
  if (!product) return 0;
  return Math.max(0, product.onHand - product.reserved);
}

/**
 * Validates whether an order can be accepted without overselling.
 * Returns { valid: boolean, errors: Array<{ productId, productName, requested, available, onHand, reserved }> }
 */
export function validateOrderAvailability(requestedItems, products) {
  const errors = [];
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of requestedItems) {
    const product = productMap.get(item.productId);
    if (!product) {
      errors.push({
        productId: item.productId,
        productName: item.productName || 'Unknown Product',
        requested: item.quantity,
        available: 0,
        reason: 'Product does not exist in inventory',
      });
      continue;
    }

    const available = getAvailableStock(product);
    if (item.quantity <= 0) {
      errors.push({
        productId: product.id,
        productName: product.name,
        requested: item.quantity,
        available,
        reason: 'Quantity must be greater than zero',
      });
    } else if (item.quantity > available) {
      errors.push({
        productId: product.id,
        productName: product.name,
        requested: item.quantity,
        available,
        onHand: product.onHand,
        reserved: product.reserved,
        shortfall: item.quantity - available,
        reason: `Insufficient available stock! Requested ${item.quantity} ${product.unit}, but only ${available} ${product.unit} is available (${product.onHand} on hand minus ${product.reserved} already reserved).`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * State Transition Guard & Invariant Verifier
 */
export function canCancelOrder(order) {
  if (!order) {
    return { allowed: false, reason: 'Order does not exist' };
  }
  if (order.status === ORDER_STATUS.CANCELLED) {
    return {
      allowed: false,
      reason: 'Order has already been cancelled. Stock was already returned to inventory and cannot be restored again.',
      code: 'ALREADY_CANCELLED',
    };
  }
  if (order.status === ORDER_STATUS.FULFILLED) {
    return {
      allowed: false,
      reason: 'Cannot cancel an already fulfilled order. Goods have already left the cooperative depot.',
      code: 'ALREADY_FULFILLED',
    };
  }
  if (order.status !== ORDER_STATUS.RESERVED) {
    return {
      allowed: false,
      reason: `Cannot cancel order in status "${order.status}". Only RESERVED orders can be cancelled.`,
      code: 'INVALID_STATUS',
    };
  }
  return { allowed: true };
}

export function canFulfillOrder(order) {
  if (!order) {
    return { allowed: false, reason: 'Order does not exist' };
  }
  if (order.status === ORDER_STATUS.FULFILLED) {
    return {
      allowed: false,
      reason: 'Order is already fulfilled.',
      code: 'ALREADY_FULFILLED',
    };
  }
  if (order.status === ORDER_STATUS.CANCELLED) {
    return {
      allowed: false,
      reason: 'Cannot fulfill a cancelled order. Stock was already returned to open pool.',
      code: 'ALREADY_CANCELLED',
    };
  }
  if (order.status !== ORDER_STATUS.RESERVED) {
    return {
      allowed: false,
      reason: `Cannot fulfill order in status "${order.status}". Only RESERVED orders can be fulfilled.`,
      code: 'INVALID_STATUS',
    };
  }
  return { allowed: true };
}
