import React, { useState, useEffect, useMemo } from 'react';
import { getVehicles, getCustomers, addReservation } from '../services/api';
import { Vehicle, Customer, Page } from '../types';
import CustomerFormModal from '../components/CustomerFormModal';
import { Plus, User, Car, Calendar, Loader } from 'lucide-react';

const Reservations: React.FC<{ setCurrentPage: (page: Page) => void }> = ({ setCurrentPage }) => {
    // State for data
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);

    // State for form
    const [selectedVehicleId, setSelectedVehicleId] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [totalPrice, setTotalPrice] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State for customer modal
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [vehiclesData, customersData] = await Promise.all([getVehicles(), getCustomers()]);
            setVehicles(vehiclesData);
            setCustomers(customersData);
        } catch (error) {
            console.error("Failed to fetch data for reservations:", error);
            alert("Nepodařilo se načíst data pro vytvoření rezervace.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const availableVehicles = useMemo(() => {
        // A more advanced implementation would check for overlapping reservations
        return vehicles.filter(v => v.status === 'available');
    }, [vehicles]);

    useEffect(() => {
        if (selectedVehicleId && startDate && endDate) {
            const vehicle = vehicles.find(v => v.id === selectedVehicleId);
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (vehicle && end > start) {
                const durationHours = (end.getTime() - start.getTime()) / (1000 * 3600);
                let price = 0;
                if (durationHours <= 4) {
                    price = vehicle.rate4h;
                } else if (durationHours <= 12) {
                    price = vehicle.rate12h;
                } else {
                    const durationDays = Math.ceil(durationHours / 24);
                    price = durationDays * vehicle.dailyRate;
                }
                setTotalPrice(price);
            } else {
                setTotalPrice(null);
            }
        } else {
            setTotalPrice(null);
        }
    }, [selectedVehicleId, startDate, endDate, vehicles]);

    const handleSaveCustomerSuccess = () => {
        setIsCustomerModalOpen(false);
        fetchData(); // Refreshes customer list
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVehicleId || !selectedCustomerId || !startDate || !endDate || totalPrice === null) {
            alert("Vyplňte prosím všechna pole.");
            return;
        }
        setIsSubmitting(true);
        try {
            await addReservation({
                vehicleId: selectedVehicleId,
                customerId: selectedCustomerId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                totalPrice: totalPrice,
            });
            alert("Rezervace byla úspěšně vytvořena.");
            setCurrentPage(Page.MANAGE_RESERVATIONS);
        } catch (error) {
            console.error("Failed to create reservation", error);
            alert("Vytvoření rezervace se nezdařilo.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Loader className="w-8 h-8 animate-spin text-primary"/></div>;
    }

    return (
        <div className="max-w-4xl mx-auto">
            <CustomerFormModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSaveSuccess={handleSaveCustomerSuccess}
                customer={null}
            />
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Vytvořit novou rezervaci</h1>
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><Calendar className="w-4 h-4 mr-2" />Termín pronájmu</label>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded" required />
                            <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded" required />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="vehicle-select" className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><Car className="w-4 h-4 mr-2" />Vozidlo</label>
                        <select id="vehicle-select" value={selectedVehicleId} onChange={e => setSelectedVehicleId(e.target.value)} className="w-full p-2 border rounded bg-white" required>
                            <option value="">-- Vyberte vozidlo --</option>
                            {availableVehicles.map(v => (
                                <option key={v.id} value={v.id}>{v.name} ({v.licensePlate})</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label htmlFor="customer-select" className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><User className="w-4 h-4 mr-2" />Zákazník</label>
                    <div className="flex items-center gap-4">
                        <select id="customer-select" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full p-2 border rounded bg-white" required>
                            <option value="">-- Vyberte zákazníka --</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.firstName} {c.lastName} {c.companyName ? `(${c.companyName})` : ''}</option>
                            ))}
                        </select>
                        <button type="button" onClick={() => setIsCustomerModalOpen(true)} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center flex-shrink-0">
                            <Plus className="w-4 h-4 mr-2"/> Nový
                        </button>
                    </div>
                </div>

                {totalPrice !== null && (
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                        <p className="text-sm font-medium text-blue-800">Předběžná cena pronájmu</p>
                        <p className="text-3xl font-bold text-blue-900">{totalPrice.toLocaleString('cs-CZ')} Kč</p>
                    </div>
                )}
                
                <div className="pt-4 border-t flex justify-end">
                    <button type="submit" disabled={isSubmitting} className="py-3 px-6 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover disabled:bg-gray-400 flex items-center">
                        {isSubmitting ? <><Loader className="w-5 h-5 mr-2 animate-spin"/> Vytvářím...</> : 'Vytvořit rezervaci'}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default Reservations;
