import React, { useEffect, useState, useMemo } from 'react';
import { getCustomers } from '../services/api';
import type { Customer } from '../types';
import { Plus, User, Mail, Phone, Edit, MapPin, Search } from 'lucide-react';
import CustomerFormModal from '../components/CustomerFormModal';

const CustomerCard: React.FC<{ customer: Customer; onEdit: (customer: Customer) => void }> = ({ customer, onEdit }) => {
    return (
        <div className="bg-white rounded-lg shadow-md p-5 flex flex-col justify-between">
            <div>
                <div className="flex items-center mb-3">
                    <div className="bg-blue-100 p-3 rounded-full mr-4">
                        <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">{customer.firstName} {customer.lastName}</h3>
                    </div>
                </div>
                <div className="space-y-2 text-sm">
                    <p className="flex items-center text-gray-600 truncate"><Mail className="w-4 h-4 mr-2 flex-shrink-0" />{customer.email}</p>
                    <p className="flex items-center text-gray-600"><Phone className="w-4 h-4 mr-2 flex-shrink-0" />{customer.phone}</p>
                    <p className="flex items-start text-gray-600"><MapPin className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />{customer.address}</p>
                    <p className="text-gray-600"><strong>ŘP:</strong> {customer.driverLicenseNumber}</p>
                </div>
            </div>
            <button onClick={() => onEdit(customer)} className="w-full mt-4 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center">
                <Edit className="w-4 h-4 mr-2" /> Upravit
            </button>
        </div>
    );
};


const Customers: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchCustomers = async () => {
        try {
            const data = await getCustomers();
            setCustomers(data);
        } catch (error) {
            console.error("Failed to fetch customers:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchCustomers();
    }, []);
    
    const filteredCustomers = useMemo(() => {
        return customers.filter(customer => {
            const fullName = `${customer.firstName} ${customer.lastName}`;
            const term = searchTerm.toLowerCase();
            return term === '' ||
                fullName.toLowerCase().includes(term) ||
                customer.email.toLowerCase().includes(term) ||
                customer.phone.includes(term);
        });
    }, [customers, searchTerm]);
    
    const handleOpenModal = (customer: Customer | null = null) => {
        setSelectedCustomer(customer);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedCustomer(null);
    };

    const handleSaveSuccess = () => {
        handleCloseModal();
        fetchCustomers();
    };


    if (loading) return <div>Načítání zákazníků...</div>;

    return (
        <div>
             <CustomerFormModal 
                isOpen={isModalOpen} 
                onClose={handleCloseModal} 
                onSaveSuccess={handleSaveSuccess} 
                customer={selectedCustomer} 
             />
            <div className="flex justify-between items-center mb-6">
                <div className="relative w-full max-w-lg">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Hledat podle jména, e-mailu nebo telefonu..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-3 pl-12 border rounded-lg shadow-sm"
                    />
                </div>
                <button onClick={() => handleOpenModal()} className="bg-secondary text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-secondary-hover transition-colors flex items-center whitespace-nowrap">
                    <Plus className="w-5 h-5 mr-2" />
                    Přidat zákazníka
                </button>
            </div>

            {filteredCustomers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredCustomers.map(customer => (
                        <CustomerCard key={customer.id} customer={customer} onEdit={handleOpenModal} />
                    ))}
                </div>
            ) : (
                 <div className="text-center py-16 bg-white rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-gray-700">Nebyly nalezeny žádné výsledky</h3>
                    <p className="text-gray-500 mt-2">Zkuste zkontrolovat zadaný text.</p>
                </div>
            )}
        </div>
    );
};

export default Customers;