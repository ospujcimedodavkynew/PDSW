import React, { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle, FormEvent } from 'react';
import { getVehicles, getReservations, submitOnlineReservation } from '../services/api';
import type { Reservation, Vehicle, Customer } from '../types';
import { Calendar, Car, User, UploadCloud, Signature, ArrowLeft, Loader, CheckCircle, Info, Maximize, ClipboardList, ChevronDown, Mail } from 'lucide-react';

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
                ctx.strokeStyle = '#111827'; // dark-text
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

const VehicleDetails: React.FC<{vehicle: Vehicle}> = ({ vehicle }) => (
    <div className="bg-gray-50 p-4 mt-2 rounded-md space-y-3 text-sm">
        {vehicle.description && (
            <div className="flex items-start">
                <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-gray-500" />
                <p className="text-gray-700">{vehicle.description}</p>
            </div>
        )}
        {vehicle.dimensions && (
            <div className="flex items-start">
                <Maximize className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-gray-500" />
                <p className="text-gray-700"><strong>Rozměry:</strong> {vehicle.dimensions}</p>
            </div>
        )}
        {vehicle.features && vehicle.features.length > 0 && (
             <div className="flex items-start">
                <ClipboardList className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-gray-500" />
                <p className="text-gray-700"><strong>Výbava:</strong> {vehicle.features.join(', ')}</p>
            </div>
        )}
    </div>
);


const OnlineRentalPortal: React.FC = () => {
    const [step, setStep] = useState(1);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form data states
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [duration, setDuration] = useState<{type: 'hours' | 'days', value: number} | null>(null);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null);
    const [customerData, setCustomerData] = useState<Omit<Customer, 'id' | 'driverLicenseImageUrl'>>({
        firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: ''
    });
    const [driverLicenseFile, setDriverLicenseFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const signaturePadRef = useRef<SignaturePadHandles>(null);
    const [submissionResult, setSubmissionResult] = useState<{contractText: string, customerEmail: string, vehicleName: string} | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [vehData, resData] = await Promise.all([getVehicles(), getReservations()]);
                setVehicles(vehData.filter(v => v.status !== 'maintenance'));
                setReservations(resData);
            } catch (err) {
                setError('Nepodařilo se načíst data. Zkuste prosím obnovit stránku.');
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


    const selectedVehicle = useMemo(() => vehicles.find(v => v.id === selectedVehicleId), [vehicles, selectedVehicleId]);

    const availableVehicles = useMemo(() => {
        if (!startDate || !endDate) return [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return [];

        const conflictingVehicleIds = new Set<string>();
        for (const r of reservations) {
            if (r.status === 'scheduled' || r.status === 'active') {
                const resStart = new Date(r.startDate);
                const resEnd = new Date(r.endDate);
                if (start < resEnd && end > resStart) {
                    conflictingVehicleIds.add(r.vehicleId);
                }
            }
        }
        return vehicles.filter(v => !conflictingVehicleIds.has(v.id));
    }, [vehicles, reservations, startDate, endDate]);

    const totalPrice = useMemo(() => {
        if (!selectedVehicle || !startDate || !endDate) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) return 0;

        const durationHours = (end.getTime() - start.getTime()) / (1000 * 3600);
        
        if (durationHours <= 4) return selectedVehicle.rate4h;
        if (durationHours <= 12) return selectedVehicle.rate12h;
        
        const days = Math.ceil(durationHours / 24);
        return days * selectedVehicle.dailyRate;
    }, [selectedVehicle, startDate, endDate]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setDriverLicenseFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleNextStep = () => setStep(s => s + 1);
    const handlePrevStep = () => setStep(s => s - 1);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!driverLicenseFile) { alert('Prosím, nahrajte fotografii řidičského průkazu.'); return; }
        if (signaturePadRef.current?.isEmpty()) { alert('Prosím, podepište se.'); return; }
        
        setIsSubmitting(true);
        try {
            const result = await submitOnlineReservation(
                { vehicleId: selectedVehicleId, startDate: new Date(startDate), endDate: new Date(endDate), totalPrice },
                customerData,
                driverLicenseFile,
                selectedVehicle!
            );
            
            const { customer, contractText } = result;
            setSubmissionResult({
                contractText,
                customerEmail: customer.email,
                vehicleName: selectedVehicle!.name,
            });
            setStep(4);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Došlo k chybě při odesílání rezervace.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader className="w-12 h-12 text-primary animate-spin" /></div>;
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-600 p-4">{error}</div>;

    const renderStep = () => {
        switch (step) {
            case 1: // Date and Vehicle Selection
                return (
                    <>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center mb-4"><Calendar className="mr-2"/>1. Vyberte termín a vozidlo</h2>
                        
                        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                            <div>
                                <label className="font-semibold block mb-1">Začátek pronájmu</label>
                                <input type="datetime-local" value={startDate} onChange={e => { setStartDate(e.target.value); setSelectedVehicleId(''); }} className="w-full p-2 border rounded" required />
                            </div>
                            <div>
                                <label className="font-semibold block mb-2">Délka pronájmu</label>
                                <div className="flex flex-wrap gap-2 items-center">
                                    <button type="button" onClick={() => handleDurationChange('hours', 4)} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${duration?.type === 'hours' && duration?.value === 4 ? 'bg-primary text-white' : 'bg-white border'}`}>4 hodiny</button>
                                    <button type="button" onClick={() => handleDurationChange('hours', 12)} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${duration?.type === 'hours' && duration?.value === 12 ? 'bg-primary text-white' : 'bg-white border'}`}>12 hodin</button>
                                    <button type="button" onClick={() => handleDurationChange('days', 1)} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${duration?.type === 'days' && duration?.value === 1 ? 'bg-primary text-white' : 'bg-white border'}`}>1 den</button>
                                    <div className={`flex items-center space-x-2 border rounded-lg p-1 transition-colors ${duration?.type === 'days' && duration.value >= 2 ? 'border-primary ring-2 ring-primary/50' : 'border-gray-300'}`}>
                                        <input 
                                            type="number" min="2" max="30" 
                                            value={duration?.type === 'days' && duration.value >= 2 ? duration.value : ''}
                                            placeholder="2+"
                                            onChange={e => {
                                                const days = parseInt(e.target.value, 10);
                                                if (days >= 2 && days <= 30) {
                                                    handleDurationChange('days', days);
                                                }
                                            }}
                                            onFocus={() => {
                                                if (!(duration?.type === 'days' && duration.value >= 2)) {
                                                    handleDurationChange('days', 2);
                                                }
                                            }}
                                            className="w-16 p-1 border-none focus:ring-0 text-center font-semibold"
                                        />
                                        <label className="font-semibold pr-2">dní</label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4">
                            <h3 className="font-semibold mb-2">Dostupná vozidla</h3>
                             <div className="space-y-3">
                                {availableVehicles.map(v => (
                                    <div key={v.id} className={`border-2 rounded-lg p-3 transition-all ${selectedVehicleId === v.id ? 'border-primary shadow-lg' : 'border-gray-200'}`}>
                                        <div onClick={() => setSelectedVehicleId(v.id)} className="flex items-center cursor-pointer">
                                            <img src={v.imageUrl} alt={v.name} className="w-24 h-16 object-cover rounded-md mr-4"/>
                                            <div className="flex-grow">
                                                <h3 className="font-semibold">{v.name}</h3>
                                                <p className="text-sm text-gray-500">{v.dailyRate.toLocaleString('cs-CZ')} Kč/den</p>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedVehicleId === v.id ? 'bg-primary' : 'border'}`}>
                                                {selectedVehicleId === v.id && <CheckCircle className="w-4 h-4 text-white" />}
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => setExpandedVehicleId(expandedVehicleId === v.id ? null : v.id)} className="text-sm text-primary hover:underline mt-2 flex items-center">
                                            {expandedVehicleId === v.id ? 'Skrýt detaily' : 'Zobrazit detaily'}
                                            <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${expandedVehicleId === v.id ? 'rotate-180' : ''}`} />
                                        </button>
                                        {expandedVehicleId === v.id && <VehicleDetails vehicle={v} />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {startDate && endDate && availableVehicles.length === 0 && <p className="text-center text-red-600 p-4">V tomto termínu nejsou dostupná žádná vozidla.</p>}
                        
                        <div className="mt-6 flex justify-end">
                            <button onClick={handleNextStep} disabled={!selectedVehicleId} className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-hover disabled:bg-gray-400">Další</button>
                        </div>
                    </>
                );
            case 2: // Customer Details
                return (
                     <>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center mb-4"><User className="mr-2"/>2. Vaše údaje</h2>
                        <div className="space-y-4">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" placeholder="Jméno" value={customerData.firstName} onChange={e => setCustomerData({...customerData, firstName: e.target.value})} className="w-full p-2 border rounded" required />
                                <input type="text" placeholder="Příjmení" value={customerData.lastName} onChange={e => setCustomerData({...customerData, lastName: e.target.value})} className="w-full p-2 border rounded" required />
                            </div>
                            <input type="email" placeholder="Email" value={customerData.email} onChange={e => setCustomerData({...customerData, email: e.target.value})} className="w-full p-2 border rounded" required />
                            <input type="text" placeholder="Adresa" value={customerData.address} onChange={e => setCustomerData({...customerData, address: e.target.value})} className="w-full p-2 border rounded" required />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="tel" placeholder="Telefon" value={customerData.phone} onChange={e => setCustomerData({...customerData, phone: e.target.value})} className="w-full p-2 border rounded" required />
                                <input type="text" placeholder="Číslo ŘP" value={customerData.driverLicenseNumber} onChange={e => setCustomerData({...customerData, driverLicenseNumber: e.target.value})} className="w-full p-2 border rounded" required />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-between">
                            <button onClick={handlePrevStep} className="bg-gray-200 text-dark-text font-bold py-2 px-6 rounded-lg hover:bg-gray-300">Zpět</button>
                            <button onClick={handleNextStep} type="button" className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-hover">Další</button>
                        </div>
                    </>
                );
             case 3: // Upload & Sign
                return (
                    <>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center mb-4"><UploadCloud className="mr-2"/>3. Doklad a Podpis</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Fotografie řidičského průkazu (přední strana)</label>
                            <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400">
                                {imagePreview ? <img src={imagePreview} alt="Náhled ŘP" className="h-full object-contain"/> : <span className="text-gray-600">Klikněte pro nahrání</span>}
                            </label>
                            <input id="file-upload" type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} required/>
                        </div>
                        <div className="mt-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Váš podpis</label>
                            <SignaturePad ref={signaturePadRef} />
                        </div>
                        <div className="mt-6 flex justify-between">
                            <button onClick={handlePrevStep} className="bg-gray-200 text-dark-text font-bold py-2 px-6 rounded-lg hover:bg-gray-300">Zpět</button>
                            <button type="submit" disabled={isSubmitting} className="bg-secondary text-dark-text font-bold py-2 px-6 rounded-lg hover:bg-secondary-hover disabled:bg-gray-400 flex items-center">
                                {isSubmitting && <Loader className="w-5 h-5 mr-2 animate-spin" />}
                                Dokončit a odeslat
                            </button>
                        </div>
                    </>
                );
             case 4: // Success
                const handleSendEmail = () => {
                    if (!submissionResult) return;
                    const { contractText, customerEmail, vehicleName } = submissionResult;
                    const bccEmail = "smlouvydodavky@gmail.com";
                    const mailtoBody = encodeURIComponent(contractText);
                    const mailtoLink = `mailto:${customerEmail}?bcc=${bccEmail}&subject=${encodeURIComponent(`Potvrzení rezervace a smlouva - ${vehicleName}`)}&body=${mailtoBody}`;
                    window.location.href = mailtoLink;
                };

                return (
                    <div className="text-center py-10">
                        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
                        <h2 className="text-3xl font-bold text-gray-800">Rezervace dokončena!</h2>
                        <p className="mt-2 text-gray-600">Děkujeme, Vaše rezervace byla úspěšně vytvořena. Potvrzení a kopii smlouvy jsme připravili k odeslání.</p>
                        <button
                            onClick={handleSendEmail}
                            className="mt-6 bg-secondary text-dark-text font-bold py-3 px-6 rounded-lg hover:bg-secondary-hover transition-colors text-lg flex items-center justify-center w-full md:w-auto mx-auto"
                        >
                            <Mail className="w-5 h-5 mr-2" />
                            Odeslat smlouvu e-mailem
                        </button>
                        <p className="mt-4 text-sm text-gray-500">Kliknutím na tlačítko se otevře Váš výchozí e-mailový klient s předvyplněnými údaji.</p>
                    </div>
                );
            default: return null;
        }
    }

    return (
        <div className="min-h-screen bg-light-bg flex flex-col items-center justify-center p-4">
             <div className="w-full max-w-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-primary">Online Rezervace Dodávky</h1>
                    <p className="text-medium-text mt-2">Jednoduše, rychle, online.</p>
                </div>
                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl p-6 md:p-8 space-y-6 relative">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
                        <div className="bg-primary h-2.5 rounded-full" style={{ width: `${(step / 3) * 100}%`, transition: 'width 0.3s' }}></div>
                    </div>
                    {renderStep()}
                </form>
            </div>
        </div>
    )
};

export default OnlineRentalPortal;