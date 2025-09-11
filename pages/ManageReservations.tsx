import React, { useEffect, useState, useMemo } from 'react';
import { getReservations, deleteReservation } from '../services/api';
// FIX: 'Page' is an enum used as a value, so it cannot be imported with 'import type'.
import { Page, type Reservation } from '../types';
import { Plus, Search, Filter, Trash2 } from 'lucide-react';
import ReservationDetailModal from '../components/ReservationDetailModal';

// Main component for the reservation management page
const ManageReservations: React.FC<{ setCurrentPage: (page: Page) => void }> = ({ setCurrentPage }) => {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch reservations and sort them by start date descending
            const resData = await getReservations();
            setReservations(resData.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
        } catch (error) {
            console.error("Failed to fetch reservation data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredReservations = useMemo(() => {
        return reservations.filter(r => {
            const searchLower = searchTerm.toLowerCase();
            const customerName = `${r.customer?.firstName} ${r.customer?.lastName}`.toLowerCase();
            const vehicleName = r.vehicle?.name.toLowerCase() || '';

            const matchesSearch = customerName.includes(searchLower) || vehicleName.includes(searchLower);
            const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
    }, [reservations, searchTerm, statusFilter]);

    const handleOpenDetailModal = (reservation: Reservation) => {
        setSelectedReservation(reservation);
        setIsDetailModalOpen(true);
    };

    const handleCloseDetailModal = () => {
        setIsDetailModalOpen(false);
        setSelectedReservation(null);
        fetchData(); // Refresh data after modal action
    };
    
    const handleDelete = async (reservationId: string) => {
        if (window.confirm('Opravdu si přejete smazat tuto rezervaci? Tato akce je nevratná a smaže i související smlouvu.')) {
            try {
                await deleteReservation(reservationId);
                // Refresh list by removing the deleted item from state
                setReservations(prev => prev.filter(r => r.id !== reservationId));
            } catch (error) {
                console.error("Failed to delete reservation:", error);
                alert("Smazání rezervace se nezdařilo.");
            }
        }
    };


    const statusStyles: { [key: string]: string } = {
        'scheduled': 'bg-blue-100 text-blue-800',
        'active': 'bg-yellow-100 text-yellow-800',
        'completed': 'bg-green-100 text-green-800',
        'pending-customer': 'bg-gray-100 text-gray-800',
    };
    const statusText: { [key: string]: string } = {
        'scheduled': 'Naplánováno',
        'active': 'Probíhá',
        'completed': 'Dokončeno',
        'pending-customer': 'Čeká na zákazníka',
    };

    if (loading) return <div>Načítání rezervací...</div>;

    return (
        <div>
            <ReservationDetailModal 
                isOpen={isDetailModalOpen}
                onClose={handleCloseDetailModal}
                reservation={selectedReservation}
            />
            
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Správa rezervací</h1>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-52">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" placeholder="Hledat..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 pl-10 border rounded-lg" />
                    </div>
                    <div className="relative w-full md:w-48">
                         <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                         <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full p-2 pl-10 border rounded-lg appearance-none">
                            <option value="all">Všechny stavy</option>
                            <option value="scheduled">Naplánované</option>
                            <option value="active">Probíhající</option>
                            <option value="completed">Dokončené</option>
                            <option value="pending-customer">Čeká na zákazníka</option>
                        </select>
                    </div>
                    <button onClick={() => setCurrentPage(Page.RESERVATIONS)} className="bg-secondary text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-secondary-hover transition-colors flex items-center flex-shrink-0">
                        <Plus className="w-5 h-5 mr-2" /> Nová rezervace
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr className="text-left text-gray-600 uppercase text-sm">
                                <th className="px-5 py-3">Stav</th>
                                <th className="px-5 py-3">Zákazník</th>
                                <th className="px-5 py-3">Vozidlo</th>
                                <th className="px-5 py-3">Od</th>
                                <th className="px-5 py-3">Do</th>
                                <th className="px-5 py-3">Akce</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredReservations.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50">
                                    <td className="px-5 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[r.status]}`}>{statusText[r.status]}</span></td>
                                    <td className="px-5 py-4">{r.customer ? `${r.customer.firstName} ${r.customer.lastName}` : 'N/A'}</td>
                                    <td className="px-5 py-4">{r.vehicle?.name || 'N/A'}</td>
                                    <td className="px-5 py-4 whitespace-nowrap">{new Date(r.startDate).toLocaleString('cs-CZ')}</td>
                                    <td className="px-5 py-4 whitespace-nowrap">{new Date(r.endDate).toLocaleString('cs-CZ')}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center space-x-4">
                                            <button onClick={() => handleOpenDetailModal(r)} className="text-primary hover:text-primary-hover font-semibold">Detail</button>
                                            <button 
                                                onClick={() => handleDelete(r.id)} 
                                                className="text-gray-400 hover:text-red-600"
                                                title="Smazat rezervaci"
                                            >
                                                <Trash2 className="w-5 h-5"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManageReservations;