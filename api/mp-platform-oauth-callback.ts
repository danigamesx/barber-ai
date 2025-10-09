import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${proto}://${host}`;
    const redirectUri = `${baseUrl}/api/mp-platform-oauth-callback`;
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    const appId = process.env.VITE_MERCADO_PAGO_APP_ID;
    const clientSecret = process.env.MERCADO_PAGO_CLIENT_SECRET;

    if (!supabaseUrl || !supabaseServiceKey || !appId || !clientSecret) {
        console.error('Platform OAuth Error: Server environment variables are not fully set.');
        return res.status(500).send('Server configuration error.');
    }

    const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);
    
    const { code, state } = req.query;

    if (state !== 'platform_connect') {
        return res.status(400).send('Invalid state parameter for platform connection.');
    }
    
    if (!code) {
        return res.status(400).send('Authorization code is missing.');
    }

    try {
        const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
            throw new Error(`Failed to get access token: ${errorBody.message || JSON.stringify(errorBody)}`);
        }

        const tokenData = await tokenResponse.json();
        const { access_token, public_key, refresh_token, user_id } = tokenData;

        const mpConfig = {
            mercadopagoAccessToken: access_token,
            mercadopagoPublicKey: public_key,
            mercadopagoRefreshToken: refresh_token,
            mercadopagoUserId: user_id,
        };

        const { error: updateError } = await supabaseAdmin
            .from('platform_settings')
            .update({ config: mpConfig })
            .eq('id', 1);

        if (updateError) {
            console.error('Platform OAuth Supabase update error:', updateError);
            throw new Error('Failed to save platform credentials.');
        }

        res.redirect(302, `${baseUrl}/`);

    } catch (error: any) {
        console.error('Platform OAuth Callback Error:', error);
        res.status(500).send(`An error occurred: ${error.message}`);
    }
}