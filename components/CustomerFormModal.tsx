import React, { useState, useEffect, FormEvent } from 'react';
import type { Customer } from '../types';
import { X } from 'lucide-react';
import { addCustomer, updateCustomer } from '../services/api';

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    customer: Partial<Customer> | null;
}

const CustomerFormModal: React.FC<CustomerFormModalProps> = ({ isOpen, onClose, onSaveSuccess, customer }) => {
    const getInitialData = (c: Partial<Customer> | null): Partial<Customer> => c || {
        firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: '',
        companyName: '', companyId: '', vatId: ''
    };

    const [formData, setFormData] = useState<Partial<Customer>>(getInitialData(customer));
    const [isCompany, setIsCompany] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            const initialData = getInitialData(customer);
            setFormData(initialData);
            setIsCompany(!!(initialData.companyName || initialData.companyId || initialData.vatId));
            setError(null);
        }
    }, [customer, isOpen]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        
        const dataToSave = { ...formData };
        if (!isCompany) {
            dataToSave.companyName = undefined;
            dataToSave.companyId = undefined;
            dataToSave.vatId = undefined;
        }

        try {
            if (dataToSave.id) {
                await updateCustomer(dataToSave as Customer);
            } else {
                await addCustomer(dataToSave as Omit<Customer, 'id'>);
            }
            onSaveSuccess();
        } catch (err) {
            console.error("Failed to save customer:", err);
            setError(err instanceof Error ? err.message : 'Uložení zákazníka se nezdařilo');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{customer?.id ? 'Upravit zákazníka' : 'Přidat nového zákazníka'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="Jméno" value={formData.firstName || ''} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="w-full p-2 border rounded" required />
                        <input type="text" placeholder="Příjmení" value={formData.lastName || ''} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="w-full p-2 border rounded" required />
                    </div>
                    <input type="email" placeholder="Email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-2 border rounded" required />
                    <input type="text" placeholder="Adresa" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full p-2 border rounded" required />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="tel" placeholder="Telefon" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full p-2 border rounded" required />
                        <input type="text" placeholder="Číslo ŘP" value={formData.driverLicenseNumber || ''} onChange={e => setFormData({ ...formData, driverLicenseNumber: e.target.value })} className="w-full p-2 border rounded" required />
                    </div>

                    <div className="pt-2">
                        <label className="flex items-center">
                            <input type="checkbox" checked={isCompany} onChange={e => setIsCompany(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                            <span className="ml-2 text-sm font-medium text-gray-700">Nakupuji na firmu</span>
                        </label>
                    </div>

                    {isCompany && (
                        <div className="space-y-4 pt-4 border-t mt-4">
                            <input type="text" placeholder="Název firmy" value={formData.companyName || ''} onChange={e => setFormData({ ...formData, companyName: e.target.value })} className="w-full p-2 border rounded" required={isCompany} />
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="IČO" value={formData.companyId || ''} onChange={e => setFormData({ ...formData, companyId: e.target.value })} className="w-full p-2 border rounded" />
                                <input type="text" placeholder="DIČ" value={formData.vatId || ''} onChange={e => setFormData({ ...formData, vatId: e.target.value })} className="w-full p-2 border rounded" />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                            <strong className="font-bold">Chyba: </strong>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}
                    
                    <div className="flex justify-end space-x-3 pt-4 border-t">
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
