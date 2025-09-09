// This file was missing its implementation. Provided a full implementation for the customer self-service portal.
import React, { useState, useEffect, useMemo } from 'react';
import { Reservation, Vehicle, Customer } from '../types';
import { getReservationByToken, addCustomer, updateReservationWithCustomerData, uploadFile, updateCustomer } from '../services/api';
import { Car, User, Calendar, CheckCircle, Upload, AlertTriangle } from 'lucide-react';

interface CustomerPortalProps {
    token: string;
}

const CustomerPortal: React.FC<CustomerPortalProps> = ({ token }) => {
    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState(1); // 1: Form, 2: Success

    const [customerData, setCustomerData] = useState<Omit<Customer, 'id' | 'driverLicenseImageUrl'>>({
        firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: ''
    });
    const [driverLicenseFile, setDriverLicenseFile] = useState<File | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchReservation = async () => {
            try {
                const data = await getReservationByToken(token);
                if (data && data.vehicle) {
                    setReservation(data);
                    setVehicle(data.vehicle as Vehicle);
                } else {
                    setError("Odkaz pro rezervaci je neplatný nebo již vypršel.");
                }
            } catch (err) {
                setError("Nastala chyba při načítání vaší rezervace.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchReservation();
    }, [token]);
    
    const totalPrice = useMemo(() => {
        if (!vehicle || !startDate || !endDate) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) return 0;

        const durationHours = (end.getTime() - start.getTime()) / (1000 * 3600);
        
        if (durationHours <= 4) return vehicle.rate4h;
        if (durationHours <= 12) return vehicle.rate12h;
        
        const days = Math.ceil(durationHours / 24);
        return days * vehicle.dailyRate;
    }, [vehicle, startDate, endDate]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setDriverLicenseFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!reservation) return;
        if (!driverLicenseFile) {
            setError("Prosím, nahrajte fotografii vašeho řidičského průkazu.");
            return;
        }
        if (!startDate || !endDate) {
            setError("Prosím, vyberte období pronájmu.");
            return;
        }
        if (new Date(endDate) <= new Date(startDate)) {
            setError("Datum konce musí být po datu začátku.");
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Add customer
            const newCustomer = await addCustomer(customerData);

            // 2. Upload driver's license
            const filePath = `driver_licenses/${newCustomer.id}-${driverLicenseFile.name.replace(/\s/g, '_')}`;
            const { publicUrl } = await uploadFile('licenses', filePath, driverLicenseFile);

            // 3. Update customer with license URL
            await updateCustomer({ ...newCustomer, driverLicenseImageUrl: publicUrl });
            
            // 4. Update reservation
            await updateReservationWithCustomerData(
                reservation.id,
                newCustomer.id,
                new Date(startDate),
                new Date(endDate)
            );
            
            setStep(2); // Move to success screen
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Při odesílání formuláře došlo k chybě.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="flex h-screen w-screen items-center justify-center"><p>Načítání vaší rezervace...</p></div>;
    }

    if (error && !reservation) {
         return (
            <div className="flex h-screen w-screen items-center justify-center bg-red-50 p-4">
                <div className="text-center p-8 bg-white shadow-lg rounded-lg border border-red-200 max-w-lg">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-red-800">Chyba rezervace</h1>
                    <p className="mt-2 text-gray-700">{error}</p>
                </div>
            </div>
        );
    }

    if (step === 2) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-green-50 p-4">
                <div className="text-center p-8 bg-white shadow-lg rounded-lg border border-green-200 max-w-lg">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-green-800">Rezervace potvrzena!</h1>
                    <p className="mt-4 text-gray-700">
                        Děkujeme, <strong>{customerData.firstName} {customerData.lastName}</strong>. Vaše rezervace vozidla <strong>{vehicle?.name}</strong> byla úspěšně vytvořena.
                    </p>
                    <p className="mt-2 text-gray-600">
                        Vyzvednutí je naplánováno na: <strong>{new Date(startDate).toLocaleString('cs-CZ')}</strong>.
                    </p>
                     <p className="mt-6 text-sm text-gray-500">
                        Brzy se vám ozveme s dalšími detaily. Můžete nyní zavřít tuto stránku.
                    </p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-primary">Van Rental Pro</h1>
                    <p className="text-xl text-gray-600 mt-2">Dokončete svou rezervaci</p>
                </header>
                
                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Form */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md space-y-6">
                        <section>
                            <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4"><User className="mr-2"/>Vaše údaje</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="Jméno" value={customerData.firstName} onChange={e => setCustomerData({ ...customerData, firstName: e.target.value })} className="w-full p-2 border rounded" required />
                                <input type="text" placeholder="Příjmení" value={customerData.lastName} onChange={e => setCustomerData({ ...customerData, lastName: e.target.value })} className="w-full p-2 border rounded" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <input type="email" placeholder="Email" value={customerData.email} onChange={e => setCustomerData({ ...customerData, email: e.target.value })} className="w-full p-2 border rounded" required />
                                <input type="tel" placeholder="Telefon" value={customerData.phone} onChange={e => setCustomerData({ ...customerData, phone: e.target.value })} className="w-full p-2 border rounded" required />
                            </div>
                            <div className="mt-4">
                                <input type="text" placeholder="Adresa bydliště" value={customerData.address} onChange={e => setCustomerData({ ...customerData, address: e.target.value })} className="w-full p-2 border rounded" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <input type="text" placeholder="Číslo řidičského průkazu" value={customerData.driverLicenseNumber} onChange={e => setCustomerData({ ...customerData, driverLicenseNumber: e.target.value })} className="w-full p-2 border rounded" required />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                        <Upload className="w-4 h-4 mr-2"/>Foto ŘP (přední strana)
                                    </label>
                                    <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" required />
                                </div>
                            </div>
                        </section>
                        <section>
                            <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4"><Calendar className="mr-2"/>Doba pronájmu</h2>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Od (datum a čas)</label>
                                    <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Do (datum a čas)</label>
                                    <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded" required />
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-lg shadow-md sticky top-6">
                            <h2 className="text-xl font-bold text-gray-800 border-b pb-3 mb-4">Souhrn rezervace</h2>
                             {vehicle && (
                                <div className="space-y-4">
                                    <img src={vehicle.imageUrl} alt={vehicle.name} className="w-full h-40 object-cover rounded-lg"/>
                                    <div>
                                        <h3 className="text-lg font-bold text-primary flex items-center"><Car className="w-5 h-5 mr-2"/>{vehicle.name}</h3>
                                        <p className="text-sm text-gray-500">{vehicle.make} {vehicle.model}</p>
                                    </div>
                                    <div className="border-t pt-4">
                                        <p className="flex justify-between items-baseline text-2xl font-bold">
                                            <span>Celkem:</span>
                                            <span>{totalPrice > 0 ? `${totalPrice.toLocaleString('cs-CZ')} Kč` : '...'}</span>
                                        </p>
                                        <p className="text-xs text-gray-500 text-right">Cena je konečná.</p>
                                    </div>
                                </div>
                             )}
                             <button type="submit" className="w-full mt-6 bg-secondary text-dark-text font-bold py-3 rounded-lg hover:bg-secondary-hover transition-colors text-lg" disabled={isSubmitting}>
                                {isSubmitting ? 'Odesílám...' : 'Potvrdit a odeslat'}
                            </button>
                            {error && <p className="text-red-500 mt-4 text-center text-sm">{error}</p>}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomerPortal;