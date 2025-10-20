import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { Database, TablesInsert, Json } from '../src/types/database';
import { IntegrationSettings, ServicePackage, UserActiveSubscription, UserPurchasedPackage } from '../src/types';
import { randomUUID } from 'crypto';


const supabaseAdmin = createClient<Database>(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    const { body, query } = req;
    
    // Respond immediately to Mercado Pago to prevent timeouts and retries
    res.status(200).send('OK');

    if (body.type !== 'payment' || !body.data?.id) {
        console.log('Webhook received non-payment notification, ignoring.');
        return;
    }

    const paymentId = body.data.id as string;
    const purchaseType = query.purchase_type as string;
    
    // barbershop_id is required for both flows to get the correct MP Access Token
    const barbershopIdFromQuery = query.barbershop_id as string;

    try {
        const { data: barbershop, error: fetchError } = await supabaseAdmin
            .from('barbershops')
            .select('integrations, packages, subscriptions')
            .eq('id', barbershopIdFromQuery)
            .single();

        if (fetchError || !barbershop) {
            console.error(`Webhook Error: Cannot find barbershop with ID ${barbershopIdFromQuery}.`, fetchError);
            return;
        }

        const integrations = barbershop.integrations as IntegrationSettings;
        const accessToken = integrations?.mercadopagoAccessToken;

        if (!accessToken) {
            console.error(`Webhook Error: No Mercado Pago access token for barbershop ${barbershopIdFromQuery}.`);
            return;
        }

        const client = new MercadoPagoConfig({ accessToken });
        const paymentClient = new Payment(client);
        const payment = await paymentClient.get({ id: paymentId });

        if (!payment) {
             console.log(`Webhook Info: Payment ${paymentId} not found.`);
             return;
        }
        
        const { status, metadata } = payment;

        if (status !== 'approved') {
            console.log(`Webhook Info: Payment ${paymentId} is not approved (status: ${status}). Ignoring.`);
            return;
        }

        if (purchaseType === 'package' || purchaseType === 'subscription') {
            // --- Handle Package/Subscription Logic ---
            const { userId, barbershopId, itemId, type } = metadata as any;
             if (!userId || !barbershopId || !itemId || !type) {
                console.error(`Webhook Error: Metadata missing for package/subscription payment ${paymentId}.`);
                return;
            }

            const { data: userProfile, error: userError } = await supabaseAdmin
                .from('profiles').select('*').eq('id', userId).single();
            if (userError || !userProfile) {
                 console.error(`Webhook Error: User profile ${userId} not found.`, userError);
                 return;
            }

            if (type === 'package') {
                const packages = barbershop.packages as ServicePackage[] || [];
                const pkgDetails = packages.find(p => p.id === itemId);
                if (!pkgDetails) {
                    console.error(`Webhook Error: Package ${itemId} not found in barbershop ${barbershopId}.`);
                    return;
                }

                const newPurchase: UserPurchasedPackage = {
                    id: `purchase_${randomUUID()}`,
                    packageId: itemId,
                    barbershopId: barbershopId,
                    purchaseDate: new Date().toISOString(),
                    remainingUses: pkgDetails.totalUses,
                };
                const currentPackages = (userProfile.purchased_packages as UserPurchasedPackage[] || []);
                const updatedPackages = [...currentPackages, newPurchase];
                
                const { error: updateError } = await supabaseAdmin
                    .from('profiles').update({ purchased_packages: updatedPackages as unknown as Json }).eq('id', userId);
                if (updateError) throw updateError;
            } else { // subscription
                const newSubscription: UserActiveSubscription = {
                    id: `sub_${randomUUID()}`,
                    subscriptionId: itemId,
                    barbershopId: barbershopId,
                    startDate: new Date().toISOString(),
                    status: 'active',
                };
                const currentSubs = (userProfile.active_subscriptions as UserActiveSubscription[] || []);
                const updatedSubs = [...currentSubs, newSubscription];

                const { error: updateError } = await supabaseAdmin
                    .from('profiles').update({ active_subscriptions: updatedSubs as unknown as Json }).eq('id', userId);
                if (updateError) throw updateError;
            }
            console.log(`Webhook Success: Processed ${type} purchase for user ${userId} from payment ${paymentId}.`);
        
        } else { // 'appointment' or undefined (legacy)
            // --- Handle Appointment Logic (existing logic) ---
            const { external_reference } = payment;
            const preference_id = (payment as any).preference_id;
            
            console.log(`Webhook processing appointment: PaymentID=${paymentId}, Status=${status}, Ref=${external_reference}`);
            
            const { data: existingAppointment, error: checkError } = await supabaseAdmin
                .from('appointments').select('id').eq('mp_preference_id', preference_id).limit(1);

            if (checkError) {
                console.error(`Webhook DB Check Error: Failed to check for appointment with preference_id ${preference_id}.`, checkError);
                return;
            }

            if (existingAppointment && existingAppointment.length > 0) {
                console.log(`Webhook Info: Appointment for preference_id ${preference_id} already exists. Skipping.`);
                return;
            }
            
            const appointmentData = metadata as any;
             if (!appointmentData || typeof appointmentData !== 'object') {
                console.error(`Webhook Error: Metadata missing or invalid in payment ${paymentId}.`);
                return;
            }

            const appointmentForDb: TablesInsert<'appointments'> = {
                client_id: appointmentData.client_id,
                client_name: appointmentData.client_name ?? null,
                barbershop_id: appointmentData.barbershop_id,
                barber_id: appointmentData.barber_id ?? null,
                barber_name: appointmentData.barber_name ?? null,
                service_id: appointmentData.service_id ?? null,
                service_name: appointmentData.service_name ?? null,
                price: Number(appointmentData.price) ?? null,
                start_time: appointmentData.start_time,
                end_time: appointmentData.end_time,
                notes: appointmentData.notes ?? null,
                status: 'paid',
                is_reward: appointmentData.is_reward ?? false,
                mp_preference_id: preference_id,
                // FIX: Removed properties that do not exist in the 'appointments' table schema.
                // package_usage_id: appointmentData.package_usage_id ?? null,
                // subscription_usage_id: appointmentData.subscription_usage_id ?? null,
            };
            
            const { error: insertError } = await supabaseAdmin.from('appointments').insert(appointmentForDb);
            
            if (insertError) {
                console.error(`Webhook DB Error: Failed to create appointment for payment ${paymentId}.`, insertError);
            } else {
                console.log(`Webhook Success: Appointment created for payment ${paymentId}.`);
            }
        }
    } catch (error: any) {
        console.error('Webhook Internal Error:', error.message || error);
    }
}