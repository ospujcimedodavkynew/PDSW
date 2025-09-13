import React, { useEffect, useState, useMemo } from 'react';
import { getReservations, deleteReservation } from '../services/api';
// FIX: Correctly import Page as a value and Reservation as a type.
import { Page, type Reservation } from '../types';
import { Search, Edit, Trash2, PlusCircle } from 'lucide-react';

interface ManageReservationsProps {
    setCurrentPage: (page: Page) => void;
}

const ManageReservations: React.FC<ManageReservationsProps> = ({ setCurrentPage }) => {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchReservations = async () => {
        setLoading(true);
        try {
            const data = await getReservations();
            // Sort by start date, newest first
            data.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
            setReservations(data);
        } catch (error) {
            console.error("Failed to fetch reservations:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReservations();
    }, []);

    const handleDelete = async (reservationId: string) => {
        if (window.confirm('Opravdu si přejete smazat tuto rezervaci?')) {
            try {
                await deleteReservation(reservationId);
                fetchReservations();
            } catch (error) {
                alert('Nepodařilo se smazat rezervaci.');
            }
        }
    };

    const filteredReservations = useMemo(() => {
        return reservations.filter(r => {
            const searchLower = searchTerm.toLowerCase();
            const customerName = `${r.customer?.firstName} ${r.customer?.lastName}`.toLowerCase();
            const vehicleName = r.vehicle?.name.toLowerCase() || '';
            const licensePlate = r.vehicle?.licensePlate.toLowerCase() || '';
            return customerName.includes(searchLower) || vehicleName.includes(searchLower) || licensePlate.includes(searchLower);
        });
    }, [reservations, searchTerm]);

    const getStatusChip = (status: Reservation['status']) => {
        switch(status) {
            case 'confirmed': return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Potvrzeno</span>;
            case 'pending-customer': return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Čeká na zákazníka</span>;
            case 'completed': return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Dokončeno</span>;
            case 'cancelled': return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Zrušeno</span>;
            default: return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Neznámý</span>;
        }
    }

    if (loading) return <div>Načítání rezervací...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Správa rezervací</h1>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Hledat rezervaci..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-72 p-2 pl-10 border rounded-lg"
                        />
                    </div>
                    <button onClick={() => setCurrentPage(Page.RESERVATIONS)} className="bg-secondary text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-secondary-hover transition-colors flex items-center">
                        <PlusCircle className="w-5 h-5 mr-2" />
                        Nová rezervace
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zákazník</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vozidlo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Termín</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="relative px-6 py-3"><span className="sr-only">Akce</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredReservations.map((r) => (
                            <tr key={r.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">{r.customer?.firstName} {r.customer?.lastName}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{r.vehicle?.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(r.startDate).toLocaleDateString('cs-CZ')} - {new Date(r.endDate).toLocaleDateString('cs-CZ')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">{getStatusChip(r.status)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button className="text-primary hover:text-primary-hover p-2" title="Upravit"><Edit className="w-5 h-5"/></button>
                                    <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:text-red-800 p-2" title="Smazat"><Trash2 className="w-5 h-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ManageReservations;