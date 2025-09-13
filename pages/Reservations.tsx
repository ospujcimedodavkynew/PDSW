import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getVehicles, getCustomers, getReservations } from '../services/api';
import type { Reservation, Vehicle, Customer } from '../types';
import { ChevronLeft, ChevronRight, Plus, Loader } from 'lucide-react';
import ReservationFormModal from '../components/ReservationFormModal';

const Reservations: React.FC = () => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<Partial<Reservation> & { initialDate?: Date } | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [vehData, custData, resData] = await Promise.all([
                getVehicles(),
                getCustomers(),
                getReservations(),
            ]);
            setVehicles(vehData);
            setCustomers(custData);
            setReservations(resData);
        } catch (error) {
            console.error("Failed to fetch calendar data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const { year, month, daysInMonth, firstDayOfMonth } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday...
        return { year, month, daysInMonth, firstDayOfMonth: (firstDayOfMonth === 0 ? 6 : firstDayOfMonth -1) }; // Adjust to Mon-Sun week
    }, [currentDate]);

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    
    const openModalForNew = (vehicleId: string, date?: number) => {
        const initialDate = date != null ? new Date(year, month, date) : new Date();
        setModalData({ vehicleId, initialDate });
        setIsModalOpen(true);
    };

    const openModalForEdit = (reservation: Reservation) => {
        setModalData(reservation);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setModalData(null);
    };

    const handleSave = () => {
        fetchData();
        handleCloseModal();
    };

    const statusColors: { [key in Reservation['status']]: string } = {
        'scheduled': 'bg-blue-500 border-blue-700',
        'active': 'bg-yellow-500 border-yellow-700',
        'completed': 'bg-green-500 border-green-700',
        'pending-customer': 'bg-gray-400 border-gray-600',
    };

    if (loading) {
        return <div className="flex items-center justify-center h-full"><Loader className="w-8 h-8 animate-spin" /> Načítání kalendáře...</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <ReservationFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSave}
                reservationData={modalData}
                vehicles={vehicles}
                customers={customers}
            />
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center bg-white shadow-sm rounded-lg p-1">
                    <button onClick={handlePrevMonth} className="p-2 rounded-md hover:bg-gray-100"><ChevronLeft /></button>
                    <span className="w-48 text-center font-bold text-lg">
                        {new Date(year, month).toLocaleString('cs-CZ', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={handleNextMonth} className="p-2 rounded-md hover:bg-gray-100"><ChevronRight /></button>
                </div>
                <button onClick={() => openModalForNew('')} className="bg-secondary text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-secondary-hover transition-colors flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Nová rezervace
                </button>
            </div>

            {/* Calendar */}
            <div className="flex-grow bg-white p-4 rounded-lg shadow-md overflow-auto">
                <div className="grid gap-px" style={{ gridTemplateColumns: `180px repeat(${daysInMonth}, minmax(40px, 1fr))` }}>
                    {/* Header: Vehicle Name */}
                    <div className="sticky top-0 left-0 z-20 bg-gray-100 p-2 font-semibold border-b border-r">Vozidlo</div>
                    {/* Header: Days */}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                         const day = i + 1;
                         const d = new Date(year, month, day);
                         const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                         return (
                            <div key={i} className={`sticky top-0 z-10 p-2 text-center font-semibold border-b ${isWeekend ? 'bg-gray-200' : 'bg-gray-100'}`}>
                                {day}
                                <span className="block text-xs font-normal text-gray-500">{d.toLocaleString('cs-CZ', { weekday: 'short' })}</span>
                            </div>
                         )
                    })}
                    
                    {/* Rows: Vehicles and Reservations */}
                    {vehicles.map((vehicle, vehicleIndex) => (
                        <React.Fragment key={vehicle.id}>
                            <div className="sticky left-0 z-10 p-2 font-medium bg-white border-r flex items-center" style={{ gridRow: vehicleIndex + 2 }}>
                                {vehicle.name}
                            </div>
                            {/* Empty cells for clicking */}
                            {Array.from({ length: daysInMonth }, (_, dayIndex) => (
                                <div key={dayIndex} className="border-b border-r hover:bg-blue-50 cursor-pointer" style={{ gridRow: vehicleIndex + 2, gridColumn: dayIndex + 2 }} onClick={() => openModalForNew(vehicle.id, dayIndex + 1)}></div>
                            ))}
                            {/* Reservations for this vehicle */}
                            {reservations
                                .filter(r => r.vehicleId === vehicle.id)
                                .map(r => {
                                    const startDate = new Date(r.startDate);
                                    const endDate = new Date(r.endDate);

                                    // Determine the start and end column for the reservation
                                    let startCol = 1;
                                    if (startDate.getFullYear() === year && startDate.getMonth() === month) {
                                        startCol = startDate.getDate();
                                    } else if (startDate < new Date(year, month, 1)) {
                                        startCol = 1;
                                    } else {
                                        return null; // Reservation is outside this month's view
                                    }
                                    
                                    let endCol = daysInMonth;
                                    if (endDate.getFullYear() === year && endDate.getMonth() === month) {
                                        endCol = endDate.getDate();
                                    } else if (endDate > new Date(year, month, daysInMonth)) {
                                       endCol = daysInMonth;
                                    } else {
                                        return null;
                                    }
                                    
                                    const duration = endCol - startCol + 1;
                                    if (duration < 0) return null;

                                    return (
                                        <div
                                            key={r.id}
                                            onClick={() => openModalForEdit(r)}
                                            className={`absolute h-12 p-2 rounded-lg text-white font-semibold text-sm overflow-hidden whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity ${statusColors[r.status]}`}
                                            style={{
                                                top: `${(vehicleIndex * 3.5) + 3.5}rem`, // Adjust based on row height
                                                left: `calc(180px + ${(startCol - 1) * (100 / daysInMonth)}%)`,
                                                width: `calc(${duration * (100 / daysInMonth)}% - 4px)`,
                                                transform: 'translateY(4px)'
                                            }}
                                        >
                                           {r.customer ? `${r.customer.firstName} ${r.customer.lastName}` : 'Čeká na zákazníka'}
                                        </div>
                                    );
                                })
                            }
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Reservations;