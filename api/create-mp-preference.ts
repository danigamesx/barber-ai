import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';
import { IntegrationSettings } from '../src/types';
import { randomUUID } from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Supabase environment variables are missing.');
        return res.status(500).json({ error: 'Configuração do servidor incompleta. Variáveis do Supabase ausentes.' });
    }

    const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    const { appointmentData } = req.body;

    if (!appointmentData || !appointmentData.barbershop_id) {
        return res.status(400).json({ error: 'Dados do agendamento, incluindo ID da barbearia, são obrigatórios.' });
    }

    try {
        const { data: barbershop, error: fetchError } = await supabaseAdmin
            .from('barbershops')
            .select('integrations, name')
            .eq('id', appointmentData.barbershop_id)
            .single();

        if (fetchError) {
            console.error('Supabase fetch error:', fetchError);
            throw new Error('Barbearia não encontrada ou erro de banco de dados.');
        }

        const integrations = barbershop.integrations as IntegrationSettings;
        const accessToken = integrations?.mercadopagoAccessToken;

        if (!accessToken) {
            return res.status(400).json({ error: 'Esta barbearia não está configurada para receber pagamentos online.' });
        }

        const client = new MercadoPagoConfig({ accessToken });
        const preferenceClient = new Preference(client);
        
        const transactionId = randomUUID();
        const origin = req.headers.origin || `https://${req.headers.host}`;

        const preferenceBody = {
            items: [
                {
                    id: appointmentData.service_id,
                    title: `Serviço: ${appointmentData.service_name}`,
                    description: `Agendamento na ${barbershop.name} com ${appointmentData.barber_name}`,
                    quantity: 1,
                    currency_id: 'BRL',
                    unit_price: Number(appointmentData.price),
                },
            ],
            payer: {
                name: appointmentData.client_name,
                email: '',
            },
            back_urls: {
                success: `${origin}/`,
                failure: `${origin}/`,
                pending: `${origin}/`,
            },
            auto_return: 'approved' as 'approved',
            notification_url: `https://${req.headers.host}/api/mp-webhook?barbershop_id=${appointmentData.barbershop_id}`,
            external_reference: transactionId,
            metadata: appointmentData,
        };

        const mpResponse = await preferenceClient.create({ body: preferenceBody });
        
        const redirectUrl = mpResponse.init_point;
        const preferenceId = mpResponse.id;

        if (!redirectUrl || !preferenceId) {
            throw new Error('Não foi possível obter a URL de checkout e o ID da preferência do Mercado Pago.');
        }
        
        res.status(200).json({ redirectUrl, preferenceId });

    } catch (error: any) {
        console.error('Erro ao criar preferência no Mercado Pago:', error.cause || error.message);
        res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
    }
}