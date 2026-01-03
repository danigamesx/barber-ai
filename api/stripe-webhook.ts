import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Database, TablesInsert, Json } from '../src/types/database';
import { IntegrationSettings, ServicePackage, UserActiveSubscription, UserPurchasedPackage } from '../src/types';
import { stripe } from './_shared';
import { buffer } from 'micro';
import { randomUUID } from 'crypto';

const supabaseAdmin = createClient<Database>(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

// Desativar body parsing automático do Vercel para validar assinatura
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const buf = await buffer(req);
    const sig = req.headers['stripe-signature']!;
    let event;

    try {
        event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;
        const metadata = session.metadata;

        console.log('Processing checkout session:', session.id, metadata);

        try {
            if (metadata.purchase_type === 'plan_subscription') {
                // Pagamento de Assinatura da Plataforma (Barbearia pagando o SaaS)
                await handlePlanPayment(metadata);
            } else if (metadata.purchase_type === 'appointment') {
                // Pagamento de Agendamento (Cliente pagando Barbearia)
                await handleAppointmentPayment(metadata, session.id);
            } else if (metadata.purchase_type === 'package' || metadata.purchase_type === 'subscription') {
                // Compra de Pacote/Assinatura de Serviços (Cliente comprando da Barbearia)
                await handleItemPurchase(metadata);
            }
        } catch (error) {
            console.error('Error processing webhook logic:', error);
            return res.status(500).send('Internal Server Error');
        }
    }

    res.status(200).json({ received: true });
}

async function handlePlanPayment(metadata: any) {
    const { barbershop_id, plan_id, billing_cycle } = metadata;
    
    const { data: barbershop } = await supabaseAdmin.from('barbershops').select('integrations').eq('id', barbershop_id).single();
    if (!barbershop) return;

    const currentIntegrations = (barbershop.integrations as IntegrationSettings) || {};
    const newExpiryDate = new Date();
    
    if (billing_cycle === 'annual') {
        newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
    } else {
        newExpiryDate.setMonth(newExpiryDate.getMonth() + 1);
    }

    const updatedIntegrations = {
        ...currentIntegrations,
        plan: plan_id,
        plan_type: billing_cycle,
        plan_expires_at: newExpiryDate.toISOString(),
        plan_status: 'active',
    };

    await supabaseAdmin.from('barbershops')
        .update({ integrations: updatedIntegrations as Json, trial_ends_at: null })
        .eq('id', barbershop_id);
}

async function handleAppointmentPayment(metadata: any, sessionId: string) {
    const appointmentForDb: TablesInsert<'appointments'> = {
        client_id: metadata.client_id,
        client_name: metadata.client_name,
        barbershop_id: metadata.barbershop_id,
        barber_name: metadata.barber_name,
        service_id: metadata.service_id,
        service_name: metadata.service_name,
        price: parseFloat(metadata.price),
        start_time: metadata.start_time,
        end_time: metadata.end_time,
        status: 'paid',
        stripe_session_id: sessionId,
    };
    await supabaseAdmin.from('appointments').insert(appointmentForDb);
}

async function handleItemPurchase(metadata: any) {
    const { userId, barbershopId, item_id, purchase_type } = metadata;
    
    const { data: barbershop } = await supabaseAdmin.from('barbershops').select('packages, subscriptions').eq('id', barbershopId).single();
    const { data: userProfile } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
    
    if (!barbershop || !userProfile) return;

    if (purchase_type === 'package') {
        const pkg = (barbershop.packages as ServicePackage[]).find(p => p.id === item_id);
        if (!pkg) return;

        const newPurchase: UserPurchasedPackage = {
            id: `purchase_${randomUUID()}`,
            packageId: item_id,
            barbershopId: barbershopId,
            purchaseDate: new Date().toISOString(),
            remainingUses: pkg.totalUses,
        };
        const currentPackages = (userProfile.purchased_packages as UserPurchasedPackage[] || []);
        await supabaseAdmin.from('profiles').update({ purchased_packages: [...currentPackages, newPurchase] as unknown as Json }).eq('id', userId);

    } else if (purchase_type === 'subscription') {
        const newSubscription: UserActiveSubscription = {
            id: `sub_${randomUUID()}`,
            subscriptionId: item_id,
            barbershopId: barbershopId,
            startDate: new Date().toISOString(),
            status: 'active',
        };
        const currentSubs = (userProfile.active_subscriptions as UserActiveSubscription[] || []);
        await supabaseAdmin.from('profiles').update({ active_subscriptions: [...currentSubs, newSubscription] as unknown as Json }).eq('id', userId);
    }
}
