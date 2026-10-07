import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { getAvailableStock } from '../domain/inventoryModel';
import { parseSmsOrder, SAMPLE_SMS_TEMPLATES } from '../utils/smsParser';
import {
  MessageSquare,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Send,
  User,
  Phone,
  Trash2,
  Plus,
} from 'lucide-react';

export default function SmsIntakeView({ onOrderPlaced }) {
  const { products, placeOrder } = useInventory();
  const [rawSmsText, setRawSmsText] = useState(SAMPLE_SMS_TEMPLATES[0].text);
  const [customerName, setCustomerName] = useState('Aling Maring Eatery');
  const [customerPhone, setCustomerPhone] = useState('+63 918 333 4411');
  const [parsedItems, setParsedItems] = useState([
    { productId: 'prod-1', productName: 'Fresh Black Tilapia', quantity: 10, unit: 'kg' },
    { productId: 'prod-4', productName: 'Highland Benguet Tomatoes', quantity: 15, unit: 'kg' },
  ]);

  const handleSelectTemplate = (template) => {
    setRawSmsText(template.text);
    const parsed = parseSmsOrder(template.text, products);
    setCustomerName(parsed.customerName || template.sender.split('(')[0].trim());
    setCustomerPhone(parsed.customerPhone || '+63 918 000 0000');
    setParsedItems(parsed.detectedItems);
  };

  const handleParseText = () => {
    const parsed = parseSmsOrder(rawSmsText, products);
    if (parsed.customerName) setCustomerName(parsed.customerName);
    if (parsed.customerPhone) setCustomerPhone(parsed.customerPhone);
    setParsedItems(parsed.detectedItems);
  };

  const handleUpdateItemQty = (index, newQty) => {
    const updated = [...parsedItems];
    updated[index].quantity = Math.max(1, Number(newQty) || 1);
    setParsedItems(updated);
  };

  const handleRemoveItem = (index) => {
    setParsedItems(parsedItems.filter((_, i) => i !== index));
  };

  const handleAddItem = (productId) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    if (parsedItems.some((i) => i.productId === productId)) return;

    setParsedItems([
      ...parsedItems,
      {
        productId: prod.id,
        productName: prod.name,
        quantity: 1,
        unit: prod.unit,
      },
    ]);
  };

  // Live availability analysis for each item in parsed list
  const itemAnalysis = parsedItems.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    const available = product ? getAvailableStock(product) : 0;
    const requested = Number(item.quantity);
    const isExceeded = requested > available;
    const shortfall = Math.max(0, requested - available);

    return {
      ...item,
      product,
      available,
      requested,
      isExceeded,
      shortfall,
    };
  });

  const hasOversellViolation = itemAnalysis.some((item) => item.isExceeded);
  const isReadyToReserve = parsedItems.length > 0 && !hasOversellViolation;

  const handleConfirmReservation = () => {
    if (hasOversellViolation) return;

    const result = placeOrder({
      customerName,
      customerPhone,
      items: parsedItems.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })),
      channel: 'SMS Text',
      rawText: rawSmsText,
      notes: 'Parsed from incoming mobile text message',
    });

    if (result.success && onOrderPlaced) {
      onOrderPlaced();
    }
  };

  return (
    <div className="view-container">
      {/* INVARIANT BANNER */}
      <div className="invariant-explainer-card">
        <div className="invariant-badge-title">
          <MessageSquare size={18} className="text-emerald" />
          <h3>Cooperative SMS / Text Message Intake Center</h3>
        </div>
        <p>
          Farmers and fisherfolk cooperatives receive high volumes of casual text orders. 
          This tool parses text messages, performs an <strong>instant pre-flight stock check</strong>, 
          and prevents accepting promises for goods that are already depleted or locked in other orders.
        </p>
      </div>

      <div className="sms-intake-grid">
        {/* LEFT COLUMN: SMS INPUT & TEMPLATES */}
        <div className="card sms-input-card">
          <div className="card-header">
            <h3>1. Incoming Text Message</h3>
            <span className="badge badge-info">Live SMS Stream</span>
          </div>

          <div className="sms-templates-row">
            <span className="templates-label">Quick Sample Scenarios:</span>
            <div className="template-chips">
              {SAMPLE_SMS_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  className="template-chip-btn"
                  onClick={() => handleSelectTemplate(tmpl)}
                  title={tmpl.text}
                >
                  {tmpl.title}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group mt-3">
            <label className="form-label">Customer SMS Content:</label>
            <textarea
              className="form-textarea sms-textarea"
              rows={4}
              value={rawSmsText}
              onChange={(e) => setRawSmsText(e.target.value)}
              placeholder="Paste SMS here (e.g., 'Order po Nanay Cora: 5kg Tilapia at 10kg Kamatis...')"
            />
          </div>

          <button
            className="btn btn-secondary w-full"
            onClick={handleParseText}
          >
            <Sparkles size={16} />
            <span>Parse / Re-extract Items from SMS</span>
          </button>

          <div className="customer-fields-grid mt-3">
            <div className="form-group">
              <label className="form-label">Customer / Buyer:</label>
              <div className="input-with-icon">
                <User size={15} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number:</label>
              <div className="input-with-icon">
                <Phone size={15} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PARSED ITEMS & INSTANT STOCK PRE-FLIGHT CHECK */}
        <div className="card sms-validation-card">
          <div className="card-header">
            <h3>2. Stock Pre-Flight & Availability Verification</h3>
            <span className={hasOversellViolation ? 'badge badge-danger' : 'badge badge-success'}>
              {hasOversellViolation ? '⚠️ Overselling Detected' : '✅ 100% Stock Available'}
            </span>
          </div>

          {parsedItems.length === 0 ? (
            <div className="empty-state-card">
              <AlertTriangle size={32} className="text-muted" />
              <p>No products detected in this SMS text. Try picking a sample scenario on the left.</p>
            </div>
          ) : (
            <div className="parsed-items-table-wrapper">
              <table className="validation-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Requested</th>
                    <th>Available Stock</th>
                    <th>Validation Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {itemAnalysis.map((item, idx) => (
                    <tr
                      key={idx}
                      className={item.isExceeded ? 'row-oversold' : 'row-available'}
                    >
                      <td>
                        <strong>{item.productName}</strong>
                        <div className="text-xs text-muted">
                          ₱{item.product?.price} / {item.unit}
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="table-qty-input"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItemQty(idx, e.target.value)}
                        />
                        <span className="qty-unit">{item.unit}</span>
                      </td>
                      <td>
                        <span className="font-bold">
                          {item.available} {item.unit}
                        </span>
                        <div className="text-xs text-muted">
                          (OnHand: {item.product?.onHand}, Res: {item.product?.reserved})
                        </div>
                      </td>
                      <td>
                        {item.isExceeded ? (
                          <div className="status-pill status-pill-danger">
                            <AlertTriangle size={14} />
                            <span>Short by {item.shortfall} {item.unit}!</span>
                          </div>
                        ) : (
                          <div className="status-pill status-pill-success">
                            <CheckCircle2 size={14} />
                            <span>Stock Ready</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-icon-sm"
                          onClick={() => handleRemoveItem(idx)}
                          title="Remove item"
                        >
                          <Trash2 size={14} className="text-red" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ADD EXTRA PRODUCT DROPDOWN */}
          <div className="add-extra-item-row mt-3">
            <span className="text-sm font-semibold">Add additional item:</span>
            <select
              className="form-select select-sm"
              onChange={(e) => {
                if (e.target.value) {
                  handleAddItem(e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>
                -- Select catch or farm produce --
              </option>
              {products
                .filter((p) => !parsedItems.some((i) => i.productId === p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Avail: {getAvailableStock(p)} {p.unit})
                  </option>
                ))}
            </select>
          </div>

          {/* OVERSALE VIOLATION WARNING BOX */}
          {hasOversellViolation && (
            <div className="oversell-blocker-notice mt-3">
              <div className="blocker-header">
                <AlertTriangle size={18} className="text-red" />
                <strong>Order Acceptance Blocked by Design</strong>
              </div>
              <p>
                One or more requested items exceed current cooperative available stock. 
                In the old notebook system, staff might have promised these goods anyway. 
                Here, reservation is forbidden until quantities are adjusted or new stock is logged.
              </p>
            </div>
          )}

          {/* ACTION BUTTON */}
          <div className="sms-reserve-action mt-4">
            <button
              className={`btn btn-accent btn-lg w-full ${!isReadyToReserve ? 'btn-disabled' : ''}`}
              disabled={!isReadyToReserve}
              onClick={handleConfirmReservation}
            >
              <Send size={18} />
              <span>
                {hasOversellViolation
                  ? 'Cannot Accept (Resolve Shortage First)'
                  : 'Accept SMS Order & Reserve Stock Immediately'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
