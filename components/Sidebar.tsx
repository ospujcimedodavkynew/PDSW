import React from 'react';
import { Page } from '../types';
import { LayoutDashboard, Car, Users, Calendar as CalendarIcon, FileText, DollarSign, BarChart, LogOut, Receipt, PlusCircle } from 'lucide-react';
import { signOut } from '../services/api';

interface SidebarProps {
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
}

const NavItem: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void; }> = ({ icon, label, isActive, onClick }) => (
    <button onClick={onClick} className={`flex items-center w-full px-4 py-3 text-left transition-colors duration-200 ${isActive ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
        {icon}
        <span className="ml-4 font-medium">{label}</span>
    </button>
);

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
    
    const handleLogout = async () => {
        if (window.confirm('Opravdu se chcete odhlásit?')) {
            await signOut();
            // App component will handle redirect on auth state change
        }
    };

    return (
        <div className="flex flex-col w-64 bg-white shadow-lg h-screen">
            <div className="flex items-center justify-center h-20 border-b">
                <h1 className="text-2xl font-bold text-primary">Van Rental Pro</h1>
            </div>
            <nav className="flex-grow mt-5 space-y-1">
                <NavItem icon={<LayoutDashboard />} label="Přehled" isActive={currentPage === Page.DASHBOARD} onClick={() => setCurrentPage(Page.DASHBOARD)} />
                <NavItem icon={<Car />} label="Vozový park" isActive={currentPage === Page.VEHICLES} onClick={() => setCurrentPage(Page.VEHICLES)} />
                <NavItem icon={<Users />} label="Zákazníci" isActive={currentPage === Page.CUSTOMERS} onClick={() => setCurrentPage(Page.CUSTOMERS)} />
                <NavItem icon={<PlusCircle />} label="Nová rezervace" isActive={currentPage === Page.RESERVATIONS} onClick={() => setCurrentPage(Page.RESERVATIONS)} />
                <NavItem icon={<FileText />} label="Správa rezervací" isActive={currentPage === Page.MANAGE_RESERVATIONS} onClick={() => setCurrentPage(Page.MANAGE_RESERVATIONS)} />
                <NavItem icon={<CalendarIcon />} label="Kalendář" isActive={currentPage === Page.CALENDAR} onClick={() => setCurrentPage(Page.CALENDAR)} />
                <NavItem icon={<Receipt />} label="Faktury" isActive={currentPage === Page.INVOICES} onClick={() => setCurrentPage(Page.INVOICES)} />
                <NavItem icon={<DollarSign />} label="Finance" isActive={currentPage === Page.FINANCIALS} onClick={() => setCurrentPage(Page.FINANCIALS)} />
                <NavItem icon={<FileText />} label="Smlouvy" isActive={currentPage === Page.CONTRACTS} onClick={() => setCurrentPage(Page.CONTRACTS)} />
                <NavItem icon={<BarChart />} label="Reporty" isActive={currentPage === Page.REPORTS} onClick={() => setCurrentPage(Page.REPORTS)} />
            </nav>
            <div className="p-4 border-t">
                <button onClick={handleLogout} className="flex items-center w-full px-4 py-3 text-left text-gray-600 hover:bg-gray-100 rounded-md">
                    <LogOut />
                    <span className="ml-4 font-medium">Odhlásit se</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
