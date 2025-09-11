import React, { useEffect, useState, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { getVehicles, getCustomers, getReservations, addCustomer, addReservation, addContract } from '../services/api';
import type { Reservation, Vehicle, Customer } from '../types';
import { UserPlus, Car, Calendar as CalendarIcon, Signature, Plus, X, Search, Filter } from 'lucide-react';
import ReservationDetailModal from '../components/ReservationDetailModal';

// Signature Pad Component - used inside the modal
interface SignaturePadHandles {
    getSignature: () => string;
    clear: () => void;
    isEmpty: () => boolean;
}

const SignaturePad = forwardRef<SignaturePadHandles>((props, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);

    const getContext = () => canvasRef.current?.getContext('2d');

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = getContext();
            if (ctx) {
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
            }
        }
    }, []);
    
    const getCoords = (e: React.MouseEvent | React.TouchEvent): { x: number, y: number } => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e.nativeEvent) {
             return { x: e.nativeEvent.touches[0].clientX - rect.left, y: e.nativeEvent.touches[0].clientY - rect.top };
        }
        return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
    }

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const ctx = getContext();
        if (ctx) {
            const { x, y } = getCoords(e);
            ctx.beginPath();
            ctx.moveTo(x, y);
            setIsDrawing(true);
            setIsEmpty(false);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const ctx = getContext();
        if (ctx) {
            const { x, y } = getCoords(e);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        const ctx = getContext();
        if (ctx) {
            ctx.closePath();
            setIsDrawing(false);
        }
    };

    const clear = () => {
        const ctx = getContext();
        const canvas = canvasRef.current;
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setIsEmpty(true);
        }
    };

    useImperativeHandle(ref, () => ({
        getSignature: () => {
            if (isEmpty || !canvasRef.current) return '';
            return canvasRef.current.toDataURL('image/png');
        },
        clear,
        isEmpty: () => isEmpty,
    }));

    return (
        <div>
            <canvas
                ref={canvasRef}
                width="400"
                height="150"
                className="border border-gray-400 rounded-md bg-white cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
            />
            <button type="button" onClick={clear} className="text-sm mt-2 text-blue-600 hover:underline">
                Vymazat podpis
            </button>
        </div>
    );
});

// Modal for creating a new reservation
const ReservationFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    customers: Customer[];
    vehicles: Vehicle[];
    reservations: Reservation[];
}> = ({ isOpen, onClose, onSave, customers, vehicles, reservations }) => {
    const [loading, setLoading] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [isNewCustomer, setIsNewCustomer] = useState(false);
    const [newCustomerData, setNewCustomerData] = useState<Omit<Customer, 'id'>>({ firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: '' });
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const signaturePadRef = useRef<SignaturePadHandles>(null);

    useEffect(() => {
        if (!isOpen) {
             setSelectedCustomerId('');
             setIsNewCustomer(false);
             setNewCustomerData({ firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: '' });
             setSelectedVehicleId('');
             setStartDate('');
             setEndDate('');
             signaturePadRef.current?.clear();
        }
    }, [isOpen]);

    const availableVehicles = useMemo(() => {
        if (!startDate || !endDate) return [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) return [];
        const conflictingVehicleIds = new Set(
            reservations
                .filter(r => r.status === 'scheduled' || r.status === 'active')
                .filter(r => start < new Date(r.endDate) && end > new Date(r.startDate))
                .map(r => r.vehicleId)
        );
        return vehicles.filter(v => v.status !== 'maintenance' && !conflictingVehicleIds.has(v.id));
    }, [vehicles, reservations, startDate, endDate]);

    const selectedVehicle = useMemo(() => vehicles.find(v => v.id === selectedVehicleId), [vehicles, selectedVehicleId]);
    const totalPrice = useMemo(() => {
        if (!selectedVehicle || !startDate || !endDate) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) return 0;
        const durationHours = (end.getTime() - start.getTime()) / (1000 * 3600);
        if (durationHours <= 4) return selectedVehicle.rate4h;
        if (durationHours <= 12) return selectedVehicle.rate12h;
        return Math.ceil(durationHours / 24) * selectedVehicle.dailyRate;
    }, [selectedVehicle, startDate, endDate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let customerForContract: Customer | undefined;
        
        if (!isNewCustomer && !selectedCustomerId) { alert("Vyberte prosím zákazníka."); return; }
        if (isNewCustomer && (!newCustomerData.firstName || !newCustomerData.lastName || !newCustomerData.email)) { alert("Vyplňte prosím údaje o novém zákazníkovi."); return; }
        if (!selectedVehicleId) { alert("Vyberte prosím vozidlo."); return; }
        if (!startDate || !endDate) { alert("Vyberte prosím období pronájmu."); return; }
        if (new Date(endDate) <= new Date(startDate)) { alert("Datum konce musí být po datu začátku."); return; }
        if (signaturePadRef.current?.isEmpty()) { alert("Zákazník se musí podepsat."); return; }
        if (!availableVehicles.some(v => v.id === selectedVehicleId)) {
            alert("Vybrané vozidlo není v tomto termínu dostupné.");
            return;
        }

        try {
            setLoading(true);
            let finalCustomerId = selectedCustomerId;

            if (isNewCustomer) {
                const newCustomer = await addCustomer(newCustomerData);
                finalCustomerId = newCustomer.id;
                customerForContract = newCustomer;
            } else {
                 customerForContract = customers.find(c => c.id === finalCustomerId);
            }

            if (!customerForContract) throw new Error("Nepodařilo se nalézt data zákazníka.");

            const newReservation = await addReservation({
                customerId: finalCustomerId,
                vehicleId: selectedVehicleId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
            });

            const contractText = `SMLOUVA O NÁJMU DOPRAVNÍHO PROSTŘEDKU\n=========================================\n\nČlánek I. - Smluvní strany\n-----------------------------------------\nPronajímatel:\nMilan Gula\nGhegova 17, Brno, 60200\nWeb: Pujcimedodavky.cz\nIČO: 07031653\n(dále jen "pronajímatel")\n\nNájemce:\nJméno: ${customerForContract.firstName} ${customerForContract.lastName}\nEmail: ${customerForContract.email}\nTelefon: ${customerForContract.phone}\nČíslo ŘP: ${customerForContract.driverLicenseNumber}\n(dále jen "nájemce")\n\nČlánek II. - Předmět nájmu\n-----------------------------------------\nPronajímatel tímto přenechává nájemci do dočasného užívání následující motorové vozidlo:\nVozidlo: ${selectedVehicle?.name}\nSPZ: ${selectedVehicle?.licensePlate}\nRok výroby: ${selectedVehicle?.year}\n\nČlánek III. - Doba nájmu a cena\n-----------------------------------------\nDoba nájmu: od ${new Date(startDate).toLocaleString('cs-CZ')} do ${new Date(endDate).toLocaleString('cs-CZ')}\nCelková cena nájmu: ${totalPrice.toLocaleString('cs-CZ')} Kč\n\nČlánek IV. - Práva a povinnosti\n-----------------------------------------\n1. Nájemce potvrzuje, že vozidlo převzal v řádném technickém stavu, bez zjevných závad a s kompletní povinnou výbavou.\n2. Nájemce je povinen užívat vozidlo s péčí řádného hospodáře a chránit ho před poškozením, ztrátou či zničením.\n\nČlánek V. - Spoluúčast a poškození vozidla\n-----------------------------------------\nV případě poškození vozidla zaviněného nájemcem se sjednává spoluúčast ve výši 5.000 Kč až 10.000 Kč dle rozsahu poškození.\n\nČlánek VI. - Stav kilometrů a limit\n-----------------------------------------\nPočáteční stav kilometrů: ${(selectedVehicle?.currentMileage ?? 0).toLocaleString('cs-CZ')} km\nDenní limit pro nájezd je 300 km. Za každý kilometr nad tento limit bude účtován poplatek 3 Kč/km.\n\nČlánek VII. - Závěrečná ustanovení\n-----------------------------------------\nTato smlouva je vyhotovena elektronicky. Nájemce svým digitálním podpisem stvrzuje, že se seznámil s obsahem smlouvy, souhlasí s ním a vozidlo v uvedeném stavu přebírá.`;
            
            await addContract({
                reservationId: newReservation.id,
                customerId: finalCustomerId,
                vehicleId: selectedVehicleId,
                generatedAt: new Date(),
                contractText: contractText
            });

            const bccEmail = "smlouvydodavky@gmail.com";
            const mailtoBody = encodeURIComponent(contractText);
            const mailtoLink = `mailto:${customerForContract.email}?bcc=${bccEmail}&subject=${encodeURIComponent(`Smlouva o pronájmu vozidla ${selectedVehicle?.name}`)}&body=${mailtoBody}`;
            
            window.location.href = mailtoLink;
            alert("Rezervace byla úspěšně vytvořena a smlouva uložena!");
            onSave();
        } catch (error) {
            console.error("Failed to create reservation:", error);
            alert(`Chyba při vytváření rezervace: ${error instanceof Error ? error.message : "Neznámá chyba"}`);
        } finally {
            setLoading(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-4xl max-h-[95vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b pb-3 flex-shrink-0">
                    <h2 className="text-2xl font-bold">Nová rezervace</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto space-y-6 pr-2">
                    {/* Customer Section */}
                    <section>
                        <h3 className="text-lg font-semibold text-gray-700 flex items-center mb-3"><UserPlus className="mr-2"/>1. Zákazník</h3>
                        <div className="flex items-center space-x-4">
                            <select value={selectedCustomerId} onChange={(e) => { setSelectedCustomerId(e.target.value); setIsNewCustomer(false); }} className="w-full p-2 border rounded-md" disabled={isNewCustomer}>
                                <option value="">Vyberte stávajícího zákazníka</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</option>)}
                            </select>
                             <button type="button" onClick={() => { setIsNewCustomer(!isNewCustomer); setSelectedCustomerId(''); }} className={`py-2 px-4 rounded-md font-semibold whitespace-nowrap ${isNewCustomer ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Nový</button>
                        </div>
                        {isNewCustomer && (
                             <div className="mt-4 space-y-2 p-4 border-t">
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" placeholder="Jméno" value={newCustomerData.firstName} onChange={e => setNewCustomerData({...newCustomerData, firstName: e.target.value})} className="w-full p-2 border rounded" required />
                                    <input type="text" placeholder="Příjmení" value={newCustomerData.lastName} onChange={e => setNewCustomerData({...newCustomerData, lastName: e.target.value})} className="w-full p-2 border rounded" required />
                                </div>
                                <input type="email" placeholder="Email" value={newCustomerData.email} onChange={e => setNewCustomerData({...newCustomerData, email: e.target.value})} className="w-full p-2 border rounded" required />
                                <input type="text" placeholder="Adresa" value={newCustomerData.address} onChange={e => setNewCustomerData({...newCustomerData, address: e.target.value})} className="w-full p-2 border rounded" required />
                                <div className="grid grid-cols-2 gap-4">
                                     <input type="tel" placeholder="Telefon" value={newCustomerData.phone} onChange={e => setNewCustomerData({...newCustomerData, phone: e.target.value})} className="w-full p-2 border rounded" required />
                                    <input type="text" placeholder="Číslo ŘP" value={newCustomerData.driverLicenseNumber} onChange={e => setNewCustomerData({...newCustomerData, driverLicenseNumber: e.target.value})} className="w-full p-2 border rounded" required />
                                </div>
                            </div>
                        )}
                    </section>
                     {/* Date & Time Section */}
                    <section>
                        <h3 className="text-lg font-semibold text-gray-700 flex items-center mb-3"><CalendarIcon className="mr-2"/>2. Doba pronájmu</h3>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                           <input type="datetime-local" value={startDate} onChange={e => { setSelectedVehicleId(''); setStartDate(e.target.value); }} className="w-full p-2 border rounded" required />
                           <input type="datetime-local" value={endDate} onChange={e => { setSelectedVehicleId(''); setEndDate(e.target.value); }} className="w-full p-2 border rounded" required />
                        </div>
                    </section>
                    {/* Vehicle Section */}
                     <section>
                        <h3 className="text-lg font-semibold text-gray-700 flex items-center mb-3"><Car className="mr-2"/>3. Vozidlo</h3>
                        {!startDate || !endDate ? <p className="text-gray-500">Vyberte dobu pronájmu pro zobrazení dostupných vozidel.</p> :
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {availableVehicles.map(v => (
                                    <div key={v.id} onClick={() => setSelectedVehicleId(v.id)} className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${selectedVehicleId === v.id ? 'border-primary shadow-lg scale-105' : 'border-gray-200 hover:border-blue-300'}`}>
                                        <img src={v.imageUrl} alt={v.name} className="w-full h-24 object-cover rounded-md mb-2"/>
                                        <h3 className="font-semibold">{v.name}</h3>
                                        <p className="text-sm text-gray-700 font-bold">{v.dailyRate.toLocaleString('cs-CZ')} Kč/den</p>
                                    </div>
                                ))}
                            </div>
                        }
                    </section>
                    {/* Signature Section */}
                    <section>
                         <h3 className="text-lg font-semibold text-gray-700 flex items-center mb-3"><Signature className="mr-2"/>4. Podpis zákazníka</h3>
                         <SignaturePad ref={signaturePadRef} />
                    </section>
                     <div className="flex justify-end space-x-3 pt-4 border-t flex-shrink-0">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zrušit</button>
                        <button type="submit" className="py-2 px-6 rounded-lg bg-secondary text-dark-text font-bold hover:bg-secondary-hover" disabled={loading}>
                            {loading ? 'Zpracovávám...' : 'Vytvořit rezervaci'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Main component for the reservation management page
const Reservations: React.FC = () => {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resData, custData, vehData] = await Promise.all([getReservations(), getCustomers(), getVehicles()]);
            setReservations(resData.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
            setCustomers(custData);
            setVehicles(vehData);
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
            <ReservationFormModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={() => { setIsCreateModalOpen(false); fetchData(); }}
                customers={customers}
                vehicles={vehicles}
                reservations={reservations}
            />
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
                        </select>
                    </div>
                    <button onClick={() => setIsCreateModalOpen(true)} className="bg-secondary text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-secondary-hover transition-colors flex items-center flex-shrink-0">
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
                                    <td className="px-5 py-4"><button onClick={() => handleOpenDetailModal(r)} className="text-primary hover:text-primary-hover font-semibold">Detail</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Reservations;