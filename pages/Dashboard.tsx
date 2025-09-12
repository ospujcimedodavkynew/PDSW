import React, { useEffect, useState } from 'react';
import { getDashboardStats, onTableChange } from '../services/api';
import { Car, Users, Calendar, AlertTriangle, LogIn, LogOut, PlusCircle } from 'lucide-react';
import { Page, Reservation } from '../types';
import SelfServiceModal from '../components/SelfServiceModal';
import { getVehicles } from '../services/api';

interface DashboardProps {
    setCurrentPage: (page: Page) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setCurrentPage }) => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSsmOpen, setIsSsmOpen] = useState(false);
    const [availableVehicles, setAvailableVehicles] = useState([]);

    const fetchStats = async () => {
        try {
            const data = await getDashboardStats();
            setStats(data);
        } catch (error) {
            console.error("Failed to fetch dashboard stats", error);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchStats();
        // Subscribe to realtime changes
        const unsubscribeReservations = onTableChange('reservations', fetchStats);
        const unsubscribeVehicles = onTableChange('vehicles', fetchStats);

        return () => {
            unsubscribeReservations();
            unsubscribeVehicles();
        };
    }, []);

    const handleOpenSsm = async () => {
        try {
            const vehicles = await getVehicles();
            setAvailableVehicles(vehicles.filter(v => v.status === 'available') as any);
            setIsSsmOpen(true);
        } catch (error) {
            alert('Nepodařilo se načíst dostupná vozidla.');
        }
    };

    if (loading) return <div>Načítání přehledu...</div>;
    if (!stats) return <div>Data se nepodařilo načíst.</div>;

    return (
        <div className="space-y-6">
            <SelfServiceModal 
                isOpen={isSsmOpen}
                onClose={() => setIsSsmOpen(false)}
                availableVehicles={availableVehicles}
                onLinkGenerated={() => {
                    // Optional: show a success message
                }}
            />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Přehled</h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(Page.RESERVATIONS)} className="bg-secondary text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-secondary-hover transition-colors flex items-center">
                        <PlusCircle className="w-5 h-5 mr-2" />
                        Nová rezervace
                    </button>
                    <button onClick={handleOpenSsm} className="bg-white border border-gray-300 text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors">
                        Samoobsluha
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Stat cards */}
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="p-4 bg-blue-100 rounded-full"><Car className="w-8 h-8 text-blue-600"/></div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Dostupná vozidla</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.stats?.availableVehicles} / {stats.stats?.totalVehicles}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="p-4 bg-green-100 rounded-full"><Calendar className="w-8 h-8 text-green-600"/></div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Nadcházející rezervace</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.upcomingReservations}</p>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="p-4 bg-yellow-100 rounded-full"><AlertTriangle className="w-8 h-8 text-yellow-600"/></div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Dnes se vrací</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.dueBack}</p>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="p-4 bg-purple-100 rounded-full"><Users className="w-8 h-8 text-purple-600"/></div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Celkem zákazníků</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.totalCustomers || 0}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Dnešní odjezdy</h2>
                    {stats.todaysDepartures.length > 0 ? (
                        <div className="space-y-3">
                        {stats.todaysDepartures.map((r: Reservation) => (
                            <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                <div>
                                    <p className="font-semibold">{r.customer?.firstName} {r.customer?.lastName}</p>
                                    <p className="text-sm text-gray-500">{r.vehicle?.name}</p>
                                </div>
                                <span className="font-bold text-primary">{new Date(r.startDate).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">Dnes nejsou žádné plánované odjezdy.</p>
                    )}
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Dnešní příjezdy</h2>
                     {stats.todaysArrivals.length > 0 ? (
                        <div className="space-y-3">
                        {stats.todaysArrivals.map((r: Reservation) => (
                             <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                <div>
                                    <p className="font-semibold">{r.customer?.firstName} {r.customer?.lastName}</p>
                                    <p className="text-sm text-gray-500">{r.vehicle?.name}</p>
                                </div>
                                <span className="font-bold text-yellow-600">{new Date(r.endDate).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">Dnes nejsou žádné plánované příjezdy.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
