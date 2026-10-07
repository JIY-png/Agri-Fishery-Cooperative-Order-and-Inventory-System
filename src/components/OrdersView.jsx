import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { ORDER_STATUS } from '../domain/inventoryModel';
import {
  PackageCheck,
  Ban,
  Clock,
  Phone,
  User,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  CheckCircle2,
  Info,
} from 'lucide-react';

export default function OrdersView() {
  const { orders, cancelOrder, fulfillOrder } = useInventory();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('Customer called to cancel order');

  const filteredOrders = orders.filter((order) => {
    const matchesFilter =
      statusFilter === 'ALL' || order.status === statusFilter;
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerPhone.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const toggleExpand = (id) => {
    setExpandedOrderId(expandedOrderId === id ? null : id);
  };

  const handleOpenCancel = (order) => {
    setCancelModalOrder(order);
    setCancelReason('Customer called to cancel text order');
  };

  const handleConfirmCancel = () => {
    if (cancelModalOrder) {
      cancelOrder(cancelModalOrder.id, cancelReason);
      setCancelModalOrder(null);
    }
  };

  return (
    <div className="view-container">
      {/* INVARIANT BANNER */}
      <div className="invariant-explainer-card">
        <div className="invariant-badge-title">
          <ShieldCheck size={18} className="text-emerald" />
          <h3>System Invariant #2: Safe Idempotent Cancellations</h3>
        </div>
        <p>
          Cancelling an active order returns its reserved stock to available inventory 
          <strong> exactly once</strong>. 
          The system strictly forbids double-cancelling and locks out cancellation once goods are fulfilled.
        </p>
      </div>

      {/* TOOLBAR */}
      <div className="toolbar-row">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search order ID, customer name, phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-pill-group">
          <button
            className={`filter-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All Orders ({orders.length})
          </button>
          <button
            className={`filter-pill ${statusFilter === ORDER_STATUS.RESERVED ? 'active' : ''}`}
            onClick={() => setStatusFilter(ORDER_STATUS.RESERVED)}
          >
            🔒 Active Reserved ({orders.filter((o) => o.status === ORDER_STATUS.RESERVED).length})
          </button>
          <button
            className={`filter-pill ${statusFilter === ORDER_STATUS.FULFILLED ? 'active' : ''}`}
            onClick={() => setStatusFilter(ORDER_STATUS.FULFILLED)}
          >
            ✅ Fulfilled ({orders.filter((o) => o.status === ORDER_STATUS.FULFILLED).length})
          </button>
          <button
            className={`filter-pill ${statusFilter === ORDER_STATUS.CANCELLED ? 'active' : ''}`}
            onClick={() => setStatusFilter(ORDER_STATUS.CANCELLED)}
          >
            ⛔ Cancelled ({orders.filter((o) => o.status === ORDER_STATUS.CANCELLED).length})
          </button>
        </div>
      </div>

      {/* ORDERS LIST */}
      <div className="orders-list">
        {filteredOrders.length === 0 ? (
          <div className="empty-state-card">
            <PackageCheck size={36} className="text-muted" />
            <h3>No orders found</h3>
            <p>Try clearing your filter or searching for another customer name.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isReserved = order.status === ORDER_STATUS.RESERVED;
            const isFulfilled = order.status === ORDER_STATUS.FULFILLED;
            const isCancelled = order.status === ORDER_STATUS.CANCELLED;
            const isExpanded = expandedOrderId === order.id;

            return (
              <div
                key={order.id}
                className={`order-card order-status-${order.status.toLowerCase()}`}
              >
                <div className="order-card-header">
                  <div className="order-title-meta">
                    <span className="order-id-tag">{order.id}</span>
                    <span className={`channel-badge channel-${order.channel.toLowerCase()}`}>
                      <MessageSquare size={13} />
                      {order.channel}
                    </span>
                    <span className="order-time">
                      <Clock size={13} />
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="order-header-badges">
                    {isReserved && (
                      <span className="badge badge-warning">
                        🔒 Stock Reserved
                      </span>
                    )}
                    {isFulfilled && (
                      <span className="badge badge-success">
                        ✅ Dispatched & Fulfilled
                      </span>
                    )}
                    {isCancelled && (
                      <span className="badge badge-danger">
                        ⛔ Cancelled (Stock Restored: {order.restoredCount}x)
                      </span>
                    )}
                  </div>
                </div>

                {/* CUSTOMER INFO */}
                <div className="order-customer-row">
                  <div className="customer-info-item">
                    <User size={15} className="text-muted" />
                    <strong>{order.customerName}</strong>
                  </div>
                  <div className="customer-info-item">
                    <Phone size={15} className="text-muted" />
                    <span>{order.customerPhone}</span>
                  </div>
                </div>

                {/* RAW TEXT SNIPPET IF FROM SMS */}
                {order.rawText && (
                  <div className="sms-snippet-box">
                    <span className="sms-snippet-label">Incoming Text:</span>
                    <span className="sms-snippet-text">&ldquo;{order.rawText}&rdquo;</span>
                  </div>
                )}

                {/* ORDER ITEMS TABLE */}
                <div className="order-items-wrapper">
                  <table className="order-items-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Quantity Reserved</th>
                        <th>Unit Price</th>
                        <th className="text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <strong>{item.productName}</strong>
                          </td>
                          <td>
                            <span className="item-qty-badge">
                              {item.quantity} {item.unit}
                            </span>
                          </td>
                          <td>₱{item.unitPrice.toLocaleString()}</td>
                          <td className="text-right font-mono">
                            ₱{(item.quantity * item.unitPrice).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="text-right font-bold">
                          Order Total:
                        </td>
                        <td className="text-right font-bold text-emerald font-mono">
                          ₱{order.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* ORDER ACTION BAR */}
                <div className="order-action-bar">
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => toggleExpand(order.id)}
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <span>{isExpanded ? 'Hide Audit Log' : 'View Invariant Audit Log'}</span>
                  </button>

                  <div className="order-cta-buttons">
                    {isReserved && (
                      <>
                        <button
                          className="btn btn-danger-outline btn-sm"
                          onClick={() => handleOpenCancel(order)}
                          title="Return reserved stock to inventory"
                        >
                          <Ban size={15} />
                          <span>Cancel Order & Restore Stock</span>
                        </button>

                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => fulfillOrder(order.id)}
                          title="Deduct physical stock and dispatch order"
                        >
                          <PackageCheck size={15} />
                          <span>Fulfill & Dispatch</span>
                        </button>
                      </>
                    )}

                    {isCancelled && (
                      <div className="status-note-badge note-cancelled">
                        <CheckCircle2 size={14} />
                        <span>Stock returned to available inventory (Restored {order.restoredCount}x)</span>
                      </div>
                    )}

                    {isFulfilled && (
                      <div className="status-note-badge note-fulfilled">
                        <CheckCircle2 size={14} />
                        <span>Physical stock deducted. Cancellation locked out by design.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* EXPANDABLE AUDIT TRAIL */}
                {isExpanded && (
                  <div className="order-timeline-expanded">
                    <h4 className="timeline-title">Audit Trail & State Transitions:</h4>
                    <ul className="timeline-list">
                      {order.timeline.map((entry, index) => (
                        <li key={index} className="timeline-item">
                          <span className="timeline-bullet" />
                          <div className="timeline-content">
                            <div className="timeline-header">
                              <span className="timeline-action">{entry.action}</span>
                              <span className="timeline-date">
                                {new Date(entry.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="timeline-note">{entry.note}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* CANCELLATION CONFIRMATION MODAL */}
      {cancelModalOrder && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <div className="modal-title-group">
                <Ban size={20} className="text-red" />
                <h3>Cancel Order #{cancelModalOrder.id}</h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setCancelModalOrder(null)}
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              <div className="alert-box-warning">
                <strong>Inventory Impact:</strong> Cancelling will return all{' '}
                {cancelModalOrder.items
                  .map((i) => `${i.quantity} ${i.unit} of ${i.productName}`)
                  .join(', ')}{' '}
                back to <strong>Available Stock</strong> immediately.
              </div>

              <div className="form-group mt-3">
                <label className="form-label">Reason for cancellation:</label>
                <select
                  className="form-select"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                >
                  <option value="Customer called to cancel text order">
                    Customer called to cancel text order
                  </option>
                  <option value="Customer changed mind / duplicate SMS">
                    Customer changed mind / duplicate SMS
                  </option>
                  <option value="Delivery unable to proceed due to weather/typhoon">
                    Delivery unable to proceed due to weather/typhoon
                  </option>
                  <option value="Payment verification failed">
                    Payment verification failed
                  </option>
                </select>
              </div>

              <p className="invariant-proof-note mt-2">
                🔒 <em>State Invariant:</em> Once cancelled, this order cannot be cancelled
                again. The cancellation handler verifies <code>order.restoredCount === 0</code>{' '}
                before modifying stock, ensuring stock is restored exactly once.
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setCancelModalOrder(null)}
              >
                Keep Order Active
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirmCancel}
              >
                Confirm Cancel & Restore Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
