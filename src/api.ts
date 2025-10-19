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
    // FIX: Cast to any to bypass incorrect type errors for Supabase auth methods.
    return (supabase.auth as any).getSession();
}
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
    if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
    // FIX: Cast to any to bypass incorrect type errors for Supabase auth methods.
    return (supabase.auth as any).onAuthStateChange(callback);
}

export const signInUser = async (email: string, password: string) => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    // FIX: Cast to any to bypass incorrect type errors for Supabase auth methods.
    const { error } = await (supabase.auth as any).signInWithPassword({ email, password });
    if (error) throw error;
};

export const signOutUser = async () => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    // FIX: Cast to any to bypass incorrect type errors for Supabase auth methods.
    const { error } = await (supabase.auth as any).signOut();
    if (error) throw error;
};

export const signUpUser = async (name: string, email: string, password: string, accountType: 'client' | 'barbershop', phone: string, birthDate?: string, barbershopName?: string) => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    // FIX: Cast to any to bypass incorrect type errors for Supabase auth methods.
    const { data: authData, error: authError } = await (supabase.auth as any).signUp({ 
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

export const getBarbershopById = async (id: string): Promise<Barbershop> => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const { data, error } = await supabase.from('barbershops').select('*').eq('id', id).single();
    if (error) {
        console.error(`Error fetching barbershop ${id}:`, error);
        throw error;
    }
    if (!data) throw new Error(`Barbershop with id ${id} not found.`);
    return data;
};

export const getBarbershopBySlug = async (slug: string): Promise<Barbershop> => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const { data, error } = await supabase.from('barbershops').select('*').eq('slug', slug).single();
    if (error) {
        console.error(`Error fetching barbershop with slug ${slug}:`, error);
        throw error;
    }
    if (!data) throw new Error(`Barbershop with slug ${slug} not found.`);
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
        client_id: appointment.client_id,
        client_name: appointment.client_name,
        barbershop_id: appointment.barbershop_id,
        barber_id: appointment.barber_id,
        barber_name: appointment.barber_name,
        service_id: appointment.service_id,
        service_name: appointment.service_name,
        price: appointment.price,
        start_time: appointment.start_time.toISOString(),
        end_time: appointment.end_time.toISOString(),
        notes: appointment.notes || null,
        status: initialStatus,
        is_reward: appointment.is_reward || false,
        review_id: appointment.review_id || null,
        cancellation_fee: appointment.cancellation_fee || null,
        commission_amount: appointment.commission_amount || null
    };

    const { data: newAppointmentRow, error: insertError } = await supabase.from('appointments').insert(appointmentForDb).select().single();
    if (insertError) {
        console.error('Supabase insert error:', insertError);
        throw insertError;
    }

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

    const updates: Partial<TablesUpdate<'appointments'>> = { status };

    if (status === 'completed' && barbershopData && appointment.price && appointment.barber_id) {
        const barbers = (barbershopData.barbers as Barber[]) || [];
        const barber = barbers.find(b => b.id === appointment.barber_id);
        
        if (barber && typeof barber.commissionPercentage === 'number') {
            const commission = appointment.price * (barber.commissionPercentage / 100);
            updates.commission_amount = commission;
        } else {
            updates.commission_amount = 0;
        }
    }

    const { error } = await supabase.from('appointments').update(updates).eq('id', appointment.id);
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
    if (error) {
        if (error.message.includes('duplicate key value violates unique constraint "barbershops_slug_key"')) {
            throw new Error('Este link personalizado já está em uso. Por favor, escolha outro.');
        }
        throw error;
    }
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
// FIX: Updated return type to include 'publicKey' as it is returned by the API endpoint.
export const createMercadoPagoPreference = async (appointmentData: Omit<Appointment, 'id' | 'created_at'> & { start_time: Date, end_time: Date }): Promise<{ redirectUrl: string, preferenceId: string, publicKey: string }> => {
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

export const createPackageSubscriptionPreference = async (
  type: 'package' | 'subscription',
  itemId: string,
  barbershopId: string,
  user: User
): Promise<{ preferenceId: string, publicKey: string }> => {
  const response = await fetch(`/api/create-mp-preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        packageData: { 
          type, 
          itemId, 
          barbershopId, 
          userId: user.id, 
          userName: user.name, 
          userEmail: user.email 
        } 
      }),
  });
  if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(errorBody.error || 'Falha ao criar preferência de pagamento.');
  }
  return await response.json();
};

export const createPlanPreference = async (planId: string, billingCycle: 'monthly' | 'annual', barbershopId: string): Promise<{ preferenceId: string, publicKey: string }> => {
    const response = await fetch(`/api/create-plan-preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingCycle, barbershopId }),
    });
    
    if (!response.ok) {
        // Handle non-JSON error responses gracefully
        const errorText = await response.text();
        try {
            const errorBody = JSON.parse(errorText);
            throw new Error(errorBody.error || `Falha ao criar preferência de pagamento do plano (status: ${response.status}).`);
        } catch (e) {
            // If parsing fails, the error response was not JSON
            throw new Error(errorText || `Falha ao criar preferência de pagamento do plano (status: ${response.status}).`);
        }
    }
    
    const data = await response.json();
    return data;
};

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

export const deleteBarbershopAccount = async () => {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const { error } = await supabase.rpc('delete_user_and_barbershop');
    if (error) {
        console.error('Error calling delete_user_and_barbershop RPC:', error);
        throw new Error('Não foi possível excluir a conta. Certifique-se de que a função `delete_user_and_barbershop` existe no seu banco de dados ou entre em contato com o suporte.');
    }
};


// === PUSH NOTIFICATIONS ===

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function saveSubscriptionToServer(userId: string, subscription: PushSubscription) {
    if (!supabase) throw new Error(supabaseInitializationError!);
    
    const { data: profile, error: fetchError } = await supabase.from('profiles').select('push_subscriptions').eq('id', userId).single();
    if (fetchError) throw new Error(`Failed to fetch user profile: ${fetchError.message}`);

    const newSubscriptionJSON = subscription.toJSON();
    const existingSubscriptions = (profile?.push_subscriptions as PushSubscriptionJSON[] || []);

    const isAlreadySubscribed = existingSubscriptions.some(sub => sub.endpoint === newSubscriptionJSON.endpoint);

    if (!isAlreadySubscribed) {
        const updatedSubscriptions = [...existingSubscriptions, newSubscriptionJSON];
        const { error: updateError } = await supabase.from('profiles').update({ push_subscriptions: updatedSubscriptions as unknown as Json }).eq('id', userId);
        if (updateError) throw new Error(`Failed to save subscription: ${updateError.message}`);
    }
}

async function removeSubscriptionFromServer(userId: string, endpoint: string) {
    if (!supabase) throw new Error(supabaseInitializationError!);
    const { data: profile, error: fetchError } = await supabase.from('profiles').select('push_subscriptions').eq('id', userId).single();
    if (fetchError) return; // Fail silently

    const existingSubscriptions = (profile?.push_subscriptions as PushSubscriptionJSON[] || []);
    const updatedSubscriptions = existingSubscriptions.filter(sub => sub.endpoint !== endpoint);

    if (updatedSubscriptions.length < existingSubscriptions.length) {
        await supabase.from('profiles').update({ push_subscriptions: updatedSubscriptions as unknown as Json }).eq('id', userId);
    }
}

export const subscribeToPushNotifications = async (userId: string) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push messaging is not supported on this browser.');
        return;
    }
    
    try {
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            console.log('User is already subscribed.');
            await saveSubscriptionToServer(userId, subscription); // Resync
            return;
        }
        
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Push notification permission not granted.');
            return;
        }

        // TODO: Gere suas chaves VAPID (public/private) e defina VITE_VAPID_PUBLIC_KEY no seu ambiente.
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
            console.error('VAPID public key is not configured in environment variables (VITE_VAPID_PUBLIC_KEY).');
            return;
        }

        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        await saveSubscriptionToServer(userId, subscription);
        console.log('User subscribed to push notifications.');

    } catch (error) {
        console.error('Failed to subscribe to push notifications:', error);
    }
};

export const unsubscribeFromPushNotifications = async (userId: string) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
            const endpoint = subscription.endpoint;
            const unsubscribed = await subscription.unsubscribe();
            if (unsubscribed) {
                console.log('Successfully unsubscribed from push service.');
                await removeSubscriptionFromServer(userId, endpoint);
            }
        }
    } catch (error) {
        console.error('Error unsubscribing:', error);
    }
};
