import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { getAvailableStock } from '../domain/inventoryModel';
import {
  PlusCircle,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Send,
  User,
  Phone,
  Layers,
} from 'lucide-react';

export default function NewOrderModal({ isOpen, onClose, initialProduct = null }) {
  const { products, placeOrder } = useInventory();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [channel, setChannel] = useState('Walk-in / Notebook');
  const [notes, setNotes] = useState('');
  const [orderItems, setOrderItems] = useState([]);

  useEffect(() => {
    if (initialProduct) {
      setOrderItems([
        {
          productId: initialProduct.id,
          quantity: 1,
        },
      ]);
    } else if (orderItems.length === 0 && products.length > 0) {
      setOrderItems([
        {
          productId: products[0].id,
          quantity: 1,
        },
      ]);
    }
  }, [initialProduct, products]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    const availableProd = products.find(
      (p) => !orderItems.some((i) => i.productId === p.id) && getAvailableStock(p) > 0
    ) || products[0];

    if (availableProd) {
      setOrderItems([...orderItems, { productId: availableProd.id, quantity: 1 }]);
    }
  };

  const handleRemoveItem = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...orderItems];
    if (field === 'quantity') {
      updated[index].quantity = Math.max(1, Number(value) || 1);
    } else {
      updated[index][field] = value;
    }
    setOrderItems(updated);
  };

  // Pre-flight check
  let hasOversell = false;
  let totalOrderCost = 0;

  const enrichedItems = orderItems.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    const available = product ? getAvailableStock(product) : 0;
    const requested = Number(item.quantity);
    const exceeds = requested > available;
    if (exceeds) hasOversell = true;

    const unitPrice = product ? product.price : 0;
    totalOrderCost += requested * unitPrice;

    return {
      ...item,
      product,
      available,
      requested,
      exceeds,
      unitPrice,
    };
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (hasOversell || orderItems.length === 0) return;

    const result = placeOrder({
      customerName: customerName || 'Walk-in Member',
      customerPhone: customerPhone || 'N/A',
      items: orderItems.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })),
      channel,
      notes,
    });

    if (result.success) {
      onClose();
      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setNotes('');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog modal-lg">
        <div className="modal-header">
          <div className="modal-title-group">
            <PlusCircle size={22} className="text-emerald" />
            <div>
              <h3>Create Order with Immediate Stock Reservation</h3>
              <span className="text-xs text-muted">
                Fail-Safe Order Intake &bull; No Overselling by Design
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* INVARIANT NOTICE */}
            <div className="alert-box-info mb-3">
              <ShieldCheck size={16} className="text-emerald shrink-0" />
              <span>
                Committed items are <strong>reserved immediately</strong> upon confirmation.
                Quantities exceeding current available stock are disallowed.
              </span>
            </div>

            {/* CUSTOMER DETAILS */}
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Customer / Member Name:</label>
                <div className="input-with-icon">
                  <User size={15} className="input-icon" />
                  <input
                    type="text"
                    required
                    placeholder="e.g., Mang Juan / Aling Nena Eatery"
                    className="form-input"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Phone / Contact:</label>
                <div className="input-with-icon">
                  <Phone size={15} className="input-icon" />
                  <input
                    type="text"
                    placeholder="+63 9XX XXX XXXX"
                    className="form-input"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Intake Channel:</label>
                <select
                  className="form-select"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                >
                  <option value="Walk-in / Notebook">Walk-in / Notebook Ledger</option>
                  <option value="Phone Call">Direct Phone Call</option>
                  <option value="SMS Text">SMS Text Message</option>
                  <option value="Cooperative Depot Pickup">Cooperative Depot Pickup</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Order Notes / Delivery Details:</label>
                <input
                  type="text"
                  placeholder="e.g., Morning dispatch, cold storage needed"
                  className="form-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* ORDER ITEMS BUILDER */}
            <div className="items-section-header mt-3">
              <h4 className="font-semibold text-sm">Order Items & Quantities:</h4>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={handleAddItem}
              >
                + Add Another Item
              </button>
            </div>

            <div className="order-items-builder-list">
              {enrichedItems.map((item, index) => (
                <div
                  key={index}
                  className={`item-builder-row ${item.exceeds ? 'row-oversold' : ''}`}
                >
                  <div className="product-select-col">
                    <select
                      className="form-select"
                      value={item.productId}
                      onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                    >
                      {products.map((p) => {
                        const avail = getAvailableStock(p);
                        return (
                          <option key={p.id} value={p.id}>
                            {p.icon} {p.name} — Avail: {avail} {p.unit} (₱{p.price}/{p.unit})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="qty-col">
                    <label className="text-xs text-muted block mb-1">Quantity:</label>
                    <div className="qty-input-group">
                      <input
                        type="number"
                        min="1"
                        max={item.available > 0 ? item.available : 1}
                        className="form-input text-center font-bold"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      />
                      <span className="qty-addon-unit">{item.product?.unit}</span>
                    </div>
                  </div>

                  <div className="status-col">
                    <span className="text-xs text-muted block mb-1">Availability:</span>
                    {item.exceeds ? (
                      <span className="badge badge-danger text-xs">
                        Exceeds ({item.available} {item.product?.unit} max)
                      </span>
                    ) : (
                      <span className="badge badge-success text-xs">
                        {item.available} {item.product?.unit} ready
                      </span>
                    )}
                  </div>

                  <div className="price-col text-right font-mono">
                    <span className="text-xs text-muted block mb-1">Subtotal:</span>
                    ₱{(item.requested * item.unitPrice).toLocaleString()}
                  </div>

                  <div className="action-col">
                    {orderItems.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon-sm"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 size={15} className="text-red" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* OVERSALE BLOCKER */}
            {hasOversell && (
              <div className="alert-box-warning mt-3">
                <AlertTriangle size={16} className="text-red shrink-0" />
                <span>
                  <strong>Overselling Blocked:</strong> One or more items requested exceed
                  available stock. Reduce quantity before this order can be reserved.
                </span>
              </div>
            )}

            {/* TOTALS BAR */}
            <div className="order-summary-footer-bar mt-3">
              <span className="summary-label">Estimated Order Total:</span>
              <span className="summary-total-price">₱{totalOrderCost.toLocaleString()}</span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-accent"
              disabled={hasOversell || orderItems.length === 0}
            >
              <Send size={16} />
              <span>Confirm & Lock Reservation Immediately</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
