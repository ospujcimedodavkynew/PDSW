import React, { useEffect, useState, FormEvent } from 'react';
import { getVehicles, addVehicle, updateVehicle, getServiceRecordsForVehicle, addServiceRecord, deleteServiceRecord } from '../services/api';
import type { Vehicle, ServiceRecord } from '../types';
import { Car, Wrench, CheckCircle, Plus, X, Gauge, Maximize, ClipboardList, Info, Trash2, Calendar, DollarSign, Loader } from 'lucide-react';

const VehicleCard: React.FC<{ vehicle: Vehicle; onEdit: (vehicle: Vehicle) => void; }> = ({ vehicle, onEdit }) => {
    const statusInfo = {
        available: { text: 'K dispozici', color: 'text-green-600', icon: <CheckCircle className="w-5 h-5" /> },
        rented: { text: 'Pronajato', color: 'text-yellow-600', icon: <Car className="w-5 h-5" /> },
        maintenance: { text: 'V servisu', color: 'text-red-600', icon: <Wrench className="w-5 h-5" /> },
    };

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 flex flex-col">
            <img src={vehicle.imageUrl} alt={vehicle.name} className="w-full h-48 object-cover" />
            <div className="p-4 flex-grow space-y-2">
                <h3 className="text-xl font-bold text-gray-800">{vehicle.name}</h3>
                <p className="text-sm text-gray-500">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
                <p className="text-gray-600 font-semibold mt-2">{vehicle.licensePlate}</p>
                 <div className="flex items-center text-sm text-gray-500">
                    <Gauge className="w-4 h-4 mr-2" />
                    <span>Stav km: {vehicle.currentMileage.toLocaleString('cs-CZ')} km</span>
                </div>
                <div className={`flex items-center font-medium ${statusInfo[vehicle.status].color}`}>
                    {statusInfo[vehicle.status].icon}
                    <span className="ml-2">{statusInfo[vehicle.status].text}</span>
                </div>
                 {vehicle.dimensions && (
                     <div className="flex items-start text-sm text-gray-500 pt-2">
                        <Maximize className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{vehicle.dimensions}</span>
                    </div>
                )}
                 {vehicle.features && vehicle.features.length > 0 && (
                     <div className="flex items-start text-sm text-gray-500">
                        <ClipboardList className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{vehicle.features.join(', ')}</span>
                    </div>
                )}
            </div>
            <div className="p-4 bg-gray-50 border-t">
                 <div className="text-sm space-y-1">
                    <p className="flex justify-between"><span>4 hodiny:</span> <span className="font-bold text-primary">{vehicle.rate4h.toLocaleString('cs-CZ')} Kč</span></p>
                    <p className="flex justify-between"><span>12 hodin:</span> <span className="font-bold text-primary">{vehicle.rate12h.toLocaleString('cs-CZ')} Kč</span></p>
                    <p className="flex justify-between"><span>1+ den:</span> <span className="font-bold text-primary">{vehicle.dailyRate.toLocaleString('cs-CZ')} Kč/den</span></p>
                </div>
                <button onClick={() => onEdit(vehicle)} className="w-full mt-3 bg-primary text-white py-2 rounded-lg hover:bg-primary-hover transition-colors">
                    Upravit
                </button>
            </div>
        </div>
    );
};

const ServiceHistoryTab: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => {
    const [records, setRecords] = useState<ServiceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Form state for new record
    const [newRecord, setNewRecord] = useState({
        description: '',
        cost: '',
        mileage: '',
        serviceDate: new Date().toISOString().split('T')[0],
    });
    const [isAdding, setIsAdding] = useState(false);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const data = await getServiceRecordsForVehicle(vehicle.id);
            setRecords(data);
        } catch (err) {
            setError('Nepodařilo se načíst servisní historii.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, [vehicle.id]);

    const handleAddRecord = async (e: FormEvent) => {
        e.preventDefault();
        if (!newRecord.description || !newRecord.cost) {
            alert('Popis a cena jsou povinné.');
            return;
        }
        setIsAdding(true);
        try {
            await addServiceRecord({
                vehicleId: vehicle.id,
                description: newRecord.description,
                cost: parseFloat(newRecord.cost),
                mileage: parseInt(newRecord.mileage, 10) || vehicle.currentMileage,
                serviceDate: new Date(newRecord.serviceDate),
            }, vehicle.name);
            setNewRecord({ description: '', cost: '', mileage: '', serviceDate: new Date().toISOString().split('T')[0] });
            fetchRecords(); // Refresh the list
        } catch (err) {
            alert('Nepodařilo se přidat záznam.');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteRecord = async (recordId: string) => {
        if (window.confirm('Opravdu si přejete smazat tento servisní záznam? Tato akce je nevratná a nesmaže související finanční výdaj.')) {
            try {
                await deleteServiceRecord(recordId);
                fetchRecords(); // Refresh the list
            } catch (err) {
                alert('Nepodařilo se smazat záznam.');
            }
        }
    };

    return (
        <div className="py-4">
            <form onSubmit={handleAddRecord} className="p-4 bg-gray-50 border rounded-lg space-y-3 mb-6">
                <h3 className="font-bold text-lg">Přidat nový servisní záznam</h3>
                <input
                    type="text"
                    placeholder="Popis úkonu (např. Výměna oleje a filtrů)"
                    value={newRecord.description}
                    onChange={e => setNewRecord({...newRecord, description: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                />
                <div className="grid grid-cols-3 gap-3">
                    <input
                        type="date"
                        value={newRecord.serviceDate}
                        onChange={e => setNewRecord({...newRecord, serviceDate: e.target.value})}
                        className="w-full p-2 border rounded"
                        required
                    />
                    <input
                        type="number"
                        placeholder="Cena v Kč"
                        value={newRecord.cost}
                        onChange={e => setNewRecord({...newRecord, cost: e.target.value})}
                        className="w-full p-2 border rounded"
                        required
                    />
                     <input
                        type="number"
                        placeholder="Stav km"
                        value={newRecord.mileage}
                        onChange={e => setNewRecord({...newRecord, mileage: e.target.value})}
                        className="w-full p-2 border rounded"
                    />
                </div>
                <button type="submit" disabled={isAdding} className="py-2 px-4 rounded-lg bg-secondary text-dark-text hover:bg-secondary-hover disabled:bg-gray-400">
                    {isAdding ? 'Přidávám...' : 'Přidat záznam'}
                </button>
            </form>

            <h3 className="font-bold text-lg mb-4">Historie</h3>
            {isLoading ? <p>Načítání záznamů...</p> : error ? <p className="text-red-500">{error}</p> : (
                <div className="space-y-3">
                    {records.length > 0 ? records.map(record => (
                        <div key={record.id} className="flex justify-between items-center p-3 bg-white border rounded-md">
                            <div className="flex-grow">
                                <p className="font-semibold">{record.description}</p>
                                <div className="flex space-x-4 text-sm text-gray-500 mt-1">
                                    <span className="flex items-center"><Calendar className="w-4 h-4 mr-1.5"/>{new Date(record.serviceDate).toLocaleDateString('cs-CZ')}</span>
                                    <span className="flex items-center"><DollarSign className="w-4 h-4 mr-1.5"/>{record.cost.toLocaleString('cs-CZ')} Kč</span>
                                    <span className="flex items-center"><Gauge className="w-4 h-4 mr-1.5"/>{record.mileage.toLocaleString('cs-CZ')} km</span>
                                </div>
                            </div>
                            <button onClick={() => handleDeleteRecord(record.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-full">
                                <Trash2 className="w-5 h-5"/>
                            </button>
                        </div>
                    )) : <p className="text-gray-500">Pro toto vozidlo neexistují žádné servisní záznamy.</p>}
                </div>
            )}
        </div>
    );
};

const VehicleFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    vehicle: Partial<Vehicle> | null;
}> = ({ isOpen, onClose, onSave, vehicle }) => {
    const getInitialData = (v: Partial<Vehicle> | null): Partial<Vehicle> => v || {
        name: '', make: '', model: '', year: new Date().getFullYear(), licensePlate: '',
        status: 'available', rate4h: 0, rate12h: 0, dailyRate: 0, features: [],
        currentMileage: 0, description: '', dimensions: '',
    };
    
    const [formData, setFormData] = useState<Partial<Vehicle>>(getInitialData(vehicle));
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'service'>('details');


    useEffect(() => {
        if (isOpen) {
            setFormData(getInitialData(vehicle));
            setError(null);
            setActiveTab('details');
        }
    }, [vehicle, isOpen]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSaving(true);
        
        if (!formData.name || !formData.licensePlate) {
            setError("Název a SPZ jsou povinné.");
            setIsSaving(false);
            return;
        }

        try {
            if (formData.id) {
                await updateVehicle(formData as Vehicle);
            } else {
                await addVehicle(formData as Omit<Vehicle, 'id' | 'imageUrl'>);
            }
            onSave();
        } catch (err) {
            console.error("Failed to save vehicle", err);
            setError(err instanceof Error ? err.message : 'Uložení vozidla se nezdařilo');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-2xl font-bold">{vehicle?.id ? `Upravit: ${vehicle.name}` : 'Přidat nové vozidlo'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                
                <div className="border-b border-gray-200 mb-4 flex-shrink-0">
                    <nav className="-mb-px flex space-x-6">
                        <button
                            onClick={() => setActiveTab('details')}
                            className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            Základní údaje
                        </button>
                        <button
                            onClick={() => setActiveTab('service')}
                            disabled={!vehicle?.id}
                            className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'service' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} disabled:text-gray-300 disabled:cursor-not-allowed`}
                        >
                            Servisní historie
                        </button>
                    </nav>
                </div>

                <div className="overflow-y-auto">
                    {activeTab === 'details' ? (
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            {/* Form content for vehicle details */}
                            <input type="text" placeholder="Název (např. Ford Transit L2H2)" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-2 border rounded" required />
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="Značka" value={formData.make || ''} onChange={e => setFormData({ ...formData, make: e.target.value })} className="w-full p-2 border rounded" required />
                                <input type="text" placeholder="Model" value={formData.model || ''} onChange={e => setFormData({ ...formData, model: e.target.value })} className="w-full p-2 border rounded" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="number" placeholder="Rok výroby" value={formData.year || ''} onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) || 0 })} className="w-full p-2 border rounded" required />
                                <input type="text" placeholder="SPZ" value={formData.licensePlate || ''} onChange={e => setFormData({ ...formData, licensePlate: e.target.value })} className="w-full p-2 border rounded" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Aktuální stav kilometrů</label>
                                <input type="number" placeholder="Aktuální stav km" value={formData.currentMileage || 0} onChange={e => setFormData({ ...formData, currentMileage: parseInt(e.target.value) || 0 })} className="w-full p-2 border rounded" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ceny pronájmu</label>
                                <div className="grid grid-cols-3 gap-4">
                                    <input type="number" placeholder="Cena / 4 hod" value={formData.rate4h || 0} onChange={e => setFormData({ ...formData, rate4h: parseInt(e.target.value) || 0 })} className="w-full p-2 border rounded" required />
                                    <input type="number" placeholder="Cena / 12 hod" value={formData.rate12h || 0} onChange={e => setFormData({ ...formData, rate12h: parseInt(e.target.value) || 0 })} className="w-full p-2 border rounded" required />
                                    <input type="number" placeholder="Cena / den (24h+)" value={formData.dailyRate || 0} onChange={e => setFormData({ ...formData, dailyRate: parseInt(e.target.value) || 0 })} className="w-full p-2 border rounded" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Popis vozidla</label>
                                <textarea placeholder="Krátký popis pro zákazníky..." value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full p-2 border rounded h-24" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rozměry nákladového prostoru</label>
                                <input type="text" placeholder="např. D: 3.2m, Š: 1.8m, V: 1.9m" value={formData.dimensions || ''} onChange={e => setFormData({ ...formData, dimensions: e.target.value })} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Výbava (odděleno čárkou)</label>
                                <input type="text" placeholder="např. Klimatizace, Tažné zařízení, Rádio" value={(formData.features || []).join(', ')} onChange={e => setFormData({ ...formData, features: e.target.value.split(',').map(f => f.trim()) })} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Stav vozidla</label>
                                <select value={formData.status || 'available'} onChange={e => setFormData({ ...formData, status: e.target.value as Vehicle['status'] })} className="w-full p-2 border rounded">
                                    <option value="available">K dispozici</option>
                                    <option value="rented">Pronajato</option>
                                    <option value="maintenance">V servisu</option>
                                </select>
                            </div>

                            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">{error}</div>}

                            <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                                <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zrušit</button>
                                <button type="submit" disabled={isSaving} className="py-2 px-4 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:bg-gray-400">
                                    {isSaving ? 'Ukládám...' : 'Uložit změny'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <ServiceHistoryTab vehicle={vehicle as Vehicle} />
                    )}
                </div>
            </div>
        </div>
    );
};

const Vehicles: React.FC = () => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<Partial<Vehicle> | null>(null);

    const fetchVehiclesData = async () => {
        setLoading(true);
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
        fetchVehiclesData();
    }, []);

    const handleOpenModal = (vehicle: Vehicle | null = null) => {
        setSelectedVehicle(vehicle);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedVehicle(null);
    };

    const handleSave = () => {
        handleCloseModal();
        fetchVehiclesData();
    };

    if (loading) return <div className="flex justify-center items-center h-full"><Loader className="w-8 h-8 animate-spin text-primary"/></div>;

    return (
        <div>
            <VehicleFormModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSave} vehicle={selectedVehicle} />
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Vozový park</h1>
                <button onClick={() => handleOpenModal()} className="bg-secondary text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-secondary-hover transition-colors flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Přidat vozidlo
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {vehicles.map(vehicle => (
                    <VehicleCard key={vehicle.id} vehicle={vehicle} onEdit={handleOpenModal} />
                ))}
            </div>
        </div>
    );
};

export default Vehicles;
