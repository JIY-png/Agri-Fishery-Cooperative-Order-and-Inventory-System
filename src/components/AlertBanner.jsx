import React from 'react';
import { useInventory } from '../context/InventoryContext';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export default function AlertBanner() {
  const { systemAlert, clearAlert } = useInventory();

  if (!systemAlert) return null;

  const { type, message, details, timestamp } = systemAlert;

  const icons = {
    error: <AlertCircle className="alert-icon text-red-400" size={20} />,
    warning: <AlertTriangle className="alert-icon text-amber-400" size={20} />,
    success: <CheckCircle2 className="alert-icon text-emerald-400" size={20} />,
    info: <Info className="alert-icon text-blue-400" size={20} />,
  };

  return (
    <div className={`alert-banner alert-${type}`} role="alert">
      <div className="alert-content">
        <div className="alert-header">
          {icons[type] || icons.info}
          <span className="alert-message">{message}</span>
          <span className="alert-time">{timestamp}</span>
        </div>
        {details && Array.isArray(details) && details.length > 0 && (
          <ul className="alert-details-list">
            {details.map((d, i) => (
              <li key={i}>
                <strong>{d.productName || d.productId}:</strong> {d.reason}
              </li>
            ))}
          </ul>
        )}
        {details && typeof details === 'string' && (
          <p className="alert-details-text">{details}</p>
        )}
      </div>
      <button className="alert-close-btn" onClick={clearAlert} aria-label="Close notification">
        <X size={16} />
      </button>
    </div>
  );
}
