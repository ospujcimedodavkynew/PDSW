import React, { useState, useEffect, FormEvent } from 'react';
import type { Customer } from '../types';
import { X } from 'lucide-react';

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (customer: Customer | Omit<Customer, 'id'>) => void;
    customer: Partial<Customer> | null;
}

const CustomerFormModal: React.FC<CustomerFormModalProps> = ({ isOpen, onClose, onSave, customer }) => {
    const [formData, setFormData] = useState<Partial<Customer>>({
        firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: ''
    });

    useEffect(() => {
        if (customer) {
            setFormData(customer);
        } else {
            setFormData({ firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: '' });
        }
    }, [customer]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSave(formData as Customer | Omit<Customer, 'id'>);
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
                    <div className="flex justify-end space-x-3 mt-6">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zrušit</button>
                        <button type="submit" className="py-2 px-4 rounded-lg bg-primary text-white hover:bg-primary-hover">Uložit</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomerFormModal;
