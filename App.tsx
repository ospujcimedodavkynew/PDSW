import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Reservations from './pages/Reservations';
import Vehicles from './pages/Vehicles';
import Customers from './pages/Customers';
import Contracts from './pages/Contracts';
import Financials from './pages/Financials';
import CustomerPortal from './pages/CustomerPortal';
import { Page } from './types';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);

  const urlParams = new URLSearchParams(window.location.search);
  const portalToken = urlParams.get('portal');

  if (portalToken) {
    return <CustomerPortal token={portalToken} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case Page.DASHBOARD:
        return <Dashboard setCurrentPage={setCurrentPage} />;
      case Page.RESERVATIONS:
        return <Reservations />;
      case Page.VEHICLES:
        return <Vehicles />;
      case Page.CUSTOMERS:
        return <Customers />;
      case Page.CONTRACTS:
        return <Contracts />;
      case Page.FINANCIALS:
        return <Financials />;
      default:
        return <Dashboard setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
