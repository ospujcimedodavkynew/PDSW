import React, { useState, useEffect } from 'react';
import type { Vehicle } from '../types';
import { createPendingReservation } from '../services/api';
import { X, Link as LinkIcon, Copy, CheckCircle } from 'lucide-react';

interface SelfServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableVehicles: Vehicle[];
    onLinkGenerated: () => void;
}

const SelfServiceModal: React.FC<SelfServiceModalProps> = ({ isOpen, onClose, availableVehicles, onLinkGenerated }) => {
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Reset state when modal is opened
            setSelectedVehicleId(null);
            setGeneratedLink(null);
            setError(null);
            setIsGenerating(false);
            setIsCopied(false);
        }
    }, [isOpen]);

    const handleGenerateLink = async () => {
        if (!selectedVehicleId) return;

        setIsGenerating(true);
        setError(null);
        try {
            const reservation = await createPendingReservation(selectedVehicleId);
            if (reservation.portalToken) {
                const link = `${window.location.origin}?portal=${reservation.portalToken}`;
                setGeneratedLink(link);
                onLinkGenerated();
            } else {
                throw new Error("Nepodařilo se získat portálový token z rezervace.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Došlo k neznámé chybě.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyToClipboard = () => {
        if (!generatedLink) return;
        navigator.clipboard.writeText(generatedLink).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };
    
    const resetForm = () => {
        setSelectedVehicleId(null);
        setGeneratedLink(null);
        setError(null);
        setIsGenerating(false);
        setIsCopied(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{generatedLink ? 'Odkaz pro zákazníka' : 'Vytvořit samoobslužnou rezervaci'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                
                {generatedLink ? (
                    <div className="text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold">Odkaz byl úspěšně vygenerován!</h3>
                        <p className="text-gray-600 mb-4">Zašlete tento odkaz zákazníkovi, aby mohl vyplnit své údaje a dokončit rezervaci.</p>
                        <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded-md">
                            <LinkIcon className="text-gray-500" />
                            <input type="text" readOnly value={generatedLink} className="w-full bg-transparent outline-none" />
                            <button onClick={handleCopyToClipboard} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-semibold">
                                {isCopied ? 'Zkopírováno!' : 'Kopírovat'}
                            </button>
                        </div>
                         <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={resetForm} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Vytvořit další</button>
                            <button onClick={onClose} className="py-2 px-4 rounded-lg bg-primary text-white hover:bg-primary-hover">Zavřít</button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <p className="text-gray-600 mb-4">Vyberte vozidlo, pro které chcete vytvořit samoobslužný odkaz. Zákazník si pomocí odkazu sám vyplní osobní údaje a nahraje fotografii řidičského průkazu.</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-64 overflow-y-auto p-2 bg-gray-50 rounded-md">
                            {availableVehicles.map(v => (
                                <div key={v.id} onClick={() => setSelectedVehicleId(v.id)} className={`border-2 rounded-lg p-3 cursor-pointer ${selectedVehicleId === v.id ? 'border-primary shadow-lg' : 'border-gray-200 hover:border-blue-300'}`}>
                                    <img src={v.imageUrl} alt={v.name} className="w-full h-24 object-cover rounded-md mb-2"/>
                                    <h3 className="font-semibold text-sm">{v.name}</h3>
                                    <p className="text-xs text-gray-500">{v.licensePlate}</p>
                                </div>
                            ))}
                        </div>
                        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zrušit</button>
                            <button 
                                onClick={handleGenerateLink} 
                                disabled={!selectedVehicleId || isGenerating}
                                className="py-2 px-4 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:bg-gray-400"
                            >
                                {isGenerating ? 'Generuji...' : 'Vygenerovat odkaz'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SelfServiceModal;
