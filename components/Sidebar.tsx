import React from 'react';
import {
    LayoutDashboard, Calendar, Car, Users, DollarSign, FileText,
    BarChart, Settings, LogOut, FilePlus, List
} from 'lucide-react';
import { Page } from '../types';
import { signOut } from '../services/api';

interface SidebarProps {
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
}

const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    page: Page;
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
}> = ({ icon, label, page, currentPage, setCurrentPage }) => {
    const isActive = currentPage === page;
    return (
        <button
            onClick={() => setCurrentPage(page)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                ? 'bg-primary text-white shadow-lg'
                : 'text-gray-600 hover:bg-primary-hover hover:text-white'
                }`}
        >
            {icon}
            <span className="font-medium">{label}</span>
        </button>
    );
};


const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
    const handleLogout = async () => {
        try {
            await signOut();
            // Auth state change in App.tsx will handle redirect
        } catch (error) {
            console.error("Logout failed:", error);
            alert('Odhlášení se nezdařilo.');
        }
    };

    const navItems = [
        { icon: <LayoutDashboard />, label: "Přehled", page: Page.DASHBOARD },
        { icon: <Calendar />, label: "Kalendář", page: Page.CALENDAR },
        { icon: <FilePlus />, label: "Nová rezervace", page: Page.RESERVATIONS },
        { icon: <List />, label: "Správa rezervací", page: Page.MANAGE_RESERVATIONS },
        { icon: <Car />, label: "Vozidla", page: Page.VEHICLES },
        { icon: <Users />, label: "Zákazníci", page: Page.CUSTOMERS },
        { icon: <DollarSign />, label: "Finance", page: Page.FINANCIALS },
        { icon: <FileText />, label: "Smlouvy", page: Page.CONTRACTS },
        { icon: <BarChart />, label: "Reporty", page: Page.REPORTS },
        { icon: <Settings />, label: "Nastavení", page: Page.SETTINGS },
    ];

    return (
        <div className="w-64 bg-white p-4 flex flex-col shadow-lg">
            <div className="text-2xl font-bold text-primary mb-8 text-center">
                Van Rental Pro
            </div>
            <nav className="flex-grow space-y-2">
                {navItems.map(item => (
                    <NavItem key={item.page} {...item} currentPage={currentPage} setCurrentPage={setCurrentPage} />
                ))}
            </nav>
            <div className="mt-auto">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-red-500 hover:text-white transition-colors"
                >
                    <LogOut />
                    <span className="font-medium">Odhlásit se</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
