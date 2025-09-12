import React, { useEffect, useState } from 'react';
import { getReportsData } from '../services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const Reports: React.FC = () => {
    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await getReportsData();
                setReportData(data);
            } catch (error) {
                console.error("Failed to fetch reports data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    if (loading) return <div>Načítání reportů...</div>;
    if (!reportData) return <div>Data se nepodařilo načíst.</div>;

    const exampleData = [{name: 'Pronájmy', value: 400}, {name: 'Poplatky', value: 30}];

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Reporty</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Výkonnost vozidel</h2>
                     <p className="text-gray-500">Tato sekce je ve vývoji. Zde bude graf porovnávající vytíženost a příjmy jednotlivých vozidel.</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Příjmy podle kategorie</h2>
                     <p className="text-gray-500">Tato sekce je ve vývoji. Zde bude koláčový graf zobrazující podíl příjmů z pronájmů vs. poplatků za kilometry navíc.</p>
                     {/* Example of a chart */}
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={exampleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                                {exampleData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Reports;
