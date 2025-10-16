export const SUPER_ADMIN_USER_ID = 'a3367fc8-e32b-47d7-9fb5-4ec78c2953ff'; // Substitua por um ID de usuário real para o administrador
export const WHATSAPP_CONTACT = '5511999999999'; // TODO: Substitua pelo número de contato correto

export const PLANS = [
  {
    id: 'BASIC',
    name: 'Básico',
    description: 'Plano para iniciantes.',
    priceMonthly: 44.90,
    priceAnnual: 377.16, // 31.43 * 12
    maxBarbers: 1,
    features: {
      analytics: true,
      marketing: true,
      googleCalendar: true,
      onlinePayments: false, // Habilitado dinamicamente para plano anual no App.tsx
      packagesAndSubscriptions: true,
      clientManagement: true,
    }
  },
  {
    id: 'PRO',
    name: 'Pro',
    description: 'Plano para profissionais.',
    priceMonthly: 59.90,
    priceAnnual: 503.16, // 41.93 * 12
    maxBarbers: 5,
    features: {
      analytics: true,
      marketing: true,
      googleCalendar: true,
      onlinePayments: true,
      packagesAndSubscriptions: true,
      clientManagement: true,
    }
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    description: 'Plano para grandes barbearias.',
    priceMonthly: 89.90,
    priceAnnual: 755.16, // 62.93 * 12
    maxBarbers: Infinity,
    features: {
      analytics: true,
      marketing: true,
      googleCalendar: true,
      onlinePayments: true,
      packagesAndSubscriptions: true,
      clientManagement: true,
    }
  },
  {
    id: 'INACTIVE',
    name: 'Inativo',
    description: 'Funcionalidades limitadas para contas com assinatura expirada.',
    priceMonthly: 0,
    priceAnnual: 0,
    maxBarbers: 1,
    features: {
      analytics: false,
      marketing: false,
      googleCalendar: false,
      onlinePayments: false,
      packagesAndSubscriptions: false,
      clientManagement: false,
    }
  },
];