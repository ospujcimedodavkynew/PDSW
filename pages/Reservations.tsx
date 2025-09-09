import React, { useEffect, useState } from 'react';
import { getReservations, getVehicles, getCustomers, addReservation } from '../services/api';
import type { Reservation, Vehicle, Customer } from '../types';
import { Plus, X } from 'lucide-react';

// ReservationFormModal is an inline component for creating new reservations.
interface ReservationFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    reservation: Partial<Reservation> | null;
    vehicles: Vehicle[];
    customers: Customer[];
}

const ReservationFormModal: React.FC<ReservationFormModalProps> = ({ isOpen, onClose, onSaveSuccess, reservation, vehicles, customers }) => {
    const getInitialData = (r: Partial<Reservation> | null): Partial<Reservation> => r || {
        vehicleId: '', customerId: '', startDate: undefined, endDate: undefined, status: 'scheduled'
    };

    const [formData, setFormData] = useState<Partial<Reservation>>(getInitialData(reservation));
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormData(getInitialData(reservation));
            setError(null);
        }
    }, [reservation, isOpen]);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        if (!formData.vehicleId || !formData.customerId || !formData.startDate || !formData.endDate) {
            setError("Všechna pole jsou povinná.");
            setIsSaving(false);
            return;
        }

        if (new Date(formData.endDate) <= new Date(formData.startDate)) {
            setError("Datum konce musí být po datu začátku.");
            setIsSaving(false);
            return;
        }

        try {
            await addReservation(formData);
            onSaveSuccess();
        } catch (err) {
            console.error("Failed to save reservation:", err);
            setError(err instanceof Error ? err.message : 'Uložení rezervace se nezdařilo');
        } finally {
            setIsSaving(false);
        }
    };

    const toDateTimeLocal = (date: Date | undefined) => {
        if (!date) return '';
        const ten = (i: number) => (i < 10 ? '0' : '') + i;
        const YYYY = date.getFullYear();
        const MM = ten(date.getMonth() + 1);
        const DD = ten(date.getDate());
        const HH = ten(date.getHours());
        const II = ten(date.getMinutes());
        return `${YYYY}-${MM}-${DD}T${HH}:${II}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{reservation?.id ? 'Upravit rezervaci' : 'Nová rezervace'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vozidlo</label>
                        <select value={formData.vehicleId || ''} onChange={e => setFormData({ ...formData, vehicleId: e.target.value })} className="w-full p-2 border rounded" required>
                            <option value="" disabled>Vyberte vozidlo</option>
                            {vehicles.filter(v => v.status === 'available').map(v => (
                                <option key={v.id} value={v.id}>{v.name} ({v.licensePlate})</option>
                            ))}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Zákazník</label>
                        <select value={formData.customerId || ''} onChange={e => setFormData({ ...formData, customerId: e.target.value })} className="w-full p-2 border rounded" required>
                            <option value="" disabled>Vyberte zákazníka</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Od (datum a čas)</label>
                            <input type="datetime-local" value={toDateTimeLocal(formData.startDate)} onChange={e => setFormData({ ...formData, startDate: new Date(e.target.value) })} className="w-full p-2 border rounded" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Do (datum a čas)</label>
                             <input type="datetime-local" value={toDateTimeLocal(formData.endDate)} onChange={e => setFormData({ ...formData, endDate: new Date(e.target.value) })} className="w-full p-2 border rounded" required />
                        </div>
                    </div>
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}
                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zrušit</button>
                        <button type="submit" disabled={isSaving} className="py-2 px-4 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:bg-gray-400">
                            {isSaving ? 'Ukládám...' : 'Uložit rezervaci'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const statusMap: Record<Reservation['status'], { text: string; color: string }> = {
    'pending-customer': { text: 'Čeká na zákazníka', color: 'bg-blue-100 text-blue-800' },
    'scheduled': { text: 'Naplánováno', color: 'bg-indigo-100 text-indigo-800' },
    'active': { text: 'Aktivní', color: 'bg-yellow-100 text-yellow-800' },
    'completed': { text: 'Dokončeno', color: 'bg-green-100 text-green-800' },
};

const Reservations: React.FC = () => {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const fetchData = async () => {
        setLoading(true);
        try {
            const [resData, vehData, custData] = await Promise.all([
                getReservations(),
                getVehicles(),
                getCustomers(),
            ]);
            setReservations(resData);
            setVehicles(vehData);
            setCustomers(custData);
        } catch (error) {
            console.error("Failed to fetch data for reservations page:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);
    
    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleSaveSuccess = () => {
        handleCloseModal();
        fetchData();
    };


    if (loading) return <div>Načítání rezervací...</div>;

    return (
        <div>
             <ReservationFormModal 
                isOpen={isModalOpen} 
                onClose={handleCloseModal} 
                onSaveSuccess={handleSaveSuccess} 
                reservation={null} 
                vehicles={vehicles}
                customers={customers}
             />
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Rezervace</h1>
                <button onClick={handleOpenModal} className="bg-secondary text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-secondary-hover transition-colors flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Nová rezervace
                </button>
            </div>
             <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-gray-100">
                        <tr className="text-left text-gray-600 uppercase text-sm">
                            <th className="px-5 py-3">Zákazník</th>
                            <th className="px-5 py-3">Vozidlo</th>
                            <th className="px-5 py-3">Od</th>
                            <th className="px-5 py-3">Do</th>
                            <th className="px-5 py-3">Stav</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reservations.sort((a, b) => (b.startDate?.getTime() || 0) - (a.startDate?.getTime() || 0)).map(res => (
                            <tr key={res.id} className="hover:bg-gray-50 border-b">
                                <td className="px-5 py-4 font-medium">{res.customer ? `${res.customer.firstName} ${res.customer.lastName}` : 'Neznámý'}</td>
                                <td className="px-5 py-4">{res.vehicle?.name || 'Neznámé'}</td>
                                <td className="px-5 py-4">{res.startDate ? res.startDate.toLocaleString('cs-CZ') : 'N/A'}</td>
                                <td className="px-5 py-4">{res.endDate ? res.endDate.toLocaleString('cs-CZ') : 'N/A'}</td>
                                <td className="px-5 py-4">
                                     <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${statusMap[res.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                                        {statusMap[res.status]?.text || res.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Reservations;
