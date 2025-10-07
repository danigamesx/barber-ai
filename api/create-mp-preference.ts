import type { VercelRequest, VercelResponse } from '@vercel/node';
import mercadopago from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';

// Esta é uma função serverless, então inicializamos um cliente Supabase aqui
const supabase = createClient<Database>(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    const { appointmentData } = req.body;
    
    if (!appointmentData) {
        return res.status(400).send({ error: 'Dados do agendamento são obrigatórios.' });
    }

    try {
        // 1. Configurar o Mercado Pago com o Access Token
        mercadopago.configure({
            access_token: process.env.MERCADOPAGO_ACCESS_TOKEN!,
        });

        // 2. Antes de criar a preferência, vamos inserir o agendamento no banco com status 'pending'
        // e um ID de preferência temporário. O webhook irá atualizá-lo para 'paid'.
        const { data: newAppointment, error: insertError } = await supabase
            .from('appointments')
            .insert({
                ...appointmentData,
                status: 'pending', // Inicia como pendente
            })
            .select()
            .single();

        if (insertError) {
            console.error('Supabase insert error:', insertError);
            throw new Error(`Falha ao criar o agendamento inicial: ${insertError.message}`);
        }
        
        // 3. Montar o objeto da preferência de pagamento
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
                success: `${req.headers.origin}`, // Redireciona para a home
                failure: `${req.headers.origin}`,
                pending: `${req.headers.origin}`,
            },
            auto_return: 'approved',
            // URL para onde o Mercado Pago enviará a notificação de pagamento
            notification_url: `https://${req.headers.host}/api/mp-webhook`,
            // Referência externa para ligar o pagamento ao agendamento no nosso banco
            external_reference: newAppointment.id,
        };

        // 4. Criar a preferência no Mercado Pago
        const mpResponse = await mercadopago.preferences.create(preference);
        const preferenceId = mpResponse.body.id;
        
        // 5. Atualizar o agendamento no banco com o ID da preferência real
        await supabase
            .from('appointments')
            .update({ mp_preference_id: preferenceId })
            .eq('id', newAppointment.id);

        // 6. Enviar o ID da preferência de volta para o frontend
        res.status(200).json({ preferenceId });

    } catch (error: any) {
        console.error('Erro ao criar preferência no Mercado Pago:', error);
        res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
    }
}
