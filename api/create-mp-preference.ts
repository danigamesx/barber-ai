
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';
import { IntegrationSettings, Json, ServicePackage, SubscriptionPlan, Promotion, ClientNotification } from '../src/types';
import { randomUUID } from 'crypto';
import { PLANS, SUPER_ADMIN_USER_ID } from './_shared';
import webpush from 'web-push';

// Helper to get user and check for Super Admin
async function isSuperAdmin(req: VercelRequest, supabase: SupabaseClient<Database>): Promise<boolean> {
    const authHeader = req.headers.authorization;
    if (!authHeader) return false;
    const token = authHeader.split(' ')[1];
    if (!token) return false;

    // FIX: Cast supabase.auth to any to avoid type error with getUser in some environments/versions
    const { data: { user } } = await (supabase.auth as any).getUser(token);
    return user?.id === SUPER_ADMIN_USER_ID;
}

// Configurar Web Push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return res.status(500).json({ error: 'Configuração do servidor incompleta.' });
    }

    const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);
    const action = req.query.action as string || 'create_preference'; // Default action

    // --- GET ACTIONS ---
    if (req.method === 'GET') {
        if (action === 'get_platform_status') {
            if (!(await isSuperAdmin(req, supabaseAdmin))) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            try {
                const { data: settings } = await supabaseAdmin.from('platform_settings').select('config').eq('id', 1).single();
                const config = settings?.config as any;
                return res.status(200).json({ connected: !!(config?.mercadopagoAccessToken && config?.mercadopagoPublicKey) });
            } catch (e: any) {
                return res.status(500).json({ error: e.message });
            }
        }
        return res.status(405).end('Method Not Allowed');
    }

    // --- POST ACTIONS ---
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    try {
        // 1. DISCONNECT MERCHANT
        if (action === 'disconnect_merchant') {
            const { barbershopId } = req.body;
            if (!barbershopId) return res.status(400).json({ error: 'Barbershop ID required.' });
            
            const { data: barbershop } = await supabaseAdmin.from('barbershops').select('integrations').eq('id', barbershopId).single();
            const current = (barbershop?.integrations as IntegrationSettings) || {};
            const { mercadopagoAccessToken, mercadopagoPublicKey, mercadopagoRefreshToken, mercadopagoUserId, ...rest } = current;
            
            await supabaseAdmin.from('barbershops').update({ integrations: rest as Json }).eq('id', barbershopId);
            return res.status(200).json({ message: 'Disconnected' });
        }

        // 2. DISCONNECT PLATFORM
        if (action === 'disconnect_platform') {
            if (!(await isSuperAdmin(req, supabaseAdmin))) return res.status(403).json({ error: 'Forbidden' });
            
            const { data } = await supabaseAdmin.from('platform_settings').select('config').eq('id', 1).single();
            const current = (data?.config as any) || {};
            const { mercadopagoAccessToken, mercadopagoPublicKey, mercadopagoRefreshToken, mercadopagoUserId, ...rest } = current;
            
            await supabaseAdmin.from('platform_settings').update({ config: rest }).eq('id', 1);
            return res.status(200).json({ message: 'Disconnected' });
        }

        // 3. CREATE PLAN PREFERENCE
        if (action === 'create_plan_preference') {
            const { data: settings } = await supabaseAdmin.from('platform_settings').select('config').eq('id', 1).single();
            const platformToken = (settings?.config as any)?.mercadopagoAccessToken;
            const platformKey = (settings?.config as any)?.mercadopagoPublicKey;

            if (!platformToken) return res.status(500).json({ error: 'Conta da plataforma não conectada.' });

            const { planId, billingCycle, barbershopId } = req.body;
            const plan = PLANS.find(p => p.id === planId);
            if (!plan) return res.status(400).json({ error: 'Plano não encontrado.' });

            const price = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;
            const client = new MercadoPagoConfig({ accessToken: platformToken });
            const preference = new Preference(client);

            const response = await preference.create({
                body: {
                    items: [{ id: `${planId}-${billingCycle}`, title: `Plano ${plan.name}`, quantity: 1, unit_price: Number(price.toFixed(2)), currency_id: 'BRL' }],
                    back_urls: {
                        success: `${req.headers.origin}/#/?payment_status=success&return_to=settings`,
                        failure: `${req.headers.origin}/#/?payment_status=failure&return_to=settings`,
                        pending: `${req.headers.origin}/#/?payment_status=pending&return_to=settings`,
                    },
                    auto_return: 'approved',
                    notification_url: `https://${req.headers.host}/api/plan-webhook`,
                    external_reference: barbershopId,
                    metadata: { plan_id: planId, billing_cycle: billingCycle, barbershop_id: barbershopId }
                }
            });
            return res.status(200).json({ preferenceId: response.id, publicKey: platformKey });
        }

        // 4. SEND PROMOTION
        if (action === 'send_promotion') {
            const { barbershopId, title, message, clientIds } = req.body;

            if (!barbershopId || !title || !message || !clientIds) {
                return res.status(400).json({ error: 'Missing required fields.' });
            }

            const { data: barbershop } = await supabaseAdmin.from('barbershops').select('name, promotions').eq('id', barbershopId).single();
            if (!barbershop) return res.status(404).json({ error: 'Barbershop not found' });

            const { data: clients } = await supabaseAdmin.from('profiles').select('id, name, notifications, push_subscriptions').in('id', clientIds);
            if (!clients) return res.status(404).json({ error: 'Clients not found' });

            const recipients = clients.map(c => ({
                clientId: c.id,
                clientName: c.name,
                status: 'sent' as const,
                receivedAt: new Date().toISOString()
            }));

            const newPromotion: Promotion = {
                id: `promo_${Date.now()}`,
                title,
                message,
                sentAt: new Date().toISOString(),
                recipients
            };

            const currentPromotions = (barbershop.promotions as unknown as Promotion[]) || [];
            await supabaseAdmin.from('barbershops').update({ 
                promotions: [...currentPromotions, newPromotion] as unknown as Json 
            }).eq('id', barbershopId);

            const notificationBase: Omit<ClientNotification, 'id'> = {
                promotionId: newPromotion.id,
                barbershopId,
                barbershopName: barbershop.name,
                title,
                message,
                receivedAt: new Date().toISOString(),
                isRead: false,
            };

            // Enviar notificações internas e Push
            for (const client of clients) {
                // 1. Internal Notification
                const currentNotifications = (client.notifications as unknown as ClientNotification[]) || [];
                const newNotification = { ...notificationBase, id: `notif_${Date.now()}_${client.id}` };
                await supabaseAdmin.from('profiles').update({ 
                    notifications: [...currentNotifications, newNotification] as unknown as Json 
                }).eq('id', client.id);

                // 2. Web Push Notification
                const pushSubscriptions = client.push_subscriptions as any[] || [];
                if (pushSubscriptions.length > 0) {
                     const payload = JSON.stringify({
                        title: `${barbershop.name}: ${title}`,
                        body: message,
                    });
                    
                    const validSubscriptions = [];
                    for (const sub of pushSubscriptions) {
                        try {
                            await webpush.sendNotification(sub, payload);
                            validSubscriptions.push(sub);
                        } catch (error: any) {
                            if (error.statusCode !== 410 && error.statusCode !== 404) {
                                validSubscriptions.push(sub); // Keep if error is temporary
                            }
                        }
                    }
                    // Update valid subscriptions if any were removed
                    if (validSubscriptions.length !== pushSubscriptions.length) {
                        await supabaseAdmin.from('profiles').update({ push_subscriptions: validSubscriptions as any }).eq('id', client.id);
                    }
                }
            }

            return res.status(200).json({ success: true });
        }

        // 5. CREATE PREFERENCE (Appointment/Package - Default)
        if (action === 'create_preference') {
            const { appointmentData, packageData } = req.body;
            const buildBackUrls = (path: string) => {
                const base = `${req.headers.origin}/#${path}`;
                const sep = base.includes('?') ? '&' : '?';
                return {
                    success: `${base}${sep}payment_status=success`,
                    failure: `${base}${sep}payment_status=failure`,
                    pending: `${base}${sep}payment_status=pending`,
                };
            };

            let barbershopId, items, payer, metadata, notificationUrlSuffix;

            if (packageData) {
                barbershopId = packageData.barbershopId;
                metadata = packageData;
                notificationUrlSuffix = `purchase_type=${packageData.type}&barbershop_id=${barbershopId}`;
                payer = { name: packageData.userName, email: packageData.userEmail };
                
                const { data: shop } = await supabaseAdmin.from('barbershops').select('packages, subscriptions, name').eq('id', barbershopId).single();
                if (!shop) throw new Error('Barbearia não encontrada');
                
                let itemDetails;
                if (packageData.type === 'package') {
                    itemDetails = (shop.packages as unknown as ServicePackage[]).find(p => p.id === packageData.itemId);
                } else {
                    itemDetails = (shop.subscriptions as unknown as SubscriptionPlan[]).find(s => s.id === packageData.itemId);
                }
                if (!itemDetails) throw new Error('Item não encontrado');

                items = [{
                    id: packageData.itemId,
                    title: itemDetails.name,
                    description: `Compra na ${shop.name}`,
                    quantity: 1,
                    currency_id: 'BRL',
                    unit_price: Number(itemDetails.price)
                }];

            } else if (appointmentData) {
                barbershopId = appointmentData.barbershop_id;
                metadata = appointmentData;
                notificationUrlSuffix = `purchase_type=appointment&barbershop_id=${barbershopId}`;
                payer = { name: appointmentData.client_name, email: '' };
                items = [{
                    id: appointmentData.service_id,
                    title: appointmentData.service_name,
                    quantity: 1,
                    currency_id: 'BRL',
                    unit_price: Number(appointmentData.price)
                }];
            } else {
                return res.status(400).json({ error: 'Dados inválidos.' });
            }

            const { data: shop } = await supabaseAdmin.from('barbershops').select('integrations, slug').eq('id', barbershopId).single();
            const token = (shop?.integrations as IntegrationSettings)?.mercadopagoAccessToken;
            const key = (shop?.integrations as IntegrationSettings)?.mercadopagoPublicKey;

            if (!token) return res.status(400).json({ error: 'Pagamento online não configurado.' });

            const client = new MercadoPagoConfig({ accessToken: token });
            const preference = new Preference(client);
            const returnPath = shop?.slug ? `/${shop.slug}` : `/?barbershopId=${barbershopId}`;

            const response = await preference.create({
                body: {
                    items,
                    payer,
                    back_urls: buildBackUrls(returnPath),
                    auto_return: 'approved',
                    notification_url: `https://${req.headers.host}/api/mp-webhook?${notificationUrlSuffix}`,
                    external_reference: randomUUID(),
                    metadata
                }
            });

            return res.status(200).json({ redirectUrl: response.init_point, preferenceId: response.id, publicKey: key });
        }

        return res.status(400).json({ error: 'Ação desconhecida.' });

    } catch (error: any) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}