import React, { useState } from 'react';
import { InventoryProvider } from './context/InventoryContext';
import Header from './components/Header';
import AlertBanner from './components/AlertBanner';
import InventoryView from './components/InventoryView';
import OrdersView from './components/OrdersView';
import SmsIntakeView from './components/SmsIntakeView';
import SafetyProofLab from './components/SafetyProofLab';
import LedgerView from './components/LedgerView';
import NewOrderModal from './components/NewOrderModal';
import RestockModal from './components/RestockModal';

function MainApp() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [quickOrderProduct, setQuickOrderProduct] = useState(null);
  const [restockProductId, setRestockProductId] = useState(null);

  const handleOpenQuickOrder = (product) => {
    setQuickOrderProduct(product);
    setIsNewOrderOpen(true);
  };

  const handleOpenRestockForProduct = (productId) => {
    setRestockProductId(productId);
    setIsRestockOpen(true);
  };

  return (
    <div className="app-container">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewOrder={() => {
          setQuickOrderProduct(null);
          setIsNewOrderOpen(true);
        }}
        onOpenSmsIntake={() => setActiveTab('sms')}
        onOpenRestock={() => {
          setRestockProductId(null);
          setIsRestockOpen(true);
        }}
      />

      <main className="main-content">
        <AlertBanner />

        {activeTab === 'inventory' && (
          <InventoryView
            onOpenRestock={handleOpenRestockForProduct}
            onQuickOrderProduct={handleOpenQuickOrder}
          />
        )}

        {activeTab === 'orders' && <OrdersView />}

        {activeTab === 'sms' && (
          <SmsIntakeView
            onOrderPlaced={() => setActiveTab('orders')}
          />
        )}

        {activeTab === 'safety' && <SafetyProofLab />}

        {activeTab === 'ledger' && <LedgerView />}
      </main>

      {/* MODALS */}
      <NewOrderModal
        isOpen={isNewOrderOpen}
        onClose={() => {
          setIsNewOrderOpen(false);
          setQuickOrderProduct(null);
        }}
        initialProduct={quickOrderProduct}
      />

      <RestockModal
        isOpen={isRestockOpen}
        onClose={() => {
          setIsRestockOpen(false);
          setRestockProductId(null);
        }}
        targetProductId={restockProductId}
      />
    </div>
  );
}

export default function App() {
  return (
    <InventoryProvider>
      <MainApp />
    </InventoryProvider>
  );
}
