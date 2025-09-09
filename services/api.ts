import { createClient } from '@supabase/supabase-js';
import type { Vehicle, Customer, Reservation, Contract, FinancialTransaction } from '../types';

// Tyto proměnné budou automaticky dosazeny Vercel-em při nasazení
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key are not set. Please check your environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper pro zpracování chyb od Supabase
const handleSupabaseError = (error: any, context: string) => {
    if (error) {
        console.error(`Error in ${context}:`, error);
        throw new Error(error.message);
    }
};

// Vehicle API
export const getVehicles = async (): Promise<Vehicle[]> => {
    const { data, error } = await supabase.from('vehicles').select('*').order('name');
    handleSupabaseError(error, 'getVehicles');
    return data || [];
};

export const addVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'imageUrl'>): Promise<Vehicle> => {
    const { data, error } = await supabase
        .from('vehicles')
        .insert({
            ...vehicleData,
            image_url: `https://placehold.co/600x400/e2e8f0/475569?text=${encodeURIComponent(vehicleData.name)}`
        })
        .select()
        .single();
    handleSupabaseError(error, 'addVehicle');
    return data;
};

export const updateVehicle = async (updatedVehicle: Vehicle): Promise<Vehicle> => {
    const { data, error } = await supabase
        .from('vehicles')
        .update(updatedVehicle)
        .eq('id', updatedVehicle.id)
        .select()
        .single();
    handleSupabaseError(error, 'updateVehicle');
    return data;
};

// Customer API
export const getCustomers = async (): Promise<Customer[]> => {
    const { data, error } = await supabase.from('customers').select('*').order('last_name');
    handleSupabaseError(error, 'getCustomers');
    return data || [];
};

export const addCustomer = async (customerData: Omit<Customer, 'id'>): Promise<Customer> => {
    const { data, error } = await supabase.from('customers').insert(customerData).select().single();
    handleSupabaseError(error, 'addCustomer');
    return data;
};

export const updateCustomer = async (updatedCustomer: Customer): Promise<Customer> => {
    const { data, error } = await supabase.from('customers').update(updatedCustomer).eq('id', updatedCustomer.id).select().single();
    handleSupabaseError(error, 'updateCustomer');
    return data;
};

// Reservation API
export const getReservations = async (): Promise<Reservation[]> => {
    const { data, error } = await supabase
        .from('reservations')
        .select('*, customer:customers(*), vehicle:vehicles(*)');
    handleSupabaseError(error, 'getReservations');
    return data || [];
};

export const addReservation = async (reservationData: Omit<Reservation, 'id' | 'status'>): Promise<Reservation> => {
    const { data, error } = await supabase.from('reservations').insert({ ...reservationData, status: 'scheduled' }).select().single();
    handleSupabaseError(error, 'addReservation');
    return data;
};

export const activateReservation = async (reservationId: string): Promise<Reservation> => {
    const { data: reservation, error: resError } = await supabase
        .from('reservations')
        .update({ status: 'active' })
        .eq('id', reservationId)
        .select()
        .single();
    handleSupabaseError(resError, 'activateReservation - update reservation');

    const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ status: 'rented' })
        .eq('id', reservation.vehicle_id);
    handleSupabaseError(vehicleError, 'activateReservation - update vehicle');
    
    return reservation;
};

export const completeReservation = async (reservationId: string, notes: string): Promise<Reservation> => {
    const { data: reservation, error: resError } = await supabase
        .from('reservations')
        .update({ status: 'completed', notes })
        .eq('id', reservationId)
        .select()
        .single();
    handleSupabaseError(resError, 'completeReservation - update reservation');

    const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ status: 'available' })
        .eq('id', reservation.vehicle_id);
    handleSupabaseError(vehicleError, 'completeReservation - update vehicle');
    
    return reservation;
};

// Self-service API
export const createPendingReservation = async (vehicleId: string): Promise<Reservation> => {
    const token = `portal-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const { data, error } = await supabase
        .from('reservations')
        .insert({
            customer_id: null,
            vehicle_id: vehicleId,
            status: 'pending-customer',
            portal_token: token
        })
        .select()
        .single();
    handleSupabaseError(error, 'createPendingReservation');
    return data;
};

export const getReservationByToken = async (token: string): Promise<Reservation | undefined> => {
    const { data, error } = await supabase
        .from('reservations')
        .select('*, vehicle:vehicles(*)')
        .eq('portal_token', token)
        .single();
    // Zde nechceme házet chybu, pokud se nic nenajde
    if (error && error.code !== 'PGRST116') { // PGRST116 = "exact one row not found"
      handleSupabaseError(error, 'getReservationByToken');
    }
    return data || undefined;
}

export const submitCustomerDetails = async (portalToken: string, customerData: Omit<Customer, 'id' | 'driverLicenseImageUrl'>, driverLicenseImage: File): Promise<Reservation> => {
    // 1. Nahrát obrázek do Supabase Storage
    const filePath = `public/${portalToken}-${driverLicenseImage.name}`;
    const { error: uploadError } = await supabase.storage
        .from('licenses')
        .upload(filePath, driverLicenseImage);
    handleSupabaseError(uploadError, 'submitCustomerDetails - image upload');

    // 2. Získat veřejnou URL obrázku
    const { data: { publicUrl } } = supabase.storage
        .from('licenses')
        .getPublicUrl(filePath);

    // 3. Vytvořit nového zákazníka s URL obrázku
    const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({ ...customerData, driver_license_image_url: publicUrl })
        .select()
        .single();
    handleSupabaseError(customerError, 'submitCustomerDetails - create customer');

    // 4. Aktualizovat rezervaci s ID nového zákazníka a změnit status
    const { data: updatedReservation, error: reservationError } = await supabase
        .from('reservations')
        .update({
            customer_id: newCustomer.id,
            status: 'scheduled',
            start_date: new Date().toISOString(), // Nastavíme defaultní datum
            end_date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString()
        })
        .eq('portal_token', portalToken)
        .select()
        .single();
    handleSupabaseError(reservationError, 'submitCustomerDetails - update reservation');

    return updatedReservation;
};

// Zástupné funkce pro Smlouvy a Finance
export const getContracts = async (): Promise<Contract[]> => {
    console.warn("getContracts is not implemented for Supabase yet.");
    return [];
};

export const getFinancials = async (): Promise<FinancialTransaction[]> => {
    console.warn("getFinancials is not implemented for Supabase yet.");
    return [];
};
