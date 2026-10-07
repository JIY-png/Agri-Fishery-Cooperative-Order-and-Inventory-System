import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  RefreshCw,
  Search,
  Filter,
  FileText,
  Lock,
  RotateCcw,
  PackageCheck,
  PlusCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

export default function LedgerView() {
  const { ledger } = useInventory();
  const [filterType, setFilterType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEntries = ledger.filter((entry) => {
    const matchesFilter = filterType === 'ALL' || entry.type === filterType;
    const matchesSearch =
      (entry.orderId && entry.orderId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.productName && entry.productName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.note && entry.note.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const getActionBadge = (type) => {
    switch (type) {
      case 'RESERVATION':
        return (
          <span className="badge badge-warning">
            <Lock size={12} /> Stock Reserved
          </span>
        );
      case 'CANCELLATION_RESTORE':
        return (
          <span className="badge badge-danger">
            <RotateCcw size={12} /> Cancel Restored
          </span>
        );
      case 'FULFILLMENT':
        return (
          <span className="badge badge-success">
            <PackageCheck size={12} /> Dispatched
          </span>
        );
      case 'RESTOCK':
        return (
          <span className="badge badge-info">
            <PlusCircle size={12} /> Catch / Harvest In
          </span>
        );
      default:
        return (
          <span className="badge badge-neutral">
            <FileText size={12} /> Audit Snapshot
          </span>
        );
    }
  };

  return (
    <div className="view-container">
      {/* INVARIANT BANNER */}
      <div className="invariant-explainer-card">
        <div className="invariant-badge-title">
          <RefreshCw size={18} className="text-emerald" />
          <h3>Cooperative Immutable Stock Ledger</h3>
        </div>
        <p>
          In the past, cancelled orders or notebook scribbles led to missing stock. 
          This ledger acts as a <strong>tamper-evident audit trail</strong>. Every reservation, 
          cancellation return, and harvest delivery is permanently logged with before-and-after balances.
        </p>
      </div>

      {/* TOOLBAR */}
      <div className="toolbar-row">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search audit trail by order, catch, notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-pill-group">
          <button
            className={`filter-pill ${filterType === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterType('ALL')}
          >
            All Events ({ledger.length})
          </button>
          <button
            className={`filter-pill ${filterType === 'RESERVATION' ? 'active' : ''}`}
            onClick={() => setFilterType('RESERVATION')}
          >
            🔒 Reservations
          </button>
          <button
            className={`filter-pill ${filterType === 'CANCELLATION_RESTORE' ? 'active' : ''}`}
            onClick={() => setFilterType('CANCELLATION_RESTORE')}
          >
            ↩️ Cancel Restores
          </button>
          <button
            className={`filter-pill ${filterType === 'FULFILLMENT' ? 'active' : ''}`}
            onClick={() => setFilterType('FULFILLMENT')}
          >
            📦 Fulfillments
          </button>
          <button
            className={`filter-pill ${filterType === 'RESTOCK' ? 'active' : ''}`}
            onClick={() => setFilterType('RESTOCK')}
          >
            🌾 Restocks
          </button>
        </div>
      </div>

      {/* LEDGER TABLE */}
      <div className="card ledger-table-card">
        <div className="table-responsive">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Time & ID</th>
                <th>Event Type</th>
                <th>Ref Order</th>
                <th>Produce / Catch</th>
                <th>Available Impact</th>
                <th>Balance Snapshot</th>
                <th>Audit Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <div className="ledger-time">
                      <Clock size={12} className="text-muted" />
                      <span>
                        {new Date(entry.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                    <span className="ledger-id-tag">{entry.id.split('-').slice(0, 2).join('-')}</span>
                  </td>
                  <td>{getActionBadge(entry.type)}</td>
                  <td>
                    {entry.orderId ? (
                      <span className="order-link-tag">{entry.orderId}</span>
                    ) : (
                      <span className="text-muted">&mdash;</span>
                    )}
                  </td>
                  <td>
                    <strong>{entry.productName}</strong>
                  </td>
                  <td>
                    {entry.changeQty !== undefined && entry.changeQty !== 0 ? (
                      <span
                        className={`impact-qty-tag ${
                          entry.changeQty > 0 ? 'impact-positive' : 'impact-negative'
                        }`}
                      >
                        {entry.changeQty > 0 ? `+${entry.changeQty}` : entry.changeQty}
                      </span>
                    ) : (
                      <span className="text-muted">0</span>
                    )}
                  </td>
                  <td>
                    {entry.balanceAfter ? (
                      <div className="balance-breakdown text-xs">
                        <div>
                          OnHand: <strong>{entry.balanceAfter.onHand}</strong>
                        </div>
                        <div>
                          Res: <strong className="text-amber">{entry.balanceAfter.reserved}</strong>
                        </div>
                        <div>
                          Avail: <strong className="text-emerald">{entry.balanceAfter.available}</strong>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted">&mdash;</span>
                    )}
                  </td>
                  <td className="ledger-note-cell">
                    <p className="ledger-note-text">{entry.note}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
