import React, { useState, useEffect } from 'react';
import { Reservation } from '../types';
import { X, Car, User, Calendar, Hash, FileText, CheckCircle } from 'lucide-react';
import { generateContract, saveContract, updateReservation, updateVehicle } from '../services/api';

interface ReservationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    reservation: Reservation | null;
}

const ReservationDetailModal: React.FC<ReservationDetailModalProps> = ({ isOpen, onClose, reservation }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [contractText, setContractText] = useState<string | null>(null);
    const [startMileage, setStartMileage] = useState<string>('');
    const [endMileage, setEndMileage] = useState<string>('');

    useEffect(() => {
        if (reservation?.vehicle) {
            setStartMileage(reservation.vehicle.currentMileage.toString());
        }
        setContractText(null);
        setEndMileage('');
    }, [reservation]);

    if (!isOpen || !reservation) return null;

    const handleGenerateContract = async () => {
        setIsProcessing(true);
        try {
            const text = await generateContract(reservation);
            setContractText(text);
        } catch (error) {
            alert('Nepodařilo se vygenerovat smlouvu.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleIssueVehicle = async () => {
        if (!contractText) {
            alert('Nejprve musíte vygenerovat smlouvu.');
            return;
        }
        if (!startMileage || parseInt(startMileage) < reservation.vehicle!.currentMileage) {
            alert('Zadejte platný stav kilometrů.');
            return;
        }

        setIsProcessing(true);
        try {
            // Save contract
            await saveContract({
                reservationId: reservation.id,
                customerId: reservation.customerId,
                vehicleId: reservation.vehicleId,
                contractText,
            });

            // Update vehicle status and mileage
            await updateVehicle({ ...reservation.vehicle!, status: 'rented', currentMileage: parseInt(startMileage) });
            
            alert('Vozidlo bylo úspěšně vydáno a smlouva uložena.');
            onClose(); // This will trigger a refresh on the dashboard
        } catch (error) {
            alert('Došlo k chybě při vydávání vozidla.');
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReceiveVehicle = async () => {
        if (!endMileage || parseInt(endMileage) <= reservation.vehicle!.currentMileage) {
            alert('Zadejte platný konečný stav kilometrů.');
            return;
        }
        setIsProcessing(true);
        try {
             // Update vehicle status and mileage
            await updateVehicle({ ...reservation.vehicle!, status: 'available', currentMileage: parseInt(endMileage) });

            // Update reservation status
            await updateReservation({ id: reservation.id, status: 'completed' });
            
            alert('Vozidlo bylo úspěšně převzato.');
            onClose();
        } catch(error) {
            alert('Došlo k chybě při přebírání vozidla.');
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };


    const isDeparture = new Date(reservation.startDate) <= new Date() && reservation.status === 'confirmed';
    const isArrival = new Date(reservation.endDate) <= new Date() && reservation.status === 'confirmed';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-2xl font-bold">Detail rezervace</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                
                <div className="overflow-y-auto">
                    {/* Reservation Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                            <h3 className="font-bold text-lg flex items-center"><Car className="mr-2"/>Vozidlo</h3>
                            <p><strong>{reservation.vehicle?.name}</strong> ({reservation.vehicle?.licensePlate})</p>
                            <p className="text-sm text-gray-600">{reservation.vehicle?.make} {reservation.vehicle?.model}, {reservation.vehicle?.year}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                            <h3 className="font-bold text-lg flex items-center"><User className="mr-2"/>Zákazník</h3>
                            <p><strong>{reservation.customer?.firstName} {reservation.customer?.lastName}</strong></p>
                            <p className="text-sm text-gray-600">{reservation.customer?.email}, {reservation.customer?.phone}</p>
                        </div>
                         <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                            <h3 className="font-bold text-lg flex items-center"><Calendar className="mr-2"/>Termín</h3>
                            <p><strong>Od:</strong> {new Date(reservation.startDate).toLocaleString('cs-CZ')}</p>
                            <p><strong>Do:</strong> {new Date(reservation.endDate).toLocaleString('cs-CZ')}</p>
                        </div>
                         <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                            <h3 className="font-bold text-lg flex items-center"><Hash className="mr-2"/>Číslo rezervace</h3>
                            <p className="font-mono text-sm">{reservation.id}</p>
                        </div>
                    </div>

                    {/* Actions */}
                    {isDeparture && (
                        <div className="border-t pt-4">
                            <h3 className="text-xl font-bold mb-4">Proces vydání vozidla</h3>
                             <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Aktuální stav kilometrů při předání</label>
                                <input 
                                    type="number" 
                                    value={startMileage}
                                    onChange={e => setStartMileage(e.target.value)}
                                    className="w-full md:w-1/2 p-2 border rounded mt-1"
                                />
                            </div>
                            <button onClick={handleGenerateContract} disabled={isProcessing} className="bg-secondary text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-secondary-hover transition-colors flex items-center disabled:bg-gray-300">
                                <FileText className="w-5 h-5 mr-2" />
                                {isProcessing ? 'Generuji...' : '1. Generovat smlouvu'}
                            </button>
                            {contractText && (
                                <div className="mt-4">
                                    <h4 className="font-bold">Náhled smlouvy:</h4>
                                    <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded-md text-sm font-mono border overflow-auto max-h-60 mt-2">
                                        {contractText}
                                    </pre>
                                    <button onClick={handleIssueVehicle} disabled={isProcessing} className="mt-4 bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-hover transition-colors flex items-center disabled:bg-gray-300">
                                        <CheckCircle className="w-5 h-5 mr-2"/>
                                        {isProcessing ? 'Ukládám...' : '2. Potvrdit vydání vozidla'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {isArrival && (
                         <div className="border-t pt-4">
                             <h3 className="text-xl font-bold mb-4">Proces převzetí vozidla</h3>
                              <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Konečný stav kilometrů při vrácení</label>
                                <input
                                    type="number"
                                    value={endMileage}
                                    onChange={e => setEndMileage(e.target.value)}
                                    placeholder={`Předchozí stav: ${reservation.vehicle?.currentMileage.toLocaleString('cs-CZ')} km`}
                                    className="w-full md:w-1/2 p-2 border rounded mt-1"
                                />
                            </div>
                             <button onClick={handleReceiveVehicle} disabled={isProcessing} className="bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors flex items-center disabled:bg-gray-300">
                                <CheckCircle className="w-5 h-5 mr-2"/>
                                {isProcessing ? 'Zpracovávám...' : 'Potvrdit převzetí vozidla'}
                            </button>
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReservationDetailModal;
