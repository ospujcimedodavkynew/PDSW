
import React, { useEffect, useState } from 'react';
import { getContracts } from '../services/api';
import type { Contract } from '../types';

const Contracts: React.FC = () => {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await getContracts();
                setContracts(data);
            } catch (error) {
                console.error("Failed to fetch contracts:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div>Načítání smluv...</div>;
    
    if (selectedContract) {
        return (
            <div className="bg-white p-8 rounded-lg shadow-lg">
                <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-bold">Smlouva o pronájmu vozidla</h2>
                    <button onClick={() => setSelectedContract(null)} className="text-gray-500 hover:text-gray-800">&times; Zavřít</button>
                </div>
                <div className="my-6 border-t border-b py-4">
                    <p><strong>Číslo smlouvy:</strong> {selectedContract.id}</p>
                    <p><strong>Datum vystavení:</strong> {selectedContract.generatedAt.toLocaleDateString('cs-CZ')}</p>
                </div>
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <h3 className="font-bold text-lg mb-2">Pronajímatel</h3>
                        <p>Van Rental Pro s.r.o.</p>
                        <p>Ulice 123, 110 00 Praha 1</p>
                        <p>IČO: 12345678</p>
                    </div>
                     <div>
                        <h3 className="font-bold text-lg mb-2">Nájemce</h3>
                        <p>{selectedContract.customer.firstName} {selectedContract.customer.lastName}</p>
                        <p>Email: {selectedContract.customer.email}</p>
                        <p>Tel: {selectedContract.customer.phone}</p>
                        <p>Číslo ŘP: {selectedContract.customer.driverLicenseNumber}</p>
                    </div>
                </div>
                 <div className="mt-8">
                    <h3 className="font-bold text-lg mb-2">Předmět pronájmu</h3>
                    <p><strong>Vozidlo:</strong> {selectedContract.vehicle.name}</p>
                    <p><strong>SPZ:</strong> {selectedContract.vehicle.licensePlate}</p>
                    <p><strong>Rok výroby:</strong> {selectedContract.vehicle.year}</p>
                </div>
                <div className="mt-8 text-xs text-gray-500">
                    <p>Toto je zjednodušený náhled smlouvy. Podpisem obou stran se nájemce zavazuje dodržovat smluvní podmínky...</p>
                </div>
                <div className="mt-8 text-right">
                     <button onClick={() => window.print()} className="bg-primary text-white py-2 px-6 rounded-lg hover:bg-primary-hover">
                        Tisknout
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Archiv smluv</h1>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm">
                            <th className="px-5 py-3">ID Smlouvy</th>
                            <th className="px-5 py-3">Zákazník</th>
                            <th className="px-5 py-3">Vozidlo</th>
                            <th className="px-5 py-3">Datum vystavení</th>
                            <th className="px-5 py-3">Akce</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contracts.map(contract => (
                            <tr key={contract.id} className="hover:bg-gray-50 border-b">
                                <td className="px-5 py-4">{contract.id}</td>
                                <td className="px-5 py-4">{contract.customer.firstName} {contract.customer.lastName}</td>
                                <td className="px-5 py-4">{contract.vehicle.name}</td>
                                <td className="px-5 py-4">{contract.generatedAt.toLocaleDateString('cs-CZ')}</td>
                                <td className="px-5 py-4">
                                    <button onClick={() => setSelectedContract(contract)} className="text-primary hover:text-primary-hover font-semibold">Zobrazit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Contracts;
