import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';
import { IntegrationSettings, Json } from '../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const supabaseAdmin = createClient<Database>(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

    if (req.method !== 'POST') return res.status(405).end();

    const { barbershopId } = req.body;

    try {
        const { data: barbershop } = await supabaseAdmin
            .from('barbershops')
            .select('integrations')
            .eq('id', barbershopId)
            .single();

        const currentIntegrations = (barbershop?.integrations as IntegrationSettings) || {};

        // Remover campos do Stripe
        const { stripeAccountId, stripeAccountOnboarded, ...rest } = currentIntegrations;

        await supabaseAdmin
            .from('barbershops')
            .update({ integrations: rest as Json })
            .eq('id', barbershopId);

        res.status(200).json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}