import React from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  ShieldCheck,
  Package,
  Layers,
  Lock,
  RefreshCw,
  PlusCircle,
  MessageSquare,
  FlaskConical,
  RotateCcw,
} from 'lucide-react';

export default function Header({
  activeTab,
  setActiveTab,
  onOpenNewOrder,
  onOpenSmsIntake,
  onOpenRestock,
}) {
  const { metrics, resetData } = useInventory();

  return (
    <header className="app-header">
      <div className="header-top-row">
        <div className="brand-group">
          <div className="brand-icon-wrapper">
            <span className="brand-emoji">🌾🐟</span>
          </div>
          <div>
            <div className="brand-title-badge-row">
              <h1 className="brand-title">SagipAni & Dagat Cooperative</h1>
              <span className="shield-tag">
                <ShieldCheck size={14} className="shield-icon" />
                Zero-Oversell Invariant Active
              </span>
            </div>
            <p className="brand-subtitle">
              Agri-Fishery Smart Order Intake & Stock Ledger &bull; Instant Reservation &bull; Idempotent Restores
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={resetData}
            title="Reset data back to clean sample demonstration state"
          >
            <RotateCcw size={15} />
            <span>Reset Demo</span>
          </button>

          <button
            className="btn btn-outline"
            onClick={onOpenRestock}
            title="Log new harvest or catch arrival"
          >
            <Package size={16} />
            <span>Record Catch / Harvest</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={onOpenSmsIntake}
            title="Intake order via text message / SMS"
          >
            <MessageSquare size={16} />
            <span>SMS Order Intake</span>
          </button>

          <button
            className="btn btn-accent"
            onClick={onOpenNewOrder}
            title="Create manual order"
          >
            <PlusCircle size={16} />
            <span>New Order</span>
          </button>
        </div>
      </div>

      {/* METRICS STRIP */}
      <div className="metrics-strip">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Catalog SKUs</span>
            <Layers size={16} className="text-muted" />
          </div>
          <div className="metric-value">{metrics.totalSKUs} Products</div>
          <div className="metric-sub">Fresh Catch & Farm Harvests</div>
        </div>

        <div className="metric-card highlight-card">
          <div className="metric-header">
            <span className="metric-title">Available To Order</span>
            <span className="badge badge-success">Open Pool</span>
          </div>
          <div className="metric-value text-emerald">{metrics.totalAvailableUnits} Units</div>
          <div className="metric-sub">OnHand minus Reserved</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Committed / Reserved</span>
            <Lock size={16} className="text-amber" />
          </div>
          <div className="metric-value text-amber">{metrics.totalReservedUnits} Units</div>
          <div className="metric-sub">
            ₱{metrics.reservedValue.toLocaleString()} across {metrics.pendingOrdersCount} orders
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Physical On-Hand</span>
            <Package size={16} className="text-blue" />
          </div>
          <div className="metric-value text-blue">{metrics.totalOnHandUnits} Units</div>
          <div className="metric-sub">In coop cold-storage & sheds</div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <nav className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <Layers size={17} />
          <span>Stock & Products</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <Package size={17} />
          <span>Orders & Dispatch ({metrics.pendingOrdersCount} Active)</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'sms' ? 'active' : ''}`}
          onClick={() => setActiveTab('sms')}
        >
          <MessageSquare size={17} />
          <span>SMS Text Order Parser</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'safety' ? 'active' : ''}`}
          onClick={() => setActiveTab('safety')}
        >
          <FlaskConical size={17} />
          <span>Invariant Proof Lab</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'ledger' ? 'active' : ''}`}
          onClick={() => setActiveTab('ledger')}
        >
          <RefreshCw size={17} />
          <span>Stock Audit Ledger</span>
        </button>
      </nav>
    </header>
  );
}
