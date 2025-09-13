import React, { useState, useEffect, FormEvent } from 'react';
import type { Customer, Reservation, Vehicle } from '../types';
import { X, Trash } from 'lucide-react';
import { addReservation, updateReservation, deleteReservation } from '../services/api';

interface ReservationFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    reservationData: Partial<Reservation> & { initialDate?: Date } | null;
    vehicles: Vehicle[];
    customers: Customer[];
}

const ReservationFormModal: React.FC<ReservationFormModalProps> = ({ isOpen, onClose, onSave, reservationData, vehicles, customers }) => {
    const [formData, setFormData] = useState<Partial<Reservation>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEditing = !!formData.id;

    useEffect(() => {
        if (isOpen && reservationData) {
            const defaultStartTime = new Date(reservationData.initialDate || new Date());
            defaultStartTime.setHours(9, 0, 0, 0);

            const defaultEndTime = new Date(defaultStartTime);
            defaultEndTime.setDate(defaultEndTime.getDate() + 1);

            const dataToEdit = {
                id: reservationData.id,
                customerId: reservationData.customerId || '',
                vehicleId: reservationData.vehicleId || '',
                startDate: reservationData.startDate ? new Date(reservationData.startDate) : defaultStartTime,
                endDate: reservationData.endDate ? new Date(reservationData.endDate) : defaultEndTime,
                status: reservationData.status || 'scheduled',
                notes: reservationData.notes || '',
            };
            setFormData(dataToEdit);
        } else {
            setFormData({});
        }
    }, [reservationData, isOpen]);

    const handleDateTimeChange = (field: 'startDate' | 'endDate', value: string) => {
        setFormData(prev => ({ ...prev, [field]: new Date(value) }));
    };

    const formatDateForInput = (date?: Date) => {
        if (!date) return '';
        const d = new Date(date);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!formData.customerId || !formData.vehicleId || !formData.startDate || !formData.endDate) {
            setError('Zákazník, vozidlo a termín jsou povinné.');
            return;
        }
        if (formData.endDate <= formData.startDate) {
            setError('Datum konce musí být po datu začátku.');
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            if (isEditing && formData.id) {
                await updateReservation(formData.id, {
                    customerId: formData.customerId,
                    vehicleId: formData.vehicleId,
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    status: formData.status,
                    notes: formData.notes,
                });
            } else {
                 await addReservation({
                    customerId: formData.customerId,
                    vehicleId: formData.vehicleId,
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    status: formData.status as Reservation['status'],
                });
            }
            onSave();
        } catch (err) {
            console.error("Failed to save reservation:", err);
            setError(err instanceof Error ? err.message : 'Uložení rezervace se nezdařilo.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async () => {
        if (isEditing && formData.id && window.confirm('Opravdu si přejete smazat tuto rezervaci?')) {
            setIsSaving(true);
            setError(null);
            try {
                await deleteReservation(formData.id);
                onSave();
            } catch (err) {
                 setError(err instanceof Error ? err.message : 'Smazání rezervace se nezdařilo.');
            } finally {
                setIsSaving(false);
            }
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg max-h-full overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{isEditing ? 'Upravit rezervaci' : 'Nová rezervace'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Zákazník</label>
                        <select value={formData.customerId || ''} onChange={e => setFormData({ ...formData, customerId: e.target.value })} className="w-full p-2 border rounded-md" required>
                            <option value="">-- Vyberte zákazníka --</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Vozidlo</label>
                        <select value={formData.vehicleId || ''} onChange={e => setFormData({ ...formData, vehicleId: e.target.value })} className="w-full p-2 border rounded-md" required>
                             <option value="">-- Vyberte vozidlo --</option>
                            {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Začátek</label>
                            <input type="datetime-local" value={formatDateForInput(formData.startDate)} onChange={e => handleDateTimeChange('startDate', e.target.value)} className="w-full p-2 border rounded-md" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Konec</label>
                            <input type="datetime-local" value={formatDateForInput(formData.endDate)} onChange={e => handleDateTimeChange('endDate', e.target.value)} className="w-full p-2 border rounded-md" required />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Stav</label>
                        <select value={formData.status || 'scheduled'} onChange={e => setFormData({ ...formData, status: e.target.value as Reservation['status'] })} className="w-full p-2 border rounded-md">
                            <option value="scheduled">Naplánováno</option>
                            <option value="active">Aktivní</option>
                            <option value="completed">Dokončeno</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Poznámky</label>
                        <textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full p-2 border rounded-md h-20"></textarea>
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div className="flex justify-between items-center pt-4">
                        <div>
                        {isEditing && (
                            <button type="button" onClick={handleDelete} className="py-2 px-4 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center disabled:bg-gray-400" disabled={isSaving}>
                                <Trash className="w-4 h-4 mr-2" /> Smazat
                            </button>
                        )}
                        </div>
                        <div className="flex space-x-3">
                            <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zrušit</button>
                            <button type="submit" disabled={isSaving} className="py-2 px-4 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:bg-gray-400">
                                {isSaving ? 'Ukládám...' : 'Uložit rezervaci'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReservationFormModal;
