import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';
import { SUPER_ADMIN_USER_ID } from './_shared';

// Helper to get user and check for Super Admin
async function isSuperAdmin(req: VercelRequest, supabase: SupabaseClient<Database>): Promise<boolean> {
    const authHeader = req.headers.authorization;
    if (!authHeader) return false;
    const token = authHeader.split(' ')[1];
    if (!token) return false;

    const { data: { user } } = await supabase.auth.getUser(token);
    return user?.id === SUPER_ADMIN_USER_ID;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Supabase env vars are not set for platform disconnect.');
        return res.status(500).json({ error: 'Server configuration error.' });
    }
    const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);

    if (!(await isSuperAdmin(req, supabaseAdmin))) {
        return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }
    
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    try {
        const { data, error: fetchError } = await supabaseAdmin
            .from('platform_settings')
            .select('config')
            .eq('id', 1)
            .single();

        if (fetchError || !data) throw new Error('Could not fetch platform settings.');

        const currentConfig = (data.config as any) || {};

        // Remove Mercado Pago specific keys
        const {
            mercadopagoAccessToken,
            mercadopagoPublicKey,
            mercadopagoRefreshToken,
            mercadopagoUserId,
            ...restConfig
        } = currentConfig;

        const { error: updateError } = await supabaseAdmin
            .from('platform_settings')
            .update({ config: restConfig })
            .eq('id', 1);

        if (updateError) throw updateError;

        res.status(200).json({ message: 'Platform Mercado Pago account successfully disconnected.' });

    } catch (error: any) {
        console.error('Platform Disconnect Error:', error);
        res.status(500).json({ error: error.message || 'Internal server error.' });
    }
}