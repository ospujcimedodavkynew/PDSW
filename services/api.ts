import { createClient, User, SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { Customer, FinancialTransaction, Reservation, ServiceRecord, Vehicle, Contract, Page } from '../types';
import { GoogleGenAI } from "@google/genai";

// Supabase setup
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase URL and Anon Key not found. Please add them to your environment variables.");
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Gemini AI setup
// FIX: Initialize Gemini AI client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });


// --- AUTH ---
export const onAuthStateChange = (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
    return supabase.auth.onAuthStateChange(callback);
}
export const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
}
export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

// --- REALTIME ---
export const onTableChange = (table: string, callback: () => void) => {
    const subscription = supabase.channel(`public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, payload => {
            callback();
        })
        .subscribe();
    return () => supabase.removeChannel(subscription);
};


// --- DASHBOARD ---
export const getDashboardStats = async () => {
    const { data: vehicles, error: vehiclesError } = await supabase.from('vehicles').select('*');
    if (vehiclesError) throw vehiclesError;
    
    const { data: customers, error: customersError } = await supabase.from('customers').select('id');
    if (customersError) throw customersError;

    const { data: reservations, error: reservationsError } = await supabase
        .from('reservations')
        .select(`
            *,
            customer:customers(*),
            vehicle:vehicles(*)
        `)
        .in('status', ['confirmed', 'pending-customer']);
    if (reservationsError) throw reservationsError;

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const todayEnd = new Date(now.setHours(23, 59, 59, 999)).toISOString();

    const todaysDepartures = reservations.filter(r => new Date(r.startDate) >= new Date(todayStart) && new Date(r.startDate) <= new Date(todayEnd));
    const todaysArrivals = reservations.filter(r => new Date(r.endDate) >= new Date(todayStart) && new Date(r.endDate) <= new Date(todayEnd));
    const upcomingReservations = reservations.filter(r => new Date(r.startDate) > new Date(todayEnd)).length;

    return {
        stats: {
            availableVehicles: vehicles.filter(v => v.status === 'available').length,
            totalVehicles: vehicles.length
        },
        upcomingReservations,
        dueBack: todaysArrivals.length,
        totalCustomers: customers.length,
        todaysDepartures,
        todaysArrivals,
        vehicles
    };
};

// --- VEHICLES ---
export const getVehicles = async (): Promise<Vehicle[]> => {
    const { data, error } = await supabase.from('vehicles').select('*').order('name');
    if (error) throw error;
    return data;
}
export const addVehicle = async (vehicle: Omit<Vehicle, 'id' | 'imageUrl'>) => {
    // This is a simplified version. In a real app, you'd handle image upload separately.
    const newVehicle = { ...vehicle, imageUrl: 'https://via.placeholder.com/400x300.png?text=Van+Image' };
    const { error } = await supabase.from('vehicles').insert(newVehicle);
    if (error) throw error;
}
export const updateVehicle = async (vehicle: Vehicle) => {
    const { error } = await supabase.from('vehicles').update(vehicle).eq('id', vehicle.id);
    if (error) throw error;
}

// --- CUSTOMERS ---
export const getCustomers = async (): Promise<Customer[]> => {
    const { data, error } = await supabase.from('customers').select('*').order('lastName');
    if (error) throw error;
    return data;
}
export const addCustomer = async (customer: Omit<Customer, 'id' | 'driverLicenseImageUrl'>, file: File): Promise<Customer> => {
    const filePath = `driver_licenses/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);

    const { data, error } = await supabase.from('customers').insert({
        ...customer,
        driverLicenseImageUrl: urlData.publicUrl
    }).select().single();
    if (error) throw error;
    return data;
}
export const updateCustomer = async (customer: Customer) => {
    const { error } = await supabase.from('customers').update(customer).eq('id', customer.id);
    if (error) throw error;
}
export const deleteCustomer = async (id: string) => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
}

// --- RESERVATIONS ---
export const getReservations = async (): Promise<Reservation[]> => {
    const { data, error } = await supabase
        .from('reservations')
        .select(`*, customer:customers(*), vehicle:vehicles(*)`);
    if (error) throw error;
    return data;
}

export const getReservationByToken = async (token: string): Promise<Reservation | null> => {
    const { data, error } = await supabase
        .from('reservations')
        .select(`*, vehicle:vehicles(*)`)
        .eq('portalToken', token)
        .single();
    if (error) {
        console.error("Error fetching reservation by token:", error);
        return null;
    }
    return data;
}

export const createPendingReservation = async (vehicleId: string, startDate: Date, endDate: Date): Promise<Reservation> => {
    const portalToken = crypto.randomUUID();
    const { data, error } = await supabase.from('reservations').insert({
        vehicleId,
        startDate,
        endDate,
        status: 'pending-customer',
        totalPrice: 0, // Price will be calculated later
        portalToken,
    }).select().single();
    if (error) throw error;
    return data;
}

export const submitCustomerDetails = async (token: string, customerData: Omit<Customer, 'id' | 'driverLicenseImageUrl'>, file: File) => {
    // 1. Upload driver license
    const filePath = `driver_licenses/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);

    // 2. Create customer
    const { data: newCustomer, error: customerError } = await supabase.from('customers').insert({
        ...customerData,
        driverLicenseImageUrl: urlData.publicUrl
    }).select().single();
    if(customerError) throw customerError;

    // 3. Update reservation
    const { error: reservationError } = await supabase
        .from('reservations')
        .update({ customerId: newCustomer.id, status: 'confirmed' })
        .eq('portalToken', token);
    if(reservationError) throw reservationError;
}

export const addReservation = async (reservation: Omit<Reservation, 'id'>) => {
    const { error } = await supabase.from('reservations').insert(reservation);
    if (error) throw error;
}

export const updateReservation = async (reservation: Partial<Reservation> & {id: string}) => {
    const { error } = await supabase.from('reservations').update(reservation).eq('id', reservation.id);
    if (error) throw error;
}

export const deleteReservation = async (id: string) => {
    const { error } = await supabase.from('reservations').delete().eq('id', id);
    if (error) throw error;
}

export const getAvailableVehicles = async (start: Date, end: Date): Promise<Vehicle[]> => {
    // This is a simplified query. A real implementation should use a database function for accuracy.
    const { data: reservations, error } = await supabase
        .from('reservations')
        .select('vehicleId')
        .or(`startDate.lte.${end.toISOString()},endDate.gte.${start.toISOString()}`);
    
    if (error) throw error;
    
    const unavailableVehicleIds = reservations.map(r => r.vehicleId);
    
    const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .not('id', 'in', `(${unavailableVehicleIds.join(',')})`);
    
    if (vehiclesError) throw vehiclesError;
    return vehicles;
};


// --- CONTRACTS ---
export const getContracts = async (): Promise<Contract[]> => {
    const { data, error } = await supabase.from('contracts').select('*, customer:customers(*), vehicle:vehicles(*)');
    if (error) throw error;
    return data;
}

export const generateContract = async (reservation: Reservation): Promise<string> => {
    if (!reservation.customer || !reservation.vehicle) {
        throw new Error("Customer and vehicle data are required to generate a contract.");
    }
    const prompt = `
        Vygeneruj jednoduchou smlouvu o nájmu vozidla v češtině.

        Pronajímatel:
        Van Rental Pro
        Ukázková 123
        110 00 Praha 1
        IČO: 12345678

        Nájemce:
        Jméno: ${reservation.customer.firstName} ${reservation.customer.lastName}
        Adresa: ${reservation.customer.address}
        Číslo ŘP: ${reservation.customer.driverLicenseNumber}
        Telefon: ${reservation.customer.phone}
        Email: ${reservation.customer.email}

        Vozidlo:
        Typ: ${reservation.vehicle.name} (${reservation.vehicle.make} ${reservation.vehicle.model})
        SPZ: ${reservation.vehicle.licensePlate}
        Rok výroby: ${reservation.vehicle.year}

        Doba nájmu:
        Od: ${new Date(reservation.startDate).toLocaleString('cs-CZ')}
        Do: ${new Date(reservation.endDate).toLocaleString('cs-CZ')}

        Cena:
        Celková cena: ${reservation.totalPrice.toLocaleString('cs-CZ')} Kč

        Smlouva by měla obsahovat standardní klauzule o stavu vozidla, omezeních použití, odpovědnosti za škody a podpisy pro obě strany.
        Text by měl být prostý text, dobře naformátovaný pro zobrazení.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating contract with Gemini API:", error);
        throw new Error("Nepodařilo se vygenerovat text smlouvy.");
    }
};

export const saveContract = async (contract: Omit<Contract, 'id' | 'generatedAt' | 'customer' | 'vehicle'>) => {
    const { error } = await supabase.from('contracts').insert(contract);
    if(error) throw error;
}


// --- SERVICE RECORDS ---
export const getServiceRecordsForVehicle = async (vehicleId: string): Promise<ServiceRecord[]> => {
    const { data, error } = await supabase.from('service_records').select('*').eq('vehicleId', vehicleId).order('serviceDate', { ascending: false });
    if(error) throw error;
    return data;
}
export const addServiceRecord = async (record: Omit<ServiceRecord, 'id'>, vehicleName: string) => {
    const { data, error } = await supabase.from('service_records').insert(record).select().single();
    if(error) throw error;

    // Add corresponding expense
    await addExpense({
        description: `Servis: ${vehicleName} - ${record.description}`,
        amount: record.cost,
        date: record.serviceDate,
    });
    return data;
}
export const deleteServiceRecord = async (id: string) => {
    const { error } = await supabase.from('service_records').delete().eq('id', id);
    if (error) throw error;
}


// --- FINANCIALS ---
export const getFinancials = async (): Promise<FinancialTransaction[]> => {
    const { data, error } = await supabase.from('financial_transactions').select('*').order('date', { ascending: false });
    if(error) throw error;
    return data;
}

export const addExpense = async (expense: Omit<FinancialTransaction, 'id' | 'type'>) => {
    const { error } = await supabase.from('financial_transactions').insert({ ...expense, type: 'expense' });
    if (error) throw error;
}

// --- REPORTS ---
export const getReportsData = async () => {
    // Placeholder function
    return {
        vehiclePerformance: [],
        incomeByCategory: []
    };
}
