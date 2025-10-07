
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mercadopago from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';
import { IntegrationSettings } from '../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Adicionando verificação de variáveis de ambiente no início
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Supabase environment variables are not set on the server.');
        return res.status(500).json({ error: 'Configuração do servidor incompleta. Variáveis de ambiente do Supabase ausentes.' });
    }

    // Inicializa o cliente Supabase Admin com as chaves verificadas
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
        // 1. Fetch the barbershop's Mercado Pago credentials and name
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
        
        // 2. Configure Mercado Pago with the barbershop-specific Access Token
        mercadopago.configure({ access_token: accessToken });

        // 3. Insert the appointment into the database with 'pending' status to get its ID
        const { data: newAppointment, error: insertError } = await supabaseAdmin
            .from('appointments')
            .insert({
                ...appointmentData,
                status: 'pending', // Ensure status is pending
            })
            .select('id') // Only select the ID we need
            .single();

        if (insertError) {
            console.error('Supabase insert error:', insertError);
            throw new Error(`Falha ao criar o agendamento inicial: ${insertError.message}`);
        }
        
        // 4. Create the payment preference object
        const preference = {
            items: [
                {
                    title: `Serviço: ${appointmentData.service_name}`,
                    description: `Agendamento na ${barbershop.name} com ${appointmentData.barber_name}`,
                    quantity: 1,
                    currency_id: 'BRL',
                    unit_price: appointmentData.price,
                },
            ],
            payer: {
                name: appointmentData.client_name,
            },
            back_urls: {
                // These URLs are used to redirect the user after payment
                success: `${req.headers.origin}/#/?payment_status=success`, 
                failure: `${req.headers.origin}/#/?payment_status=failure`,
                pending: `${req.headers.origin}/#/?payment_status=pending`,
            },
            auto_return: 'approved',
            // Pass barbershop_id to the webhook for multi-tenant authentication
            notification_url: `https://${req.headers.host}/api/mp-webhook?barbershop_id=${appointmentData.barbershop_id}`,
            external_reference: newAppointment.id,
        };

        // 5. Create the preference with Mercado Pago
        const mpResponse = await mercadopago.preferences.create(preference);
        const preferenceId = mpResponse.body.id;
        
        // 6. Update the appointment with the real preference ID
        await supabaseAdmin
            .from('appointments')
            .update({ mp_preference_id: preferenceId })
            .eq('id', newAppointment.id);

        // 7. Send the preference ID back to the frontend to render the payment brick
        res.status(200).json({ preferenceId });

    } catch (error: any) {
        console.error('Erro ao criar preferência no Mercado Pago:', error);
        res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
    }
}
