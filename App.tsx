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
import { areSupabaseCredentialsSet } from './services/api';
import { AlertTriangle } from 'lucide-react';

const ConfigError = () => (
    <div className="flex h-screen w-screen items-center justify-center bg-red-50 p-4">
        <div className="text-center p-8 bg-white shadow-lg rounded-lg border border-red-200 max-w-lg">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-red-800">Chyba konfigurace aplikace</h1>
            <p className="mt-2 text-gray-700">
                Zdá se, že chybí klíčové údaje pro připojení k databázi (Supabase).
            </p>
            <p className="mt-4 text-sm text-gray-500">
                Prosím, zkontrolujte, že jste správně nastavili proměnné <strong>VITE_SUPABASE_URL</strong> a <strong>VITE_SUPABASE_ANON_KEY</strong> v nastavení vašeho projektu na Vercel.
            </p>
        </div>
    </div>
);


function App() {
  if (!areSupabaseCredentialsSet) {
    return <ConfigError />;
  }
  
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