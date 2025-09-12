import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { getVehicles, submitOnlineReservation, fetchCompanyFromAres } from '../services/api';
import { Vehicle, Customer, Reservation } from '../types';
import { Loader, ArrowRight, ArrowLeft, CheckCircle, Search } from 'lucide-react';

const OnlineRentalPortal: React.FC = () => {
    const [step, setStep] = useState(1);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);

    // Step 1: Date selection
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Step 2: Vehicle selection
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [totalPrice, setTotalPrice] = useState(0);

    // Step 3: Customer details
    const [customerData, setCustomerData] = useState<Omit<Customer, 'id' | 'driverLicenseImageUrl'>>({
        firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: '',
        companyName: '', companyId: '', vatId: ''
    });
    const [driverLicenseFile, setDriverLicenseFile] = useState<File | null>(null);
    const [isCompany, setIsCompany] = useState(false);
    const [aresLoading, setAresLoading] = useState(false);
    const [aresError, setAresError] = useState('');

    // Step 4: Confirmation
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionResult, setSubmissionResult] = useState<{ reservation: Reservation; customer: Customer; contractText: string } | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const vehicleData = await getVehicles();
                setVehicles(vehicleData.filter(v => v.status === 'available'));
            } catch (err) {
                setError('Nepodařilo se načíst dostupná vozidla. Zkuste to prosím později.');
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    const availableVehicles = useMemo(() => {
        // In a real app, this would check against existing reservations for the selected dates.
        // For this implementation, we assume all 'available' vehicles are bookable.
        return vehicles;
    }, [vehicles, startDate, endDate]);
    
    const handleDateSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!startDate || !endDate || new Date(endDate) <= new Date(startDate)) {
            alert('Zadejte prosím platný termín pronájmu.');
            return;
        }
        setStep(2);
    };

    const handleVehicleSelect = (vehicle: Vehicle) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const durationHours = (end.getTime() - start.getTime()) / (1000 * 3600);
        let price = 0;
        if (durationHours <= 4) price = vehicle.rate4h;
        else if (durationHours <= 12) price = vehicle.rate12h;
        else price = Math.ceil(durationHours / 24) * vehicle.dailyRate;

        setSelectedVehicle(vehicle);
        setTotalPrice(price);
        setStep(3);
    };

    const handleAresSearch = async () => {
        if (!customerData.companyId) return;
        setAresLoading(true);
        setAresError('');
        try {
            const companyInfo = await fetchCompanyFromAres(customerData.companyId);
            setCustomerData(prev => ({ ...prev, ...companyInfo }));
        } catch (err) {
            setAresError(err instanceof Error ? err.message : 'Neznámá chyba.');
        } finally {
            setAresLoading(false);
        }
    };
    
    const handleCustomerSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!driverLicenseFile) {
            alert('Nahrajte prosím fotografii řidičského průkazu.');
            return;
        }
        
        setIsSubmitting(true);
        setError('');
        try {
            if(!selectedVehicle) {
                throw new Error("Nebylo vybráno žádné vozidlo.");
            }
            const reservationData = { vehicleId: selectedVehicle.id, startDate: new Date(startDate), endDate: new Date(endDate), totalPrice };
            const customerDetails = { ...customerData };
            if (!isCompany) {
                customerDetails.companyName = undefined;
                customerDetails.companyId = undefined;
                customerDetails.vatId = undefined;
            }
            const result = await submitOnlineReservation(reservationData, customerDetails, driverLicenseFile, selectedVehicle);
            setSubmissionResult(result);
            setStep(4);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Odeslání rezervace se nezdařilo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStep = () => {
        switch(step) {
            case 1: // Date Selection
                return (
                    <form onSubmit={handleDateSubmit} className="space-y-4">
                        <h2 className="text-2xl font-bold text-center">Zvolte termín pronájmu</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 border rounded" required />
                            <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-3 border rounded" required />
                        </div>
                        <button type="submit" className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-hover flex items-center justify-center">
                            Najít vozidla <ArrowRight className="ml-2 w-5 h-5"/>
                        </button>
                    </form>
                );
            case 2: // Vehicle Selection
                return (
                    <div>
                        <button onClick={() => setStep(1)} className="mb-4 text-primary hover:underline flex items-center"><ArrowLeft className="mr-1 w-4 h-4"/> Zpět na výběr termínu</button>
                        <h2 className="text-2xl font-bold text-center mb-4">Vyberte si vozidlo</h2>
                        <div className="space-y-4">
                            {availableVehicles.map(v => (
                                <div key={v.id} className="border rounded-lg p-4 flex flex-col md:flex-row gap-4 items-center">
                                    <img src={v.imageUrl} alt={v.name} className="w-full md:w-48 h-32 object-cover rounded"/>
                                    <div className="flex-grow">
                                        <h3 className="text-xl font-bold">{v.name}</h3>
                                        <p className="text-gray-600">{v.description}</p>
                                        <p className="text-sm text-gray-500 mt-1">{v.features.join(', ')}</p>
                                    </div>
                                    <div className="text-center md:text-right">
                                        <button onClick={() => handleVehicleSelect(v)} className="bg-secondary text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-secondary-hover">
                                            Rezervovat
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 3: // Customer Details
                return (
                    <div>
                        <button onClick={() => setStep(2)} className="mb-4 text-primary hover:underline flex items-center"><ArrowLeft className="mr-1 w-4 h-4"/> Zpět na výběr vozidla</button>
                        <h2 className="text-2xl font-bold text-center mb-4">Vyplňte Vaše údaje</h2>
                        <div className="text-center mb-4 bg-blue-50 p-3 rounded-lg">
                            <p>Rezervujete <span className="font-bold">{selectedVehicle?.name}</span> v ceně <span className="font-bold">{totalPrice.toLocaleString('cs-CZ')} Kč</span></p>
                        </div>
                        <form onSubmit={handleCustomerSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="Jméno" value={customerData.firstName} onChange={e => setCustomerData({ ...customerData, firstName: e.target.value })} className="w-full p-2 border rounded" required />
                                <input type="text" placeholder="Příjmení" value={customerData.lastName} onChange={e => setCustomerData({ ...customerData, lastName: e.target.value })} className="w-full p-2 border rounded" required />
                            </div>
                            <input type="email" placeholder="Email" value={customerData.email} onChange={e => setCustomerData({ ...customerData, email: e.target.value })} className="w-full p-2 border rounded" required />
                            <input type="text" placeholder="Adresa" value={customerData.address} onChange={e => setCustomerData({ ...customerData, address: e.target.value })} className="w-full p-2 border rounded" required />
                            <div className="grid grid-cols-2 gap-4">
                                <input type="tel" placeholder="Telefon" value={customerData.phone} onChange={e => setCustomerData({ ...customerData, phone: e.target.value })} className="w-full p-2 border rounded" required />
                                <input type="text" placeholder="Číslo ŘP" value={customerData.driverLicenseNumber} onChange={e => setCustomerData({ ...customerData, driverLicenseNumber: e.target.value })} className="w-full p-2 border rounded" required />
                            </div>
                            <label className="flex items-center"><input type="checkbox" checked={isCompany} onChange={e => setIsCompany(e.target.checked)} className="mr-2"/> Nakupuji na firmu</label>
                            {isCompany && (
                                <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                                    <div className="flex items-end gap-2">
                                        <div className="flex-grow">
                                            <label className="text-sm font-medium">IČO</label>
                                            <input type="text" placeholder="IČO" value={customerData.companyId || ''} onChange={e => setCustomerData({ ...customerData, companyId: e.target.value })} className="w-full p-2 border rounded" />
                                        </div>
                                        <button type="button" onClick={handleAresSearch} disabled={aresLoading} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center">
                                            {aresLoading ? <Loader className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4"/>}
                                        </button>
                                    </div>
                                    {aresError && <p className="text-red-500 text-sm">{aresError}</p>}
                                    <input type="text" placeholder="Název firmy" value={customerData.companyName || ''} onChange={e => setCustomerData({ ...customerData, companyName: e.target.value })} className="w-full p-2 border rounded" />
                                    <input type="text" placeholder="DIČ" value={customerData.vatId || ''} onChange={e => setCustomerData({ ...customerData, vatId: e.target.value })} className="w-full p-2 border rounded" />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium mb-1">Fotografie řidičského průkazu</label>
                                <input type="file" accept="image/*" onChange={e => setDriverLicenseFile(e.target.files ? e.target.files[0] : null)} className="w-full p-2 border rounded" required/>
                            </div>
                            <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-hover">
                                {isSubmitting ? 'Odesílám...' : 'Odeslat a dokončit rezervaci'}
                            </button>
                        </form>
                    </div>
                );
            case 4: // Confirmation
                return (
                    <div className="text-center">
                        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4"/>
                        <h2 className="text-3xl font-bold text-green-800">Rezervace úspěšná!</h2>
                        <p className="mt-2 text-lg">Děkujeme, Vaše rezervace byla přijata. V nejbližší době Vám zašleme potvrzení na e-mail.</p>
                        {submissionResult && (
                             <div className="mt-6 p-4 bg-gray-100 rounded-lg text-left">
                                <h3 className="font-bold">Rekapitulace:</h3>
                                <p><strong>Zákazník:</strong> {submissionResult.customer.firstName} {submissionResult.customer.lastName}</p>
                                <p><strong>Termín:</strong> od {new Date(submissionResult.reservation.startDate).toLocaleString('cs-CZ')} do {new Date(submissionResult.reservation.endDate).toLocaleString('cs-CZ')}</p>
                            </div>
                        )}
                    </div>
                );
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl mx-auto">
                <h1 className="text-4xl font-bold text-primary text-center mb-8">Online rezervace</h1>
                <div className="bg-white rounded-lg shadow-xl p-8">
                    {loading ? <div className="text-center"><Loader className="w-8 h-8 animate-spin mx-auto text-primary"/></div> : error ? <p className="text-red-600 text-center">{error}</p> : renderStep()}
                </div>
            </div>
        </div>
    );
};

export default OnlineRentalPortal;
