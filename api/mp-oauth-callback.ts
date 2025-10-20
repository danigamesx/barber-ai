import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';
import { Json } from '../src/types/database';
import { IntegrationSettings } from '../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${proto}://${host}`;
    const redirectUri = `${baseUrl}/api/mp-oauth-callback`;
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    const appId = process.env.VITE_MERCADO_PAGO_APP_ID;
    const clientSecret = process.env.MERCADO_PAGO_CLIENT_SECRET;

    if (!supabaseUrl || !supabaseServiceKey || !appId || !clientSecret) {
        console.error('Server environment variables are not fully set for Mercado Pago OAuth.');
        return res.status(500).send('Server configuration error.');
    }

    const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);
    
    const { code, state } = req.query;
    const barbershopId = state as string;

    if (!code || !barbershopId) {
        return res.status(400).send('Authorization code or state is missing.');
    }

    try {
        // Exchange authorization code for access token
        const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'grant_type': 'authorization_code',
                'client_id': appId,
                'client_secret': clientSecret,
                'code': code as string,
                'redirect_uri': redirectUri,
            })
        });

        if (!tokenResponse.ok) {
            const errorBody = await tokenResponse.json();
            const errorMessage = errorBody.message || JSON.stringify(errorBody);
            console.error('Mercado Pago token exchange failed:', errorBody);
            throw new Error(`Failed to get access token: ${errorMessage}`);
        }

        const tokenData = await tokenResponse.json();
        const { access_token, public_key, refresh_token, user_id } = tokenData;

        // Fetch current integrations to merge with new ones
        const { data: barbershop, error: fetchError } = await supabaseAdmin
            .from('barbershops')
            .select('integrations')
            .eq('id', barbershopId)
            .single();

        if (fetchError) throw fetchError;

        const currentIntegrations = (barbershop.integrations as IntegrationSettings) || {};
        
        const updatedIntegrations: IntegrationSettings = {
            ...currentIntegrations,
            mercadopagoAccessToken: access_token,
            mercadopagoPublicKey: public_key,
            mercadopagoRefreshToken: refresh_token,
            mercadopagoUserId: user_id,
        };

        // Save tokens to the database
        const { error: updateError } = await supabaseAdmin
            .from('barbershops')
            .update({ integrations: updatedIntegrations as Json })
            .eq('id', barbershopId);

        if (updateError) {
            console.error('Supabase update error:', updateError);
            throw new Error('Failed to save credentials to the database.');
        }

        res.redirect(302, `${baseUrl}/#/settings`);

    } catch (error: any) {
        console.error('OAuth Callback Error:', error);
        res.status(500).send(`An error occurred: ${error.message}`);
    }
}