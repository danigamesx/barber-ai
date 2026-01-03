import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';
import { stripe } from './_shared';
import { IntegrationSettings, Json } from '../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const frontendUrl = process.env.FRONTEND_URL || `https://${req.headers.host}`;
    const supabaseAdmin = createClient<Database>(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

    const { code, state } = req.query; // 'state' contém o barbershopId

    if (!code || !state) {
        return res.status(400).send('Código ou estado ausente.');
    }

    const barbershopId = state as string;

    try {
        // 1. Trocar o código de autorização pelo ID da conta conectada
        const response = await stripe.oauth.token({
            grant_type: 'authorization_code',
            code: code as string,
        });

        const connectedAccountId = response.stripe_user_id;

        // 2. Buscar configurações atuais
        const { data: barbershop, error: fetchError } = await supabaseAdmin
            .from('barbershops')
            .select('integrations')
            .eq('id', barbershopId)
            .single();

        if (fetchError) throw fetchError;

        const currentIntegrations = (barbershop.integrations as IntegrationSettings) || {};

        // 3. Atualizar configurações com o ID do Stripe
        const updatedIntegrations: IntegrationSettings = {
            ...currentIntegrations,
            stripeAccountId: connectedAccountId,
            stripeAccountOnboarded: true,
        };

        const { error: updateError } = await supabaseAdmin
            .from('barbershops')
            .update({ integrations: updatedIntegrations as Json })
            .eq('id', barbershopId);

        if (updateError) throw updateError;

        // 4. Redirecionar de volta para o painel
        res.redirect(302, `${frontendUrl}/#settings`);

    } catch (error: any) {
        console.error('Stripe Connect Callback Error:', error);
        res.status(500).send(`Erro ao conectar conta Stripe: ${error.message}`);
    }
}