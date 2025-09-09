import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Vehicle, Customer, Reservation, Contract, FinancialTransaction } from '../types';

let supabase: SupabaseClient | null = null;
let credentialsChecked = false;
let credentialsAreSet = false;

// Function to check credentials. It caches the result for performance.
export const areSupabaseCredentialsSet = (): boolean => {
    if (credentialsChecked) {
        return credentialsAreSet;
    }

    const env = (window as any).env || {};
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

    credentialsAreSet = 
        !!supabaseUrl && 
        !!supabaseAnonKey && 
        !supabaseUrl.includes("vasedomena") && 
        !supabaseAnonKey.includes("vas_anon_public_klic");
        
    credentialsChecked = true;
    return credentialsAreSet;
};

// Singleton pattern to get the Supabase client. It initializes the client only once when first needed.
const getSupabaseClient = (): SupabaseClient => {
    if (supabase) {
        return supabase;
    }
    
    if (!areSupabaseCredentialsSet()) {
        // This message is for developers; the user sees the message from App.tsx
        const errorMessage = "Supabase client cannot be initialized. Credentials are not set correctly in index.html.";
        console.error(errorMessage);
        throw new Error(errorMessage);
    }
    
    const env = (window as any).env || {};
    supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
    return supabase;
};

// A helper function to handle Supabase errors
const handleSupabaseError = ({ data, error }: { data: any, error: any }) => {
    if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message);
    }
    return data;
};

// Vehicle API
export const getVehicles = async (): Promise<Vehicle[]> => {
    const client = getSupabaseClient();
    const { data, error } = await client.from('vehicles').select('*');
    return handleSupabaseError({ data, error });
};

export const addVehicle = async (vehicle: Omit<Vehicle, 'id' | 'imageUrl'>): Promise<Vehicle> => {
    const client = getSupabaseClient();
    const vehicleWithImage = { ...vehicle, imageUrl: `https://placehold.co/600x400/E2E8F0/4A5568?text=${encodeURI(vehicle.name || 'New Van')}` };
    const { data, error } = await client.from('vehicles').insert([vehicleWithImage]).select();
    const result = handleSupabaseError({ data, error });
    return result[0];
};

export const updateVehicle = async (vehicle: Vehicle): Promise<Vehicle> => {
    const client = getSupabaseClient();
    const { data, error } = await client.from('vehicles').update(vehicle).eq('id', vehicle.id).select();
    const result = handleSupabaseError({ data, error });
    return result[0];
};

// Customer API
export const getCustomers = async (): Promise<Customer[]> => {
    const client = getSupabaseClient();
    const { data, error } = await client.from('customers').select('*');
    return handleSupabaseError({ data, error });
};

export const addCustomer = async (customer: Omit<Customer, 'id'>): Promise<Customer> => {
    const client = getSupabaseClient();
    const { data, error } = await client.from('customers').insert([customer]).select();
    const result = handleSupabaseError({ data, error });
    return result[0];
};

export const updateCustomer = async (customer: Customer): Promise<Customer> => {
    const client = getSupabaseClient();
    const { data, error } = await client.from('customers').update(customer).eq('id', customer.id).select();
    const result = handleSupabaseError({ data, error });
    return result[0];
};

// Reservation API
export const getReservations = async (): Promise<Reservation[]> => {
    const client = getSupabaseClient();
    const { data, error } = await client
        .from('reservations')
        .select(`*, customer:customers(*), vehicle:vehicles(*)`);
    const reservations = handleSupabaseError({ data, error });
    // Convert date strings to Date objects
    return reservations.map((r: any) => ({
        ...r,
        startDate: r.startDate ? new Date(r.startDate) : undefined,
        endDate: r.endDate ? new Date(r.endDate) : undefined,
    }));
};

export const addReservation = async (reservation: Partial<Reservation>): Promise<Reservation> => {
    const client = getSupabaseClient();
    const newReservation = {
        ...reservation,
        status: 'scheduled',
    };
    const { data, error } = await client.from('reservations').insert([newReservation]).select();
    const result = handleSupabaseError({ data, error });
    return result[0];
};

export const createPendingReservation = async (vehicleId: string): Promise<Reservation> => {
    const client = getSupabaseClient();
    const portalToken = crypto.randomUUID();
    const { data, error } = await client
        .from('reservations')
        .insert([{
            vehicleId,
            status: 'pending-customer',
            portalToken,
        }])
        .select();
    const result = handleSupabaseError({ data, error });
    return result[0];
};

export const activateReservation = async (reservationId: string): Promise<Reservation> => {
    const client = getSupabaseClient();
    const { data, error } = await client
        .from('reservations')
        .update({ status: 'active' })
        .eq('id', reservationId)
        .select('*, vehicle:vehicles(id)');
    const result = handleSupabaseError({ data, error });
    if (result[0]?.vehicle?.id) {
        await client.from('vehicles').update({ status: 'rented' }).eq('id', result[0].vehicle.id);
    }
    return result[0];
};

export const completeReservation = async (reservationId: string, notes: string): Promise<Reservation> => {
    const client = getSupabaseClient();
    const { data, error } = await client
        .from('reservations')
        .update({ status: 'completed', notes })
        .eq('id', reservationId)
        .select('*, vehicle:vehicles(id)');
    const result = handleSupabaseError({ data, error });
    if (result[0]?.vehicle?.id) {
        await client.from('vehicles').update({ status: 'available' }).eq('id', result[0].vehicle.id);
    }
    return result[0];
};

export const getReservationByToken = async (token: string): Promise<Reservation | null> => {
    const client = getSupabaseClient();
     const { data, error } = await client
        .from('reservations')
        .select(`*, vehicle:vehicles(*)`)
        .eq('portalToken', token)
        .eq('status', 'pending-customer')
        .maybeSingle();
    const reservation = handleSupabaseError({ data, error });
    if (!reservation) return null;
    return {
        ...reservation,
        startDate: reservation.startDate ? new Date(reservation.startDate) : undefined,
        endDate: reservation.endDate ? new Date(reservation.endDate) : undefined,
    }
};

export const updateReservationWithCustomerData = async (reservationId: string, customerId: string, startDate: Date, endDate: Date): Promise<Reservation> => {
    const client = getSupabaseClient();
    const { data, error } = await client
        .from('reservations')
        .update({
            customerId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            status: 'scheduled'
        })
        .eq('id', reservationId)
        .select();
    const result = handleSupabaseError({ data, error });
    return result[0];
};

// Contract API
export const getContracts = async (): Promise<Contract[]> => {
    const client = getSupabaseClient();
    const { data, error } = await client
        .from('contracts')
        .select(`*, customer:customers(*), vehicle:vehicles(*)`);
    const contracts = handleSupabaseError({ data, error });
    // Convert date strings to Date objects
    return contracts.map((c: any) => ({
        ...c,
        generatedAt: new Date(c.generatedAt),
    }));
};

export const addContract = async (contractData: {
    reservationId: string;
    customerId: string;
    vehicleId: string;
    contractText: string;
}): Promise<Contract> => {
    const client = getSupabaseClient();
    const { data, error } = await client
        .from('contracts')
        .insert([contractData])
        .select();
    const result = handleSupabaseError({ data, error });
    return result[0];
};


// Financials API
export const getFinancials = async (): Promise<FinancialTransaction[]> => {
    const client = getSupabaseClient();
    const { data, error } = await client.from('financial_transactions').select('*');
    const financials = handleSupabaseError({ data, error });
    // Convert date strings to Date objects
    return financials.map((f: any) => ({
        ...f,
        date: new Date(f.date),
    }));
};

// Storage API
export const uploadFile = async (bucket: string, path: string, file: File): Promise<{ publicUrl: string }> => {
    const client = getSupabaseClient();
    const { error: uploadError } = await client.storage.from(bucket).upload(path, file);
    if (uploadError) {
        throw uploadError;
    }
    const { data } = client.storage.from(bucket).getPublicUrl(path);
    return { publicUrl: data.publicUrl };
};