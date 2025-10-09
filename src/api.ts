import { supabase, supabaseInitializationError } from './supabaseClient';
import { User, Barbershop, Appointment, Review, Barber, FinancialRecord, Promotion, ClientNotification, WaitingListEntry, Json, IntegrationSettings, Address } from './types';
import { TablesInsert, TablesUpdate } from './types/database';

// Helper functions to convert DB row types to application types (especially for dates)
const appointmentFromRow = (row: any): Appointment => ({
  ...row,
  start_time: new Date(row.start_time),
  end_time: new Date(row.end_time),
  created_at: row.created_at ? new Date(row.created_at) : null,
});

const reviewFromRow = (row: any): Review => ({
    ...row,
    created_at: new Date(row.created_at),
});

// === AUTH FUNCTIONS ===
export const getSession = () => {
    if (!supabase) return Promise.resolve({ data: { session: null }, error: new Error(supabaseInitializationError!) });
    return supabase.auth.getSession();
}
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
    if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange(callback);
}

export const signInUser = async (email: string, password: string) => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
};

export const signOutUser = async () => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const signUpUser = async (name: string, email: string, password: string, accountType: 'client' | 'barbershop', phone: string, birthDate?: string, barbershopName?: string) => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
            data: {
                name,
                user_type: accountType === 'client' ? 'CLIENT' : 'BARBERSHOP',
                phone,
                birth_date: birthDate || null,
            }
        }
    });
    if (authError) throw authError;
    if (!authData.user) throw new Error("Signup successful, but no user returned.");
    
    if (accountType === 'barbershop') {
        if (!barbershopName) throw new Error("Barbershop name is required.");

        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 30);

        const initialIntegrations: IntegrationSettings = {
            auto_confirm_appointments: false,
        };
        
        const { error: barbershopError } = await supabase.from('barbershops').insert({
            owner_id: authData.user.id,
            name: barbershopName,
            image_url: `https://picsum.photos/seed/${Date.now()}/600/400`,
            trial_ends_at: trialEndDate.toISOString(),
            integrations: initialIntegrations as Json,
        });
        if (barbershopError) throw barbershopError;
    }
};

// === DATA FETCHING FUNCTIONS ===
export const getUserProfile = async (userId: string): Promise<User> => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) throw error;
    if (!data) throw new Error("User profile not found.");
    return data as User;
};

export const getAllUsers = async (): Promise<User[]> => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    return data as User[];
}

export const getBarbershops = async (): Promise<Barbershop[]> => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const { data, error } = await supabase.from('barbershops').select('*');
    if (error) throw error;
    return data;
};

export const getAppointments = async (): Promise<Appointment[]> => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const { data, error } = await supabase.from('appointments').select('*');
    if (error) throw error;
    return data.map(appointmentFromRow);
};

export const getReviews = async (): Promise<Review[]> => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const { data, error } = await supabase.from('reviews').select('*');
    if (error) throw error;
    return data.map(reviewFromRow);
};

// === STORAGE FUNCTIONS ===
export const uploadImage = async (file: File, bucket: string, folder: string): Promise<string> => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    if (!file) throw new Error("Nenhum arquivo fornecido para upload.");

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
    if (uploadError) {
        console.error("Erro no upload para o Supabase storage:", uploadError);
        throw uploadError;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    if (!data || !data.publicUrl) throw new Error("Não foi possível obter a URL pública do arquivo enviado.");
    return data.publicUrl;
};

// === DATA MUTATION FUNCTIONS ===
export const addAppointment = async (appointment: Omit<Appointment, 'id' | 'created_at' | 'start_time' | 'end_time'> & { start_time: Date, end_time: Date }): Promise<Appointment> => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const initialStatus = appointment.status === 'paid' ? 'paid' : (appointment.status === 'confirmed' ? 'confirmed' : 'pending');
    const appointmentForDb: TablesInsert<'appointments'> = {
        ...appointment,
        start_time: appointment.start_time.toISOString(),
        end_time: appointment.end_time.toISOString(),
        status: initialStatus,
    };

    const { data: newAppointmentRow, error: insertError } = await supabase.from('appointments').insert(appointmentForDb).select().single();
    if (insertError) throw insertError;

    let finalAppointment = appointmentFromRow(newAppointmentRow);

    if (initialStatus === 'pending') {
        const { data: barbershop } = await supabase.from('barbershops').select('integrations').eq('id', appointment.barbershop_id).single();
        const integrations = barbershop?.integrations as IntegrationSettings | undefined;

        if (integrations?.auto_confirm_appointments) {
            const { data: updatedAppointmentRow, error: updateError } = await supabase.from('appointments').update({ status: 'confirmed' }).eq('id', finalAppointment.id).select().single();
            if (updateError) console.error("Failed to auto-confirm appointment.", updateError);
            if (updatedAppointmentRow) finalAppointment = appointmentFromRow(updatedAppointmentRow);
        }
    }
    return finalAppointment;
};

export const updateAppointment = async (appointmentId: string, updates: { start_time: Date, end_time: Date }): Promise<Appointment> => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const { data, error } = await supabase.from('appointments').update({
        start_time: updates.start_time.toISOString(),
        end_time: updates.end_time.toISOString(),
    }).eq('id', appointmentId).select().single();

    if (error) throw error;
    return appointmentFromRow(data);
};

export const updateAppointmentStatus = async (appointment: Appointment, status: string, barbershopData: Barbershop | null, googleToken: string | null) => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const { error } = await supabase.from('appointments').update({ status }).eq('id', appointment.id);
    if (error) throw error;

    const integrations = barbershopData?.integrations as IntegrationSettings;
    if (integrations?.googleCalendar && googleToken) {
        if (status === 'confirmed' && !appointment.google_event_id) {
            try {
                const event = await createGoogleCalendarEvent(appointment, googleToken, barbershopData!);
                await setAppointmentGoogleEventId(appointment.id, event.id);
            } catch (e) { console.error("Failed to create Google Calendar event:", e); }
        } else if ((status === 'cancelled' || status === 'declined') && appointment.google_event_id) {
            try {
                await deleteGoogleCalendarEvent(appointment.google_event_id, googleToken);
            } catch (e) { console.error("Failed to delete Google Calendar event:", e); }
        }
    }
};

export const updateBarbershop = async (id: string, fields: Partial<Omit<Barbershop, 'id'>>) => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const { error } = await supabase.from('barbershops').update(fields as TablesUpdate<'barbershops'>).eq('id', id);
    if (error) throw error;
};

export const addReview = async (review: Omit<Review, 'id' | 'created_at'>, appointmentId: string) => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const { error: reviewError } = await supabase.from('reviews').insert(review);
    if (reviewError) throw reviewError;

    const { data: newReview, error: fetchError } = await supabase.from('reviews').select('id').eq('appointment_id', appointmentId).single();
    if(fetchError) throw fetchError;

    const { error: appUpdateError } = await supabase.from('appointments').update({ review_id: newReview.id }).eq('id', appointmentId);
    if (appUpdateError) throw appUpdateError;
};

export const toggleFavoriteBarbershop = async (userId: string, currentFavorites: string[], barbershopId: string): Promise<User> => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const updatedFavorites = currentFavorites.includes(barbershopId) ? currentFavorites.filter(id => id !== barbershopId) : [...currentFavorites, barbershopId];
    const { data, error } = await supabase.from('profiles').update({ favorite_barbershop_ids: updatedFavorites }).eq('id', userId).select().single();
    if (error) throw error;
    return data as User;
};

export const addFinancialRecord = async (barbershopId: string, barberId: string, type: 'advances' | 'consumptions', recordData: Omit<FinancialRecord, 'id' | 'date'>, barbershops: Barbershop[]) => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const shop = barbershops.find(b => b.id === barbershopId);
    if (!shop) return;
    const barbers = Array.isArray(shop.barbers) ? shop.barbers as Barber[] : [];
    const updatedBarbers = barbers.map(barber => {
        if (barber.id === barberId) {
            const newRecord: FinancialRecord = { ...recordData, id: `${type.slice(0, 3)}_${Date.now()}`, date: new Date().toISOString() };
            const existingRecords = Array.isArray(barber[type]) ? barber[type] as FinancialRecord[] : [];
            return { ...barber, [type]: [...existingRecords, newRecord] };
        }
        return barber;
    });
    await updateBarbershop(barbershopId, { barbers: updatedBarbers as unknown as Json });
};

export const deleteFinancialRecord = async (barbershopId: string, barberId: string, type: 'advances' | 'consumptions', recordId: string, barbershops: Barbershop[]) => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const shop = barbershops.find(b => b.id === barbershopId);
    if (!shop) return;
    const barbers = Array.isArray(shop.barbers) ? shop.barbers as Barber[] : [];
    const updatedBarbers = barbers.map(barber => {
        if (barber.id === barberId) {
            const existingRecords = Array.isArray(barber[type]) ? barber[type] as FinancialRecord[] : [];
            const updatedRecords = existingRecords.filter(record => record.id !== recordId);
            return { ...barber, [type]: updatedRecords };
        }
        return barber;
    });
    await updateBarbershop(barbershopId, { barbers: updatedBarbers as unknown as Json });
};

export const sendPromotion = async (barbershopId: string, title: string, message: string, clients: User[], barbershops: Barbershop[]) => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const shop = barbershops.find(b => b.id === barbershopId);
    if (!shop) return;

    const newPromotion: Promotion = { 
        id: `promo_${Date.now()}`, title, message, sentAt: new Date().toISOString(), 
        recipients: clients.map(c => ({ clientId: c.id, clientName: c.name, status: 'sent', receivedAt: new Date().toISOString() }))
    };
    const currentPromotions = Array.isArray(shop.promotions) ? shop.promotions as Promotion[] : [];
    await updateBarbershop(barbershopId, { promotions: [...currentPromotions, newPromotion] as unknown as Json });

    const notification: Omit<ClientNotification, 'id'> = {
        promotionId: newPromotion.id, barbershopId, barbershopName: shop.name, title, message, receivedAt: new Date().toISOString(), isRead: false,
    };
    
    for (const client of clients) {
        const currentNotifications = Array.isArray(client.notifications) ? client.notifications as ClientNotification[] : [];
        const newNotification = { ...notification, id: `notif_${Date.now()}_${client.id}` };
        await supabase.from('profiles').update({ notifications: [...currentNotifications, newNotification] as unknown as Json }).eq('id', client.id);
    }
};

export const markNotificationsAsRead = async (userId: string, currentNotifications: ClientNotification[], notificationIds: string[]): Promise<User> => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const updatedNotifications = currentNotifications.map(n => notificationIds.includes(n.id) ? { ...n, isRead: true } : n);
    const { data, error } = await supabase.from('profiles').update({ notifications: updatedNotifications as unknown as Json }).eq('id', userId).select().single();
    if (error) throw error;
    return data as User;
};

export const addToWaitingList = async (barbershopId: string, date: string, user: User, barbershops: Barbershop[]) => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const shop = barbershops.find(b => b.id === barbershopId);
    if (!shop) return;

    const newEntry: WaitingListEntry = { clientId: user.id, clientName: user.name, requestedAt: new Date().toISOString() };
    const waitingList = (shop.waiting_list as { [date: string]: WaitingListEntry[] } || {});
    const dayEntries = waitingList[date] || [];
    if (dayEntries.some(e => e.clientId === user.id)) return;
    const updatedWaitingList = { ...waitingList, [date]: [...dayEntries, newEntry] };
    await updateBarbershop(barbershopId, { waiting_list: updatedWaitingList as unknown as Json });
};

export const removeFromWaitingList = async (barbershopId: string, date: string, clientId: string, barbershops: Barbershop[]) => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const shop = barbershops.find(b => b.id === barbershopId);
    if (!shop) return;
    
    const waitingList = (shop.waiting_list as { [date: string]: WaitingListEntry[] } || {});
    const updatedWaitingList = { ...waitingList, [date]: (waitingList[date] || []).filter(e => e.clientId !== clientId) };
    await updateBarbershop(barbershopId, { waiting_list: updatedWaitingList as unknown as Json });
};

export const getUsersByIds = async (userIds: string[]): Promise<User[]> => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    if (!userIds || userIds.length === 0) return [];
    const { data, error } = await supabase.from('profiles').select('*').in('id', userIds);
    if (error) throw error;
    return data as User[];
};

export const updateUserProfile = async (userId: string, updates: Partial<User>) => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const { data, error } = await supabase.from('profiles').update(updates as TablesUpdate<'profiles'>).eq('id', userId).select().single();
    if (error) throw error;
    return data as User;
}

// === GOOGLE CALENDAR INTEGRATION ===
export const createGoogleCalendarEvent = async (appointment: Appointment, token: string, barbershop: Barbershop): Promise<{id: string}> => {
    const address = barbershop.address as Address;
    const location = address ? `${address.street}, ${address.number} - ${address.neighborhood}, ${address.city}` : barbershop.name;
    const event = {
        'summary': `${appointment.service_name} - ${appointment.client_name}`,
        'location': location,
        'description': `Serviço agendado via BarberAI.\n\nBarbeiro: ${appointment.barber_name}\nObservações: ${appointment.notes || 'Nenhuma'}`,
        'start': { 'dateTime': appointment.start_time.toISOString(), 'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone },
        'end': { 'dateTime': appointment.end_time.toISOString(), 'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone },
    };
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || 'Failed to create Google Calendar event');
    }
    return response.json();
};

export const deleteGoogleCalendarEvent = async (eventId: string, token: string): Promise<void> => {
     const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok && response.status !== 410) { // 410 Gone means it's already deleted
        const errorData = await response.json();
        throw new Error(errorData.error.message || 'Failed to delete Google Calendar event');
    }
};

export const setAppointmentGoogleEventId = async (appointmentId: string, googleEventId: string) => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const { error } = await supabase.from('appointments').update({ google_event_id: googleEventId }).eq('id', appointmentId);
    if (error) throw error;
};

// === MERCADO PAGO PAYMENT INTEGRATION ===
// FIX: Updated the return type to include `preferenceId`, which is necessary for the Mercado Pago Payment Brick.
export const createMercadoPagoPreference = async (appointmentData: Omit<Appointment, 'id' | 'created_at'> & { start_time: Date, end_time: Date }): Promise<{ redirectUrl: string, preferenceId: string }> => {
    const response = await fetch(`/api/create-mp-preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentData }),
    });
    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || 'Falha ao criar preferência de pagamento.');
    }
    const data = await response.json();
    return data;
};

// FIX: Added function to call the disconnect API endpoint.
export const disconnectMercadoPago = async (barbershopId: string): Promise<void> => {
    const response = await fetch('/api/mp-oauth-disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barbershopId }),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || 'Falha ao desconectar conta do Mercado Pago.');
    }
};