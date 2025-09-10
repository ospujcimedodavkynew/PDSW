import { createClient } from '@supabase/supabase-js';
import type { Vehicle, Customer, Reservation, Contract, FinancialTransaction } from '../types';

// Načtení konfigurace z globálního objektu window, který je definován v index.html
const env = (window as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;


// Exportujeme stav, aby UI mohlo reagovat a zobrazit chybovou hlášku.
// Kontrolujeme, zda hodnoty nejsou výchozí placeholdery.
export const areSupabaseCredentialsSet = 
    !!(supabaseUrl && supabaseAnonKey && 
    !supabaseUrl.includes("vasedomena") && 
    !supabaseAnonKey.includes("vas_anon_public_klic"));

const supabase = areSupabaseCredentialsSet ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Helper, který zajistí, že nevoláme funkce, pokud není klient nakonfigurován
const getClient = () => {
    if (!supabase) {
        throw new Error("Supabase client is not initialized. Check your environment variables in index.html.");
    }
    return supabase;
}

// Helper pro zpracování chyb od Supabase
const handleSupabaseError = (error: any, context: string) => {
    if (error) {
        console.error(`Error in ${context}:`, error);
        throw new Error(error.message);
    }
};

// --- Mappers for data consistency ---

const toVehicle = (dbVehicle: any): Vehicle => ({
    id: dbVehicle.id,
    name: dbVehicle.name,
    make: dbVehicle.make,
    model: dbVehicle.model,
    year: dbVehicle.year,
    licensePlate: dbVehicle.license_plate,
    status: dbVehicle.status,
    imageUrl: dbVehicle.image_url,
    rate4h: dbVehicle.rate4h,
    rate12h: dbVehicle.rate12h,
    dailyRate: dbVehicle.daily_rate,
    features: dbVehicle.features || [],
});

const fromVehicle = (vehicle: Partial<Vehicle>) => ({
    name: vehicle.name,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    license_plate: vehicle.licensePlate,
    status: vehicle.status,
    rate4h: vehicle.rate4h,
    rate12h: vehicle.rate12h,
    daily_rate: vehicle.dailyRate,
    features: vehicle.features,
    image_url: vehicle.imageUrl,
});

const toCustomer = (dbCustomer: any): Customer => ({
    id: dbCustomer.id,
    firstName: dbCustomer.first_name,
    lastName: dbCustomer.last_name,
    email: dbCustomer.email,
    phone: dbCustomer.phone,
    driverLicenseNumber: dbCustomer.driver_license_number,
    address: dbCustomer.address,
    driverLicenseImageUrl: dbCustomer.driver_license_image_url,
});

const fromCustomer = (customer: Partial<Customer>) => ({
    first_name: customer.firstName,
    last_name: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    driver_license_number: customer.driverLicenseNumber,
    address: customer.address,
    driver_license_image_url: customer.driverLicenseImageUrl,
});

const toReservation = (dbReservation: any): Reservation => ({
    id: dbReservation.id,
    customerId: dbReservation.customer_id,
    vehicleId: dbReservation.vehicle_id,
    startDate: dbReservation.start_date ? new Date(dbReservation.start_date) : undefined,
    endDate: dbReservation.end_date ? new Date(dbReservation.end_date) : undefined,
    status: dbReservation.status,
    portalToken: dbReservation.portal_token,
    notes: dbReservation.notes,
    customer: dbReservation.customers ? toCustomer(dbReservation.customers) : (dbReservation.customer ? toCustomer(dbReservation.customer) : undefined),
    vehicle: dbReservation.vehicles ? toVehicle(dbReservation.vehicles) : (dbReservation.vehicle ? toVehicle(dbReservation.vehicle) : undefined),
});


// Vehicle API
export const getVehicles = async (): Promise<Vehicle[]> => {
    const { data, error } = await getClient().from('vehicles').select('*').order('name');
    handleSupabaseError(error, 'getVehicles');
    return (data || []).map(toVehicle);
};

export const addVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'imageUrl'>): Promise<Vehicle> => {
    const dbData = fromVehicle(vehicleData);
    dbData.image_url = `https://placehold.co/600x400/e2e8f0/475569?text=${encodeURIComponent(vehicleData.name)}`;
    
    const { data, error } = await getClient()
        .from('vehicles')
        .insert(dbData)
        .select()
        .single();
    handleSupabaseError(error, 'addVehicle');
    return toVehicle(data);
};

export const updateVehicle = async (updatedVehicle: Vehicle): Promise<Vehicle> => {
    const dbData = fromVehicle(updatedVehicle);
    const { data, error } = await getClient()
        .from('vehicles')
        .update(dbData)
        .eq('id', updatedVehicle.id)
        .select()
        .single();
    handleSupabaseError(error, 'updateVehicle');
    return toVehicle(data);
};

// Customer API
export const getCustomers = async (): Promise<Customer[]> => {
    const { data, error } = await getClient().from('customers').select('*').order('last_name');
    handleSupabaseError(error, 'getCustomers');
    return (data || []).map(toCustomer);
};

export const addCustomer = async (customerData: Omit<Customer, 'id'>): Promise<Customer> => {
    const { data, error } = await getClient().from('customers').insert(fromCustomer(customerData)).select().single();
    handleSupabaseError(error, 'addCustomer');
    return toCustomer(data);
};

export const updateCustomer = async (updatedCustomer: Customer): Promise<Customer> => {
    const { data, error } = await getClient().from('customers').update(fromCustomer(updatedCustomer)).eq('id', updatedCustomer.id).select().single();
    handleSupabaseError(error, 'updateCustomer');
    return toCustomer(data);
};

// Reservation API
export const getReservations = async (): Promise<Reservation[]> => {
    const { data, error } = await getClient()
        .from('reservations')
        .select('*, customer:customers(*), vehicle:vehicles(*)');
    handleSupabaseError(error, 'getReservations');
    return (data || []).map(toReservation);
};

export const addReservation = async (reservationData: Omit<Reservation, 'id' | 'status'>): Promise<Reservation> => {
    if (!reservationData.startDate || !reservationData.endDate) {
        throw new Error("Start date and end date are required for a standard reservation.");
    }
    const { data, error } = await getClient().from('reservations').insert({ 
        customer_id: reservationData.customerId,
        vehicle_id: reservationData.vehicleId,
        start_date: reservationData.startDate.toISOString(),
        end_date: reservationData.endDate.toISOString(),
        status: 'scheduled' 
    }).select().single();
    handleSupabaseError(error, 'addReservation');
    return toReservation(data);
};

export const activateReservation = async (reservationId: string): Promise<Reservation> => {
    const { data: reservation, error: resError } = await getClient()
        .from('reservations')
        .update({ status: 'active' })
        .eq('id', reservationId)
        .select()
        .single();
    handleSupabaseError(resError, 'activateReservation - update reservation');

    const { error: vehicleError } = await getClient()
        .from('vehicles')
        .update({ status: 'rented' })
        .eq('id', reservation.vehicle_id);
    handleSupabaseError(vehicleError, 'activateReservation - update vehicle');
    
    return toReservation(reservation);
};

export const completeReservation = async (reservationId: string, notes: string): Promise<Reservation> => {
    const { data: reservation, error: resError } = await getClient()
        .from('reservations')
        .update({ status: 'completed', notes })
        .eq('id', reservationId)
        .select()
        .single();
    handleSupabaseError(resError, 'completeReservation - update reservation');

    const { error: vehicleError } = await getClient()
        .from('vehicles')
        .update({ status: 'available' })
        .eq('id', reservation.vehicle_id);
    handleSupabaseError(vehicleError, 'completeReservation - update vehicle');
    
    return toReservation(reservation);
};

// Self-service API
export const createPendingReservation = async (vehicleId: string): Promise<Reservation> => {
    const token = `portal-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const { data, error } = await getClient()
        .from('reservations')
        .insert({
            customer_id: null,
            vehicle_id: vehicleId,
            status: 'pending-customer',
            portal_token: token,
            start_date: null,
            end_date: null
        })
        .select()
        .single();
    handleSupabaseError(error, 'createPendingReservation');
    return toReservation(data);
};

export const getReservationByToken = async (token: string): Promise<Reservation | undefined> => {
    const { data, error } = await getClient()
        .from('reservations')
        .select('*, vehicle:vehicles(*)')
        .eq('portal_token', token)
        .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = "exact one row not found"
      handleSupabaseError(error, 'getReservationByToken');
    }
    if (!data) return undefined;
    return toReservation(data);
}

export const submitCustomerDetails = async (portalToken: string, customerData: Omit<Customer, 'id' | 'driverLicenseImageUrl'>, driverLicenseImage: File): Promise<Reservation> => {
    // 1. Nahrát obrázek do Supabase Storage
    const filePath = `public/${portalToken}-${driverLicenseImage.name}`;
    const { error: uploadError } = await getClient().storage
        .from('licenses')
        .upload(filePath, driverLicenseImage);
    handleSupabaseError(uploadError, 'submitCustomerDetails - image upload');

    // 2. Získat veřejnou URL obrázku
    const { data: { publicUrl } } = getClient().storage
        .from('licenses')
        .getPublicUrl(filePath);

    // 3. Vytvořit nového zákazníka s URL obrázku
    const customerToInsert = fromCustomer(customerData);
    customerToInsert.driver_license_image_url = publicUrl;

    const { data: newCustomer, error: customerError } = await getClient()
        .from('customers')
        .insert(customerToInsert)
        .select()
        .single();
    handleSupabaseError(customerError, 'submitCustomerDetails - create customer');

    // 4. Aktualizovat rezervaci s ID nového zákazníka a změnit status
    const { data: updatedReservation, error: reservationError } = await getClient()
        .from('reservations')
        .update({
            customer_id: newCustomer.id,
            status: 'scheduled',
            start_date: new Date().toISOString(), // Default start date to now
            end_date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString() // Default end date to 24h from now
        })
        .eq('portal_token', portalToken)
        .select()
        .single();
    handleSupabaseError(reservationError, 'submitCustomerDetails - update reservation');

    return toReservation(updatedReservation);
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
