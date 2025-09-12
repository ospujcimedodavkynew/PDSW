import React, { useEffect, useState, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { getVehicles, getCustomers, getReservations, addCustomer, addReservation, addContract } from '../services/api';
// FIX: 'Page' is an enum used as a value, so it cannot be imported with 'import type'.
import { Page } from '../types';
import type { Reservation, Vehicle, Customer } from '../types';
import { UserPlus, Car, Calendar as CalendarIcon, Signature, Loader, Send, Clock } from 'lucide-react';

// Signature Pad Component
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
                className="w-full h-40 border border-gray-300 rounded-md bg-white cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
            />
            <button type="button" onClick={clear} className="text-sm mt-2 text-primary hover:underline">
                Vymazat podpis
            </button>
        </div>
    );
});


const Reservations: React.FC<{ setCurrentPage: (page: Page) => void }> = ({ setCurrentPage }) => {
    // Data states
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [isNewCustomer, setIsNewCustomer] = useState(false);
    const [newCustomerData, setNewCustomerData] = useState<Omit<Customer, 'id'>>({ firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: '' });
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [duration, setDuration] = useState<{type: 'hours' | 'days', value: number} | null>(null);
    const signaturePadRef = useRef<SignaturePadHandles>(null);

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [resData, custData, vehData] = await Promise.all([getReservations(), getCustomers(), getVehicles()]);
                setReservations(resData);
                setCustomers(custData);
                setVehicles(vehData);
            } catch (error) {
                console.error("Failed to fetch data:", error);
                alert("Nepodařilo se načíst potřebná data.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleDurationChange = (type: 'hours' | 'days', value: number) => {
        if (isNaN(value) || value <= 0) {
             setDuration(null);
             return;
        }
        setDuration({ type, value });
        setSelectedVehicleId(''); // Reset vehicle choice on duration change
    };
    
    useEffect(() => {
        if (!startDate || !duration) {
            setEndDate('');
            return;
        }
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
             setEndDate('');
             return;
        }
        let end;
        if (duration.type === 'hours') {
            end = new Date(start.getTime() + duration.value * 60 * 60 * 1000);
        } else { // type is 'days'
            end = new Date(start.getTime() + duration.value * 24 * 60 * 60 * 1000);
        }
        const pad = (num: number) => num.toString().padStart(2, '0');
        const formattedEnd = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
        setEndDate(formattedEnd);
    }, [startDate, duration]);


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
        return vehicles.filter(v => v.status === 'available' && !conflictingVehicleIds.has(v.id));
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
    
    const resetForm = () => {
        setSelectedCustomerId('');
        setIsNewCustomer(false);
        setNewCustomerData({ firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: '' });
        setSelectedVehicleId('');
        setStartDate('');
        setEndDate('');
        setDuration(null);
        signaturePadRef.current?.clear();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isNewCustomer && !selectedCustomerId) { alert("Vyberte prosím zákazníka."); return; }
        if (isNewCustomer && (!newCustomerData.firstName || !newCustomerData.lastName || !newCustomerData.email)) { alert("Vyplňte prosím údaje o novém zákazníkovi."); return; }
        if (!selectedVehicleId) { alert("Vyberte prosím vozidlo."); return; }
        if (!startDate || !endDate) { alert("Vyberte prosím období pronájmu."); return; }
        if (new Date(endDate) <= new Date(startDate)) { alert("Datum konce musí být po datu začátku."); return; }
        if (signaturePadRef.current?.isEmpty()) { alert("Zákazník se musí podepsat."); return; }
        if (!availableVehicles.some(v => v.id === selectedVehicleId)) { alert("Vybrané vozidlo není v tomto termínu dostupné."); return; }

        try {
            setIsSubmitting(true);
            let customerForContract: Customer | undefined;
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

            const contractText = `SMLOUVA O NÁJMU DOPRAVNÍHO PROSTŘEDKU\n=========================================\n\nČlánek I. - Smluvní strany\n-----------------------------------------\nPronajímatel:\nMilan Gula\nGhegova 17, Brno, 60200\nWeb: Pujcimedodavky.cz\nIČO: 07031653\n(dále jen "pronajímatel")\n\nNájemce:\nJméno: ${customerForContract.firstName} ${customerForContract.lastName}\nEmail: ${customerForContract.email}\nTelefon: ${customerForContract.phone}\nČíslo ŘP: ${customerForContract.driverLicenseNumber}\nAdresa: ${customerForContract.address}\n(dále jen "nájemce")\n\nČlánek II. - Předmět nájmu\n-----------------------------------------\nPronajímatel tímto přenechává nájemci do dočasného užívání následující motorové vozidlo:\nVozidlo: ${selectedVehicle?.name}\nSPZ: ${selectedVehicle?.licensePlate}\nRok výroby: ${selectedVehicle?.year}\n\nČlánek III. - Doba nájmu a cena\n-----------------------------------------\nDoba nájmu: od ${new Date(startDate).toLocaleString('cs-CZ')} do ${new Date(endDate).toLocaleString('cs-CZ')}\nCelková cena nájmu: ${totalPrice.toLocaleString('cs-CZ')} Kč\n\nČlánek IV. - Práva a povinnosti\n-----------------------------------------\n1. Nájemce potvrzuje, že vozidlo převzal v řádném technickém stavu, bez zjevných závad a s kompletní povinnou výbavou.\n2. Nájemce je povinen užívat vozidlo s péčí řádného hospodáře a chránit ho před poškozením, ztrátou či zničením.\n\nČlánek V. - Spoluúčast a poškození vozidla\n-----------------------------------------\nV případě poškození vozidla zaviněného nájemcem se sjednává spoluúčast ve výši 5.000 Kč až 10.000 Kč dle rozsahu poškození.\n\nČlánek VI. - Stav kilometrů a limit\n-----------------------------------------\nPočáteční stav kilometrů: ${(selectedVehicle?.currentMileage ?? 0).toLocaleString('cs-CZ')} km\nDenní limit pro nájezd je 300 km. Za každý kilometr nad tento limit bude účtován poplatek 3 Kč/km.\n\nČlánek VII. - Závěrečná ustanovení\n-----------------------------------------\nTato smlouva je vyhotovena elektronicky. Nájemce svým digitálním podpisem stvrzuje, že se seznámil s obsahem smlouvy, souhlasí s ním a vozidlo v uvedeném stavu přebírá.`;
            
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
            resetForm();
            setCurrentPage(Page.MANAGE_RESERVATIONS);
            
        } catch (error) {
            alert(`Chyba při vytváření rezervace: ${error instanceof Error ? error.message : "Neznámá chyba"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-full"><Loader className="w-8 h-8 animate-spin text-primary"/></div>;

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Nová rezervace</h1>
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg space-y-8">
                {/* Customer Section */}
                <section>
                    <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4 border-b pb-2"><UserPlus className="mr-3 text-primary"/>Krok 1: Zákazník</h2>
                    <div className="flex items-center space-x-4">
                        <select value={selectedCustomerId} onChange={(e) => { setSelectedCustomerId(e.target.value); setIsNewCustomer(false); }} className="w-full p-2 border rounded-md" disabled={isNewCustomer}>
                            <option value="">Vyberte stávajícího zákazníka</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</option>)}
                        </select>
                         <button type="button" onClick={() => { setIsNewCustomer(!isNewCustomer); setSelectedCustomerId(''); }} className={`py-2 px-4 rounded-md font-semibold whitespace-nowrap ${isNewCustomer ? 'bg-primary text-white' : 'bg-gray-200'}`}>Nový zákazník</button>
                    </div>
                    {isNewCustomer && (
                         <div className="mt-4 space-y-3 p-4 bg-gray-50 rounded-md border">
                            <h3 className="font-semibold text-gray-600">Údaje nového zákazníka</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="Jméno" value={newCustomerData.firstName} onChange={e => setNewCustomerData({...newCustomerData, firstName: e.target.value})} className="w-full p-2 border rounded" required={isNewCustomer} />
                                <input type="text" placeholder="Příjmení" value={newCustomerData.lastName} onChange={e => setNewCustomerData({...newCustomerData, lastName: e.target.value})} className="w-full p-2 border rounded" required={isNewCustomer} />
                            </div>
                            <input type="email" placeholder="Email" value={newCustomerData.email} onChange={e => setNewCustomerData({...newCustomerData, email: e.target.value})} className="w-full p-2 border rounded" required={isNewCustomer} />
                            <input type="text" placeholder="Adresa" value={newCustomerData.address} onChange={e => setNewCustomerData({...newCustomerData, address: e.target.value})} className="w-full p-2 border rounded" required={isNewCustomer} />
                            <div className="grid grid-cols-2 gap-4">
                                 <input type="tel" placeholder="Telefon" value={newCustomerData.phone} onChange={e => setNewCustomerData({...newCustomerData, phone: e.target.value})} className="w-full p-2 border rounded" required={isNewCustomer} />
                                <input type="text" placeholder="Číslo ŘP" value={newCustomerData.driverLicenseNumber} onChange={e => setNewCustomerData({...newCustomerData, driverLicenseNumber: e.target.value})} className="w-full p-2 border rounded" required={isNewCustomer} />
                            </div>
                        </div>
                    )}
                </section>
                 {/* Date & Time Section */}
                <section>
                    <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4 border-b pb-2"><CalendarIcon className="mr-3 text-primary"/>Krok 2: Doba pronájmu</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Začátek pronájmu</label>
                            <input type="datetime-local" value={startDate} onChange={e => { setStartDate(e.target.value); setSelectedVehicleId(''); }} className="w-full p-2 border rounded" required />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Délka pronájmu</label>
                            <div className="flex flex-wrap gap-2 items-center">
                                <button type="button" onClick={() => handleDurationChange('hours', 4)} className={`px-3 py-2 text-sm rounded-lg font-semibold transition-colors ${duration?.type === 'hours' && duration?.value === 4 ? 'bg-primary text-white' : 'bg-white border'}`}>4 hod</button>
                                <button type="button" onClick={() => handleDurationChange('hours', 12)} className={`px-3 py-2 text-sm rounded-lg font-semibold transition-colors ${duration?.type === 'hours' && duration?.value === 12 ? 'bg-primary text-white' : 'bg-white border'}`}>12 hod</button>
                                <button type="button" onClick={() => handleDurationChange('days', 1)} className={`px-3 py-2 text-sm rounded-lg font-semibold transition-colors ${duration?.type === 'days' && duration?.value === 1 ? 'bg-primary text-white' : 'bg-white border'}`}>1 den</button>
                                <div className={`flex items-center space-x-2 border rounded-lg p-1 transition-colors ${duration?.type === 'days' && duration.value >= 2 ? 'border-primary ring-2 ring-primary/50' : 'border-gray-300'}`}>
                                    <input 
                                        type="number" min="2" max="30" 
                                        value={duration?.type === 'days' && duration.value >= 2 ? duration.value : ''}
                                        placeholder="2+"
                                        onChange={e => {
                                            const days = parseInt(e.target.value, 10);
                                            if (days >= 2 && days <= 30) handleDurationChange('days', days);
                                        }}
                                        onFocus={() => { if (!(duration?.type === 'days' && duration.value >= 2)) handleDurationChange('days', 2); }}
                                        className="w-16 p-1 border-none focus:ring-0 text-center font-semibold"
                                    />
                                    <label className="font-semibold pr-2 text-sm">dní</label>
                                </div>
                            </div>
                        </div>
                    </div>
                     {endDate && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center">
                           <Clock className="w-5 h-5 mr-3 text-blue-600"/>
                           <p className="text-sm text-blue-800">
                                Konec pronájmu: <span className="font-bold">{new Date(endDate).toLocaleString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                           </p>
                        </div>
                    )}
                </section>
                {/* Vehicle Section */}
                 <section>
                    <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4 border-b pb-2"><Car className="mr-3 text-primary"/>Krok 3: Výběr vozidla</h2>
                    {!startDate || !endDate ? <p className="text-gray-500 p-4 bg-gray-100 rounded-md">Nejprve vyberte dobu pronájmu pro zobrazení dostupných vozidel.</p> :
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {availableVehicles.length > 0 ? availableVehicles.map(v => (
                                <div key={v.id} onClick={() => setSelectedVehicleId(v.id)} className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${selectedVehicleId === v.id ? 'border-primary shadow-lg scale-105' : 'border-gray-200 hover:border-blue-300'}`}>
                                    <img src={v.imageUrl} alt={v.name} className="w-full h-28 object-cover rounded-md mb-2"/>
                                    <h3 className="font-semibold text-gray-800">{v.name}</h3>
                                    <p className="text-sm text-gray-700 font-bold">{v.dailyRate.toLocaleString('cs-CZ')} Kč/den</p>
                                </div>
                            )) : <p className="col-span-full text-center text-red-600 p-4 bg-red-50 rounded-md">V tomto termínu nejsou dostupná žádná vozidla.</p>}
                        </div>
                    }
                </section>
                {/* Signature Section */}
                <section>
                     <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4 border-b pb-2"><Signature className="mr-3 text-primary"/>Krok 4: Podpis a dokončení</h2>
                     <div className="grid md:grid-cols-2 gap-8 items-start">
                         <div>
                            <h3 className="font-semibold text-gray-600 mb-2">Podpis zákazníka</h3>
                            <SignaturePad ref={signaturePadRef} />
                         </div>
                         <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="font-semibold text-gray-800 mb-3">Rekapitulace</h3>
                             <div className="space-y-2 text-sm">
                                <p className="flex justify-between"><span>Vozidlo:</span> <span className="font-bold text-right">{selectedVehicle?.name || 'Nevybráno'}</span></p>
                                <p className="flex justify-between"><span>SPZ:</span> <span className="font-bold">{selectedVehicle?.licensePlate || '-'}</span></p>
                                <p className="flex justify-between border-t pt-2 mt-2"><span>Cena celkem:</span> <span className="text-lg font-bold text-primary">{totalPrice.toLocaleString('cs-CZ')} Kč</span></p>
                            </div>
                         </div>
                     </div>
                </section>
                 <div className="flex justify-end pt-6 border-t">
                    <button type="submit" className="py-3 px-8 rounded-lg bg-secondary text-dark-text font-bold hover:bg-secondary-hover text-lg flex items-center" disabled={isSubmitting}>
                        {isSubmitting ? <><Loader className="w-5 h-5 mr-2 animate-spin"/> Zpracovávám...</> : <><Send className="w-5 h-5 mr-2"/> Vytvořit rezervaci a odeslat</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Reservations;