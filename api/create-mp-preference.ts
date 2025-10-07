import type { VercelRequest, VercelResponse } from '@vercel/node';
import mercadopago from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';
import { IntegrationSettings } from '../src/types';

// Esta é uma função serverless, então inicializamos um cliente Supabase aqui
const supabase = createClient<Database>(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    const { appointmentData } = req.body;
    
    if (!appointmentData || !appointmentData.barbershop_id) {
        return res.status(400).send({ error: 'Dados do agendamento, incluindo ID da barbearia, são obrigatórios.' });
    }

    try {
        // 1. Buscar as credenciais do Mercado Pago da barbearia específica
        const { data: barbershopData, error: fetchError } = await supabase
            .from('barbershops')
            .select('integrations')
            .eq('id', appointmentData.barbershop_id)
            .single();

        if (fetchError) throw fetchError;

        const integrations = barbershopData.integrations as IntegrationSettings;
        const accessToken = integrations?.mercadopagoAccessToken;

        if (!accessToken) {
            return res.status(400).json({ error: 'Esta barbearia não está configurada para receber pagamentos online.' });
        }
        
        // 2. Configurar o Mercado Pago com o Access Token específico da barbearia
        mercadopago.configure({
            access_token: accessToken,
        });

        // 3. Inserir o agendamento no banco com status 'pending'
        const { data: newAppointment, error: insertError } = await supabase
            .from('appointments')
            .insert({
                ...appointmentData,
                status: 'pending',
            })
            .select()
            .single();

        if (insertError) {
            console.error('Supabase insert error:', insertError);
            throw new Error(`Falha ao criar o agendamento inicial: ${insertError.message}`);
        }
        
        // 4. Montar o objeto da preferência de pagamento
        const preference = {
            items: [
                {
                    title: `Serviço: ${appointmentData.service_name} na ${appointmentData.barbershop_name || 'Barbearia'}`,
                    description: `Agendamento com ${appointmentData.barber_name}`,
                    quantity: 1,
                    currency_id: 'BRL',
                    unit_price: appointmentData.price,
                },
            ],
            payer: {
                name: appointmentData.client_name,
            },
            back_urls: {
                success: `${req.headers.origin}`, 
                failure: `${req.headers.origin}`,
                pending: `${req.headers.origin}`,
            },
            auto_return: 'approved',
            notification_url: `https://${req.headers.host}/api/mp-webhook`,
            external_reference: newAppointment.id,
        };

        // 5. Criar a preferência no Mercado Pago
        const mpResponse = await mercadopago.preferences.create(preference);
        const preferenceId = mpResponse.body.id;
        
        // 6. Atualizar o agendamento no banco com o ID da preferência real
        await supabase
            .from('appointments')
            .update({ mp_preference_id: preferenceId })
            .eq('id', newAppointment.id);

        // 7. Enviar o ID da preferência de volta para o frontend
        res.status(200).json({ preferenceId });

    } catch (error: any) {
        console.error('Erro ao criar preferência no Mercado Pago:', error);
        res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
    }
}