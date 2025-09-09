import React, { useState, useEffect } from 'react';
import type { Vehicle } from '../types';
import { createPendingReservation } from '../services/api';
import { X, Mail } from 'lucide-react';

interface SelfServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableVehicles: Vehicle[];
    onLinkGenerated: () => void;
}

const SelfServiceModal: React.FC<SelfServiceModalProps> = ({ isOpen, onClose, availableVehicles, onLinkGenerated }) => {
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
    const [customerEmail, setCustomerEmail] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedVehicleId(null);
            setCustomerEmail('');
            setError(null);
            setIsGenerating(false);
        }
    }, [isOpen]);

    const handleGenerateAndSend = async () => {
        if (!selectedVehicleId) {
            setError("Nejprve vyberte vozidlo.");
            return;
        }
        if (!customerEmail || !customerEmail.includes('@')) {
            setError("Zadejte prosím platnou emailovou adresu.");
            return;
        }

        setIsGenerating(true);
        setError(null);
        try {
            const reservation = await createPendingReservation(selectedVehicleId);
            const vehicle = availableVehicles.find(v => v.id === selectedVehicleId);
            
            if (reservation.portalToken) {
                const link = `${window.location.origin}?portal=${reservation.portalToken}`;
                
                const subject = `Dokončení rezervace vozidla ${vehicle?.name || ''}`;
                const body = `Dobrý den,\n\npro dokončení vaší rezervace vozidla ${vehicle?.name || ''} klikněte prosím na následující odkaz a vyplňte požadované údaje:\n\n${link}\n\nDěkujeme,\nVáš tým Van Rental Pro`;

                const mailtoLink = `mailto:${customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                
                window.location.href = mailtoLink;
                
                onLinkGenerated(); // Refresh dashboard
                onClose(); // Close modal
            } else {
                throw new Error("Nepodařilo se získat portálový token z rezervace.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Došlo k neznámé chybě.");
        } finally {
            setIsGenerating(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Vytvořit samoobslužnou rezervaci</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                
                <div>
                    <p className="text-gray-600 mb-4"><b>Krok 1:</b> Vyberte vozidlo, pro které chcete vytvořit samoobslužný odkaz.</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-64 overflow-y-auto p-2 bg-gray-50 rounded-md">
                        {availableVehicles.map(v => (
                            <div key={v.id} onClick={() => setSelectedVehicleId(v.id)} className={`border-2 rounded-lg p-3 cursor-pointer ${selectedVehicleId === v.id ? 'border-primary shadow-lg' : 'border-gray-200 hover:border-blue-300'}`}>
                                <img src={v.imageUrl} alt={v.name} className="w-full h-24 object-cover rounded-md mb-2"/>
                                <h3 className="font-semibold text-sm">{v.name}</h3>
                                <p className="text-xs text-gray-500">{v.licensePlate}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6">
                        <label htmlFor="customer-email" className="block text-gray-600 mb-2"><b>Krok 2:</b> Zadejte email zákazníka pro odeslání odkazu.</label>
                         <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                            <input
                                id="customer-email"
                                type="email"
                                value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)}
                                placeholder="email@zakaznika.cz"
                                className="w-full p-3 pl-10 border rounded-md"
                            />
                        </div>
                    </div>

                    {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
                    
                    <div className="mt-6 flex justify-end space-x-3">
                        <button onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zrušit</button>
                        <button 
                            onClick={handleGenerateAndSend} 
                            disabled={!selectedVehicleId || !customerEmail || isGenerating}
                            className="py-2 px-4 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:bg-gray-400 flex items-center"
                        >
                            <Mail className="w-4 h-4 mr-2" />
                            {isGenerating ? 'Generuji...' : 'Vygenerovat a odeslat emailem'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SelfServiceModal;