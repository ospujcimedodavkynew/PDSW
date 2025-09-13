import React, { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { X, FileText, Gauge, Car, Camera, Plus, Trash2, Loader, Image as ImageIcon, Edit2 } from 'lucide-react';
import { Reservation, DamageRecord } from '../types';
import { activateReservation, completeReservation, getDamageRecordsForVehicle, addDamageRecord } from '../services/api';

// Reusable SignaturePad Component
interface SignaturePadHandles { getSignature: () => string; clear: () => void; isEmpty: () => boolean; }
const SignaturePad = forwardRef<SignaturePadHandles, { width?: number, height?: number, className?: string }>(({ width = 500, height = 200, className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);
    const getContext = () => canvasRef.current?.getContext('2d');
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            canvas.width = canvas.offsetWidth * ratio;
            canvas.height = canvas.offsetHeight * ratio;
            const ctx = canvas.getContext('2d');
            if(ctx) {
                ctx.scale(ratio, ratio);
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
            }
        }
    }, []);

    const getCoords = (e: React.MouseEvent | React.TouchEvent): { x: number, y: number } => {
        const canvas = canvasRef.current; if (!canvas) return { x: 0, y: 0 }; const rect = canvas.getBoundingClientRect();
        if ('touches' in e.nativeEvent) { return { x: e.nativeEvent.touches[0].clientX - rect.left, y: e.nativeEvent.touches[0].clientY - rect.top }; }
        return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
    }
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => { const ctx = getContext(); if (ctx) { const { x, y } = getCoords(e); ctx.beginPath(); ctx.moveTo(x, y); setIsDrawing(true); setIsEmpty(false); } };
    const draw = (e: React.MouseEvent | React.TouchEvent) => { if (!isDrawing) return; const ctx = getContext(); if (ctx) { const { x, y } = getCoords(e); ctx.lineTo(x, y); ctx.stroke(); } };
    const stopDrawing = () => { const ctx = getContext(); if (ctx) { ctx.closePath(); setIsDrawing(false); } };
    const clear = () => { const ctx = getContext(); const canvas = canvasRef.current; if (ctx && canvas) { ctx.clearRect(0, 0, canvas.width, canvas.height); setIsEmpty(true); } };
    useImperativeHandle(ref, () => ({ getSignature: () => { if (isEmpty || !canvasRef.current) return ''; return canvasRef.current.toDataURL('image/png'); }, clear, isEmpty: () => isEmpty, }));
    return (<canvas ref={canvasRef} className={className || "w-full h-32 border border-gray-300 rounded-md bg-white cursor-crosshair"} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />);
});


// Signature Capture Modal for iPad-friendly signing
const SignatureCaptureModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: (signatureDataUrl: string) => void; }> = ({ isOpen, onClose, onConfirm }) => {
    const signaturePadRef = useRef<SignaturePadHandles>(null);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
            onConfirm(signaturePadRef.current.getSignature());
        } else {
            alert("Podpis je prázdný.");
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full h-full max-w-4xl max-h-[80vh] flex flex-col">
                <div className="p-4 border-b flex-shrink-0">
                    <h3 className="font-bold text-xl text-center">Podpis zákazníka</h3>
                </div>
                <div className="flex-grow p-4 relative">
                    <SignaturePad ref={signaturePadRef} className="w-full h-full bg-gray-50 border rounded-md" />
                </div>
                <div className="p-4 flex justify-between items-center border-t flex-shrink-0">
                    <button onClick={() => signaturePadRef.current?.clear()} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Vymazat</button>
                    <div>
                        <button onClick={onClose} className="py-2 px-4 mr-2 rounded-lg bg-gray-200 hover:bg-gray-300">Zrušit</button>
                        <button onClick={handleConfirm} className="py-2 px-6 rounded-lg bg-primary text-white font-semibold">Potvrdit podpis</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Vehicle Condition Component
const VehicleCondition: React.FC<{ reservation: Reservation; onNewDamage: (record: DamageRecord) => void; damageRecords: DamageRecord[] }> = ({ reservation, onNewDamage, damageRecords }) => {
    const [showDamageModal, setShowDamageModal] = useState(false);
    const [newDamageCoords, setNewDamageCoords] = useState<{ x: number; y: number } | null>(null);
    const [newDamageDesc, setNewDamageDesc] = useState('');
    const [newDamagePhoto, setNewDamagePhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isAddingDamage, setIsAddingDamage] = useState(false);

    const handleDiagramClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setNewDamageCoords({ x, y });
        setShowDamageModal(true);
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setNewDamagePhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveDamage = async () => {
        if (!newDamageDesc || !newDamageCoords || !reservation) return;
        setIsAddingDamage(true);
        try {
            const record = await addDamageRecord({
                vehicleId: reservation.vehicleId,
                reservationId: reservation.id,
                description: newDamageDesc,
                locationX: newDamageCoords.x,
                locationY: newDamageCoords.y,
            }, newDamagePhoto);
            onNewDamage(record);
            closeDamageModal();
        } catch (error) {
            alert('Nepodařilo se uložit záznam o poškození.');
        } finally {
            setIsAddingDamage(false);
        }
    };
    
    const closeDamageModal = () => {
        setShowDamageModal(false);
        setNewDamageCoords(null);
        setNewDamageDesc('');
        setNewDamagePhoto(null);
        setPhotoPreview(null);
    };

    return (
        <div className="mt-4">
            <h3 className="font-semibold text-gray-500 mb-2">Stav vozidla a evidence poškození</h3>
            <div onClick={handleDiagramClick} className="relative w-full max-w-md mx-auto aspect-[4/3] bg-gray-100 rounded border-2 border-dashed cursor-crosshair flex items-center justify-center">
                <Car size={100} className="text-gray-300" />
                <p className="absolute text-gray-400 font-semibold">Klikněte pro označení poškození</p>
                {damageRecords.map(d => (
                    <div key={d.id} className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 group" style={{ left: `${d.locationX}%`, top: `${d.locationY}%` }}>
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-black text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            <p className="font-bold">{d.description}</p>
                            {d.photoUrl && <img src={d.photoUrl} alt="Poškození" className="mt-1 rounded"/>}
                            <small>Zaznamenáno: {new Date(d.reportedAt).toLocaleDateString()}</small>
                        </div>
                    </div>
                ))}
            </div>
            {/* Modal for adding new damage */}
            {showDamageModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                        <h3 className="font-bold text-lg mb-4">Přidat záznam o poškození</h3>
                        <textarea value={newDamageDesc} onChange={e => setNewDamageDesc(e.target.value)} placeholder="Popis (např. škrábanec 5cm)" className="w-full p-2 border rounded h-20 mb-3" />
                        <label htmlFor="damage-photo" className="w-full p-3 border-2 border-dashed rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-50">
                            {photoPreview ? <img src={photoPreview} className="h-16 object-contain"/> : <><Camera className="w-5 h-5 mr-2" /> Přidat fotku</>}
                        </label>
                        <input id="damage-photo" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                        <div className="flex justify-end space-x-2 mt-4">
                            <button onClick={closeDamageModal} className="py-2 px-4 rounded bg-gray-200">Zrušit</button>
                            <button onClick={handleSaveDamage} disabled={isAddingDamage} className="py-2 px-4 rounded bg-primary text-white disabled:bg-gray-400">
                                {isAddingDamage ? 'Ukládám...' : 'Uložit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// Main Modal Component
const ReservationDetailModal: React.FC<{ isOpen: boolean; onClose: () => void; reservation: Reservation | null; }> = ({ isOpen, onClose, reservation }) => {
    const [notes, setNotes] = useState('');
    const [startMileage, setStartMileage] = useState<string>('');
    const [endMileage, setEndMileage] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'invoice'>('cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'protocol' | 'condition'>('protocol');
    const [damageRecords, setDamageRecords] = useState<DamageRecord[]>([]);

    useEffect(() => {
        if (isOpen && reservation) {
            setStartMileage(reservation.status === 'scheduled' ? String(reservation.vehicle?.currentMileage ?? '') : String(reservation.startMileage ?? ''));
            setEndMileage(reservation.status === 'active' ? String(reservation.vehicle?.currentMileage ?? '') : String(reservation.endMileage ?? ''));
            setNotes(reservation.notes || '');
            setPaymentMethod(reservation.paymentMethod || 'cash');
            setSignatureDataUrl(null);
            setActiveTab('protocol');

            const fetchDamage = async () => {
                if(reservation.vehicleId) {
                    const records = await getDamageRecordsForVehicle(reservation.vehicleId);
                    setDamageRecords(records);
                }
            };
            fetchDamage();
        }
    }, [isOpen, reservation]);

    const isArrival = reservation?.status === 'active';
    const isDeparture = reservation?.status === 'scheduled';
    
    const calculations = useMemo(() => {
        if (!isArrival || !reservation) return { extraCharge: 0 };
        const endKm = Number(endMileage) || 0;
        const kmDriven = endKm > (reservation.startMileage || 0) ? endKm - (reservation.startMileage || 0) : 0;
        const durationMs = new Date(reservation.endDate).getTime() - new Date(reservation.startDate).getTime();
        const rentalDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));
        const kmLimit = rentalDays * 300;
        const kmOver = Math.max(0, kmDriven - kmLimit);
        return { extraCharge: kmOver * 3 };
    }, [reservation, endMileage, isArrival]);

    if (!isOpen || !reservation) return null;
    if (!reservation.customer || !reservation.vehicle) {
        return <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"><div className="bg-white rounded-lg p-8">Chyba: Neúplná data rezervace.</div></div>;
    }

    const handleAction = async () => {
        if (!signatureDataUrl) {
            alert('Protokol musí být podepsán zákazníkem.'); return;
        }
        
        setIsProcessing(true);
        try {
            if (isDeparture) {
                if (!startMileage || Number(startMileage) < (reservation.vehicle?.currentMileage ?? 0)) {
                    alert('Zadejte platný stav tachometru.'); setIsProcessing(false); return;
                }
                await activateReservation(reservation.id, Number(startMileage), signatureDataUrl);
            } else if (isArrival) {
                 if (!endMileage || Number(endMileage) <= (reservation.startMileage ?? 0)) {
                    alert('Konečný stav tachometru musí být větší než počáteční.'); setIsProcessing(false); return;
                }
                await completeReservation(reservation.id, Number(endMileage), notes, paymentMethod, signatureDataUrl);
            }
            onClose();
        } catch (error) {
            console.error("Failed to update reservation status", error);
            alert("Došlo k chybě při aktualizaci rezervace.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    return (
        <>
        <SignatureCaptureModal
            isOpen={isSignatureModalOpen}
            onClose={() => setIsSignatureModalOpen(false)}
            onConfirm={(dataUrl) => {
                setSignatureDataUrl(dataUrl);
                setIsSignatureModalOpen(false);
            }}
        />
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
                <div className="p-6 flex justify-between items-center border-b">
                    <h2 className="text-2xl font-bold">
                        {isDeparture && 'Předávací Protokol'}
                        {isArrival && 'Protokol o Vrácení'}
                        {!isDeparture && !isArrival && 'Detail Rezervace'}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>

                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-6 px-6">
                        <button onClick={() => setActiveTab('protocol')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'protocol' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Protokol</button>
                        <button onClick={() => setActiveTab('condition')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'condition' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Stav Vozidla</button>
                    </nav>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-4">
                    {activeTab === 'protocol' && (
                        <>
                           <div><h3 className="font-semibold text-gray-500">Zákazník</h3><p className="text-lg">{reservation.customer.firstName} {reservation.customer.lastName}</p></div>
                           <div><h3 className="font-semibold text-gray-500">Vozidlo</h3><p className="text-lg">{reservation.vehicle.name} ({reservation.vehicle.licensePlate})</p></div>
                           {isDeparture && (<div><label htmlFor="startMileage" className="font-semibold text-gray-500 flex items-center"><Gauge className="w-4 h-4 mr-2" />Stav tachometru při vydání</label><input id="startMileage" type="number" value={startMileage} onChange={(e) => setStartMileage(e.target.value)} className="w-full mt-1 p-2 border rounded-md" required /></div>)}
                           {isArrival && (
                                <div className="space-y-4">
                                    <div><h3 className="font-semibold text-gray-500">Stav tachometru</h3><div className="grid grid-cols-2 gap-4"><div className="bg-gray-100 p-2 rounded"><label className="text-xs text-gray-600">Při odjezdu</label><p className="font-bold">{reservation.startMileage?.toLocaleString('cs-CZ') ?? 'N/A'} km</p></div><div><label htmlFor="endMileage" className="text-xs text-gray-600">Při návratu</label><input id="endMileage" type="number" value={endMileage} onChange={(e) => setEndMileage(e.target.value)} className="w-full p-2 border rounded-md" required/></div></div></div>
                                    {calculations.extraCharge > 0 && <div className="bg-blue-50 p-3 rounded-lg"><p className="flex justify-between text-red-600"><span>Poplatek za km navíc:</span> <span className="font-bold">{calculations.extraCharge.toLocaleString('cs-CZ')} Kč</span></p></div>}
                                    <div><label htmlFor="notes" className="font-semibold text-gray-500">Poznámky</label><textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full mt-1 p-2 border rounded-md h-20" placeholder="Stav nádrže, nové poškození..."/></div>
                                    <div><label className="font-semibold text-gray-500">Způsob platby</label><div className="mt-2 flex space-x-4"><label className="flex items-center"><input type="radio" name="paymentMethod" value="cash" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} className="h-4 w-4 text-primary" /><span className="ml-2">Hotově</span></label><label className="flex items-center"><input type="radio" name="paymentMethod" value="invoice" checked={paymentMethod === 'invoice'} onChange={() => setPaymentMethod('invoice')} className="h-4 w-4 text-primary" /><span className="ml-2">Fakturace</span></label></div></div>
                                </div>
                            )}
                            {(isDeparture || isArrival) && (
                                <div>
                                    <label className="font-semibold text-gray-500 mb-2 block">Podpis zákazníka</label>
                                    {signatureDataUrl ? (
                                        <div className="p-2 border rounded-md bg-gray-50 text-center">
                                            <img src={signatureDataUrl} alt="Podpis" className="mx-auto h-24 object-contain" />
                                            <button onClick={() => setIsSignatureModalOpen(true)} className="text-sm mt-2 text-primary hover:underline">Změnit podpis</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setIsSignatureModalOpen(true)} className="w-full py-3 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 border-2 border-dashed flex items-center justify-center">
                                            <Edit2 className="w-5 h-5 mr-2" />
                                            Připravit k podpisu
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                    {activeTab === 'condition' && (
                        <VehicleCondition 
                            reservation={reservation} 
                            damageRecords={damageRecords}
                            onNewDamage={(newRecord) => setDamageRecords(prev => [newRecord, ...prev])}
                        />
                    )}
                </div>
                <div className="p-6 mt-auto border-t flex justify-end space-x-3">
                    <button onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zrušit</button>
                    {(isDeparture || isArrival) && (
                         <button onClick={handleAction} disabled={isProcessing || !signatureDataUrl} className={`py-2 px-6 rounded-lg text-white font-semibold ${isDeparture ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'} disabled:bg-gray-400 disabled:cursor-not-allowed`}>
                            {isProcessing ? 'Zpracovávám...' : (isDeparture ? 'Potvrdit a Vydat' : 'Potvrdit a Převzít')}
                        </button>
                    )}
                </div>
            </div>
        </div>
        </>
    );
};

export default ReservationDetailModal;