import React, { useEffect, useState } from 'react';
import { getVehicles, addVehicle, updateVehicle } from '../services/api';
import type { Vehicle } from '../types';
import { Plus, Edit, Car, DollarSign, Wrench, X } from 'lucide-react';

// VehicleFormModal is an inline component to handle adding and editing vehicles.
interface VehicleFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    vehicle: Partial<Vehicle> | null;
}

const VehicleFormModal: React.FC<VehicleFormModalProps> = ({ isOpen, onClose, onSaveSuccess, vehicle }) => {
    const getInitialData = (v: Partial<Vehicle> | null): Partial<Vehicle> => v || {
        name: '', make: '', model: '', year: new Date().getFullYear(), licensePlate: '', status: 'available', rate4h: 0, rate12h: 0, dailyRate: 0, features: []
    };

    const [formData, setFormData] = useState<Partial<Vehicle>>(getInitialData(vehicle));
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormData(getInitialData(vehicle));
            setError(null);
        }
    }, [vehicle, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        try {
            if (!formData.name || !formData.licensePlate) {
                throw new Error("Název a SPZ jsou povinné.");
            }
            if (formData.id) {
                await updateVehicle(formData as Vehicle);
            } else {
                await addVehicle(formData as Omit<Vehicle, 'id' | 'imageUrl'>);
            }
            onSaveSuccess();
        } catch (err) {
            console.error("Failed to save vehicle:", err);
            setError(err instanceof Error ? err.message : 'Uložení vozidla se nezdařilo');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleFeatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const features = e.target.value.split(',').map(f => f.trim());
        setFormData({ ...formData, features });
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{vehicle?.id ? 'Upravit vozidlo' : 'Přidat nové vozidlo'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="Název (např. Dodávka L2H2)" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-2 border rounded" required />
                        <input type="text" placeholder="SPZ" value={formData.licensePlate || ''} onChange={e => setFormData({ ...formData, licensePlate: e.target.value })} className="w-full p-2 border rounded" required />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <input type="text" placeholder="Značka" value={formData.make || ''} onChange={e => setFormData({ ...formData, make: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="text" placeholder="Model" value={formData.model || ''} onChange={e => setFormData({ ...formData, model: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="number" placeholder="Rok výroby" value={formData.year || ''} onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })} className="w-full p-2 border rounded" />
                    </div>
                     <div className="grid grid-cols-3 gap-4">
                        <input type="number" placeholder="Cena / 4h" value={formData.rate4h || ''} onChange={e => setFormData({ ...formData, rate4h: parseFloat(e.target.value) })} className="w-full p-2 border rounded" />
                        <input type="number" placeholder="Cena / 12h" value={formData.rate12h || ''} onChange={e => setFormData({ ...formData, rate12h: parseFloat(e.target.value) })} className="w-full p-2 border rounded" />
                        <input type="number" placeholder="Cena / 24h" value={formData.dailyRate || ''} onChange={e => setFormData({ ...formData, dailyRate: parseFloat(e.target.value) })} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as Vehicle['status'] })} className="w-full p-2 border rounded">
                            <option value="available">K dispozici</option>
                            <option value="rented">Pronajato</option>
                            <option value="maintenance">V servisu</option>
                        </select>
                    </div>
                     <div>
                        <input type="text" placeholder="Vlastnosti (oddělené čárkou)" value={formData.features?.join(', ') || ''} onChange={handleFeatureChange} className="w-full p-2 border rounded" />
                    </div>
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}
                    <div className="flex justify-end space-x-3 pt-2">
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


const StatusBadge: React.FC<{ status: Vehicle['status'] }> = ({ status }) => {
    const statusMap = {
        available: { text: 'K dispozici', color: 'bg-green-100 text-green-800', icon: <Car className="w-4 h-4 mr-2" /> },
        rented: { text: 'Pronajato', color: 'bg-yellow-100 text-yellow-800', icon: <DollarSign className="w-4 h-4 mr-2" /> },
        maintenance: { text: 'V servisu', color: 'bg-red-100 text-red-800', icon: <Wrench className="w-4 h-4 mr-2" /> },
    };
    const { text, color, icon } = statusMap[status] || statusMap.available;
    return <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${color}`}>{icon}{text}</div>;
};

const VehicleCard: React.FC<{ vehicle: Vehicle; onEdit: (vehicle: Vehicle) => void }> = ({ vehicle, onEdit }) => {
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
            <img src={vehicle.imageUrl} alt={vehicle.name} className="w-full h-48 object-cover" />
            <div className="p-4 flex-grow flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-800">{vehicle.name}</h3>
                    <StatusBadge status={vehicle.status} />
                </div>
                <p className="text-gray-500 font-semibold">{vehicle.licensePlate}</p>
                <p className="text-sm text-gray-600 mb-4">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
                <div className="mt-auto pt-4 border-t">
                    <div className="flex justify-between text-sm text-gray-700">
                        <span>4h: <strong>{vehicle.rate4h} Kč</strong></span>
                        <span>12h: <strong>{vehicle.rate12h} Kč</strong></span>
                        <span>24h: <strong>{vehicle.dailyRate} Kč</strong></span>
                    </div>
                </div>
                 <button onClick={() => onEdit(vehicle)} className="w-full mt-4 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center">
                    <Edit className="w-4 h-4 mr-2" /> Upravit
                </button>
            </div>
        </div>
    );
};


const Vehicles: React.FC = () => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

    const fetchVehicles = async () => {
        try {
            const data = await getVehicles();
            setVehicles(data);
        } catch (error) {
            console.error("Failed to fetch vehicles:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVehicles();
    }, []);

    const handleOpenModal = (vehicle: Vehicle | null = null) => {
        setSelectedVehicle(vehicle);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedVehicle(null);
    };

    const handleSaveSuccess = () => {
        handleCloseModal();
        fetchVehicles();
    };

    if (loading) return <div>Načítání vozového parku...</div>;

    return (
        <div>
            <VehicleFormModal 
                isOpen={isModalOpen} 
                onClose={handleCloseModal} 
                onSaveSuccess={handleSaveSuccess}
                vehicle={selectedVehicle}
            />
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Vozový park</h1>
                <button onClick={() => handleOpenModal()} className="bg-secondary text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-secondary-hover transition-colors flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Přidat vozidlo
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vehicles.map(vehicle => (
                    <VehicleCard key={vehicle.id} vehicle={vehicle} onEdit={handleOpenModal} />
                ))}
            </div>
        </div>
    );
};

export default Vehicles;
