import type { Vehicle, ServiceRecord, Customer, Reservation, Contract, FinancialTransaction, Invoice } from '../types';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Mock user object for auth
type User = { uid: string; email: string | null };
let authListener: ((user: User | null) => void) | null = null;
let mockUser: User | null = null;

// --- Auth ---
export const signInWithPassword = async (email: string, password: string): Promise<void> => {
    await delay(500);
    if (email === 'admin@vanrental.pro' && password === 'password123') {
        mockUser = { uid: 'admin123', email };
        if (authListener) authListener(mockUser);
        return;
    }
    throw new Error('Přihlášení se nezdařilo. Zkontrolujte prosím své údaje.');
};

export const signOut = async (): Promise<void> => {
    await delay(200);
    mockUser = null;
    if (authListener) authListener(null);
};

export const onAuthStateChanged = (callback: (user: User | null) => void): (() => void) => {
    authListener = callback;
    // Immediately invoke with current state
    setTimeout(() => callback(mockUser), 0);
    // Return unsubscribe function
    return () => {
        authListener = null;
    };
};

// --- Mock Implementations for other functions (returning empty/default values) ---
export const getVehicles = async (): Promise<Vehicle[]> => { await delay(500); return []; };
export const addVehicle = async (vehicle: Omit<Vehicle, 'id' | 'imageUrl'>): Promise<Vehicle> => { await delay(500); return { ...vehicle, id: `v_${Date.now()}`, imageUrl: 'https://via.placeholder.com/400x300' }; };
export const updateVehicle = async (vehicle: Vehicle): Promise<Vehicle> => { await delay(500); return vehicle; };
export const getServiceRecordsForVehicle = async (vehicleId: string): Promise<ServiceRecord[]> => { await delay(500); return []; };
export const addServiceRecord = async (record: Omit<ServiceRecord, 'id'>, vehicleName: string): Promise<ServiceRecord> => { await delay(500); return { ...record, id: `sr_${Date.now()}` }; };
export const deleteServiceRecord = async (recordId: string): Promise<void> => { await delay(500); };
export const getCustomers = async (): Promise<Customer[]> => { await delay(500); return []; };
export const addCustomer = async (customer: Omit<Customer, 'id'>): Promise<Customer> => { await delay(500); return { ...customer, id: `c_${Date.now()}` }; };
export const updateCustomer = async (customer: Customer): Promise<Customer> => { await delay(500); return customer; };
export const getReservations = async (): Promise<Reservation[]> => { await delay(500); return []; };
export const addReservation = async (reservation: Omit<Reservation, 'id' | 'status'>): Promise<Reservation> => { await delay(500); return { ...reservation, id: `r_${Date.now()}`, status: 'scheduled' }; };
export const deleteReservation = async (reservationId: string): Promise<void> => { await delay(500); };
export const activateReservation = async (reservationId: string, startMileage: number): Promise<void> => { await delay(500); };
export const completeReservation = async (reservationId: string, endMileage: number, notes: string): Promise<void> => { await delay(500); };
export const addContract = async (contract: Omit<Contract, 'id'>): Promise<Contract> => { await delay(500); return { ...contract, id: `ct_${Date.now()}` }; };
export const getContracts = async (): Promise<Contract[]> => { await delay(500); return []; };
export const getFinancials = async (): Promise<FinancialTransaction[]> => { await delay(500); return []; };
export const addExpense = async (expense: Omit<FinancialTransaction, 'id' | 'type'>): Promise<FinancialTransaction> => { await delay(500); return { ...expense, id: `ft_${Date.now()}`, type: 'expense' }; };
export const submitCustomerDetails = async (token: string, customerData: Omit<Customer, 'id' | 'driverLicenseImageUrl'>, driverLicenseFile: File): Promise<void> => { await delay(1000); };
export const getReservationByToken = async (token: string): Promise<Reservation | null> => { await delay(500); return { id: 'res_portal', customerId: '', vehicleId: 'v_portal', startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000).toISOString(), status: 'pending-customer', vehicle: { id: 'v_portal', name: 'Ford Transit L2H2', } as Vehicle, customer: {} as Customer }; };
export const createPendingReservation = async (vehicleId: string, startDate: Date, endDate: Date): Promise<Reservation> => { await delay(500); return { id: `r_${Date.now()}`, customerId: '', vehicleId, startDate, endDate, status: 'pending-customer', portalToken: `token_${Date.now()}` }; };
export const submitOnlineReservation = async (reservationData: any, customerData: any, driverLicenseFile: File, vehicle: Vehicle): Promise<{ reservation: Reservation, customer: Customer, contractText: string }> => { await delay(1000); const cust = { ...customerData, id: `c_${Date.now()}`}; return { reservation: { ...reservationData, id: `r_${Date.now()}`, customer: cust, vehicle: vehicle }, customer: cust, contractText: 'Mock contract text generated upon online reservation.' }; };
export const getDashboardStats = async (): Promise<any> => { await delay(500); return { upcomingReservations: 0, dueBack: 0, stats: { totalVehicles: 0, availableVehicles: 0 } }; };
export const getReportsData = async (): Promise<any> => { await delay(500); return { vehiclePerformance: [], revenueByCategory: [] }; };

// --- Invoices ---
const mockInvoices: Invoice[] = [];
let invoiceCounter = 0;

export const getInvoices = async (): Promise<Invoice[]> => {
    await delay(500);
    return [...mockInvoices];
};

export const createInvoice = async (invoiceData: Omit<Invoice, 'id' | 'invoiceNumber'>): Promise<Invoice> => {
    await delay(500);
    const existingInvoice = mockInvoices.find(inv => inv.reservationId === invoiceData.reservationId);
    if (existingInvoice) {
        throw new Error("Faktura pro tuto rezervaci již existuje.");
    }
    invoiceCounter++;
    const newInvoice: Invoice = {
        ...invoiceData,
        id: `inv_${Date.now()}`,
        invoiceNumber: `FAKTURA-${new Date().getFullYear()}-${String(invoiceCounter).padStart(4, '0')}`,
    };
    mockInvoices.push(newInvoice);
    return newInvoice;
};