import React, { useEffect, useState, useMemo } from 'react';
import { getInvoices } from '../services/api';
import type { Invoice } from '../types';
import { Search, Printer, X, Loader } from 'lucide-react';

const InvoiceDetailModal: React.FC<{ invoice: Invoice; onClose: () => void; }> = ({ invoice, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col" id="invoice-modal">
                <div className="p-6 flex justify-between items-center border-b flex-shrink-0">
                    <h2 className="text-2xl font-bold text-gray-800">Faktura #{invoice.invoiceNumber}</h2>
                    <div className="flex items-center space-x-3">
                        <button onClick={() => window.print()} className="py-2 px-4 rounded-lg bg-primary text-white hover:bg-primary-hover flex items-center"><Printer className="w-4 h-4 mr-2"/>Tisknout</button>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200"><X /></button>
                    </div>
                </div>
                <div className="p-8 overflow-y-auto" id="invoice-content">
                    {/* Header */}
                    <div className="flex justify-between items-start pb-6 border-b">
                        <div>
                            <h1 className="text-3xl font-bold text-primary">Van Rental Pro</h1>
                            <p>Milan Gula</p>
                            <p>Ghegova 17, Brno, 60200</p>
                            <p>IČO: 07031653</p>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-500">Datum vystavení: <span className="font-semibold text-gray-800">{new Date(invoice.issueDate).toLocaleDateString('cs-CZ')}</span></p>
                            <p className="text-gray-500">Datum splatnosti: <span className="font-semibold text-gray-800">{new Date(invoice.dueDate).toLocaleDateString('cs-CZ')}</span></p>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="pt-6">
                        <h3 className="text-lg font-semibold text-gray-600">Odběratel</h3>
                        <p className="font-bold text-xl">{invoice.customerDetailsSnapshot.firstName} {invoice.customerDetailsSnapshot.lastName}</p>
                        <p>{invoice.customerDetailsSnapshot.address}</p>
                        <p>{invoice.customerDetailsSnapshot.email}</p>
                    </div>

                    {/* Line Items Table */}
                    <div className="mt-8">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr className="text-left text-gray-600 uppercase text-sm">
                                    <th className="px-4 py-2">Položka</th>
                                    <th className="px-4 py-2 text-right">Částka</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.lineItems.map((item, index) => (
                                    <tr key={index} className="border-b">
                                        <td className="px-4 py-3">{item.description}</td>
                                        <td className="px-4 py-3 text-right font-medium">{item.amount.toLocaleString('cs-CZ')} Kč</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Total */}
                    <div className="flex justify-end mt-6">
                        <div className="w-full max-w-xs space-y-2">
                            <div className="flex justify-between text-lg">
                                <span className="text-gray-600">Celkem bez DPH</span>
                                <span className="font-semibold">{invoice.totalAmount.toLocaleString('cs-CZ')} Kč</span>
                            </div>
                             <div className="flex justify-between text-lg">
                                <span className="text-gray-600">DPH</span>
                                <span className="font-semibold">0 Kč</span>
                            </div>
                            <div className="flex justify-between text-2xl font-bold text-primary border-t-2 pt-2 mt-2">
                                <span>K úhradě</span>
                                <span>{invoice.totalAmount.toLocaleString('cs-CZ')} Kč</span>
                            </div>
                        </div>
                    </div>

                     {/* Footer */}
                    <div className="mt-12 pt-6 border-t text-sm text-gray-500">
                        <p>Platbu proveďte na bankovní účet: <strong>2301430030/2010</strong></p>
                        <p className="mt-2">Děkujeme za využití našich služeb.</p>
                    </div>
                </div>
            </div>
            {/* FIX: Replaced Next.js specific 'styled-jsx' syntax with a standard React 'style' tag. */}
            <style>{`
                @media print {
                    body > *:not(#invoice-modal) { display: none; }
                    #invoice-modal { 
                        position: absolute; 
                        top: 0; 
                        left: 0; 
                        width: 100%; 
                        max-width: 100%;
                        max-height: 100%;
                        box-shadow: none;
                        border-radius: 0;
                        border: none;
                    }
                }
            `}</style>
        </div>
    );
};


const Invoices: React.FC = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getInvoices();
            setInvoices(data.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()));
        } catch (error) {
            console.error("Failed to fetch invoices:", error);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, []);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(invoice => {
            const searchLower = searchTerm.toLowerCase();
            const customerName = `${invoice.customerDetailsSnapshot.firstName} ${invoice.customerDetailsSnapshot.lastName}`.toLowerCase();
            return (
                customerName.includes(searchLower) ||
                invoice.invoiceNumber.toLowerCase().includes(searchLower)
            );
        });
    }, [invoices, searchTerm]);

    if (loading) return <div className="flex justify-center items-center h-full"><Loader className="w-8 h-8 animate-spin text-primary"/></div>;

    return (
        <div>
            {selectedInvoice && <InvoiceDetailModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Archiv faktur</h1>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Hledat fakturu..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-80 p-2 pl-10 border rounded-lg"
                    />
                </div>
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm">
                            <th className="px-5 py-3">Číslo faktury</th>
                            <th className="px-5 py-3">Zákazník</th>
                            <th className="px-5 py-3">Datum vystavení</th>
                            <th className="px-5 py-3 text-right">Částka</th>
                            <th className="px-5 py-3 text-center">Akce</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredInvoices.length > 0 ? (
                            filteredInvoices.map(invoice => (
                                <tr key={invoice.id} className="hover:bg-gray-50">
                                    <td className="px-5 py-4 font-semibold text-primary">{invoice.invoiceNumber}</td>
                                    <td className="px-5 py-4">{invoice.customerDetailsSnapshot.firstName} {invoice.customerDetailsSnapshot.lastName}</td>
                                    <td className="px-5 py-4">{new Date(invoice.issueDate).toLocaleDateString('cs-CZ')}</td>
                                    <td className="px-5 py-4 text-right font-bold">{invoice.totalAmount.toLocaleString('cs-CZ')} Kč</td>
                                    <td className="px-5 py-4 text-center">
                                        <button onClick={() => setSelectedInvoice(invoice)} className="text-primary hover:text-primary-hover font-semibold">Zobrazit</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-500">
                                    Nebyly nalezeny žádné faktury.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Invoices;