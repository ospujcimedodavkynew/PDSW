import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';
import { Reservation } from '../types';
import { activateReservation, completeReservation } from '../services/api';

interface ReservationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    reservation: Reservation | null;
}

const ReservationDetailModal: React.FC<ReservationDetailModalProps> = ({ isOpen, onClose, reservation }) => {
    const [notes, setNotes] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen || !reservation) return null;

    const isDeparture = reservation.status === 'scheduled';
    const isArrival = reservation.status === 'active';

    const handleAction = async () => {
        setIsProcessing(true);
        try {
            if (isDeparture) {
                await activateReservation(reservation.id);
            } else if (isArrival) {
                await completeReservation(reservation.id, notes);
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">
                        {isDeparture && 'Potvrzení o vydání vozidla'}
                        {isArrival && 'Protokol o vrácení vozidla'}
                        {!isDeparture && !isArrival && 'Detail rezervace'}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <h3 className="font-semibold text-gray-500">Zákazník</h3>
                        <p className="text-lg">{reservation.customer?.firstName} {reservation.customer?.lastName}</p>
                         {reservation.customer?.driverLicenseImageUrl && (
                             <a href={reservation.customer.driverLicenseImageUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center mt-1">
                                <FileText className="w-4 h-4 mr-1"/> Zobrazit řidičský průkaz
                            </a>
                        )}
                    </div>
                     <div>
                        <h3 className="font-semibold text-gray-500">Vozidlo</h3>
                        <p className="text-lg">{reservation.vehicle?.name} ({reservation.vehicle?.licensePlate})</p>
                    </div>
                     <div>
                        <h3 className="font-semibold text-gray-500">Období</h3>
                        <p className="text-lg">
                            {reservation.startDate ? new Date(reservation.startDate).toLocaleString('cs-CZ') : 'Není stanoveno'} - {reservation.endDate ? new Date(reservation.endDate).toLocaleString('cs-CZ') : 'Není stanoveno'}
                        </p>
                    </div>

                    {isArrival && (
                         <div>
                            <label htmlFor="notes" className="font-semibold text-gray-500">Poznámky ke stavu vozidla</label>
                            <textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full mt-1 p-2 border rounded-md h-24"
                                placeholder="Např. čistota interiéru, stav nádrže, nové poškození..."
                            />
                        </div>
                    )}
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zrušit</button>
                    {(isDeparture || isArrival) && (
                         <button 
                            onClick={handleAction} 
                            disabled={isProcessing}
                            className={`py-2 px-4 rounded-lg text-white font-semibold ${isDeparture ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'} disabled:bg-gray-400`}
                         >
                            {isProcessing ? 'Zpracovávám...' : (isDeparture ? 'Potvrdit vydání' : 'Potvrdit vrácení')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReservationDetailModal;
