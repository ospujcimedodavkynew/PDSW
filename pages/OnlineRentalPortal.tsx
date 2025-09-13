import React, { useState, useEffect } from 'react';
import { getVehicles, createPendingReservation } from '../services/api';
import { Vehicle } from '../types';
import { Loader, Mail, Send, CheckCircle } from 'lucide-react';

const OnlineRentalPortal: React.FC = () => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    useEffect(() => {
        const fetchVehicles = async () => {
            setLoading(true);
            try {
                // In a real scenario, we'd filter by availability for a selected date range.
                // For this portal, we'll just show all available vehicles.
                const allVehicles = await getVehicles();
                setVehicles(allVehicles.filter(v => v.status === 'available'));
            } catch (err) {
                setError('Nepodařilo se načíst dostupná vozidla.');
            } finally {
                setLoading(false);
            }
        };
        fetchVehicles();
    }, []);
    
    const handleSelectVehicle = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVehicle || !startDate || !endDate || !customerEmail) {
            alert("Prosím, vyplňte všechna pole.");
            return;
        }
        if (new Date(endDate) <= new Date(startDate)) {
            alert('Datum konce musí být po datu začátku.');
            return;
        }

        setIsSubmitting(true);
        try {
             const reservation = await createPendingReservation(selectedVehicle.id, new Date(startDate), new Date(endDate));
             const link = `${window.location.origin}${window.location.pathname}#/portal?token=${reservation.portalToken}`;
             
            // Here, we simulate sending the link. A real backend would email the customer.
            // For this demo, we assume the backend handles the email and we just show a success message.
            console.log(`Reservation created for ${customerEmail}. Link: ${link}`);
            
            setIsSubmitted(true);
        } catch (err) {
            alert("Došlo k chybě při vytváření vaší poptávky.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-100"><Loader className="w-10 h-10 animate-spin text-primary"/></div>;
    }

    if (error) {
         return <div className="min-h-screen flex items-center justify-center bg-gray-100 text-red-600 font-semibold">{error}</div>;
    }
    
    if (isSubmitted) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 text-center p-4">
                 <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
                <h1 className="text-3xl font-bold text-green-800">Poptávka odeslána!</h1>
                <p className="mt-2 text-lg text-gray-700">Na vámi zadaný email (<span className="font-semibold">{customerEmail}</span>) jsme odeslali odkaz pro dokončení rezervace.</p>
                <p className="mt-1 text-gray-600">Prosím, zkontrolujte si svou e-mailovou schránku.</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-primary">Van Rental Pro</h1>
                    <p className="text-gray-600 mt-2">Rezervujte si dodávku online snadno a rychle</p>
                </header>
                
                {selectedVehicle && (
                    <section className="bg-white p-6 rounded-lg shadow-lg mb-8 sticky top-4 z-10">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Vaše poptávka na <span className="text-primary">{selectedVehicle.name}</span></h2>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Od</label>
                                <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded-md mt-1" required/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Do</label>
                                <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded-md mt-1" required/>
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">Váš email</label>
                                <input type="email" placeholder="vas@email.cz" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="w-full p-2 border rounded-md mt-1" required/>
                            </div>
                            <button type="submit" disabled={isSubmitting} className="w-full bg-secondary text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-secondary-hover transition-colors flex items-center justify-center text-lg disabled:bg-gray-400">
                                <Send className="w-5 h-5 mr-2" />
                                {isSubmitting ? 'Odesílám...' : 'Odeslat poptávku'}
                            </button>
                        </form>
                    </section>
                )}

                <main>
                    <h2 className="text-2xl font-semibold text-gray-700 mb-6">{selectedVehicle ? 'Vyberte si jiné vozidlo' : 'Krok 1: Vyberte si vozidlo'}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {vehicles.map(vehicle => (
                            <div key={vehicle.id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
                                <img src={vehicle.imageUrl} alt={vehicle.name} className="w-full h-48 object-cover"/>
                                <div className="p-4 flex-grow">
                                    <h3 className="text-xl font-bold text-gray-800">{vehicle.name}</h3>
                                    <p className="text-sm text-gray-500">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
                                    {vehicle.description && <p className="text-gray-600 mt-2 text-sm">{vehicle.description}</p>}
                                </div>
                                <div className="p-4 bg-gray-50 border-t">
                                     <div className="text-sm space-y-1 mb-3">
                                        <p className="flex justify-between"><span>4 hodiny:</span> <span className="font-bold text-primary">{vehicle.rate4h.toLocaleString('cs-CZ')} Kč</span></p>
                                        <p className="flex justify-between"><span>12 hodin:</span> <span className="font-bold text-primary">{vehicle.rate12h.toLocaleString('cs-CZ')} Kč</span></p>
                                        <p className="flex justify-between"><span>1+ den:</span> <span className="font-bold text-primary">{vehicle.dailyRate.toLocaleString('cs-CZ')} Kč/den</span></p>
                                    </div>
                                    <button onClick={() => handleSelectVehicle(vehicle)} className="w-full bg-primary text-white py-2 rounded-lg hover:bg-primary-hover transition-colors font-semibold">
                                        Vybrat toto vozidlo
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default OnlineRentalPortal;
