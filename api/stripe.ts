import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';
import { IntegrationSettings, Json } from '../src/types';

// FIX: Initialize a separate Supabase client for the serverless environment using process.env.
const supabase = createClient<Database>(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

// Inicialize o Stripe com a chave secreta a partir das variáveis de ambiente
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

// Helper para atualizar as integrações da barbearia no Supabase
const updateBarbershopIntegrations = async (barbershopId: string, updates: Partial<IntegrationSettings>) => {
    const { data: barbershop, error: fetchError } = await supabase
        .from('barbershops')
        .select('integrations')
        .eq('id', barbershopId)
        .single();
    
    if (fetchError || !barbershop) throw new Error('Barbershop not found.');

    const currentIntegrations = (barbershop.integrations as IntegrationSettings) || {};
    const newIntegrations = { ...currentIntegrations, ...updates };

    const { error: updateError } = await supabase
        .from('barbershops')
        .update({ integrations: newIntegrations as Json })
        .eq('id', barbershopId);

    if (updateError) throw updateError;

    return newIntegrations;
}


export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Lógica para o Webhook
    if (req.method === 'POST' && req.body.type) {
        const sig = req.headers['stripe-signature'] as string;
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } catch (err: any) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        switch (event.type) {
            case 'account.updated':
                const account = event.data.object as Stripe.Account;
                if (account.charges_enabled) {
                    const barbershop = await supabase.from('barbershops').select('id').eq('integrations->>stripeAccountId', account.id).single();
                    if (barbershop.data) {
                        await updateBarbershopIntegrations(barbershop.data.id, { stripeAccountOnboarded: true });
                    }
                }
                break;
            // Adicione mais casos de webhook conforme necessário
        }

        return res.status(200).json({ received: true });
    }

    // Lógica para as chamadas da API do frontend
    if (req.method === 'POST') {
        const { action, barbershopId, accountId, returnUrl } = req.body;

        try {
            switch (action) {
                case 'create-account-link': {
                    if (!barbershopId || !returnUrl) return res.status(400).send('Barbershop ID and return URL are required.');

                    // FIX: Fetch the entire 'integrations' object for better type safety and to avoid Supabase parser errors.
                    const { data: shopData, error: shopError } = await supabase
                        .from('barbershops')
                        .select('integrations')
                        .eq('id', barbershopId)
                        .single();

                    if (shopError) {
                        console.error('Supabase error fetching barbershop:', shopError);
                        return res.status(500).send('Could not retrieve barbershop data.');
                    }

                    let localAccountId = (shopData?.integrations as IntegrationSettings)?.stripeAccountId || null;
                    
                    if (!localAccountId) {
                        const account = await stripe.accounts.create({ type: 'express' });
                        localAccountId = account.id;
                        await updateBarbershopIntegrations(barbershopId, { stripeAccountId: localAccountId, stripeAccountOnboarded: false });
                    }

                    const accountLink = await stripe.accountLinks.create({
                        account: localAccountId,
                        refresh_url: returnUrl,
                        return_url: returnUrl,
                        type: 'account_onboarding',
                    });

                    return res.status(200).json({ accountId: localAccountId, onboardingUrl: accountLink.url });
                }

                case 'verify-account': {
                    if (!barbershopId || !accountId) return res.status(400).send('Barbershop ID and Account ID are required.');
                    
                    const account = await stripe.accounts.retrieve(accountId);
                    const isOnboarded = !!account.charges_enabled;

                    if (isOnboarded) {
                        await updateBarbershopIntegrations(barbershopId, { stripeAccountOnboarded: true });
                    }
                    
                    return res.status(200).json({ onboarded: isOnboarded });
                }

                default:
                    return res.status(400).send('Invalid action.');
            }
        } catch (error: any) {
            console.error(error);
            return res.status(500).send(error.message || 'Internal Server Error');
        }
    }
    
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
}
