import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';
import { IntegrationSettings } from '../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Supabase environment variables are not set.');
        return res.status(500).json({ error: 'Server configuration error.' });
    }

    const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);
    
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    const { barbershopId } = req.body;
    if (!barbershopId) {
        return res.status(400).json({ error: 'Barbershop ID is required.' });
    }

    try {
        const { data: barbershop, error: fetchError } = await supabaseAdmin
            .from('barbershops')
            .select('integrations')
            .eq('id', barbershopId)
            .single();

        if (fetchError) throw fetchError;

        const currentIntegrations = (barbershop.integrations as IntegrationSettings) || {};
        
        // Remove Mercado Pago specific keys
        const {
            mercadopagoAccessToken,
            mercadopagoPublicKey,
            mercadopagoRefreshToken,
            mercadopagoUserId,
            ...restIntegrations
        } = currentIntegrations;

        const { error: updateError } = await supabaseAdmin
            .from('barbershops')
            .update({ integrations: restIntegrations })
            .eq('id', barbershopId);

        if (updateError) {
            console.error('Supabase update error on disconnect:', updateError);
            throw new Error('Failed to update database.');
        }

        res.status(200).json({ message: 'Successfully disconnected.' });

    } catch (error: any) {
        console.error('Disconnect Error:', error);
        res.status(500).json({ error: error.message || 'Internal server error.' });
    }
}
