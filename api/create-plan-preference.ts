import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';
import { PLANS } from '../src/constants';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Supabase env vars not set for plan preference creation.');
        return res.status(500).json({ error: 'Configuração do servidor incompleta.' });
    }
    const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    try {
        // Fetch platform's Mercado Pago credentials from the new table
        const { data: settings, error: settingsError } = await supabaseAdmin
            .from('platform_settings')
            .select('config')
            .eq('id', 1)
            .single();

        if (settingsError || !settings || !settings.config) {
            console.error('Could not fetch platform settings:', settingsError);
            return res.status(500).json({ error: 'Configuração de pagamento da plataforma não encontrada.' });
        }
        
        const platformConfig = settings.config as any;
        const platformAccessToken = platformConfig?.mercadopagoAccessToken;
        const platformPublicKey = platformConfig?.mercadopagoPublicKey;

        if (!platformAccessToken || !platformPublicKey) {
            console.error('Platform Mercado Pago access token or public key is missing in platform_settings.');
            return res.status(500).json({ error: 'A conta de pagamento da plataforma não está conectada ou configurada corretamente.' });
        }

        const { planId, billingCycle, barbershopId } = req.body;
        const plan = PLANS.find(p => p.id === planId);

        if (!plan || !billingCycle || !barbershopId) {
            return res.status(400).json({ error: 'Dados da assinatura (plano, ciclo, ID da barbearia) são obrigatórios.' });
        }

        const price = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;
        const title = `Assinatura BarberAI - Plano ${plan.name} (${billingCycle === 'annual' ? 'Anual' : 'Mensal'})`;

        const client = new MercadoPagoConfig({ accessToken: platformAccessToken });
        const preferenceClient = new Preference(client);

        const preferenceBody = {
            items: [
                {
                    id: `${planId}-${billingCycle}`,
                    title: title,
                    quantity: 1,
                    currency_id: 'BRL',
                    unit_price: Number(price.toFixed(2)),
                },
            ],
            back_urls: {
                success: `${req.headers.origin}/#/?plan_payment_status=success`,
                failure: `${req.headers.origin}/#/?plan_payment_status=failure`,
                pending: `${req.headers.origin}/#/?plan_payment_status=pending`,
            },
            auto_return: 'approved' as 'approved',
            notification_url: `https://${req.headers.host}/api/plan-webhook`,
            external_reference: barbershopId, // Use barbershopId as external reference for easy lookup
            metadata: {
                plan_id: planId,
                billing_cycle: billingCycle,
                barbershop_id: barbershopId
            },
        };
        
        const mpResponse = await preferenceClient.create({ body: preferenceBody });
        
        const preferenceId = mpResponse.id;
        if (!preferenceId) {
            throw new Error('Não foi possível obter o ID da preferência do Mercado Pago.');
        }
        
        res.status(200).json({ preferenceId, publicKey: platformPublicKey });

    } catch (error: any) {
        console.error('Erro ao criar preferência de plano no Mercado Pago:', error.cause || error.message);
        res.status(500).json({ error: error.message || 'Erro interno do servidor ao criar preferência.' });
    }
}