
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';
import { IntegrationSettings } from '../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Supabase environment variables are not set on the server.');
        return res.status(500).json({ error: 'Configuração do servidor incompleta. Variáveis de ambiente do Supabase ausentes.' });
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

        const { data: newAppointment, error: insertError } = await supabaseAdmin
            .from('appointments')
            .insert({
                ...appointmentData,
                status: 'pending',
            })
            .select('id')
            .single();

        if (insertError) {
            console.error('Supabase insert error:', insertError);
            throw new Error(`Falha ao criar o agendamento inicial: ${insertError.message}`);
        }
        
        const preferenceBody = {
            items: [
                {
                    // FIX: Added the 'id' property, which is required by the Mercado Pago SDK's 'Items' type.
                    id: appointmentData.service_id,
                    title: `Serviço: ${appointmentData.service_name}`,
                    description: `Agendamento na ${barbershop.name} com ${appointmentData.barber_name}`,
                    quantity: 1,
                    currency_id: 'BRL',
                    unit_price: appointmentData.price,
                },
            ],
            payment_methods: {
                excluded_payment_types: [
                    { id: 'boleto' }
                ],
                installments: 1
            },
            payer: {
                name: appointmentData.client_name,
            },
            back_urls: {
                success: `${req.headers.origin}/?payment_status=success`, 
                failure: `${req.headers.origin}/?payment_status=failure`,
                pending: `${req.headers.origin}/?payment_status=pending`,
            },
            auto_return: 'approved',
            notification_url: `https://${req.headers.host}/api/mp-webhook?barbershop_id=${appointmentData.barbershop_id}`,
            external_reference: newAppointment.id,
        };

        const preferenceClient = new Preference(client);
        const mpResponse = await preferenceClient.create({ body: preferenceBody });
        const preferenceId = mpResponse.id;
        
        await supabaseAdmin
            .from('appointments')
            .update({ mp_preference_id: preferenceId })
            .eq('id', newAppointment.id);

        res.status(200).json({ preferenceId });

    } catch (error: any) {
        console.error('Erro ao criar preferência no Mercado Pago:', error);
        res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
    }
}