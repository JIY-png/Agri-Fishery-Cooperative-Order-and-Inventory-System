import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { PackagePlus, CheckCircle, Info } from 'lucide-react';

export default function RestockModal({ isOpen, onClose, targetProductId = null }) {
  const { products, restockProduct } = useInventory();
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [sourceNote, setSourceNote] = useState('Fresh morning boat landing / truck arrival');

  useEffect(() => {
    if (targetProductId) {
      setSelectedProductId(targetProductId);
    } else if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [targetProductId, products, selectedProductId]);

  if (!isOpen) return null;

  const currentProduct = products.find((p) => p.id === selectedProductId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedProductId || Number(quantity) <= 0) return;

    const res = restockProduct(selectedProductId, quantity, sourceNote);
    if (res.success) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div className="modal-header">
          <div className="modal-title-group">
            <PackagePlus size={22} className="text-blue" />
            <div>
              <h3>Log Fresh Harvest / Boat Landing Delivery</h3>
              <span className="text-xs text-muted">Direct stock arrival into cooperative depot</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Select Cooperative Produce / Catch:</label>
              <select
                className="form-select"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name} ({p.category}) &mdash; OnHand: {p.onHand} {p.unit}
                  </option>
                ))}
              </select>
            </div>

            {currentProduct && (
              <div className="alert-box-info mb-3">
                <Info size={16} className="text-blue shrink-0" />
                <span>
                  Current on-hand for <strong>{currentProduct.name}</strong> is{' '}
                  <strong>
                    {currentProduct.onHand} {currentProduct.unit}
                  </strong>{' '}
                  ({currentProduct.reserved} {currentProduct.unit} currently reserved).
                </span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Incoming Arrival Quantity ({currentProduct?.unit}):</label>
              <input
                type="number"
                min="1"
                required
                className="form-input"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Origin Guild / Batch Details:</label>
              <input
                type="text"
                className="form-input"
                value={sourceNote}
                onChange={(e) => setSourceNote(e.target.value)}
                placeholder="e.g. Baler Boat #4 landing, Benguet Farm Truck batch #12"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <PackagePlus size={16} />
              <span>Record Delivery into Inventory</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
