import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Reservations from './pages/Reservations';
import Vehicles from './pages/Vehicles';
import Customers from './pages/Customers';
import Contracts from './pages/Contracts';
import Financials from './pages/Financials';
import CustomerPortal from './pages/CustomerPortal';
import Login from './pages/Login';
import { Page, Notification } from './types';
import { areSupabaseCredentialsSet, getSession, onAuthChange, onTableChange, getReservations } from './services/api';
import { AlertTriangle, Loader } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

const PAGE_TITLES: { [key in Page]: string } = {
    [Page.DASHBOARD]: 'Přehled',
    [Page.RESERVATIONS]: 'Kalendář rezervací',
    [Page.VEHICLES]: 'Vozový park',
    [Page.CUSTOMERS]: 'Zákazníci',
    [Page.CONTRACTS]: 'Archiv smluv',
    [Page.FINANCIALS]: 'Finance',
};

const ConfigError = () => (
    <div className="flex h-screen w-screen items-center justify-center bg-red-50 p-4">
        <div className="text-center p-8 bg-white shadow-lg rounded-lg border border-red-200 max-w-lg">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-red-800">Chyba konfigurace aplikace</h1>
            <p className="mt-2 text-gray-700">
                Zdá se, že chybí klíčové údaje pro připojení k databázi (Supabase).
            </p>
            <p className="mt-4 text-sm text-gray-500">
                Prosím, otevřete soubor <strong>index.html</strong> a vložte vaše klíče VITE_SUPABASE_URL a VITE_SUPABASE_ANON_KEY.
            </p>
        </div>
    </div>
);

const LoadingScreen = () => (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-100">
        <Loader className="w-12 h-12 text-primary animate-spin" />
    </div>
)


function App() {
  if (!areSupabaseCredentialsSet) return <ConfigError />;
  
  const urlParams = new URLSearchParams(window.location.search);
  const portalToken = urlParams.get('portal');
  if (portalToken) return <CustomerPortal token={portalToken} />;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    getSession().then((session) => {
        setSession(session);
        setLoading(false);
    });

    const authSubscription = onAuthChange((session) => {
        setSession(session);
    });

    return () => {
        authSubscription.unsubscribe();
    };
  }, []);

  // --- NOTIFICATION LOGIC ---
  useEffect(() => {
    if (!session) return;

    // 1. Real-time listener for customer submissions
    const reservationSub = onTableChange('reservations', async (payload) => {
        if (payload.eventType === 'UPDATE' && payload.old.status === 'pending-customer' && payload.new.status === 'scheduled') {
            // Fetch full reservation details to create a meaningful notification
            const allReservations = await getReservations();
            const updatedRes = allReservations.find(r => r.id === payload.new.id);
            if (updatedRes && updatedRes.customer && updatedRes.vehicle) {
                const newNotification: Notification = {
                    id: `res-update-${updatedRes.id}`,
                    message: `Zákazník ${updatedRes.customer.firstName} ${updatedRes.customer.lastName} dokončil rezervaci vozidla ${updatedRes.vehicle.name}.`,
                    type: 'info',
                    createdAt: new Date(),
                    isRead: false,
                    page: Page.RESERVATIONS,
                };
                setNotifications(prev => [newNotification, ...prev]);
            }
        }
    });

    // 2. Periodic checker for upcoming reservation ends
    const interval = setInterval(async () => {
        const allReservations = await getReservations();
        const active = allReservations.filter(r => r.status === 'active' && r.vehicle);
        const now = new Date();
        const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

        active.forEach(res => {
            const endDate = new Date(res.endDate);
            const notificationId = `end-alert-${res.id}`;
            const alreadyNotified = notifications.some(n => n.id === notificationId);

            if (endDate > now && endDate <= twoHoursLater && !alreadyNotified) {
                const newNotification: Notification = {
                    id: notificationId,
                    message: `Pronájem vozidla ${res.vehicle!.name} končí dnes v ${endDate.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}.`,
                    type: 'warning',
                    createdAt: new Date(),
                    isRead: false,
                    page: Page.DASHBOARD,
                };
                setNotifications(prev => [newNotification, ...prev]);
            }
        });
    }, 60 * 1000); // Check every minute

    return () => {
        reservationSub.unsubscribe();
        clearInterval(interval);
    };
  }, [session, notifications]);


  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };
  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };
  const handleNotificationClick = (notification: Notification) => {
      if (notification.page) {
          setCurrentPage(notification.page);
      }
  };

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

  if (loading) return <LoadingScreen />;
  if (!session) return <Login />;

  return (
    <div className="flex h-screen bg-light-bg font-sans">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
            title={PAGE_TITLES[currentPage]}
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onNotificationClick={handleNotificationClick}
        />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
