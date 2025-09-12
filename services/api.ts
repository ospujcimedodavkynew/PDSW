
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import type { Vehicle, ServiceRecord, Customer, Reservation, Contract, FinancialTransaction, Invoice, CompanySettings } from '../types';

// --- SUPABASE CLIENT INITIALIZATION ---
const supabaseUrl = (window as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (window as any).env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  alert("FATAL ERROR: Supabase URL and Anon Key are not configured in index.html. The application cannot connect to the database.");
  throw new Error("Supabase URL and Anon Key are not set.");
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// --- HELPER FUNCTIONS FOR DATA MAPPING ---
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
    driverLicenseImageUrl: data.driver_license_image_url,
    companyName: data.company_name,
    companyId: data.company_id,
    vatId: data.vat_id,
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
    paymentMethod: data.payment_method,
    customer: data.customers ? toCustomer(data.customers) : undefined,
    vehicle: data.vehicles ? toVehicle(data.vehicles) : undefined,
});

const toContract = (data: any): Contract => ({
    id: data.id,
    reservationId: data.reservation_id,
    customerId: data.customer_id,
    vehicleId: data.vehicle_id,
    generatedAt: data.generated_at,
    contractText: data.contract_text,
    customer: data.customers ? toCustomer(data.customers) : undefined,
    vehicle: data.vehicles ? toVehicle(data.vehicles) : undefined,
});

const toInvoice = (data: any): Invoice => ({
    id: data.id,
    invoiceNumber: data.invoice_number,
    reservationId: data.reservation_id,
    issueDate: data.issue_date,
    dueDate: data.due_date,
    totalAmount: data.total_amount,
    paymentMethod: data.payment_method,
    lineItems: data.line_items,
    customerDetailsSnapshot: data.customer_details_snapshot,
    vehicleDetailsSnapshot: data.vehicle_details_snapshot,
});

// --- ARES API INTEGRATION ---
export const fetchCompanyFromAres = async (ico: string): Promise<Partial<Customer>> => {
    const url = `https://ares.gov.cz/ekonomicke-subjekty-v-ares/rest/ekonomicke-subjekty/${ico.trim()}`;
    
    try {
        const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!response.ok) {
            if (response.status === 404) throw new Error('Firma s daným IČO nebyla nalezena.');
            throw new Error(`Chyba ARES: Server odpověděl se statusem ${response.status}`);
        }
        const data = await response.json();
        return {
            companyName: data.obchodniJmeno || '',
            companyId: ico.trim(),
            vatId: data.dic || '',
            address: data.sidlo?.textovaAdresa || '',
        };
    } catch (error) {
        console.error("ARES API fetch error:", error);
        throw error; // Re-throw to be caught by the component
    }
};

// --- AUTHENTICATION ---
export const signInWithPassword = async (email: string, password: string) => {
    // This part is for local development without Supabase Auth
    if (email === 'admin@vanrental.pro' && password === 'password123') {
        localStorage.setItem('user', JSON.stringify({ email }));
        return; 
    }
    // This is for production with Supabase Auth
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Přihlášení se nezdařilo. Zkontrolujte prosím své údaje.');
};

export const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('user');
};

export const onAuthStateChanged = (callback: (user: User | null) => void): (() => void) => {
    // Check for dev user first
    const devUser = localStorage.getItem('user');
    if (devUser) {
        try {
            callback(JSON.parse(devUser));
        } catch (e) {
            localStorage.removeItem('user');
        }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(session?.user ?? null);
    });

    supabase.auth.getUser().then(result => {
        if (!devUser) { // only call back if no dev user was found, to prevent double render
             callback(result.data.user);
        }
    });

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
        name: vehicle.name, make: vehicle.make, model: vehicle.model, year: vehicle.year,
        license_plate: vehicle.licensePlate, status: vehicle.status, rate4h: vehicle.rate4h, rate12h: vehicle.rate12h,
        daily_rate: vehicle.dailyRate, features: vehicle.features, current_mileage: vehicle.currentMileage,
        description: vehicle.description, dimensions: vehicle.dimensions
    }).select().single();
    if (error) throw error;
    return toVehicle(data);
};

export const updateVehicle = async (vehicle: Vehicle): Promise<Vehicle> => {
    const { data, error } = await supabase.from('vehicles').update({
        name: vehicle.name, make: vehicle.make, model: vehicle.model, year: vehicle.year,
        license_plate: vehicle.licensePlate, status: vehicle.status, rate4h: vehicle.rate4h, rate12h: vehicle.rate12h,
        daily_rate: vehicle.dailyRate, features: vehicle.features, current_mileage: vehicle.currentMileage,
        description: vehicle.description, dimensions: vehicle.dimensions, image_url: vehicle.imageUrl
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
        vehicle_id: record.vehicleId, description: record.description, cost: record.cost,
        mileage: record.mileage, service_date: record.serviceDate
    }).select().single();
    if (error) throw error;
    await addExpense({
        description: `Servis: ${vehicleName} - ${record.description}`,
        amount: record.cost,
        date: record.serviceDate,
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
        first_name: customer.firstName, last_name: customer.lastName, email: customer.email,
        phone: customer.phone, driver_license_number: customer.driverLicenseNumber, address: customer.address,
        driver_license_image_url: customer.driverLicenseImageUrl, company_name: customer.companyName,
        company_id: customer.companyId, vat_id: customer.vatId
    }).select().single();
    if (error) throw error;
    return toCustomer(data);
};

export const updateCustomer = async (customer: Customer): Promise<Customer> => {
    const { data, error } = await supabase.from('customers').update({
        first_name: customer.firstName, last_name: customer.lastName, email: customer.email,
        phone: customer.phone, driver_license_number: customer.driverLicenseNumber, address: customer.address,
        driver_license_image_url: customer.driverLicenseImageUrl, company_name: customer.companyName,
        company_id: customer.companyId, vat_id: customer.vatId
    }).eq('id', customer.id).select().single();
    if (error) throw error;
    return toCustomer(data);
};

// --- RESERVATIONS & PORTALS ---
export const getReservations = async (): Promise<Reservation[]> => {
    const { data, error } = await supabase.from('reservations').select(`*, customers:customer_id(*), vehicles:vehicle_id(*)`).order('start_date', { ascending: false });
    if (error) throw error;
    return data.map(toReservation);
};

export const addReservation = async (reservation: Omit<Reservation, 'id' | 'status'>): Promise<Reservation> => {
    const startDate = typeof reservation.startDate === 'string' ? reservation.startDate : new Date(reservation.startDate).toISOString();
    const endDate = typeof reservation.endDate === 'string' ? reservation.endDate : new Date(reservation.endDate).toISOString();
    const { data, error } = await supabase.from('reservations').insert({
        customer_id: reservation.customerId, vehicle_id: reservation.vehicleId,
        start_date: startDate, end_date: endDate, status: 'scheduled', total_price: reservation.totalPrice
    }).select().single();
    if (error) throw error;
    return toReservation(data);
};

export const deleteReservation = async (reservationId: string): Promise<void> => {
    const { error } = await supabase.from('reservations').delete().eq('id', reservationId);
    if (error) throw error;
};

export const activateReservation = async (reservationId: string, startMileage: number): Promise<void> => {
    const { error } = await supabase.from('reservations').update({ status: 'active', start_mileage: startMileage }).eq('id', reservationId);
    if (error) throw error;
};

export const completeReservation = async (reservationId: string, endMileage: number, notes: string, paymentMethod: 'cash' | 'invoice'): Promise<void> => {
    const { data: resData, error: fetchError } = await supabase.from('reservations').select(`*, customers:customer_id(first_name, last_name), vehicles:vehicle_id(name)`).eq('id', reservationId).single();
    if (fetchError || !resData) throw fetchError || new Error('Reservation not found');
    
    const durationMs = new Date(resData.end_date).getTime() - new Date(resData.start_date).getTime();
    const rentalDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));
    const kmLimit = rentalDays * 300;
    const kmDriven = endMileage - resData.start_mileage;
    const kmOver = Math.max(0, kmDriven - kmLimit);
    const extraCharge = kmOver * 3;
    const initialPrice = resData.total_price || 0;
    const finalPrice = initialPrice + extraCharge;

    const { error: updateError } = await supabase.from('reservations').update({
        status: 'completed', end_mileage: endMileage, notes: notes,
        total_price: finalPrice, payment_method: paymentMethod
    }).eq('id', reservationId);
    if (updateError) throw updateError;
    
    await supabase.from('financial_transactions').insert({
        reservation_id: reservationId, amount: finalPrice, date: new Date().toISOString(),
        description: `Pronájem: ${resData.vehicles.name} - ${resData.customers.first_name} ${resData.customers.last_name}`,
        type: 'income'
    });
};

export const getReservationByToken = async (token: string): Promise<Reservation | null> => {
    const { data, error } = await supabase.from('reservations').select(`*, vehicles:vehicle_id(*)`).eq('portal_token', token).single();
    if (error) return null;
    return toReservation(data);
};

export const createPendingReservation = async (vehicleId: string, startDate: Date, endDate: Date): Promise<Reservation> => {
    const { data: vehicle, error: vehicleError } = await supabase.from('vehicles').select('rate4h, rate12h, daily_rate').eq('id', vehicleId).single();
    if (vehicleError || !vehicle) throw vehicleError || new Error("Vozidlo nebylo nalezeno pro výpočet ceny.");

    let totalPrice = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end > start) {
        const durationHours = (end.getTime() - start.getTime()) / (1000 * 3600);
        if (durationHours <= 4) totalPrice = vehicle.rate4h;
        else if (durationHours <= 12) totalPrice = vehicle.rate12h;
        else totalPrice = Math.ceil(durationHours / 24) * vehicle.daily_rate;
    }
    
    const portalToken = crypto.randomUUID();
    const { data, error } = await supabase.from('reservations').insert({
        vehicle_id: vehicleId, start_date: startDate.toISOString(), end_date: endDate.toISOString(),
        status: 'pending-customer', portal_token: portalToken, total_price: totalPrice
    }).select().single();
    if (error) throw error;
    return toReservation(data);
};

export const submitCustomerDetails = async (token: string, customerData: Omit<Customer, 'id' | 'driverLicenseImageUrl'>, driverLicenseFile: File): Promise<void> => {
    const { data: resData, error: resError } = await supabase.from('reservations').select('id').eq('portal_token', token).single();
    if (resError || !resData) throw resError || new Error("Reservation not found for this token.");

    const filePath = `public/${resData.id}/${driverLicenseFile.name}`;
    const { error: uploadError } = await supabase.storage.from('licenses').upload(filePath, driverLicenseFile, { upsert: true });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('licenses').getPublicUrl(filePath);

    const { data: newCustomer, error: customerError } = await supabase.from('customers').insert({
        first_name: customerData.firstName, last_name: customerData.lastName, email: customerData.email,
        phone: customerData.phone, driver_license_number: customerData.driverLicenseNumber, address: customerData.address,
        driver_license_image_url: publicUrl
    }).select().single();
    if (customerError) throw customerError;

    const { error: updateError } = await supabase.from('reservations').update({ customer_id: newCustomer.id, status: 'scheduled' }).eq('id', resData.id);
    if (updateError) throw updateError;
};

export const submitOnlineReservation = async (reservationData: any, customerData: any, driverLicenseFile: File, vehicle: Vehicle): Promise<{ reservation: Reservation, customer: Customer, contractText: string }> => {
    const { data: newCustomer, error: customerError } = await supabase.from('customers').insert({
        first_name: customerData.firstName, last_name: customerData.lastName, email: customerData.email, phone: customerData.phone,
        driver_license_number: customerData.driverLicenseNumber, address: customerData.address
    }).select().single();
    if (customerError) throw customerError;

    const filePath = `public/${newCustomer.id}-${Date.now()}/${driverLicenseFile.name}`;
    const { error: uploadError } = await supabase.storage.from('licenses').upload(filePath, driverLicenseFile, { upsert: true });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from('licenses').getPublicUrl(filePath);
    await supabase.from('customers').update({ driver_license_image_url: publicUrl }).eq('id', newCustomer.id);
    
    const { data: newReservation, error: resError } = await supabase.from('reservations').insert({
        customer_id: newCustomer.id, vehicle_id: reservationData.vehicleId, start_date: reservationData.startDate.toISOString(),
        end_date: reservationData.endDate.toISOString(), status: 'scheduled', total_price: reservationData.totalPrice,
    }).select().single();
    if (resError) throw resError;

    const contractText = `SMLOUVA O NÁJMU DOPRAVNÍHO PROSTŘEDKU\n...`;
    
    await addContract({
        reservationId: newReservation.id, customerId: newCustomer.id, vehicleId: reservationData.vehicleId,
        generatedAt: new Date(), contractText: contractText
    });

    return { reservation: toReservation(newReservation), customer: toCustomer(newCustomer), contractText };
};

// --- CONTRACTS ---
export const getContracts = async (): Promise<Contract[]> => {
    const { data, error } = await supabase.from('contracts').select(`*, customers:customer_id(*), vehicles:vehicle_id(*)`).order('generated_at', { ascending: false });
    if (error) throw error;
    return data.map(toContract);
};

export const addContract = async (contract: Omit<Contract, 'id'>): Promise<Contract> => {
    const { data, error } = await supabase.from('contracts').insert({
        reservation_id: contract.reservationId, customer_id: contract.customerId,
        vehicle_id: contract.vehicleId, generated_at: new Date().toISOString(), contract_text: contract.contractText,
    }).select().single();
    if (error) throw error;
    return { ...toContract(data), id: data.id };
};

// --- FINANCIALS ---
export const getFinancials = async (): Promise<FinancialTransaction[]> => {
    const { data, error } = await supabase.from('financial_transactions').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data;
};

export const addExpense = async (expense: Omit<FinancialTransaction, 'id' | 'type'>): Promise<FinancialTransaction> => {
    const { data, error } = await supabase.from('financial_transactions').insert({ ...expense, type: 'expense' }).select().single();
    if (error) throw error;
    return data;
};

// --- INVOICES ---
export const getInvoices = async (): Promise<Invoice[]> => {
    const { data, error } = await supabase.from('invoices').select('*');
    if (error) throw error;
    return data.map(toInvoice);
};

export const createInvoice = async (invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'issueDate' | 'dueDate'>): Promise<Invoice> => {
    const { count, error: countError } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
    if (countError) throw countError;
    const invoiceNumber = `FAKT-${new Date().getFullYear()}-${(count || 0) + 1}`;

    const issueDate = new Date();
    let dueDate = new Date();
    
    if (invoiceData.paymentMethod === 'cash') {
        dueDate = issueDate; // Splatnost je stejný den
    } else {
        dueDate.setDate(issueDate.getDate() + 14); // Standardní 14denní splatnost
    }

    const { data, error } = await supabase.from('invoices').insert({
        invoice_number: invoiceNumber,
        reservation_id: invoiceData.reservationId,
        issue_date: issueDate.toISOString(),
        due_date: dueDate.toISOString(),
        total_amount: invoiceData.totalAmount,
        line_items: invoiceData.lineItems,
        customer_details_snapshot: invoiceData.customerDetailsSnapshot,
        vehicle_details_snapshot: invoiceData.vehicleDetailsSnapshot,
        payment_method: invoiceData.paymentMethod
    }).select().single();
    if (error) throw error;
    return toInvoice(data);
};

// --- DASHBOARD & REPORTS ---
export const getDashboardStats = async () => {
    const { data: vehicles, error: vError } = await supabase.from('vehicles').select('*');
    if (vError) throw vError;
    const { count: totalCustomers, error: cError } = await supabase.from('customers').select('*', { count: 'exact', head: true });
    if (cError) throw cError;
    const { data: reservations, error: rError } = await supabase.from('reservations').select('*, customers:customer_id(*), vehicles:vehicle_id(*)');
    if (rError) throw rError;

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));

    return {
        stats: {
            availableVehicles: vehicles.filter(v => v.status === 'available').length,
            totalVehicles: vehicles.length
        },
        upcomingReservations: reservations.filter(r => r.status === 'scheduled').length,
        dueBack: reservations.filter(r => new Date(r.end_date) <= todayEnd && r.status === 'active').length,
        totalCustomers: totalCustomers || 0,
        todaysDepartures: reservations.filter(r => r.status === 'scheduled' && new Date(r.start_date) >= todayStart && new Date(r.start_date) <= todayEnd).map(toReservation),
        todaysArrivals: reservations.filter(r => r.status === 'active' && new Date(r.end_date) >= todayStart && new Date(r.end_date) <= todayEnd).map(toReservation),
    };
};

export const getReportsData = async () => {
    // This is a placeholder for more complex reporting logic
    return {};
};

// --- COMPANY SETTINGS ---
export const getCompanySettings = async (): Promise<CompanySettings> => {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
    }
    return {
        companyName: data?.company_name || '',
        companyAddress: data?.company_address || '',
        companyIco: data?.company_ico || '',
        bankAccount: data?.bank_account || '',
    };
};

export const updateCompanySettings = async (settings: CompanySettings): Promise<void> => {
    const { error } = await supabase.from('settings').upsert({
        id: 1,
        company_name: settings.companyName,
        company_address: settings.companyAddress,
        company_ico: settings.companyIco,
        bank_account: settings.bankAccount,
        updated_at: new Date().toISOString(),
    }).eq('id', 1);
    if (error) throw error;
};


// --- REALTIME ---
export const onTableChange = (table: string, callback: () => void) => {
    const channel = supabase.channel(`public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, payload => {
            console.log(`Change received on ${table}!`, payload);
            callback();
        })
        .subscribe();
    return () => supabase.removeChannel(channel);
};
