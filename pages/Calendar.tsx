import React, { useState, useEffect, useMemo } from 'react';
import { getReservations, getVehicles } from '../services/api';
import { Reservation, Vehicle, Page } from '../types';
import { ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';

const Calendar: React.FC<{ setCurrentPage: (page: Page) => void }> = ({ setCurrentPage }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [reservationsData, vehiclesData] = await Promise.all([getReservations(), getVehicles()]);
                setReservations(reservationsData);
                setVehicles(vehiclesData);
            } catch (error) {
                console.error("Failed to fetch calendar data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    
    const vehicleColors = useMemo(() => {
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];
        const colorMap = new Map<string, string>();
        vehicles.forEach((vehicle, index) => {
            colorMap.set(vehicle.id, colors[index % colors.length]);
        });
        return colorMap;
    }, [vehicles]);

    const reservationsByDate = useMemo(() => {
        const map = new Map<string, Reservation[]>();
        reservations.forEach(res => {
            if(res.status === 'completed') return;
            let current = new Date(res.startDate);
            current.setHours(0,0,0,0);
            const end = new Date(res.endDate);
            end.setHours(23,59,59,999);

            while (current <= end) {
                const dateString = current.toISOString().split('T')[0];
                if (!map.has(dateString)) {
                    map.set(dateString, []);
                }
                map.get(dateString)!.push(res);
                current.setDate(current.getDate() + 1);
            }
        });
        return map;
    }, [reservations]);

    const { daysInMonth, firstDayOfMonth } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        return {
            daysInMonth: new Date(year, month + 1, 0).getDate(),
            firstDayOfMonth: new Date(year, month, 1).getDay(),
        };
    }, [currentDate]);

    const calendarGrid = useMemo(() => {
        const grid = [];
        const today = new Date();
        today.setHours(0,0,0,0);
        // Adjust for Sunday being 0
        const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; 

        // Days from previous month
        const prevMonthLastDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
        for (let i = startDay; i > 0; i--) {
            const day = prevMonthLastDay - i + 1;
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, day);
            grid.push({ day, date, isCurrentMonth: false });
        }
        
        // Days of current month
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
            grid.push({ day: i, date, isCurrentMonth: true, isToday: date.getTime() === today.getTime() });
        }

        // Days from next month
        const remainingCells = 42 - grid.length; // 6 rows * 7 days
        for (let i = 1; i <= remainingCells; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i);
            grid.push({ day: i, date, isCurrentMonth: false });
        }

        return grid;
    }, [daysInMonth, firstDayOfMonth, currentDate]);


    const changeMonth = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };
    
    const handleAddReservation = (date: Date) => {
        // We'll navigate to the reservation page, a more advanced implementation could pass the date
        alert(`Budete přesměrováni na rezervační stránku pro vytvoření rezervace na ${date.toLocaleDateString('cs-CZ')}.`);
        setCurrentPage(Page.RESERVATIONS);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800">Kalendář dostupnosti</h1>
                <div className="flex items-center space-x-2">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeft /></button>
                    <h2 className="text-xl font-semibold w-48 text-center">
                        {currentDate.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronRight /></button>
                </div>
            </div>

            {/* Calendar */}
            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-gray-600 border-b pb-2 mb-1">
                {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map(day => <div key={day}>{day}</div>)}
            </div>
            
            {loading ? (
                <div className="flex-grow flex items-center justify-center">Načítání kalendáře...</div>
            ) : (
                <div className="grid grid-cols-7 grid-rows-6 gap-1 flex-grow">
                    {calendarGrid.map(({ day, date, isCurrentMonth, isToday }, index) => {
                        const dateString = date.toISOString().split('T')[0];
                        const dailyReservations = reservationsByDate.get(dateString) || [];
                        return (
                            <div 
                                key={index} 
                                className={`
                                    border border-gray-200 rounded-md p-1.5 flex flex-col relative group
                                    ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                                    ${isToday ? 'border-2 border-primary' : ''}
                                `}
                            >
                                <span className={`
                                    font-bold text-sm
                                    ${isCurrentMonth ? 'text-gray-700' : 'text-gray-400'}
                                    ${isToday ? 'bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}
                                `}>{day}</span>
                                
                                <div className="mt-1 space-y-1 overflow-y-auto text-xs">
                                    {dailyReservations.map(res => (
                                        <div 
                                            key={res.id} 
                                            className="p-1 rounded text-white truncate"
                                            style={{ backgroundColor: vehicleColors.get(res.vehicleId) || '#6B7280' }}
                                            title={`${res.vehicle?.name} - ${res.customer?.firstName} ${res.customer?.lastName}`}
                                        >
                                            {res.vehicle?.name}
                                        </div>
                                    ))}
                                </div>
                                
                                {isCurrentMonth && (
                                    <button 
                                        onClick={() => handleAddReservation(date)} 
                                        className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary-hover"
                                        title={`Vytvořit rezervaci na ${date.toLocaleDateString('cs-CZ')}`}
                                    >
                                        <PlusCircle className="w-5 h-5"/>
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Calendar;
