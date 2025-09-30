import { supabase } from './supabaseClient';
import { User, Barbershop, Appointment, Review, Barber, Service, FinancialRecord, Promotion, ClientNotification, WaitingListEntry, Json, IntegrationSettings, Address } from './types';
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
export const getSession = () => supabase.auth.getSession();
export const onAuthStateChange = (callback: (event: string, session: any) => void) => supabase.auth.onAuthStateChange(callback);

export const signInUser = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
};

export const signOutUser = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const signUpUser = async (name: string, email: string, password: string, accountType: 'client' | 'barbershop', phone: string, birthDate?: string, barbershopName?: string) => {
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
    
    // If it's a barbershop, create the barbershop entry with a 30-day trial
    if (accountType === 'barbershop') {
        if (!barbershopName) throw new Error("Barbershop name is required.");

        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 30);

        const initialIntegrations: IntegrationSettings = {
            plan: 'PREMIUM',
            auto_confirm_appointments: false, // Padrão é confirmação manual
        };
        
        const { error: barbershopError } = await supabase.from('barbershops').insert({
            owner_id: authData.user.id,
            name: barbershopName,
            cnpj: null,
            image_url: `https://picsum.photos/seed/${Date.now()}/600/400`,
            trial_ends_at: trialEndDate.toISOString(),
            integrations: initialIntegrations as Json,
        });
        if (barbershopError) throw barbershopError;
    }
};

// === DATA FETCHING FUNCTIONS ===
export const getUserProfile = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) throw error;
    return data as User | null;
};

export const getAllUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    return data as User[];
}

export const getBarbershops = async (): Promise<Barbershop[]> => {
    const { data, error } = await supabase.from('barbershops').select('*');
    if (error) throw error;
    return data;
};

export const getAppointments = async (): Promise<Appointment[]> => {
    const { data, error } = await supabase.from('appointments').select('*');
    if (error) throw error;
    return data.map(appointmentFromRow);
};

export const getReviews = async (): Promise<Review[]> => {
    const { data, error } = await supabase.from('reviews').select('*');
    if (error) throw error;
    return data.map(reviewFromRow);
};


// === DATA MUTATION FUNCTIONS ===
export const addAppointment = async (appointment: Omit<Appointment, 'id' | 'created_at' | 'start_time' | 'end_time'> & { start_time: Date, end_time: Date }): Promise<Appointment> => {
    // Step 1: Always insert as 'pending' for RLS policies, unless it's already 'paid'.
    const initialStatus = appointment.status === 'paid' ? 'paid' : (appointment.status === 'confirmed' ? 'confirmed' : 'pending');
    const appointmentForDb: TablesInsert<'appointments'> = {
        ...appointment,
        start_time: appointment.start_time.toISOString(),
        end_time: appointment.end_time.toISOString(),
        status: initialStatus,
    };

    // Step 2: Insert and get the newly created row back.
    const { data: newAppointmentRow, error: insertError } = await supabase
        .from('appointments')
        .insert(appointmentForDb)
        .select()
        .single();

    if (insertError) throw insertError;
    if (!newAppointmentRow) throw new Error("Failed to create appointment.");

    let finalAppointment = appointmentFromRow(newAppointmentRow);

    // Step 3: If it was a 'pending' appointment, check for auto-confirmation.
    if (initialStatus === 'pending') {
        const { data: barbershop, error: shopError } = await supabase
            .from('barbershops')
            .select('integrations')
            .eq('id', appointment.barbershop_id)
            .single();
        
        if (shopError) {
            console.error("Could not fetch barbershop settings for auto-confirm, defaulting to manual.", shopError);
            return finalAppointment; // Return the pending appointment
        }

        const integrations = barbershop?.integrations as IntegrationSettings | undefined;

        // Step 4: If auto-confirm is enabled, update the status to 'confirmed'.
        if (integrations?.auto_confirm_appointments) {
            const { data: updatedAppointmentRow, error: updateError } = await supabase
                .from('appointments')
                .update({ status: 'confirmed' })
                .eq('id', finalAppointment.id)
                .select()
                .single();
            
            if (updateError) {
                 console.error("Failed to auto-confirm appointment, it will remain pending.", updateError);
                 return finalAppointment; // Return the pending appointment on failure
            }
            if (updatedAppointmentRow) {
                finalAppointment = appointmentFromRow(updatedAppointmentRow);
            }
        }
    }
    
    // Step 5: Return the final state of the appointment.
    return finalAppointment;
};

export const updateAppointment = async (appointmentId: string, updates: { start_time: Date, end_time: Date }): Promise<Appointment> => {
    const { data, error } = await supabase
        .from('appointments')
        .update({
            start_time: updates.start_time.toISOString(),
            end_time: updates.end_time.toISOString(),
        })
        .eq('id', appointmentId)
        .select()
        .single();

    if (error) throw error;
    return appointmentFromRow(data);
};

export const updateAppointmentStatus = async (appointment: Appointment, status: string, barbershopData: Barbershop | null, googleToken: string | null) => {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', appointment.id);
    if (error) throw error;

    // Google Calendar Integration Logic
    const integrations = barbershopData?.integrations as IntegrationSettings;
    if (integrations?.googleCalendar && googleToken) {
        if (status === 'confirmed') {
            try {
                const event = await createGoogleCalendarEvent(appointment, googleToken, barbershopData!);
                await setAppointmentGoogleEventId(appointment.id, event.id);
            } catch (e) {
                console.error("Failed to create Google Calendar event:", e);
                // Non-critical error, so we don't re-throw it.
            }
        } else if ((status === 'cancelled' || status === 'declined') && appointment.google_event_id) {
            try {
                await deleteGoogleCalendarEvent(appointment.google_event_id, googleToken);
            } catch (e) {
                 console.error("Failed to delete Google Calendar event:", e);
                 // Also non-critical. The event might have been deleted manually.
            }
        }
    }
};

export const updateBarbershop = async (id: string, fields: Partial<Omit<Barbershop, 'id'>>) => {
    const { error } = await supabase.from('barbershops').update(fields as TablesUpdate<'barbershops'>).eq('id', id);
    if (error) throw error;
};

export const addReview = async (review: Omit<Review, 'id' | 'created_at'>, appointmentId: string) => {
    const { error: reviewError } = await supabase.from('reviews').insert(review);
    if (reviewError) throw reviewError;

    // After adding review, update the appointment with the review_id
    // This is not ideal, should be a transaction.
    const { data: newReview, error: fetchError } = await supabase.from('reviews').select('id').eq('appointment_id', appointmentId).single();
    if(fetchError) throw fetchError;

    const { error: appUpdateError } = await supabase.from('appointments').update({ review_id: newReview.id }).eq('id', appointmentId);
    if (appUpdateError) throw appUpdateError;
};

export const toggleFavoriteBarbershop = async (userId: string, currentFavorites: string[], barbershopId: string): Promise<User> => {
    const isFavorite = currentFavorites.includes(barbershopId);
    const updatedFavorites = isFavorite
        ? currentFavorites.filter(id => id !== barbershopId)
        : [...currentFavorites, barbershopId];

    const { data, error } = await supabase.from('profiles').update({ favorite_barbershop_ids: updatedFavorites }).eq('id', userId).select().single();
    if (error) throw error;
    return data as User;
};

export const addFinancialRecord = async (barbershopId: string, barberId: string, type: 'advances' | 'consumptions', recordData: Omit<FinancialRecord, 'id' | 'date'>, barbershops: Barbershop[]) => {
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
    const shop = barbershops.find(b => b.id === barbershopId);
    if (!shop) return;

    // 1. Create the promotion record
    const newPromotion: Promotion = { 
        id: `promo_${Date.now()}`, 
        title, 
        message, 
        sentAt: new Date().toISOString(), 
        recipients: clients.map(c => ({
            clientId: c.id,
            clientName: c.name,
            status: 'sent',
            receivedAt: new Date().toISOString(),
        }))
    };
    const currentPromotions = Array.isArray(shop.promotions) ? shop.promotions as Promotion[] : [];
    const updatedPromotions = [...currentPromotions, newPromotion];
    await updateBarbershop(barbershopId, { promotions: updatedPromotions as unknown as Json });

    // 2. Create a notification for each client
    const notification: Omit<ClientNotification, 'id'> = {
        promotionId: newPromotion.id,
        barbershopId: barbershopId,
        barbershopName: shop.name,
        title,
        message,
        receivedAt: new Date().toISOString(),
        isRead: false,
    };
    
    // In a real app, this would be a single bulk operation on the backend
    for (const client of clients) {
        const currentNotifications = Array.isArray(client.notifications) ? client.notifications as ClientNotification[] : [];
        const newNotification = { ...notification, id: `notif_${Date.now()}_${client.id}` };
        const updatedNotifications = [...currentNotifications, newNotification];
        await supabase.from('profiles').update({ notifications: updatedNotifications as unknown as Json }).eq('id', client.id);
    }
};

export const markNotificationsAsRead = async (userId: string, currentNotifications: ClientNotification[], notificationIds: string[]): Promise<User> => {
    const updatedNotifications = currentNotifications.map(n => 
        notificationIds.includes(n.id) ? { ...n, isRead: true } : n
    );
    const { data, error } = await supabase.from('profiles').update({ notifications: updatedNotifications as unknown as Json }).eq('id', userId).select().single();
    if (error) throw error;
    return data as User;
};

export const addToWaitingList = async (barbershopId: string, date: string, user: User, barbershops: Barbershop[]) => {
    const shop = barbershops.find(b => b.id === barbershopId);
    if (!shop) return;

    const newEntry: WaitingListEntry = { clientId: user.id, clientName: user.name, requestedAt: new Date().toISOString() };
    const waitingList = (shop.waiting_list as { [date: string]: WaitingListEntry[] } || {});
    const dayEntries = waitingList[date] || [];
    if (dayEntries.some(e => e.clientId === user.id)) return; // Already in list
    const updatedDayEntries = [...dayEntries, newEntry];
    const updatedWaitingList = { ...waitingList, [date]: updatedDayEntries };
    
    await updateBarbershop(barbershopId, { waiting_list: updatedWaitingList as unknown as Json });
};

export const removeFromWaitingList = async (barbershopId: string, date: string, clientId: string, barbershops: Barbershop[]) => {
    const shop = barbershops.find(b => b.id === barbershopId);
    if (!shop) return;
    
    const waitingList = (shop.waiting_list as { [date: string]: WaitingListEntry[] } || {});
    const dayEntries = waitingList[date] || [];
    const updatedDayEntries = dayEntries.filter(e => e.clientId !== clientId);
    const updatedWaitingList = { ...waitingList, [date]: updatedDayEntries };
    
    await updateBarbershop(barbershopId, { waiting_list: updatedWaitingList as unknown as Json });
};

export const getUsersByIds = async (userIds: string[]): Promise<User[]> => {
    if (!userIds || userIds.length === 0) {
        return [];
    }
    const { data, error } = await supabase.from('profiles').select('*').in('id', userIds);
    if (error) throw error;
    return data as User[];
};

export const updateUserProfile = async (userId: string, updates: Partial<User>) => {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates as TablesUpdate<'profiles'>)
        .eq('id', userId)
        .select()
        .single();
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
        'description': `Serviço agendado via BarberAI.\n\nBarbeiro: ${appointment.barber_name}\nObservações do cliente: ${appointment.notes || 'Nenhuma'}`,
        'start': {
            'dateTime': appointment.start_time.toISOString(),
            'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        'end': {
            'dateTime': appointment.end_time.toISOString(),
            'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
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
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok && response.status !== 410) { // 410 Gone means it's already deleted
        const errorData = await response.json();
        throw new Error(errorData.error.message || 'Failed to delete Google Calendar event');
    }
};

export const setAppointmentGoogleEventId = async (appointmentId: string, googleEventId: string) => {
    const { error } = await supabase.from('appointments').update({ google_event_id: googleEventId }).eq('id', appointmentId);
    if (error) throw error;
};

// === STRIPE PAYMENT INTEGRATION (STUBS) ===

/**
 * SIMULAÇÃO: No backend, esta função criaria uma conta Stripe Express para a barbearia,
 * salvaria o `accountId` e retornaria um link de onboarding.
 */
export const getStripeConnectOnboardingLink = async (barbershopId: string, currentIntegrations: IntegrationSettings): Promise<{ accountId: string; onboardingUrl: string }> => {
    console.log("BACKEND SIMULATION: Called getStripeConnectOnboardingLink");
    console.log("1. Verificando se a barbearia já possui um stripeAccountId...");

    let accountId = currentIntegrations.stripeAccountId;

    if (!accountId) {
        console.log("2. Nenhum ID encontrado. Criando uma nova conta Express no Stripe...");
        // Em um backend real: const account = await stripe.accounts.create({ type: 'express' });
        accountId = `acct_mock_${Date.now()}`;
        console.log(`3. Conta criada com ID: ${accountId}. Salvando no banco de dados...`);
        
        // Salva o ID da conta no Supabase.
        const updatedIntegrations = { ...currentIntegrations, stripeAccountId: accountId, stripeAccountOnboarded: false };
        await updateBarbershop(barbershopId, { integrations: updatedIntegrations as Json });
    } else {
        console.log(`2. ID da conta existente encontrado: ${accountId}`);
    }

    console.log("4. Criando um link de onboarding do Stripe...");
    // Em um backend real: const accountLink = await stripe.accountLinks.create({...});
    const onboardingUrl = `https://connect.stripe.com/mock/onboarding/${accountId}`;
    console.log(`5. Link de onboarding gerado: ${onboardingUrl}`);
    
    return { accountId, onboardingUrl };
};

/**
 * SIMULAÇÃO: No backend, esta função verificaria o status da conta Stripe.
 * Se o onboarding estiver completo, atualizaria o registro da barbearia.
 */
export const completeStripeOnboarding = async (barbershopId: string, currentIntegrations: IntegrationSettings): Promise<void> => {
    console.log("BACKEND SIMULATION: Called completeStripeOnboarding");
    console.log("1. Verificando status da conta no Stripe para:", currentIntegrations.stripeAccountId);
    // Em um backend real: const account = await stripe.accounts.retrieve(accountId);
    // if (account.charges_enabled) { ... }
    console.log("2. Simulação: Onboarding completo. Atualizando o banco de dados.");

    const updatedIntegrations = { ...currentIntegrations, stripeAccountOnboarded: true };
    await updateBarbershop(barbershopId, { integrations: updatedIntegrations as Json });
};


/**
 * SIMULAÇÃO: No backend, esta função criaria um PaymentIntent no Stripe,
 * associando-o à conta Stripe da barbearia.
 */
export const createPaymentIntent = async (appointmentData: Omit<Appointment, 'id' | 'created_at' | 'start_time' | 'end_time'> & { start_time: Date, end_time: Date }, barbershopStripeAccountId: string): Promise<string> => {
    console.log("BACKEND SIMULATION: Called createPaymentIntent");
    const amountInCents = Math.round((appointmentData.price || 0) * 100);
    
    console.log(`1. Criando PaymentIntent de ${amountInCents} centavos para a conta Stripe: ${barbershopStripeAccountId}`);
    
    // Em um backend real:
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: amountInCents,
    //   currency: 'brl',
    //   automatic_payment_methods: { enabled: true },
    //   application_fee_amount: 123, // Opcional: sua taxa de plataforma
    //   transfer_data: {
    //     destination: barbershopStripeAccountId,
    //   },
    // });
    // return paymentIntent.client_secret;

    const mockClientSecret = `pi_mock_${Date.now()}_secret_mock_${Date.now()}`;
    console.log(`2. PaymentIntent criado. Retornando client_secret: ${mockClientSecret}`);

    return new Promise(resolve => setTimeout(() => resolve(mockClientSecret), 1000));
};