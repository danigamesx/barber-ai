import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { Database } from '../src/types/database';
import { Barbershop, ClientNotification, Json, Promotion, User, PushSubscriptionJSON } from '../src/types';

const supabaseAdmin = createClient<Database>(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

if (process.env.VAPID_SUBJECT && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
}


async function getUserIdFromToken(_req: VercelRequest, supabase: SupabaseClient<Database>): Promise<string | null> {
    const authHeader = _req.headers.authorization;
    if (!authHeader) return null;
    const token = authHeader.split(' ')[1];
    if (!token) return null;
    const { data: { user } } = await supabase.auth.getUser(token);
    return user?.id || null;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
    if (_req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    try {
        const userId = await getUserIdFromToken(_req, supabaseAdmin);
        if (!userId) {
            return res.status(401).json({ error: 'Não autorizado: token inválido.' });
        }

        const { barbershopId, title, message } = _req.body;
        if (!barbershopId || !title || !message) {
            return res.status(400).json({ error: 'Dados da promoção incompletos.' });
        }

        const { data: barbershop, error: shopError } = await supabaseAdmin
            .from('barbershops')
            .select('owner_id, name, promotions')
            .eq('id', barbershopId)
            .single();

        if (shopError || !barbershop) {
            return res.status(404).json({ error: 'Barbearia não encontrada.' });
        }

        if (barbershop.owner_id !== userId) {
            return res.status(403).json({ error: 'Acesso negado para enviar promoções desta barbearia.' });
        }

        // Find clients who have had appointments at this barbershop
        const { data: appointments, error: appointmentsError } = await supabaseAdmin
            .from('appointments')
            .select('client_id')
            .eq('barbershop_id', barbershopId);

        if (appointmentsError) throw appointmentsError;

        const clientIds = [...new Set(appointments.map(a => a.client_id))];

        if (clientIds.length === 0) {
            return res.status(200).json({ message: 'Nenhum cliente para notificar.' });
        }

        const { data: clients, error: clientsError } = await supabaseAdmin
            .from('profiles')
            .select('id, name, notifications, push_subscriptions')
            .in('id', clientIds);
        
        if (clientsError) throw clientsError;

        const newPromotion: Promotion = {
            id: `promo_${Date.now()}`, title, message, sentAt: new Date().toISOString(),
            recipients: clients.map(c => ({ clientId: c.id, clientName: c.name, status: 'sent', receivedAt: new Date().toISOString() }))
        };
        const currentPromotions = (barbershop.promotions as Promotion[] || []);
        const { error: promoUpdateError } = await supabaseAdmin
            .from('barbershops')
            .update({ promotions: [...currentPromotions, newPromotion] as unknown as Json })
            .eq('id', barbershopId);
        
        if (promoUpdateError) throw promoUpdateError;

        const notificationPayload = JSON.stringify({
            title: `Promoção de ${barbershop.name}!`,
            body: title,
        });

        for (const client of clients) {
            // Update in-app notification
            const clientNotification: Omit<ClientNotification, 'id'> = {
                promotionId: newPromotion.id, barbershopId, barbershopName: barbershop.name, title, message, receivedAt: new Date().toISOString(), isRead: false,
            };
            const currentNotifications = (client.notifications as ClientNotification[] || []);
            const newNotification = { ...clientNotification, id: `notif_${Date.now()}_${client.id}` };
            
            await supabaseAdmin.from('profiles').update({ notifications: [...currentNotifications, newNotification] as unknown as Json }).eq('id', client.id);

            // Send Push Notifications
            const subscriptions = (client.push_subscriptions as PushSubscriptionJSON[] || []);
            for (const subscription of subscriptions) {
                try {
                    await webpush.sendNotification(subscription as any, notificationPayload);
                } catch (error: any) {
                    console.error(`Error sending push to ${client.id}:`, error.statusCode);
                    // Handle expired or invalid subscriptions
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        const updatedSubscriptions = subscriptions.filter(s => s.endpoint !== subscription.endpoint);
                        await supabaseAdmin.from('profiles').update({ push_subscriptions: updatedSubscriptions as unknown as Json }).eq('id', client.id);
                    }
                }
            }
        }

        res.status(200).json({ message: 'Promoção enviada com sucesso.' });

    } catch (error: any) {
        console.error('Erro ao enviar promoção:', error);
        res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
    }
}