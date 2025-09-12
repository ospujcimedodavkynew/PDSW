import React, { useEffect, useState } from 'react';
import { getDashboardStats } from '../services/api';
import { Car, Users, Calendar, AlertTriangle } from 'lucide-react';

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await getDashboardStats();
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div>Načítání přehledu...</div>;
    if (!stats) return <div>Data se nepodařilo načíst.</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Přehled</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Stat cards */}
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="p-4 bg-blue-100 rounded-full"><Car className="w-8 h-8 text-blue-600"/></div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Dostupná vozidla</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.stats?.availableVehicles} / {stats.stats?.totalVehicles}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="p-4 bg-green-100 rounded-full"><Calendar className="w-8 h-8 text-green-600"/></div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Nadcházející rezervace</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.upcomingReservations}</p>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="p-4 bg-yellow-100 rounded-full"><AlertTriangle className="w-8 h-8 text-yellow-600"/></div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Dnes se vrací</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.dueBack}</p>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="p-4 bg-purple-100 rounded-full"><Users className="w-8 h-8 text-purple-600"/></div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Celkem zákazníků</p>
                        <p className="text-3xl font-bold text-gray-800">0</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Nadcházející rezervace</h2>
                    <p className="text-gray-500">Zde bude seznam nadcházejících rezervací.</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Vozidla k vrácení</h2>
                    <p className="text-gray-500">Zde bude seznam vozidel, která mají být dnes vrácena.</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
