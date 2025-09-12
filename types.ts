export enum Page {
    DASHBOARD = 'dashboard',
    VEHICLES = 'vehicles',
    CUSTOMERS = 'customers',
    RESERVATIONS = 'reservations',
    MANAGE_RESERVATIONS = 'manage_reservations',
    CALENDAR = 'calendar',
    FINANCIALS = 'financials',
    CONTRACTS = 'contracts',
    REPORTS = 'reports',
    INVOICES = 'invoices',
    SETTINGS = 'settings',
}

export interface Vehicle {
    id: string;
    name: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    status: 'available' | 'rented' | 'maintenance';
    rate4h: number;
    rate12h: number;
    dailyRate: number;
    features: string[];
    currentMileage: number;
    description: string;
    dimensions: string;
    imageUrl: string;
}

export interface ServiceRecord {
    id: string;
    vehicleId: string;
    description: string;
    cost: number;
    mileage: number;
    serviceDate: Date | string;
}

export interface DamageRecord {
    id: string;
    vehicleId: string;
    reservationId: string;
    description: string;
    photoUrl?: string;
    locationX: number;
    locationY: number;
    status: 'reported' | 'repaired';
    reportedAt: Date | string;
}


export interface Customer {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    driverLicenseNumber: string;
    address: string;
    driverLicenseImageUrl?: string;
    // New fields for company details
    companyName?: string;
    companyId?: string; // IČO
    vatId?: string;     // DIČ
}

export interface Reservation {
    id: string;
    customerId: string;
    vehicleId: string;
    startDate: Date | string;
    endDate: Date | string;
    status: 'scheduled' | 'active' | 'completed' | 'pending-customer';
    notes?: string;
    startMileage?: number;
    endMileage?: number;
    totalPrice?: number;
    portalToken?: string;
    paymentMethod?: 'cash' | 'invoice';
    handoverSignatureUrl?: string;
    returnSignatureUrl?: string;
    // Populated fields from API
    customer?: Customer;
    vehicle?: Vehicle;
}

export interface Contract {
    id: string;
    reservationId: string;
    customerId: string;
    vehicleId: string;
    generatedAt: Date | string;
    contractText: string;
    // Populated fields from API
    customer?: Customer;
    vehicle?: Vehicle;
}

export interface FinancialTransaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    date: Date | string;
    description: string;
    relatedReservationId?: string;
    relatedVehicleId?: string;
}

export interface Invoice {
    id: string;
    invoiceNumber: string;
    reservationId: string;
    issueDate: Date | string;
    dueDate: Date | string;
    totalAmount: number;
    paymentMethod: 'cash' | 'invoice';
    lineItems: { description: string; amount: number }[];
    customerDetailsSnapshot: Customer;
    vehicleDetailsSnapshot: Vehicle;
}

export interface CompanySettings {
    companyName: string;
    companyAddress: string;
    companyIco: string;
    bankAccount: string;
}