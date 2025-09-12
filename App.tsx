import React, { useState, useEffect } from 'react';
import { Page } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Customers from './pages/Customers';
import Reservations from './pages/Reservations';
import ManageReservations from './pages/ManageReservations';
import Calendar from './pages/Calendar';
import Financials from './pages/Financials';
import Contracts from './pages/Contracts';
import Reports from './pages/Reports';
import Invoices from './pages/Invoices';
import Login from './pages/Login';
import CustomerPortal from './pages/CustomerPortal';
import OnlineRentalPortal from './pages/OnlineRentalPortal';
import { onAuthStateChanged } from './services/api';

const App: React.FC = () => {
    const [user, setUser] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(currentUser => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const renderPage = () => {
        switch (currentPage) {
            case Page.DASHBOARD: return <Dashboard />;
            case Page.VEHICLES: return <Vehicles />;
            case Page.CUSTOMERS: return <Customers />;
            case Page.RESERVATIONS: return <Reservations setCurrentPage={setCurrentPage} />;
            case Page.MANAGE_RESERVATIONS: return <ManageReservations setCurrentPage={setCurrentPage} />;
            case Page.CALENDAR: return <Calendar setCurrentPage={setCurrentPage} />;
            case Page.FINANCIALS: return <Financials />;
            case Page.CONTRACTS: return <Contracts />;
            case Page.REPORTS: return <Reports />;
            case Page.INVOICES: return <Invoices />;
            default: return <Dashboard />;
        }
    };
    
    // Check for special portal URLs
    const urlParams = new URLSearchParams(window.location.search);
    const portalToken = urlParams.get('portal');
    const onlineRental = urlParams.has('online-rental');

    if (portalToken) {
        return <CustomerPortal token={portalToken} />;
    }

    if(onlineRental) {
        return <OnlineRentalPortal />;
    }

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Načítání...</div>;
    }

    if (!user) {
        return <Login />;
    }

    return (
        <div className="flex h-screen bg-light-bg">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
            <main className="flex-1 p-8 overflow-y-auto">
                {renderPage()}
            </main>
        </div>
    );
};

export default App;