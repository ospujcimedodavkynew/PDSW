import React, { useEffect, useState } from 'react';
import { getVehicles, getReservations } from '../services/api';
import { Reservation, Vehicle, Page } from '../types';
// FIX: Imported Tooltip from recharts
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Car, Users, CalendarCheck, AlertTriangle, Link, Clock } from 'lucide-react';
import ReservationDetailModal from '../components/ReservationDetailModal';
import SelfServiceModal from '../components/SelfServiceModal';


const COLORS = { available: '#22C55E', rented: '#F59E0B', maintenance: '#EF4444' };

const Dashboard: React.FC<{ setCurrentPage: (page: Page) => void }> = ({ setCurrentPage }) => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isSelfServiceModalOpen, setIsSelfServiceModalOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [vehiclesData, reservationsData] = await Promise.all([getVehicles(), getReservations()]);
            setVehicles(vehiclesData);
            setReservations(reservationsData);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const vehicleStatusData = [
        { name: 'K dispozici', value: vehicles.filter(v => v.status === 'available').length },
        { name: 'Pronajato', value: vehicles.filter(v => v.status === 'rented').length },
        { name: 'V servisu', value: vehicles.filter(v => v.status === 'maintenance').length },
    ];
    
    const fleetUtilization = vehicles.length > 0 ? Math.round((vehicles.filter(v => v.status === 'rented').length / vehicles.length) * 100) : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todaysDepartures = reservations.filter(r => r.status === 'scheduled' && new Date(r.startDate) >= today && new Date(r.startDate) < tomorrow);
    const todaysArrivals = reservations.filter(r => r.status === 'active' && new Date(r.endDate) >= today && new Date(r.endDate) < tomorrow);
    const pendingCustomerReservations = reservations.filter(r => r.status === 'pending-customer');
    const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance');

    const handleOpenDetailModal = (reservation: Reservation) => {
        setSelectedReservation(reservation);
        setIsDetailModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsDetailModalOpen(false);
        setSelectedReservation(null);
        fetchData();
    };

    if (loading) return <div>Načítání přehledu...</div>;

    return (
        <div className="space-y-6">
            <ReservationDetailModal isOpen={isDetailModalOpen} onClose={handleCloseModal} reservation={selectedReservation} />
            <SelfServiceModal isOpen={isSelfServiceModalOpen} onClose={() => setIsSelfServiceModalOpen(false)} availableVehicles={vehicles.filter(v => v.status === 'available')} onLinkGenerated={fetchData} />

            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Přehled</h1>
                <div className="flex space-x-3">
                     <button onClick={() => setIsSelfServiceModalOpen(true)} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                        <Link className="w-5 h-5 mr-2" /> Vytvořit samoobslužnou rezervaci
                    </button>
                    <button onClick={() => setCurrentPage(Page.CUSTOMERS)} className="bg-gray-200 text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors flex items-center">
                        <Users className="w-5 h-5 mr-2" /> Nový zákazník
                    </button>
                    <button onClick={() => setCurrentPage(Page.RESERVATIONS)} className="bg-secondary text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-secondary-hover transition-colors flex items-center">
                        <CalendarCheck className="w-5 h-5 mr-2" /> Nová rezervace
                    </button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Stav flotily</h2>
                     <div className="grid grid-cols-2 gap-4 items-center">
                        <div>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={vehicleStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
                                        {vehicleStatusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[entry.name === 'K dispozici' ? 'available' : entry.name === 'Pronajato' ? 'rented' : 'maintenance']} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="text-center">
                            <p className="text-gray-500 font-medium">Vytíženost flotily</p>
                            <p className="text-6xl font-bold text-primary">{fleetUtilization}%</p>
                        </div>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center"><AlertTriangle className="mr-2 text-red-500"/>Upozornění</h2>
                    {maintenanceVehicles.length > 0 ? (
                        <ul className="space-y-2">
                           {maintenanceVehicles.map(v => (
                             <li key={v.id} className="text-gray-600"><span className="font-semibold">{v.name}</span> je v servisu.</li>
                           ))}
                        </ul>
                    ) : <p className="text-gray-500">Žádná důležitá upozornění.</p>}
                </div>
            </div>
            
            {/* Action Center */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                     <h2 className="text-xl font-bold text-gray-700 mb-4">Čeká na údaje od zákazníka</h2>
                     {pendingCustomerReservations.length > 0 ? (
                        <ul className="space-y-3">
                           {pendingCustomerReservations.map(res => (
                               <li key={res.id} className="p-3 bg-blue-50 rounded-md">
                                 <p className="font-semibold">{res.vehicle?.name}</p>
                                 <p className="text-sm text-blue-700">Odkaz byl vygenerován. Čeká se na vyplnění.</p>
                               </li>
                           ))}
                        </ul>
                     ) : <p className="text-gray-500">Žádné čekající rezervace.</p>}
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Dnešní odjezdy</h2>
                     {todaysDepartures.length > 0 ? (
                        <ul className="space-y-3">
                           {todaysDepartures.map(res => (
                               <li key={res.id} className="flex justify-between items-center p-3 bg-green-50 rounded-md">
                                 <div>
                                    <p className="font-semibold">{res.customer?.firstName} {res.customer?.lastName}</p>
                                    <p className="text-sm text-gray-500">{res.vehicle?.name} - <Clock className="inline w-3 h-3 mr-1"/>{new Date(res.startDate).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</p>
                                 </div>
                                 <button onClick={() => handleOpenDetailModal(res)} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm font-semibold">Vydat</button>
                               </li>
                           ))}
                        </ul>
                     ) : <p className="text-gray-500">Žádné plánované odjezdy.</p>}
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Dnešní příjezdy</h2>
                      {todaysArrivals.length > 0 ? (
                        <ul className="space-y-3">
                           {todaysArrivals.map(res => (
                               <li key={res.id} className="flex justify-between items-center p-3 bg-yellow-50 rounded-md">
                                  <div>
                                    <p className="font-semibold">{res.customer?.firstName} {res.customer?.lastName}</p>
                                    <p className="text-sm text-gray-500">{res.vehicle?.name} - <Clock className="inline w-3 h-3 mr-1"/>{new Date(res.endDate).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</p>
                                  </div>
                                  <button onClick={() => handleOpenDetailModal(res)} className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm font-semibold">Převzít</button>
                               </li>
                           ))}
                        </ul>
                     ) : <p className="text-gray-500">Žádné plánované příjezdy.</p>}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;