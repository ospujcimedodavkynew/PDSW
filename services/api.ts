import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import type { Vehicle, ServiceRecord, Customer, Reservation, Contract, FinancialTransaction, Invoice } from '../types';

// --- SUPABASE CLIENT INITIALIZATION ---
// This part is crucial. It reads the keys you provide in index.html.
const supabaseUrl = (window as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (window as any).env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  alert("FATAL ERROR: Supabase URL and Anon Key are not configured in index.html. The application cannot connect to the database.");
  throw new Error("Supabase URL and Anon Key are not set.");
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// --- HELPER FUNCTIONS FOR DATA MAPPING ---
// Maps database snake_case columns to application camelCase properties
const toVehicle = (data: any): Vehicle => ({
    id: data.id,
    name: data.name,
    make: data.make,
    model: data.model,
    year: data.year,
    licensePlate: data.license_plate,
    status: data.status,
    imageUrl: data.image_url,
    rate4h: data.rate4h,
    rate12h: data.rate12h,
    dailyRate: data.daily_rate,
    features: data.features || [],
    currentMileage: data.current_mileage,
    description: data.description,
    dimensions: data.dimensions
});

const toCustomer = (data: any): Customer => ({
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    phone: data.phone,
    driverLicenseNumber: data.driver_license_number,
    address: data.address,
    driverLicenseImageUrl: data.driver_license_image_url
});

const toReservation = (data: any): Reservation => ({
    id: data.id,
    customerId: data.customer_id,
    vehicleId: data.vehicle_id,
    startDate: data.start_date,
    endDate: data.end_date,
    status: data.status,
    notes: data.notes,
    startMileage: data.start_mileage,
    endMileage: data.end_mileage,
    portalToken: data.portal_token,
    totalPrice: data.total_price,
    customer: data.customers ? toCustomer(data.customers) : undefined,
    vehicle: data.vehicles ? toVehicle(data.vehicles) : undefined,
});

// --- AUTHENTICATION ---
export const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Přihlášení se nezdařilo. Zkontrolujte prosím své údaje.');
};

export const signOut = async () => {
    await supabase.auth.signOut();
};

export const onAuthStateChanged = (callback: (user: User | null) => void): (() => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(session?.user ?? null);
    });

    // Immediately call with current user
    supabase.auth.getUser().then(result => callback(result.data.user));

    return () => subscription.unsubscribe();
};


// --- VEHICLES & SERVICE RECORDS ---
export const getVehicles = async (): Promise<Vehicle[]> => {
    const { data, error } = await supabase.from('vehicles').select('*').order('name', { ascending: true });
    if (error) throw error;
    return data.map(toVehicle);
};

export const addVehicle = async (vehicle: Omit<Vehicle, 'id' | 'imageUrl'>): Promise<Vehicle> => {
    const { data, error } = await supabase.from('vehicles').insert({
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
        current_mileage: vehicle.currentMileage,
        description: vehicle.description,
        dimensions: vehicle.dimensions
    }).select().single();
    if (error) throw error;
    return toVehicle(data);
};

export const updateVehicle = async (vehicle: Vehicle): Promise<Vehicle> => {
    const { data, error } = await supabase.from('vehicles').update({
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
        current_mileage: vehicle.currentMileage,
        description: vehicle.description,
        dimensions: vehicle.dimensions,
        image_url: vehicle.imageUrl,
    }).eq('id', vehicle.id).select().single();
     if (error) throw error;
    return toVehicle(data);
};

export const getServiceRecordsForVehicle = async (vehicleId: string): Promise<ServiceRecord[]> => {
    const { data, error } = await supabase.from('service_records').select('*').eq('vehicle_id', vehicleId).order('service_date', { ascending: false });
    if (error) throw error;
    return data.map(d => ({...d, vehicleId: d.vehicle_id, serviceDate: d.service_date}));
};

export const addServiceRecord = async (record: Omit<ServiceRecord, 'id'>, vehicleName: string): Promise<ServiceRecord> => {
    const { data, error } = await supabase.from('service_records').insert({
        vehicle_id: record.vehicleId,
        description: record.description,
        cost: record.cost,
        mileage: record.mileage,
        service_date: record.serviceDate
    }).select().single();
    if (error) throw error;
    
    await addExpense({
        description: `Servis: ${vehicleName} - ${record.description}`,
        amount: record.cost,
        date: record.serviceDate
    });

    return {...data, vehicleId: data.vehicle_id, serviceDate: data.service_date};
};

export const deleteServiceRecord = async (recordId: string): Promise<void> => {
    const { error } = await supabase.from('service_records').delete().eq('id', recordId);
    if (error) throw error;
};

// --- CUSTOMERS ---
export const getCustomers = async (): Promise<Customer[]> => {
    const { data, error } = await supabase.from('customers').select('*').order('last_name', { ascending: true });
    if (error) throw error;
    return data.map(toCustomer);
};

export const addCustomer = async (customer: Omit<Customer, 'id'>): Promise<Customer> => {
    const { data, error } = await supabase.from('customers').insert({
        first_name: customer.firstName,
        last_name: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        driver_license_number: customer.driverLicenseNumber,
        address: customer.address,
        driver_license_image_url: customer.driverLicenseImageUrl
    }).select().single();
    if (error) throw error;
    return toCustomer(data);
};

export const updateCustomer = async (customer: Customer): Promise<Customer> => {
    const { data, error } = await supabase.from('customers').update({
        first_name: customer.firstName,
        last_name: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        driver_license_number: customer.driverLicenseNumber,
        address: customer.address,
        driver_license_image_url: customer.driverLicenseImageUrl
    }).eq('id', customer.id).select().single();
    if (error) throw error;
    return toCustomer(data);
};

// --- RESERVATIONS & PORTALS ---
export const getReservations = async (): Promise<Reservation[]> => {
    const { data, error } = await supabase.from('reservations').select(`
        *,
        customers:customer_id(*),
        vehicles:vehicle_id(*)
    `);
    if (error) throw error;
    return data.map(toReservation);
};

export const addReservation = async (reservation: Omit<Reservation, 'id' | 'status'>): Promise<Reservation> => {
    const { data, error } = await supabase.from('reservations').insert({
        customer_id: reservation.customerId,
        vehicle_id: reservation.vehicleId,
        start_date: reservation.startDate,
        end_date: reservation.endDate,
        status: 'scheduled',
        total_price: reservation.totalPrice
    }).select().single();
    if (error) throw error;
    return toReservation(data);
};

export const deleteReservation = async (reservationId: string): Promise<void> => {
    const { error } = await supabase.from('reservations').delete().eq('id', reservationId);
    if (error) throw error;
};

export const activateReservation = async (reservationId: string, startMileage: number): Promise<void> => {
    const { error } = await supabase.from('reservations').update({
        status: 'active',
        start_mileage: startMileage
    }).eq('id', reservationId);
    if (error) throw error;
};

export const completeReservation = async (reservationId: string, endMileage: number, notes: string): Promise<void> => {
    // 1. Fetch reservation to get details for financial transaction
    const { data: resData, error: fetchError } = await supabase.from('reservations').select(`
        *,
        customers:customer_id(first_name, last_name),
        vehicles:vehicle_id(name)
    `).eq('id', reservationId).single();
    if (fetchError || !resData) throw fetchError || new Error('Reservation not found');
    
    // 2. Update reservation status
    const { error: updateError } = await supabase.from('reservations').update({
        status: 'completed',
        end_mileage: endMileage,
        notes: notes
    }).eq('id', reservationId);
    if (updateError) throw updateError;
    
    // 3. Calculate extra charge and create income transaction
    const durationMs = new Date(resData.end_date).getTime() - new Date(resData.start_date).getTime();
    const rentalDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));
    const kmLimit = rentalDays * 300;
    const kmDriven = endMileage - resData.start_mileage;
    const kmOver = Math.max(0, kmDriven - kmLimit);
    const extraCharge = kmOver * 3;
    const finalPrice = resData.total_price + extraCharge;

    await supabase.from('financial_transactions').insert({
        reservation_id: reservationId,
        amount: finalPrice,
        date: new Date().toISOString(),
        description: `Pronájem: ${resData.vehicles.name} - ${resData.customers.first_name} ${resData.customers.last_name}`,
        type: 'income'
    });
};

export const getReservationByToken = async (token: string): Promise<Reservation | null> => {
    const { data, error } = await supabase.from('reservations').select(`
        *,
        vehicles:vehicle_id(*)
    `).eq('portal_token', token).single();
    if (error) return null;
    return toReservation(data);
};

export const createPendingReservation = async (vehicleId: string, startDate: Date, endDate: Date): Promise<Reservation> => {
    const portalToken = crypto.randomUUID();
    const { data, error } = await supabase.from('reservations').insert({
        vehicle_id: vehicleId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'pending-customer',
        portal_token: portalToken
    }).select().single();
    if (error) throw error;
    return toReservation(data);
};

export const submitCustomerDetails = async (token: string, customerData: Omit<Customer, 'id' | 'driverLicenseImageUrl'>, driverLicenseFile: File): Promise<void> => {
    // Find reservation by token
    const { data: resData, error: resError } = await supabase.from('reservations').select('id').eq('portal_token', token).single();
    if (resError || !resData) throw resError || new Error("Reservation not found for this token.");

    // Upload driver license
    const filePath = `public/${resData.id}/${driverLicenseFile.name}`;
    const { error: uploadError } = await supabase.storage.from('licenses').upload(filePath, driverLicenseFile, { upsert: true });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('licenses').getPublicUrl(filePath);

    // Create customer
    const { data: newCustomer, error: customerError } = await supabase.from('customers').insert({
        ...customerData,
        first_name: customerData.firstName,
        last_name: customerData.lastName,
        driver_license_number: customerData.driverLicenseNumber,
        driver_license_image_url: publicUrl
    }).select().single();
    if (customerError) throw customerError;

    // Update reservation
    const { error: updateError } = await supabase.from('reservations').update({
        customer_id: newCustomer.id,
        status: 'scheduled'
    }).eq('id', resData.id);
    if (updateError) throw updateError;
};

export const submitOnlineReservation = async (reservationData: any, customerData: any, driverLicenseFile: File, vehicle: Vehicle): Promise<{ reservation: Reservation, customer: Customer, contractText: string }> => {
    // 1. Create Customer and upload license
    const { data: newCustomer, error: customerError } = await supabase.from('customers').insert({
        ...customerData,
        first_name: customerData.firstName,
        last_name: customerData.lastName,
        driver_license_number: customerData.driverLicenseNumber,
    }).select().single();
    if (customerError) throw customerError;

    const filePath = `public/${newCustomer.id}-${Date.now()}/${driverLicenseFile.name}`;
    const { error: uploadError } = await supabase.storage.from('licenses').upload(filePath, driverLicenseFile, { upsert: true });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from('licenses').getPublicUrl(filePath);
    await supabase.from('customers').update({ driver_license_image_url: publicUrl }).eq('id', newCustomer.id);
    
    // 2. Create Reservation
    const { data: newReservation, error: resError } = await supabase.from('reservations').insert({
        customer_id: newCustomer.id,
        vehicle_id: reservationData.vehicleId,
        start_date: reservationData.startDate,
        end_date: reservationData.endDate,
        status: 'scheduled',
        total_price: reservationData.totalPrice,
        start_mileage: vehicle.currentMileage,
    }).select().single();
    if (resError) throw resError;

    const contractText = `SMLOUVA O NÁJMU DOPRAVNÍHO PROSTŘEDKU\n... (full contract text) ...`; // Full text here
    
    // 3. Create Contract
    await addContract({
        reservationId: newReservation.id,
        customerId: newCustomer.id,
        vehicleId: reservationData.vehicleId,
        generatedAt: new Date(),
        contractText
    });

    return {
        reservation: toReservation(newReservation),
        customer: toCustomer(newCustomer),
        contractText,
    };
};


// --- CONTRACTS ---
export const getContracts = async (): Promise<Contract[]> => {
    const { data, error } = await supabase.from('contracts').select(`
        *,
        customers:customer_id(*),
        vehicles:vehicle_id(*)
    `).order('generated_at', { ascending: false });
    if (error) throw error;
    return data.map(c => ({
        ...c,
        reservationId: c.reservation_id,
        customerId: c.customer_id,
        vehicleId: c.vehicle_id,
        generatedAt: c.generated_at,
        contractText: c.contract_text,
        customer: c.customers ? toCustomer(c.customers) : undefined,
        vehicle: c.vehicles ? toVehicle(c.vehicles) : undefined,
    }));
};

export const addContract = async (contract: Omit<Contract, 'id'>): Promise<Contract> => {
     const { data, error } = await supabase.from('contracts').insert({
        reservation_id: contract.reservationId,
        customer_id: contract.customerId,
        vehicle_id: contract.vehicleId,
        generated_at: contract.generatedAt,
        contract_text: contract.contractText
    }).select().single();
    if (error) throw error;
    return data as Contract;
};

// --- FINANCIALS & INVOICES ---
export const getFinancials = async (): Promise<FinancialTransaction[]> => {
    const { data, error } = await supabase.from('financial_transactions').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data;
};

export const addExpense = async (expense: Omit<FinancialTransaction, 'id' | 'type'>): Promise<FinancialTransaction> => {
    const { data, error } = await supabase.from('financial_transactions').insert({
        ...expense,
        type: 'expense'
    }).select().single();
    if (error) throw error;
    return data;
};

export const getInvoices = async (): Promise<Invoice[]> => {
    const { data, error } = await supabase.from('invoices').select('*').order('issue_date', { ascending: false });
    if (error) throw error;
    return data.map(inv => ({
        ...inv,
        invoiceNumber: inv.invoice_number,
        reservationId: inv.reservation_id,
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        totalAmount: inv.total_amount,
        lineItems: inv.line_items,
        customerDetailsSnapshot: inv.customer_details_snapshot,
        vehicleDetailsSnapshot: inv.vehicle_details_snapshot,
    }));
};

export const createInvoice = async (invoiceData: Omit<Invoice, 'id' | 'invoiceNumber'>): Promise<Invoice> => {
    // Check if invoice for this reservation already exists
    const { data: existing, error: checkError } = await supabase.from('invoices').select('id').eq('reservation_id', invoiceData.reservationId).maybeSingle();
    if (checkError) throw checkError;
    if (existing) throw new Error("Faktura pro tuto rezervaci již existuje.");

    // Generate invoice number
    const { count, error: countError } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
    if (countError) throw countError;
    const invoiceNumber = `FAKTURA-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(4, '0')}`;
    
    const { data, error } = await supabase.from('invoices').insert({
        invoice_number: invoiceNumber,
        reservation_id: invoiceData.reservationId,
        issue_date: invoiceData.issueDate,
        due_date: invoiceData.dueDate,
        total_amount: invoiceData.totalAmount,
        line_items: invoiceData.lineItems,
        customer_details_snapshot: invoiceData.customerDetailsSnapshot,
        vehicle_details_snapshot: invoiceData.vehicleDetailsSnapshot,
    }).select().single();
    if (error) throw error;
    return data;
};

// --- DASHBOARD & REPORTS ---
export const getDashboardStats = async (): Promise<any> => {
    const { data: vehicles, error: vError } = await supabase.from('vehicles').select('*');
    if (vError) throw vError;

    const { data: reservations, error: rError } = await supabase.from('reservations').select('*');
    if (rError) throw rError;

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));

    const upcomingReservations = reservations.filter(r => r.status === 'scheduled' && new Date(r.start_date) > todayEnd).length;
    const dueBack = reservations.filter(r => r.status === 'active' && new Date(r.end_date) >= todayStart && new Date(r.end_date) <= todayEnd).length;
    const availableVehicles = vehicles.filter(v => v.status === 'available').length;
    
    // Additional dashboard data
    const todaysDepartures = reservations.filter(r => r.status === 'scheduled' && new Date(r.start_date) >= todayStart && new Date(r.start_date) <= todayEnd);
    const todaysArrivals = reservations.filter(r => r.status === 'active' && new Date(r.end_date) >= todayStart && new Date(r.end_date) <= todayEnd);

    return { 
        upcomingReservations, 
        dueBack, 
        stats: { totalVehicles: vehicles.length, availableVehicles },
        todaysDepartures: todaysDepartures.map(toReservation),
        todaysArrivals: todaysArrivals.map(toReservation),
     };
};

export const getReportsData = async (): Promise<any> => {
    const { data: financials, error: fError } = await supabase.from('financial_transactions').select('*');
    if (fError) throw fError;
    // FIX: The helper functions getReservations() and getCustomers() return the data array directly,
    // not a Supabase response object with `data` and `error` properties. The original destructuring was incorrect.
    // The error handling is done within those functions, which will throw if an error occurs.
    const reservations = await getReservations();
    const customers = await getCustomers();

    // Vehicle performance
    const vehiclePerformance = reservations.reduce((acc, res) => {
        if (res.status === 'completed' && res.vehicleId && res.totalPrice) {
            if (!acc[res.vehicleId]) {
                acc[res.vehicleId] = { name: res.vehicle?.name, revenue: 0, rentals: 0 };
            }
            acc[res.vehicleId].revenue += res.totalPrice;
            acc[res.vehicleId].rentals++;
        }
        return acc;
    }, {} as any);
    
    // Top Customers
    const topCustomers = reservations.reduce((acc, res) => {
        if(res.status === 'completed' && res.customerId && res.totalPrice){
            if(!acc[res.customerId]){
                acc[res.customerId] = {name: `${res.customer?.firstName} ${res.customer?.lastName}`, totalSpent: 0, rentals: 0};
            }
            acc[res.customerId].totalSpent += res.totalPrice;
            acc[res.customerId].rentals++;
        }
        return acc;
    }, {} as any)
    

    return {
        vehiclePerformance: Object.values(vehiclePerformance).sort((a: any, b: any) => b.revenue - a.revenue),
        topCustomers: Object.values(topCustomers).sort((a: any, b: any) => b.totalSpent - a.totalSpent).slice(0, 5),
    };
};

// --- REALTIME ---
export const onTableChange = (table: string, callback: () => void) => {
    const channel = supabase.channel(`public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, payload => {
            console.log('Change received!', payload);
            callback();
        })
        .subscribe();
    
    return () => {
        supabase.removeChannel(channel);
    };
};