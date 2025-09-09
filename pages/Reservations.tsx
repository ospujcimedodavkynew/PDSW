import React, { useState, useEffect, useRef } from 'react';
import { getCustomers, getVehicles, addCustomer, addReservation, addContract } from '../services/api';
import type { Customer, Vehicle } from '../types';
import { UserPlus, Car, Calendar, Pen, Mail } from 'lucide-react';
import SignaturePad from '../components/SignaturePad';
import type { SignaturePadRef } from '../components/SignaturePad';

const Reservations: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    
    const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
    const [newCustomerData, setNewCustomerData] = useState({ firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: '' });
    
    const [isProcessing, setIsProcessing] = useState(false);
    const signaturePadRef = useRef<SignaturePadRef>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [custData, vehData] = await Promise.all([getCustomers(), getVehicles()]);
            setCustomers(custData);
            setVehicles(vehData.filter(v => v.status === 'available'));
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

    const calculatePrice = () => {
        if (!selectedVehicle || !startDate || !endDate) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) return 0;
        const durationHours = (end.getTime() - start.getTime()) / (1000 * 3600);
        if (durationHours <= 4) return selectedVehicle.rate4h;
        if (durationHours <= 12) return selectedVehicle.rate12h;
        const days = Math.ceil(durationHours / 24);
        return days * selectedVehicle.dailyRate;
    };
    
    const handleAddNewCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            const newCustomer = await addCustomer(newCustomerData);
            setCustomers([...customers, newCustomer]);
            setSelectedCustomerId(newCustomer.id);
            setShowNewCustomerForm(false);
            setNewCustomerData({ firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: '' });
        } catch (error) {
            console.error("Failed to add new customer:", error);
            alert("Nepodařilo se přidat nového zákazníka.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleCreateReservation = async () => {
        if (!selectedCustomerId || !selectedVehicleId || !startDate || !endDate || !signaturePadRef.current || signaturePadRef.current.isEmpty()) {
            alert('Prosím, vyplňte všechny údaje a přidejte podpis.');
            return;
        }

        setIsProcessing(true);
        try {
            // 1. Create Reservation
            const reservationData = {
                customerId: selectedCustomerId,
                vehicleId: selectedVehicleId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
            };
            const newReservation = await addReservation(reservationData);

            // 2. Generate and Save Contract
            const price = calculatePrice();
            const contractText = `
Smlouva o pronájmu vozidla
-----------------------------

**Pronajímatel:**
Milan Gula
Ghegova 17, Brno, 60200
Pujcimedodavky.cz
IČO: 07031653

**Nájemce:**
Jméno: ${selectedCustomer?.firstName} ${selectedCustomer?.lastName}
Adresa: ${selectedCustomer?.address}
Email: ${selectedCustomer?.email}
Telefon: ${selectedCustomer?.phone}
Číslo ŘP: ${selectedCustomer?.driverLicenseNumber}

**Předmět nájmu:**
Vozidlo: ${selectedVehicle?.name}
SPZ: ${selectedVehicle?.licensePlate}

**Doba nájmu:**
Od: ${new Date(startDate).toLocaleString('cs-CZ')}
Do: ${new Date(endDate).toLocaleString('cs-CZ')}
Cena: ${price.toLocaleString('cs-CZ')} Kč

**Podmínky:**
Spoluúčast nájemce v případě poškození je 5 000 - 10 000 Kč.
Nájemce potvrzuje, že vozidlo převzal v dobrém technickém stavu.

Podpis nájemce: (viz digitální podpis)
            `;

            await addContract({
                reservationId: newReservation.id,
                customerId: selectedCustomerId,
                vehicleId: selectedVehicleId,
                contractText: contractText,
            });

            // 3. Prepare and open Mailto
            const subject = `Smlouva o pronájmu vozidla: ${selectedVehicle?.name}`;
            const mailtoLink = `mailto:${selectedCustomer?.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(contractText)}`;
            window.location.href = mailtoLink;

            // 4. Reset form
            setSelectedCustomerId('');
            setSelectedVehicleId('');
            setStartDate('');
            setEndDate('');
            signaturePadRef.current?.clear();
            fetchData(); // Refresh available vehicles
            alert('Rezervace úspěšně vytvořena a email připraven k odeslání!');

        } catch (error) {
            console.error("Failed to create reservation:", error);
            let userMessage = "Vytvoření rezervace se nezdařilo.";
            if (error instanceof Error) {
                if (error.message.includes('contracts')) {
                    userMessage = "Rezervace byla vytvořena, ale nepodařilo se uložit smlouvu. Chyba databáze: Zkontrolujte, zda existuje tabulka 'contracts'.";
                } else {
                    userMessage = `Vytvoření rezervace se nezdařilo: ${error.message}`;
                }
            }
            alert(userMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) return <div>Načítání...</div>;

    return (
        <div className="container mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Nová rezervace a smlouva</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form Area */}
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md space-y-8">
                    {/* Customer Section */}
                    <section>
                        <h2 className="text-xl font-semibold flex items-center text-primary"><UserPlus className="mr-3" />1. Zákazník</h2>
                        <div className="mt-4">
                            <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full p-2 border rounded" disabled={showNewCustomerForm}>
                                <option value="">Vyberte stávajícího zákazníka</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</option>)}
                            </select>
                            <button onClick={() => setShowNewCustomerForm(!showNewCustomerForm)} className="text-sm text-blue-600 hover:underline mt-2">
                                {showNewCustomerForm ? 'Zrušit přidání nového' : '...nebo přidat nového zákazníka'}
                            </button>
                        </div>
                        {showNewCustomerForm && (
                            <form onSubmit={handleAddNewCustomer} className="mt-4 p-4 border rounded-lg bg-gray-50 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="text" placeholder="Jméno" value={newCustomerData.firstName} onChange={e => setNewCustomerData({...newCustomerData, firstName: e.target.value})} required className="p-2 border rounded"/>
                                    <input type="text" placeholder="Příjmení" value={newCustomerData.lastName} onChange={e => setNewCustomerData({...newCustomerData, lastName: e.target.value})} required className="p-2 border rounded"/>
                                </div>
                                <input type="email" placeholder="Email" value={newCustomerData.email} onChange={e => setNewCustomerData({...newCustomerData, email: e.target.value})} required className="w-full p-2 border rounded"/>
                                <input type="text" placeholder="Adresa" value={newCustomerData.address} onChange={e => setNewCustomerData({...newCustomerData, address: e.target.value})} required className="w-full p-2 border rounded"/>
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="tel" placeholder="Telefon" value={newCustomerData.phone} onChange={e => setNewCustomerData({...newCustomerData, phone: e.target.value})} required className="p-2 border rounded"/>
                                    <input type="text" placeholder="Číslo ŘP" value={newCustomerData.driverLicenseNumber} onChange={e => setNewCustomerData({...newCustomerData, driverLicenseNumber: e.target.value})} required className="p-2 border rounded"/>
                                </div>
                                <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600" disabled={isProcessing}>
                                    {isProcessing ? 'Ukládám...' : 'Uložit nového zákazníka'}
                                </button>
                            </form>
                        )}
                    </section>

                    {/* Vehicle Section */}
                    <section>
                         <h2 className="text-xl font-semibold flex items-center text-primary"><Car className="mr-3" />2. Výběr vozidla</h2>
                         <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                             {vehicles.map(v => (
                                <div key={v.id} onClick={() => setSelectedVehicleId(v.id)} className={`border-2 rounded-lg p-3 cursor-pointer ${selectedVehicleId === v.id ? 'border-primary shadow-lg' : 'border-gray-200 hover:border-blue-300'}`}>
                                    <img src={v.imageUrl} alt={v.name} className="w-full h-24 object-cover rounded-md mb-2"/>
                                    <h3 className="font-semibold text-sm">{v.name}</h3>
                                    <p className="text-xs text-gray-500">{v.licensePlate}</p>
                                </div>
                             ))}
                         </div>
                    </section>

                    {/* Date Section */}
                    <section>
                        <h2 className="text-xl font-semibold flex items-center text-primary"><Calendar className="mr-3" />3. Termín zápůjčky</h2>
                        <div className="mt-4 grid grid-cols-2 gap-4">
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
                    
                    {/* Signature Section */}
                    <section>
                        <h2 className="text-xl font-semibold flex items-center text-primary"><Pen className="mr-3" />4. Podpis zákazníka</h2>
                        <div className="mt-4 border rounded-lg">
                            <SignaturePad ref={signaturePadRef} />
                        </div>
                    </section>
                </div>

                {/* Summary & Action Area */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-lg shadow-md sticky top-6">
                        <h2 className="text-xl font-bold text-gray-800 border-b pb-3 mb-4">Souhrn a vytvoření</h2>
                        <div className="space-y-3 text-sm">
                            <p><strong>Zákazník:</strong> {selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : 'Nevybrán'}</p>
                            <p><strong>Vozidlo:</strong> {selectedVehicle ? selectedVehicle.name : 'Nevybráno'}</p>
                            <p><strong>Od:</strong> {startDate ? new Date(startDate).toLocaleString('cs-CZ') : 'Nezadáno'}</p>
                            <p><strong>Do:</strong> {endDate ? new Date(endDate).toLocaleString('cs-CZ') : 'Nezadáno'}</p>
                        </div>
                        <div className="border-t pt-4 mt-4">
                            <p className="flex justify-between items-baseline text-2xl font-bold">
                                <span>Celkem:</span>
                                <span>{calculatePrice().toLocaleString('cs-CZ')} Kč</span>
                            </p>
                        </div>
                        <button onClick={handleCreateReservation} className="w-full mt-6 bg-secondary text-dark-text font-bold py-3 rounded-lg hover:bg-secondary-hover transition-colors text-lg flex items-center justify-center" disabled={isProcessing}>
                            <Mail className="w-5 h-5 mr-2" />
                            {isProcessing ? 'Zpracovávám...' : 'Vytvořit a odeslat smlouvu'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reservations;