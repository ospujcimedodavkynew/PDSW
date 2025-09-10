import React, { useState } from 'react';
import { X, Clipboard, Check } from 'lucide-react';
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
    const [generatedLink, setGeneratedLink] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleGenerateLink = async () => {
        if (!selectedVehicleId) {
            alert('Vyberte prosím vozidlo.');
            return;
        }
        setIsProcessing(true);
        try {
            const reservation = await createPendingReservation(selectedVehicleId);
            const link = `${window.location.origin}${window.location.pathname}?portal=${reservation.portalToken}`;
            setGeneratedLink(link);
            onLinkGenerated();
        } catch (error) {
            console.error('Failed to generate link', error);
            alert('Nepodařilo se vygenerovat odkaz.');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const resetAndClose = () => {
        setSelectedVehicleId('');
        setGeneratedLink('');
        setIsProcessing(false);
        onClose();
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Vytvořit samoobslužnou rezervaci</h2>
                    <button onClick={resetAndClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>

                {!generatedLink ? (
                    <div>
                        <p className="mb-4 text-gray-600">Vyberte vozidlo pro které chcete vytvořit odkaz. Tento odkaz zašlete zákazníkovi, aby mohl vyplnit své údaje a nahrát doklady.</p>
                        <select
                            value={selectedVehicleId}
                            onChange={(e) => setSelectedVehicleId(e.target.value)}
                            className="w-full p-3 border rounded-md mb-6"
                        >
                            <option value="">-- Vyberte vozidlo --</option>
                            {availableVehicles.map(v => (
                                <option key={v.id} value={v.id}>{v.name} ({v.licensePlate})</option>
                            ))}
                        </select>
                        <div className="flex justify-end">
                            <button
                                onClick={handleGenerateLink}
                                disabled={isProcessing || !selectedVehicleId}
                                className="py-2 px-6 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover disabled:bg-gray-400"
                            >
                                {isProcessing ? 'Generuji...' : 'Vygenerovat odkaz'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <p className="text-gray-600 mb-2">Odkaz pro zákazníka byl úspěšně vygenerován:</p>
                        <div className="flex items-center space-x-2">
                             <input type="text" readOnly value={generatedLink} className="w-full p-2 border rounded-md bg-gray-100" />
                             <button onClick={handleCopyToClipboard} className="p-2 bg-gray-200 rounded-md hover:bg-gray-300">
                                {copied ? <Check className="w-5 h-5 text-green-600"/> : <Clipboard className="w-5 h-5"/>}
                             </button>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Zašlete tento odkaz zákazníkovi. Po vyplnění se rezervace objeví na nástěnce.</p>
                         <div className="flex justify-end mt-6">
                             <button onClick={resetAndClose} className="py-2 px-6 rounded-lg bg-gray-200 hover:bg-gray-300">Zavřít</button>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SelfServiceModal;
