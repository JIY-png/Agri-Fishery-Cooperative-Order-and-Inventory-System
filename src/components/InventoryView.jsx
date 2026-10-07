import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { getAvailableStock } from '../domain/inventoryModel';
import {
  Search,
  Filter,
  Plus,
  AlertTriangle,
  Lock,
  Package,
  TrendingUp,
  Info,
  CheckCircle,
} from 'lucide-react';

export default function InventoryView({ onOpenRestock, onQuickOrderProduct }) {
  const { products } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.source.toLowerCase().includes(searchTerm.toLowerCase());

    if (categoryFilter === 'all') return matchesSearch;
    if (categoryFilter === 'low-stock') {
      const avail = getAvailableStock(p);
      return matchesSearch && avail <= p.lowStockThreshold;
    }
    return matchesSearch && p.category === categoryFilter;
  });

  return (
    <div className="view-container">
      {/* INVARIANT BANNER EXPLANATION */}
      <div className="invariant-explainer-card">
        <div className="invariant-badge-title">
          <Info size={18} className="text-emerald" />
          <h3>System Invariant #1: No Overselling Guaranteed</h3>
        </div>
        <p>
          Every cooperative product maintains an immutable reservation balance. 
          Formula: <span className="formula-tag">Available = OnHand - Reserved</span>. 
          When an order is received by SMS or notebook, goods are <strong>reserved instantly</strong> upon acceptance. 
          No second customer can claim goods already locked in active reservations.
        </p>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="toolbar-row">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search catch, crops, source guilds..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-pill-group">
          <button
            className={`filter-pill ${categoryFilter === 'all' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('all')}
          >
            All Products ({products.length})
          </button>
          <button
            className={`filter-pill ${categoryFilter === 'fishery' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('fishery')}
          >
            🐟 Fishery ({products.filter((p) => p.category === 'fishery').length})
          </button>
          <button
            className={`filter-pill ${categoryFilter === 'agriculture' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('agriculture')}
          >
            🌾 Agriculture ({products.filter((p) => p.category === 'agriculture').length})
          </button>
          <button
            className={`filter-pill ${categoryFilter === 'low-stock' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('low-stock')}
          >
            ⚠️ Low Available Stock
          </button>
        </div>
      </div>

      {/* PRODUCT GRID */}
      <div className="products-grid">
        {filteredProducts.map((product) => {
          const available = getAvailableStock(product);
          const isLowStock = available <= product.lowStockThreshold;
          const isOutOfStock = available <= 0;
          const reservedPercent =
            product.onHand > 0
              ? Math.min(100, Math.round((product.reserved / product.onHand) * 100))
              : 0;

          return (
            <div
              key={product.id}
              className={`product-card ${isOutOfStock ? 'stock-depleted' : ''} ${
                isLowStock && !isOutOfStock ? 'stock-warning' : ''
              }`}
            >
              <div className="product-card-header">
                <div className="product-identity">
                  <span className="product-card-emoji">{product.icon}</span>
                  <div>
                    <h3 className="product-name">{product.name}</h3>
                    <span className="product-source">{product.source}</span>
                  </div>
                </div>
                <span
                  className={`category-badge ${
                    product.category === 'fishery' ? 'badge-fishery' : 'badge-agriculture'
                  }`}
                >
                  {product.category === 'fishery' ? '🐟 Fishery' : '🌾 Farm Crop'}
                </span>
              </div>

              <p className="product-desc">{product.description}</p>

              {/* THREE-TIER STOCK BREAKDOWN */}
              <div className="stock-breakdown-box">
                <div className="stock-stat available-stat">
                  <span className="stat-label">Available to Promise</span>
                  <span className={`stat-number ${isOutOfStock ? 'text-red' : 'text-emerald'}`}>
                    {available} <span className="stat-unit">{product.unit}</span>
                  </span>
                  <span className="stat-sub">Ready for orders</span>
                </div>

                <div className="stock-stat reserved-stat">
                  <span className="stat-label">Reserved (Locked)</span>
                  <span className="stat-number text-amber">
                    {product.reserved} <span className="stat-unit">{product.unit}</span>
                  </span>
                  <span className="stat-sub">Committed</span>
                </div>

                <div className="stock-stat onhand-stat">
                  <span className="stat-label">Total On-Hand</span>
                  <span className="stat-number text-blue">
                    {product.onHand} <span className="stat-unit">{product.unit}</span>
                  </span>
                  <span className="stat-sub">Physical depot</span>
                </div>
              </div>

              {/* RESERVATION PROGRESS BAR */}
              <div className="reservation-meter-wrapper">
                <div className="meter-labels">
                  <span>Allocation: {reservedPercent}% Reserved</span>
                  <span>{100 - reservedPercent}% Free</span>
                </div>
                <div className="meter-track">
                  <div
                    className="meter-bar-reserved"
                    style={{ width: `${reservedPercent}%` }}
                    title={`${product.reserved} ${product.unit} reserved`}
                  />
                </div>
              </div>

              {/* PRICE & FOOTER ACTIONS */}
              <div className="product-card-footer">
                <div className="price-tag">
                  <span className="price-label">Coop Member Price</span>
                  <span className="price-amount">
                    ₱{product.price.toLocaleString()} <span className="price-unit">/{product.unit}</span>
                  </span>
                </div>

                <div className="card-action-btns">
                  <button
                    className="btn btn-outline btn-xs"
                    onClick={() => onOpenRestock(product.id)}
                    title="Add incoming catch or harvest"
                  >
                    <Plus size={14} />
                    <span>Restock</span>
                  </button>

                  <button
                    className="btn btn-primary btn-xs"
                    onClick={() => onQuickOrderProduct(product)}
                    disabled={isOutOfStock}
                    title={isOutOfStock ? 'Stock depleted' : 'Create order for this item'}
                  >
                    <span>Order</span>
                  </button>
                </div>
              </div>

              {/* STATUS INDICATORS */}
              {isOutOfStock && (
                <div className="stock-alert-pill pill-danger">
                  <AlertTriangle size={13} />
                  <span>Depleted &mdash; All available stock committed</span>
                </div>
              )}
              {isLowStock && !isOutOfStock && (
                <div className="stock-alert-pill pill-warning">
                  <AlertTriangle size={13} />
                  <span>Low stock threshold reached (&le; {product.lowStockThreshold} {product.unit})</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
