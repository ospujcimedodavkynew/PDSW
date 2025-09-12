import React, { useEffect, useState, useMemo } from 'react';
import { getDashboardStats, onTableChange } from '../services/api';
import { Car, Users, Calendar, AlertTriangle, LogIn, LogOut, PlusCircle, Phone, Wrench } from 'lucide-react';
import { Page, Reservation, Vehicle } from '../types';
import SelfServiceModal from '../components/SelfServiceModal';
import { getVehicles } from '../services/api';
import ReservationDetailModal from '../components/ReservationDetailModal';

interface DashboardProps {
    setCurrentPage: (page: Page) => void;
}

const MaintenanceAlerts: React.FC<{ vehicles: Vehicle[] }> = ({ vehicles }) => {
    const alerts = useMemo(() => {
        const oilChangeThreshold = 1000; // Upozornit 1000 km předem
        const inspectionThresholdDays = 30; // Upozornit 30 dní předem

        const now = new Date();
        const inspectionTresholdDate = new Date();
        inspectionTresholdDate.setDate(now.getDate() + inspectionThresholdDays);
        
        return vehicles.map(v => {
            const oilAlert = v.nextOilServiceKm && (v.nextOilServiceKm - v.currentMileage) <= oilChangeThreshold;
            const inspectionDate = v.nextTechnicalInspectionDate ? new Date(v.nextTechnicalInspectionDate) : null;
            const inspectionAlert = inspectionDate && inspectionDate <= inspectionTresholdDate;

            if (!oilAlert && !inspectionAlert) return null;

            let message = '';
            let isUrgent = false;

            if (oilAlert) {
                const kmRemaining = v.nextOilServiceKm! - v.currentMileage;
                if (kmRemaining <= 0) {
                    message = `Výměna oleje po limitu! (${Math.abs(kmRemaining).toLocaleString('cs-CZ')} km)`;
                    isUrgent = true;
                } else {
                    message = `Výměna oleje za ${kmRemaining.toLocaleString('cs-CZ')} km`;
                }
            }

            if (inspectionAlert) {
                const daysRemaining = Math.ceil((inspectionDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                 if (daysRemaining <= 0) {
                    message = `${message ? message + ' / ' : ''}STK po termínu!`;
                    isUrgent = true;
                } else {
                    message = `${message ? message + ' / ' : ''}STK za ${daysRemaining} dní`;
                }
            }

            return { vehicle: v, message, isUrgent };
        }).filter(Boolean) as { vehicle: Vehicle; message: string; isUrgent: boolean }[];
    }, [vehicles]);

    if (alerts.length === 0) {
        return (
             <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center"><Wrench className="mr-2"/>Nadcházející údržba</h2>
                <div className="text-center py-8">
                    <p className="text-gray-500">Všechna vozidla jsou v pořádku a nevyžadují okamžitou údržbu.</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
             <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center"><Wrench className="mr-2"/>Nadcházející údržba</h2>
            <div className="space-y-3">
            {alerts.map(({ vehicle, message, isUrgent }) => (
                <div key={vehicle.id} className={`p-3 rounded-md flex items-center ${isUrgent ? 'bg-red-50 border-l-4 border-red-500' : 'bg-yellow-50 border-l-4 border-yellow-500'}`}>
                    <AlertTriangle className={`w-6 h-6 mr-4 ${isUrgent ? 'text-red-600' : 'text-yellow-600'}`} />
                    <div>
                        <p className="font-bold">{vehicle.name} <span className="font-normal text-gray-500">({vehicle.licensePlate})</span></p>
                        <p className="text-sm">{message}</p>
                    </div>
                </div>
            ))}
            </div>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ setCurrentPage }) => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSsmOpen, setIsSsmOpen] = useState(false);
    const [availableVehiclesSsm, setAvailableVehiclesSsm] = useState<Vehicle[]>([]);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);


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
            setAvailableVehiclesSsm(vehicles.filter(v => v.status === 'available'));
            setIsSsmOpen(true);
        } catch (error) {
            alert('Nepodařilo se načíst dostupná vozidla.');
        }
    };
    
    const handleOpenDetailModal = (reservation: Reservation) => {
        setSelectedReservation(reservation);
        setIsDetailModalOpen(true);
    };

    const handleCloseDetailModal = () => {
        setIsDetailModalOpen(false);
        setSelectedReservation(null);
        fetchStats();
    };

    if (loading) return <div>Načítání přehledu...</div>;
    if (!stats) return <div>Data se nepodařilo načíst.</div>;

    return (
        <div className="space-y-6">
            <SelfServiceModal 
                isOpen={isSsmOpen}
                onClose={() => setIsSsmOpen(false)}
                availableVehicles={availableVehiclesSsm}
                onLinkGenerated={() => {
                    // Optional: show a success message
                }}
            />
            <ReservationDetailModal 
                isOpen={isDetailModalOpen}
                onClose={handleCloseDetailModal}
                reservation={selectedReservation}
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
                        <div className="space-y-4">
                        {stats.todaysDepartures.map((r: Reservation) => (
                            <div key={r.id} className="bg-gray-50 p-4 rounded-lg shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex-grow">
                                    <div className="flex items-center gap-3">
                                        <LogIn className="w-6 h-6 text-primary flex-shrink-0" />
                                        <div>
                                            <p className="font-bold text-lg text-gray-800">{r.vehicle?.name} <span className="text-sm font-normal text-gray-500">({r.vehicle?.licensePlate})</span></p>
                                            <p className="text-gray-600">{r.customer?.firstName} {r.customer?.lastName}</p>
                                        </div>
                                    </div>
                                    <a href={`tel:${r.customer?.phone}`} className="text-primary hover:underline flex items-center gap-2 mt-2 ml-9 text-sm">
                                        <Phone className="w-4 h-4" />
                                        {r.customer?.phone}
                                    </a>
                                </div>
                                <div className="flex flex-col items-end w-full sm:w-auto flex-shrink-0">
                                    <span className="font-bold text-lg text-primary mb-2">{new Date(r.startDate).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</span>
                                    <button 
                                        onClick={() => handleOpenDetailModal(r)}
                                        className="bg-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-hover transition-colors w-full sm:w-auto"
                                    >
                                        Vydat vozidlo
                                    </button>
                                </div>
                            </div>
                        ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-500">Pro dnešek máte klid, nejsou naplánovány žádné odjezdy.</p>
                        </div>
                    )}
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Dnešní příjezdy</h2>
                     {stats.todaysArrivals.length > 0 ? (
                        <div className="space-y-4">
                        {stats.todaysArrivals.map((r: Reservation) => (
                             <div key={r.id} className="bg-gray-50 p-4 rounded-lg shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex-grow">
                                    <div className="flex items-center gap-3">
                                        <LogOut className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                                        <div>
                                            <p className="font-bold text-lg text-gray-800">{r.vehicle?.name} <span className="text-sm font-normal text-gray-500">({r.vehicle?.licensePlate})</span></p>
                                            <p className="text-gray-600">{r.customer?.firstName} {r.customer?.lastName}</p>
                                        </div>
                                    </div>
                                    <a href={`tel:${r.customer?.phone}`} className="text-primary hover:underline flex items-center gap-2 mt-2 ml-9 text-sm">
                                        <Phone className="w-4 h-4" />
                                        {r.customer?.phone}
                                    </a>
                                </div>
                                <div className="flex flex-col items-end w-full sm:w-auto flex-shrink-0">
                                    <span className="font-bold text-lg text-yellow-600 mb-2">{new Date(r.endDate).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</span>
                                    <button 
                                        onClick={() => handleOpenDetailModal(r)}
                                        className="bg-yellow-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors w-full sm:w-auto"
                                    >
                                        Převzít vozidlo
                                    </button>
                                </div>
                            </div>
                        ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-500">Dnes nejsou očekávány žádné příjezdy vozidel.</p>
                        </div>
                    )}
                </div>
            </div>

            {stats.vehicles && <MaintenanceAlerts vehicles={stats.vehicles} />}
        </div>
    );
};

export default Dashboard;