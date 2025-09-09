
import React, { useEffect, useState, useMemo } from 'react';
import { getFinancials } from '../services/api';
import type { FinancialTransaction } from '../types';
import { DollarSign, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Financials: React.FC = () => {
    const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await getFinancials();
                setTransactions(data);
            } catch (error) {
                console.error("Failed to fetch financials:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const totalIncome = useMemo(() => {
        return transactions.reduce((sum, t) => sum + t.amount, 0);
    }, [transactions]);
    
    const monthlyIncome = useMemo(() => {
        return transactions.reduce((acc, curr) => {
            const month = new Date(curr.date).toLocaleString('cs-CZ', { month: 'short', year: 'numeric' });
            if (!acc[month]) {
                acc[month] = 0;
            }
            acc[month] += curr.amount;
            return acc;
        }, {} as Record<string, number>);
    }, [transactions]);
    
    const chartData = Object.keys(monthlyIncome).map(month => ({
        name: month,
        Příjem: monthlyIncome[month]
    })).reverse();


    if (loading) return <div>Načítání finančních dat...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Finance</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="p-4 rounded-full bg-green-100">
                        <DollarSign className="w-8 h-8 text-green-700"/>
                    </div>
                    <div className="ml-4">
                        <p className="text-sm text-gray-500 font-medium">Celkové příjmy</p>
                        <p className="text-3xl font-bold text-gray-800">{totalIncome.toLocaleString('cs-CZ')} Kč</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="p-4 rounded-full bg-blue-100">
                        <TrendingUp className="w-8 h-8 text-blue-700"/>
                    </div>
                    <div className="ml-4">
                        <p className="text-sm text-gray-500 font-medium">Počet transakcí</p>
                        <p className="text-3xl font-bold text-gray-800">{transactions.length}</p>
                    </div>
                </div>
            </div>

             <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4 text-gray-700">Přehled příjmů</h2>
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => `${value.toLocaleString('cs-CZ')} Kč`}/>
                        <Legend />
                        <Bar dataKey="Příjem" fill="#1E40AF" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <h2 className="text-xl font-bold text-gray-700 p-6">Historie transakcí</h2>
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm">
                            <th className="px-6 py-3">ID Transakce</th>
                            <th className="px-6 py-3">Datum</th>
                            <th className="px-6 py-3">Popis</th>
                            <th className="px-6 py-3 text-right">Částka</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(transaction => (
                            <tr key={transaction.id} className="hover:bg-gray-50 border-t">
                                <td className="px-6 py-4">{transaction.id}</td>
                                <td className="px-6 py-4">{new Date(transaction.date).toLocaleDateString('cs-CZ')}</td>
                                <td className="px-6 py-4">{transaction.description}</td>
                                <td className="px-6 py-4 text-right font-semibold text-green-600">{transaction.amount.toLocaleString('cs-CZ')} Kč</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Financials;
