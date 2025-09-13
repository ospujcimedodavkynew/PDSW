import React, { useState, useEffect, FormEvent } from 'react';
import type { Customer } from '../types';
import { addCustomer, updateCustomer } from '../services/api';
import { X } from 'lucide-react';

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    customer: Customer | null;
}

const CustomerFormModal: React.FC<CustomerFormModalProps> = ({ isOpen, onClose, onSave, customer }) => {
    const getInitialData = (c: Customer | null): Omit<Customer, 'id' | 'driverLicenseImageUrl'> => ({
        firstName: c?.firstName || '',
        lastName: c?.lastName || '',
        email: c?.email || '',
        phone: c?.phone || '',
        address: c?.address || '',
        driverLicenseNumber: c?.driverLicenseNumber || '',
    });

    const [formData, setFormData] = useState(getInitialData(customer));
    const [driverLicenseFile, setDriverLicenseFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormData(getInitialData(customer));
            setDriverLicenseFile(null);
            setError(null);
        }
    }, [customer, isOpen]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSaving(true);

        if (!customer && !driverLicenseFile) {
            setError("Fotografie řidičského průkazu je povinná pro nového zákazníka.");
            setIsSaving(false);
            return;
        }

        try {
            if (customer) {
                await updateCustomer({ ...customer, ...formData });
            } else {
                await addCustomer(formData, driverLicenseFile!);
            }
            onSave();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Uložení zákazníka se nezdařilo.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{customer ? 'Upravit zákazníka' : 'Přidat nového zákazníka'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="Jméno" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="w-full p-2 border rounded" required />
                        <input type="text" placeholder="Příjmení" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="w-full p-2 border rounded" required />
                    </div>
                    <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-2 border rounded" required />
                    <input type="tel" placeholder="Telefon" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full p-2 border rounded" required />
                    <input type="text" placeholder="Adresa (Ulice, ČP, Město, PSČ)" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full p-2 border rounded" required />
                    <input type="text" placeholder="Číslo řidičského průkazu" value={formData.driverLicenseNumber} onChange={e => setFormData({ ...formData, driverLicenseNumber: e.target.value })} className="w-full p-2 border rounded" required />
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fotografie řidičského průkazu {customer ? '(Nová pro nahrazení)' : ''}
                        </label>
                        <input type="file" accept="image/*" onChange={e => setDriverLicenseFile(e.target.files ? e.target.files[0] : null)} className="w-full p-2 border rounded" required={!customer} />
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zrušit</button>
                        <button type="submit" disabled={isSaving} className="py-2 px-4 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:bg-gray-400">
                            {isSaving ? 'Ukládám...' : 'Uložit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomerFormModal;
