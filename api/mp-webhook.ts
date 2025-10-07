import type { VercelRequest, VercelResponse } from '@vercel/node';
import mercadopago from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';

const supabase = createClient<Database>(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    mercadopago.configure({
        access_token: process.env.MERCADOPAGO_ACCESS_TOKEN!,
    });

    const { body } = req;

    if (body && body.type === 'payment' && body.data && body.data.id) {
        try {
            const paymentId = body.data.id as string;
            
            // Obter os detalhes do pagamento
            const payment = await mercadopago.payment.get(paymentId);
            
            if (payment && payment.body) {
                const { status, external_reference } = payment.body;
                
                // Se o pagamento for aprovado e tiver nossa referência externa (ID do agendamento)
                if (status === 'approved' && external_reference) {
                    const appointmentId = external_reference;

                    // Atualiza o status do agendamento para 'pago' no banco de dados
                    const { error } = await supabase
                        .from('appointments')
                        .update({ status: 'paid' })
                        .eq('id', appointmentId);
                    
                    if (error) {
                        console.error(`Webhook: Falha ao atualizar o agendamento ${appointmentId} para 'pago'. Erro:`, error);
                    } else {
                        console.log(`Webhook: Agendamento ${appointmentId} atualizado para 'pago' com sucesso.`);
                    }
                }
            }
            // Responde ao Mercado Pago que a notificação foi recebida com sucesso
            return res.status(200).send('OK');

        } catch (error: any) {
            console.error('Erro no webhook do Mercado Pago:', error);
            return res.status(500).send(error.message || 'Erro interno do servidor.');
        }
    }
    
    // Se não for uma notificação de pagamento, apenas confirme o recebimento.
    return res.status(200).send('OK');
}
