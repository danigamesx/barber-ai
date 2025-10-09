import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';
import { IntegrationSettings, Json } from '../src/types';

const supabaseAdmin = createClient<Database>(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Respond immediately to Mercado Pago to prevent timeouts
    res.status(200).send('OK');

    const { body } = req;
    
    // Process only payment notifications
    if (body.type !== 'payment' || !body.data?.id) {
        console.log('Webhook received non-payment notification, ignoring.');
        return;
    }

    const paymentId = body.data.id as string;

    try {
        const { data: settings, error: settingsError } = await supabaseAdmin
            .from('platform_settings')
            .select('config')
            .eq('id', 1)
            .single();

        if (settingsError || !settings || !settings.config) {
            console.error('PLAN WEBHOOK: Could not fetch platform settings:', settingsError);
            return;
        }

        const platformAccessToken = (settings.config as any)?.mercadopagoAccessToken;

        if (!platformAccessToken) {
            console.error('PLAN WEBHOOK: Platform Mercado Pago access token is missing in DB.');
            return;
        }

        const mpClient = new MercadoPagoConfig({ accessToken: platformAccessToken });
        const paymentClient = new Payment(mpClient);
        const payment = await paymentClient.get({ id: paymentId });

        if (!payment || !payment.metadata) {
            console.log(`PLAN WEBHOOK: Payment ${paymentId} not found or has no metadata.`);
            return;
        }

        const { status, metadata } = payment;
        const { plan_id, billing_cycle, barbershop_id } = metadata as any;
        
        console.log(`PLAN WEBHOOK: Processing payment ${paymentId} for barbershop ${barbershop_id} with status ${status}.`);

        if (status === 'approved') {
            const { data: barbershop, error: fetchError } = await supabaseAdmin
                .from('barbershops')
                .select('integrations')
                .eq('id', barbershop_id)
                .single();

            if (fetchError || !barbershop) {
                console.error(`PLAN WEBHOOK: Barbershop ${barbershop_id} not found.`, fetchError);
                return;
            }

            const currentIntegrations = (barbershop.integrations as IntegrationSettings) || {};
            
            const newExpiryDate = new Date();
            if (billing_cycle === 'annual') {
                newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
            } else {
                newExpiryDate.setMonth(newExpiryDate.getMonth() + 1);
            }

            const updatedIntegrations: IntegrationSettings = {
                ...currentIntegrations,
                plan: plan_id,
                plan_type: billing_cycle,
                plan_expires_at: newExpiryDate.toISOString(),
                plan_status: 'active',
            };

            const { error: updateError } = await supabaseAdmin
                .from('barbershops')
                .update({ 
                    integrations: updatedIntegrations as Json,
                    trial_ends_at: null // End trial period upon successful payment
                })
                .eq('id', barbershop_id);

            if (updateError) {
                console.error(`PLAN WEBHOOK: Failed to update plan for barbershop ${barbershop_id}.`, updateError);
            } else {
                console.log(`PLAN WEBHOOK: Successfully updated plan for barbershop ${barbershop_id} to ${plan_id} (${billing_cycle}).`);
            }
        }
    } catch (error: any) {
        console.error('PLAN WEBHOOK: Internal error processing webhook.', error.message || error);
    }
}