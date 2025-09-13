import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { getVehicles, getCustomers, addReservation, getAvailableVehicles } from '../services/api';
import { Vehicle, Customer, Page } from '../types';
import { Search, Plus, User, Car, Calendar, DollarSign, Loader, AlertCircle } from 'lucide-react';
import CustomerFormModal from '../components/CustomerFormModal';

interface ReservationsProps {
    setCurrentPage: (page: Page) => void;
}

const Reservations: React.FC<ReservationsProps> = ({ setCurrentPage }) => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [vehiclesData, customersData] = await Promise.all([getVehicles(), getCustomers()]);
            setVehicles(vehiclesData.filter(v => v.status === 'available' || v.status === 'rented')); // Show all for planning
            setCustomers(customersData);
        } catch (error) {
            console.error("Failed to fetch data for reservations:", error);
            setError('Nepodařilo se načíst potřebná data.');
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, []);

    const selectedVehicle = useMemo(() => vehicles.find(v => v.id === selectedVehicleId), [vehicles, selectedVehicleId]);

    const totalPrice = useMemo(() => {
        if (!selectedVehicle || !startDate || !endDate) return 0;

        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) return 0;
        
        const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

        if (durationHours <= 4) return selectedVehicle.rate4h;
        if (durationHours <= 12) return selectedVehicle.rate12h;
        
        const durationDays = Math.ceil(durationHours / 24);
        return durationDays * selectedVehicle.dailyRate;

    }, [selectedVehicle, startDate, endDate]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!selectedCustomerId || !selectedVehicleId || !startDate || !endDate) {
            setError("Všechna pole jsou povinná.");
            return;
        }
        if (new Date(endDate) <= new Date(startDate)) {
            setError("Datum konce musí být po datu začátku.");
            return;
        }

        setIsSaving(true);
        try {
            await addReservation({
                customerId: selectedCustomerId,
                vehicleId: selectedVehicleId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                totalPrice: totalPrice,
                status: 'confirmed'
            });
            alert('Rezervace byla úspěšně vytvořena.');
            setCurrentPage(Page.MANAGE_RESERVATIONS);
        } catch (err) {
            setError('Vytvoření rezervace se nezdařilo.');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };
    
    if (loading) return <div className="flex justify-center items-center h-full"><Loader className="w-8 h-8 animate-spin text-primary"/></div>;

    return (
        <div className="space-y-6">
             <CustomerFormModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSave={() => {
                    setIsCustomerModalOpen(false);
                    fetchData(); // Refresh customer list
                }}
                customer={null}
            />
            <h1 className="text-3xl font-bold text-gray-800">Nová rezervace</h1>
            
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md max-w-4xl mx-auto space-y-8">
                {/* Customer Selection */}
                <div className="border-b pb-6">
                    <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4"><User className="mr-3" />1. Zákazník</h2>
                    <div className="flex items-center gap-4">
                        <select
                            value={selectedCustomerId}
                            onChange={e => setSelectedCustomerId(e.target.value)}
                            className="w-full p-3 border rounded-md bg-white flex-grow"
                            required
                        >
                            <option value="">-- Vyberte existujícího zákazníka --</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</option>
                            ))}
                        </select>
                        <button type="button" onClick={() => setIsCustomerModalOpen(true)} className="bg-secondary text-dark-text font-bold py-3 px-4 rounded-lg hover:bg-secondary-hover transition-colors flex items-center whitespace-nowrap">
                            <Plus className="w-5 h-5 mr-2" />
                            Nový zákazník
                        </button>
                    </div>
                </div>

                {/* Vehicle & Date Selection */}
                <div className="border-b pb-6">
                    <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4"><Car className="mr-3"/>2. Vozidlo a termín</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vozidlo</label>
                            <select
                                value={selectedVehicleId}
                                onChange={e => setSelectedVehicleId(e.target.value)}
                                className="w-full p-3 border rounded-md bg-white"
                                required
                            >
                                <option value="">-- Vyberte vozidlo --</option>
                                {vehicles.map(v => (
                                    <option key={v.id} value={v.id}>{v.name} ({v.licensePlate})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Termín pronájmu</label>
                             <div className="grid grid-cols-2 gap-2">
                                <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded" title="Začátek pronájmu" required />
                                <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded" title="Konec pronájmu" required />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary & Submission */}
                <div>
                     <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4"><DollarSign className="mr-3"/>3. Souhrn a potvrzení</h2>
                     {totalPrice > 0 ? (
                         <div className="bg-primary-hover bg-opacity-10 p-6 rounded-lg text-center">
                            <p className="text-lg text-gray-600">Předběžná cena pronájmu</p>
                            <p className="text-4xl font-bold text-primary my-2">{totalPrice.toLocaleString('cs-CZ')} Kč</p>
                         </div>
                     ) : (
                         <div className="text-center text-gray-500 p-6">
                             Vyplňte prosím údaje výše pro výpočet ceny.
                         </div>
                     )}

                     {error && (
                         <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center" role="alert">
                            <AlertCircle className="w-5 h-5 mr-2"/>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}
                     
                     <div className="mt-8 flex justify-end">
                         <button type="submit" disabled={isSaving} className="bg-primary text-white font-bold py-3 px-8 rounded-lg hover:bg-primary-hover transition-colors text-lg disabled:bg-gray-400">
                             {isSaving ? 'Vytvářím...' : 'Vytvořit rezervaci'}
                         </button>
                     </div>
                </div>
            </form>
        </div>
    );
};

export default Reservations;
