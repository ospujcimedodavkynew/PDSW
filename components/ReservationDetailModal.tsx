import React, { useState, useEffect, useRef } from 'react';
import type { Reservation } from '../types';
import { X, Car, User, Calendar, ArrowRight, ArrowLeft } from 'lucide-react';
import { activateReservation, completeReservation } from '../services/api';
import SignaturePad from 'react-signature-canvas';

interface ReservationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    reservation: Reservation | null;
}

const ReservationDetailModal: React.FC<ReservationDetailModalProps> = ({ isOpen, onClose, reservation }) => {
    const [view, setView] = useState<'details' | 'activate' | 'complete'>('details');
    const [startMileage, setStartMileage] = useState<number | ''>('');
    const [endMileage, setEndMileage] = useState<number | ''>('');
    const [notes, setNotes] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'invoice'>('cash');
    const [isProcessing, setIsProcessing] = useState(false);
    
    const sigPadRef = useRef<SignaturePad>(null);

    useEffect(() => {
        if (isOpen && reservation) {
            setView('details');
            setStartMileage(reservation.startMileage || '');
            setEndMileage('');
            setNotes(reservation.notes || '');
            sigPadRef.current?.clear();
        }
    }, [isOpen, reservation]);

    const handleActivate = async () => {
        if (startMileage === '' || Number(startMileage) < (reservation?.vehicle?.currentMileage || 0)) {
            alert('Zadejte platný stav kilometrů při předání.');
            return;
        }
        if (sigPadRef.current?.isEmpty()) {
            alert('Je vyžadován podpis přebírajícího.');
            return;
        }
        setIsProcessing(true);
        try {
            const signatureDataUrl = sigPadRef.current!.toDataURL('image/png');
            await activateReservation(reservation!.id, Number(startMileage), signatureDataUrl);
            alert('Vozidlo bylo úspěšně předáno.');
            onClose();
        } catch (error) {
            console.error(error);
            alert('Předání vozidla se nezdařilo.');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleComplete = async () => {
        if (endMileage === '' || Number(endMileage) <= (reservation?.startMileage || 0)) {
            alert('Zadejte platný stav kilometrů při vrácení.');
            return;
        }
        if (sigPadRef.current?.isEmpty()) {
            alert('Je vyžadován podpis vracejícího.');
            return;
        }
        setIsProcessing(true);
        try {
            const signatureDataUrl = sigPadRef.current!.toDataURL('image/png');
            await completeReservation(reservation!.id, Number(endMileage), notes, paymentMethod, signatureDataUrl);
            alert('Rezervace byla úspěšně dokončena.');
            onClose();
        } catch (error) {
            console.error(error);
            alert(`Dokončení rezervace se nezdařilo: ${error instanceof Error ? error.message : "Neznámá chyba."}`);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen || !reservation) return null;

    const renderDetailsView = () => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="font-bold text-lg mb-2 flex items-center"><User className="mr-2"/>Zákazník</h3>
                    <p>{reservation.customer?.firstName} {reservation.customer?.lastName}</p>
                    <p>{reservation.customer?.email}</p>
                    <p>{reservation.customer?.phone}</p>
                    <p>{reservation.customer?.address}</p>
                </div>
                <div>
                    <h3 className="font-bold text-lg mb-2 flex items-center"><Car className="mr-2"/>Vozidlo</h3>
                    <p>{reservation.vehicle?.name}</p>
                    <p>SPZ: {reservation.vehicle?.licensePlate}</p>
                    <p>Aktuální stav km: {reservation.vehicle?.currentMileage?.toLocaleString('cs-CZ')} km</p>
                </div>
            </div>
            <div className="mt-4 border-t pt-4">
                 <h3 className="font-bold text-lg mb-2 flex items-center"><Calendar className="mr-2"/>Detaily rezervace</h3>
                 <p><strong>Od:</strong> {new Date(reservation.startDate).toLocaleString('cs-CZ')}</p>
                 <p><strong>Do:</strong> {new Date(reservation.endDate).toLocaleString('cs-CZ')}</p>
                 <p><strong>Stav:</strong> {reservation.status}</p>
                 {reservation.startMileage && <p><strong>Stav km při předání:</strong> {reservation.startMileage.toLocaleString('cs-CZ')} km</p>}
                 {reservation.endMileage && <p><strong>Stav km při vrácení:</strong> {reservation.endMileage.toLocaleString('cs-CZ')} km</p>}
            </div>
        </>
    );

    const renderActivateView = () => (
        <>
            <button onClick={() => setView('details')} className="absolute top-8 left-8 text-primary hover:underline flex items-center text-sm"><ArrowLeft className="mr-1 w-4 h-4"/>Zpět na detail</button>
            <h3 className="font-bold text-xl mb-4 text-center">Předání vozidla</h3>
            <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Stav kilometrů při předání</label>
                    <input type="number" value={startMileage} onChange={e => setStartMileage(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 border rounded" placeholder={`Minimálně ${reservation.vehicle?.currentMileage}`} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Podpis přebírajícího</label>
                    <div className="border rounded bg-gray-50"><SignaturePad ref={sigPadRef} canvasProps={{ className: 'w-full h-40' }} /></div>
                    <button type="button" onClick={() => sigPadRef.current?.clear()} className="text-sm text-gray-500 hover:underline mt-1">Smazat podpis</button>
                </div>
            </div>
        </>
    );
    
    const renderCompleteView = () => (
        <>
            <button onClick={() => setView('details')} className="absolute top-8 left-8 text-primary hover:underline flex items-center text-sm"><ArrowLeft className="mr-1 w-4 h-4"/>Zpět na detail</button>
            <h3 className="font-bold text-xl mb-4 text-center">Vrácení vozidla</h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Stav kilometrů při vrácení</label>
                    <input type="number" value={endMileage} onChange={e => setEndMileage(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 border rounded" placeholder={`Více než ${reservation.startMileage}`} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Poznámky (stav vozidla, poškození)</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-2 border rounded h-24"></textarea>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Způsob platby</label>
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="w-full p-2 border rounded bg-white">
                        <option value="cash">Hotově</option>
                        <option value="invoice">Na fakturu</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Podpis vracejícího</label>
                    <div className="border rounded bg-gray-50"><SignaturePad ref={sigPadRef} canvasProps={{ className: 'w-full h-40' }} /></div>
                     <button type="button" onClick={() => sigPadRef.current?.clear()} className="text-sm text-gray-500 hover:underline mt-1">Smazat podpis</button>
                </div>
            </div>
        </>
    );

    const getFooter = () => {
        if (view === 'details') {
            switch (reservation.status) {
                case 'scheduled':
                    return <button onClick={() => setView('activate')} className="py-2 px-6 rounded-lg bg-primary text-white font-semibold flex items-center"><ArrowRight className="w-4 h-4 mr-2"/> Vydat vozidlo</button>;
                case 'active':
                    return <button onClick={() => setView('complete')} className="py-2 px-6 rounded-lg bg-yellow-500 text-white font-semibold flex items-center"><ArrowLeft className="w-4 h-4 mr-2"/> Převzít vozidlo</button>;
                default:
                    return null;
            }
        }
        if (view === 'activate') {
            return <button onClick={handleActivate} disabled={isProcessing} className="py-2 px-6 rounded-lg bg-green-600 text-white font-semibold disabled:bg-gray-400">{isProcessing ? 'Zpracovávám...' : 'Potvrdit předání'}</button>;
        }
        if (view === 'complete') {
            return <button onClick={handleComplete} disabled={isProcessing} className="py-2 px-6 rounded-lg bg-green-600 text-white font-semibold disabled:bg-gray-400">{isProcessing ? 'Zpracovávám...' : 'Dokončit rezervaci'}</button>;
        }
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative">
                <div className="p-6 flex justify-between items-center border-b flex-shrink-0">
                    <h2 className="text-2xl font-bold">Detail rezervace</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                <div className="p-8 overflow-y-auto">
                    {view === 'details' && renderDetailsView()}
                    {view === 'activate' && renderActivateView()}
                    {view === 'complete' && renderCompleteView()}
                </div>
                <div className="p-6 border-t flex justify-end items-center space-x-3 flex-shrink-0 bg-gray-50">
                    <button onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zavřít</button>
                    {getFooter()}
                </div>
            </div>
        </div>
    );
};

export default ReservationDetailModal;
