import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { Database } from '../src/types/database';

const supabaseAdmin = createClient<Database>(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.headers['x-vercel-cron-authorization'] !== process.env.CRON_SECRET) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const now = new Date();
        const reminderWindowStart = new Date(now.getTime() + 59 * 60 * 1000); // 59 minutes from now
        const reminderWindowEnd = new Date(now.getTime() + 61 * 60 * 1000);   // 61 minutes from now

        const { data: appointments, error } = await supabaseAdmin
            .from('appointments')
            .select('*, barbershops(name), profiles(push_subscriptions)')
            .in('status', ['confirmed', 'paid'])
            .is('reminder_sent_at', null)
            .gte('start_time', reminderWindowStart.toISOString())
            .lte('start_time', reminderWindowEnd.toISOString());

        if (error) {
            throw new Error(`Error fetching appointments: ${error.message}`);
        }

        if (!appointments || appointments.length === 0) {
            console.log('CRON: No appointments found for reminders in this window.');
            return res.status(200).json({ message: 'No appointments to remind.' });
        }

        const remindersSent = [];
        const appointmentIdsToUpdate: string[] = [];

        for (const app of appointments) {
            // TypeScript check for nested relations
            const clientProfile = app.profiles;
            const barbershop = app.barbershops;

            if (!clientProfile || !barbershop) continue;

            const subscriptions = (clientProfile.push_subscriptions as PushSubscriptionJSON[] || []);
            if (subscriptions.length === 0) {
                // Mark as sent even if no subscription, to avoid re-querying
                appointmentIdsToUpdate.push(app.id);
                continue;
            }

            const startTime = new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const payload = JSON.stringify({
                title: 'Lembrete de Agendamento',
                body: `Seu horário na ${barbershop.name} é em breve, às ${startTime}!`,
            });
            
            let sentCount = 0;
            for (const sub of subscriptions) {
                try {
                    await webpush.sendNotification(sub as any, payload);
                    sentCount++;
                } catch (error: any) {
                    console.error(`CRON: Error sending push for appointment ${app.id}:`, error.statusCode);
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        const updatedSubs = subscriptions.filter(s => s.endpoint !== sub.endpoint);
                        await supabaseAdmin.from('profiles').update({ push_subscriptions: updatedSubs as any }).eq('id', app.client_id);
                    }
                }
            }
            if (sentCount > 0) {
                remindersSent.push(app.id);
            }
            appointmentIdsToUpdate.push(app.id);
        }
        
        if (appointmentIdsToUpdate.length > 0) {
            const { error: updateError } = await supabaseAdmin
                .from('appointments')
                .update({ reminder_sent_at: new Date().toISOString() })
                .in('id', appointmentIdsToUpdate);

            if (updateError) {
                console.error('CRON: Failed to update reminder_sent_at:', updateError);
            }
        }
        
        console.log(`CRON: Processed ${appointments.length} appointments. Sent reminders for ${remindersSent.length}.`);
        res.status(200).json({ message: `Reminders sent for ${remindersSent.length} appointments.` });

    } catch (error: any) {
        console.error('CRON JOB FAILED:', error);
        res.status(500).json({ error: error.message });
    }
}
