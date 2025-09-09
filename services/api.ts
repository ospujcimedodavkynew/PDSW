import { createClient } from '@supabase/supabase-js';
import type { Vehicle, Customer, Reservation, Contract, FinancialTransaction } from '../types';

// V prostředí bez build-processu se proměnné prostředí často nenastavují přes import.meta.env.
// Bezpečnější metodou je načíst je z globálního objektu window, kam je platforma
// jako Vercel může vložit. Toto řeší chybu 'import.meta.env is undefined'.
const supabaseUrl = (window as any).VITE_SUPABASE_URL;
const supabaseAnonKey = (window as any).VITE_SUPABASE_ANON_KEY;


// Exportujeme stav, aby UI mohlo reagovat a zobrazit chybovou hlášku
export const areSupabaseCredentialsSet = !!(supabaseUrl && supabaseAnonKey);

const supabase = areSupabaseCredentialsSet ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Helper, který zajistí, že nevoláme funkce, pokud není klient nakonfigurován
const getClient = () => {
    if (!supabase) {
        throw new Error("Supabase client is not initialized. This should be prevented by the UI check.");
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

// Vehicle API
export const getVehicles = async (): Promise<Vehicle[]> => {
    const { data, error } = await getClient().from('vehicles').select('*').order('name');
    handleSupabaseError(error, 'getVehicles');
    return (data || []).map(v => ({...v, year: v.year || 0, rate4h: v.rate4h || 0, rate12h: v.rate12h || 0, dailyRate: v.daily_rate || 0, licensePlate: v.license_plate, imageUrl: v.image_url}));
};

export const addVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'imageUrl'>): Promise<Vehicle> => {
    const { data, error } = await getClient()
        .from('vehicles')
        .insert({
            name: vehicleData.name,
            make: vehicleData.make,
            model: vehicleData.model,
            year: vehicleData.year,
            license_plate: vehicleData.licensePlate,
            status: vehicleData.status,
            rate4h: vehicleData.rate4h,
            rate12h: vehicleData.rate12h,
            daily_rate: vehicleData.dailyRate,
            features: vehicleData.features,
            image_url: `https://placehold.co/600x400/e2e8f0/475569?text=${encodeURIComponent(vehicleData.name)}`
        })
        .select()
        .single();
    handleSupabaseError(error, 'addVehicle');
    return {...data, year: data.year || 0, rate4h: data.rate4h || 0, rate12h: data.rate12h || 0, dailyRate: data.daily_rate || 0, licensePlate: data.license_plate, imageUrl: data.image_url};
};

export const updateVehicle = async (updatedVehicle: Vehicle): Promise<Vehicle> => {
    const { data, error } = await getClient()
        .from('vehicles')
        .update({
            name: updatedVehicle.name,
            make: updatedVehicle.make,
            model: updatedVehicle.model,
            year: updatedVehicle.year,
            license_plate: updatedVehicle.licensePlate,
            status: updatedVehicle.status,
            rate4h: updatedVehicle.rate4h,
            rate12h: updatedVehicle.rate12h,
            daily_rate: updatedVehicle.dailyRate,
            features: updatedVehicle.features,
            image_url: updatedVehicle.imageUrl,
        })
        .eq('id', updatedVehicle.id)
        .select()
        .single();
    handleSupabaseError(error, 'updateVehicle');
    return {...data, year: data.year || 0, rate4h: data.rate4h || 0, rate12h: data.rate12h || 0, dailyRate: data.daily_rate || 0, licensePlate: data.license_plate, imageUrl: data.image_url};
};

// Customer API
export const getCustomers = async (): Promise<Customer[]> => {
    const { data, error } = await getClient().from('customers').select('*').order('last_name');
    handleSupabaseError(error, 'getCustomers');
    return (data || []).map(c => ({...c, firstName: c.first_name, lastName: c.last_name, driverLicenseNumber: c.driver_license_number, driverLicenseImageUrl: c.driver_license_image_url}));
};

export const addCustomer = async (customerData: Omit<Customer, 'id'>): Promise<Customer> => {
    const { data, error } = await getClient().from('customers').insert({
        first_name: customerData.firstName,
        last_name: customerData.lastName,
        email: customerData.email,
        phone: customerData.phone,
        driver_license_number: customerData.driverLicenseNumber,
        address: customerData.address,
        driver_license_image_url: customerData.driverLicenseImageUrl,
    }).select().single();
    handleSupabaseError(error, 'addCustomer');
    return {...data, firstName: data.first_name, lastName: data.last_name, driverLicenseNumber: data.driver_license_number, driverLicenseImageUrl: data.driver_license_image_url};
};

export const updateCustomer = async (updatedCustomer: Customer): Promise<Customer> => {
    const { data, error } = await getClient().from('customers').update({
        first_name: updatedCustomer.firstName,
        last_name: updatedCustomer.lastName,
        email: updatedCustomer.email,
        phone: updatedCustomer.phone,
        driver_license_number: updatedCustomer.driverLicenseNumber,
        address: updatedCustomer.address,
    }).eq('id', updatedCustomer.id).select().single();
    handleSupabaseError(error, 'updateCustomer');
    return {...data, firstName: data.first_name, lastName: data.last_name, driverLicenseNumber: data.driver_license_number, driverLicenseImageUrl: data.driver_license_image_url};
};

// Reservation API
export const getReservations = async (): Promise<Reservation[]> => {
    const { data, error } = await getClient()
        .from('reservations')
        .select('*, customer:customers(*), vehicle:vehicles(*)');
    handleSupabaseError(error, 'getReservations');
    
    // Map database snake_case to camelCase and parse dates
    return (data || []).map(r => ({
        id: r.id,
        customerId: r.customer_id,
        vehicleId: r.vehicle_id,
        startDate: new Date(r.start_date),
        endDate: new Date(r.end_date),
        status: r.status,
        portalToken: r.portal_token,
        notes: r.notes,
        customer: r.customer ? {...r.customer, firstName: r.customer.first_name, lastName: r.customer.last_name, driverLicenseNumber: r.customer.driver_license_number, driverLicenseImageUrl: r.customer.driver_license_image_url} : undefined,
        vehicle: r.vehicle ? {...r.vehicle, dailyRate: r.vehicle.daily_rate, licensePlate: r.vehicle.license_plate, imageUrl: r.vehicle.image_url} : undefined,
    }));
};

export const addReservation = async (reservationData: Omit<Reservation, 'id' | 'status'>): Promise<Reservation> => {
    const { data, error } = await getClient().from('reservations').insert({ 
        customer_id: reservationData.customerId,
        vehicle_id: reservationData.vehicleId,
        start_date: reservationData.startDate.toISOString(),
        end_date: reservationData.endDate.toISOString(),
        status: 'scheduled' 
    }).select().single();
    handleSupabaseError(error, 'addReservation');
    return {...data, customerId: data.customer_id, vehicleId: data.vehicle_id, startDate: new Date(data.start_date), endDate: new Date(data.end_date), portalToken: data.portal_token };
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
    
    return {...reservation, customerId: reservation.customer_id, vehicleId: reservation.vehicle_id, startDate: new Date(reservation.start_date), endDate: new Date(reservation.end_date), portalToken: reservation.portal_token };
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
    
    return {...reservation, customerId: reservation.customer_id, vehicleId: reservation.vehicle_id, startDate: new Date(reservation.start_date), endDate: new Date(reservation.end_date), portalToken: reservation.portal_token };
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
            portal_token: token
        })
        .select()
        .single();
    handleSupabaseError(error, 'createPendingReservation');
    return {...data, customerId: data.customer_id, vehicleId: data.vehicle_id, portalToken: data.portal_token };
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
    return {
        id: data.id,
        customerId: data.customer_id,
        vehicleId: data.vehicle_id,
        startDate: new Date(data.start_date),
        endDate: new Date(data.end_date),
        status: data.status,
        portalToken: data.portal_token,
        notes: data.notes,
        vehicle: data.vehicle ? {...data.vehicle, dailyRate: data.vehicle.daily_rate, licensePlate: data.vehicle.license_plate, imageUrl: data.vehicle.image_url} : undefined,
    };
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
    const { data: newCustomer, error: customerError } = await getClient()
        .from('customers')
        .insert({ 
            first_name: customerData.firstName,
            last_name: customerData.lastName,
            email: customerData.email,
            phone: customerData.phone,
            driver_license_number: customerData.driverLicenseNumber,
            address: customerData.address,
            driver_license_image_url: publicUrl 
        })
        .select()
        .single();
    handleSupabaseError(customerError, 'submitCustomerDetails - create customer');

    // 4. Aktualizovat rezervaci s ID nového zákazníka a změnit status
    const { data: updatedReservation, error: reservationError } = await getClient()
        .from('reservations')
        .update({
            customer_id: newCustomer.id,
            status: 'scheduled',
            start_date: new Date().toISOString(),
            end_date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString()
        })
        .eq('portal_token', portalToken)
        .select()
        .single();
    handleSupabaseError(reservationError, 'submitCustomerDetails - update reservation');

    return {...updatedReservation, customerId: updatedReservation.customer_id, vehicleId: updatedReservation.vehicle_id, startDate: new Date(updatedReservation.start_date), endDate: new Date(updatedReservation.end_date), portalToken: updatedReservation.portal_token };
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