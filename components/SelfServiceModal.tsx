import React, { useState } from 'react';
import { X, Mail, Send } from 'lucide-react';
import { Vehicle } from '../types';
import { createPendingReservation } from '../services/api';

interface SelfServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableVehicles: Vehicle[];
    onLinkGenerated: () => void;
}

const SelfServiceModal: React.FC<SelfServiceModalProps> = ({ isOpen, onClose, availableVehicles, onLinkGenerated }) => {
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [customerEmail, setCustomerEmail] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);

    const resetAndClose = () => {
        setSelectedVehicleId('');
        setCustomerEmail('');
        setIsProcessing(false);
        onClose();
    };

    const handleGenerateAndSend = async () => {
        if (!selectedVehicleId) {
            alert('Vyberte prosím vozidlo.');
            return;
        }
        if (!customerEmail || !customerEmail.includes('@')) {
            alert('Zadejte prosím platný e-mail zákazníka.');
            return;
        }

        setIsProcessing(true);
        try {
            const reservation = await createPendingReservation(selectedVehicleId);
            const selectedVehicle = availableVehicles.find(v => v.id === selectedVehicleId);
            const link = `${window.location.origin}${window.location.pathname}?portal=${reservation.portalToken}`;
            
            const subject = encodeURIComponent(`Dokončení rezervace vozidla: ${selectedVehicle?.name}`);
            const body = encodeURIComponent(
`Dobrý den,

děkujeme za Váš zájem o pronájem vozidla ${selectedVehicle?.name}.

Pro dokončení rezervace prosím klikněte na následující odkaz a vyplňte požadované údaje:
${link}

Tento odkaz je unikátní a platný pouze pro Vaši rezervaci.

S pozdravem,
Tým PujcimeDodavky.cz`
            );

            // Open email client
            window.location.href = `mailto:${customerEmail}?subject=${subject}&body=${body}`;

            onLinkGenerated();
            alert("Odkaz byl úspěšně vygenerován. Nyní budete přesměrováni do Vašeho e-mailového klienta pro odeslání.");
            resetAndClose();

        } catch (error) {
            console.error('Failed to generate and send link', error);
            alert('Nepodařilo se vygenerovat odkaz.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Samoobslužná rezervace</h2>
                    <button onClick={resetAndClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>

                <div className="space-y-4">
                    <p className="text-gray-600">
                        Vygenerujte a zašlete zákazníkovi odkaz, pomocí kterého sám vyplní své údaje a nahraje potřebné doklady pro dokončení rezervace.
                    </p>
                    <div>
                        <label htmlFor="vehicle-select" className="block text-sm font-medium text-gray-700 mb-1">1. Vyberte vozidlo</label>
                        <select
                            id="vehicle-select"
                            value={selectedVehicleId}
                            onChange={(e) => setSelectedVehicleId(e.target.value)}
                            className="w-full p-3 border rounded-md bg-white"
                        >
                            <option value="">-- Které vozidlo si zákazník přeje? --</option>
                            {availableVehicles.map(v => (
                                <option key={v.id} value={v.id}>{v.name} ({v.licensePlate})</option>
                            ))}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="customer-email" className="block text-sm font-medium text-gray-700 mb-1">2. Zadejte e-mail zákazníka</label>
                         <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                id="customer-email"
                                type="email"
                                value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)}
                                placeholder="např. jan.novak@email.cz"
                                className="w-full p-3 pl-10 border rounded-md"
                            />
                        </div>
                    </div>
                </div>
                
                <div className="mt-8 flex justify-end space-x-3">
                    <button onClick={resetAndClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">
                        Zrušit
                    </button>
                    <button
                        onClick={handleGenerateAndSend}
                        disabled={isProcessing || !selectedVehicleId || !customerEmail}
                        className="py-2 px-6 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover disabled:bg-gray-400 flex items-center"
                    >
                        <Send className="w-4 h-4 mr-2" />
                        {isProcessing ? 'Generuji...' : 'Vygenerovat a odeslat'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SelfServiceModal;
