export const SUPER_ADMIN_USER_ID = '5b6749fa-13ff-498f-b18b-8374ac069b87';

export const PLANS = [
  {
    id: 'BASIC',
    name: 'Básico',
    description: 'Plano para iniciantes.',
    priceMonthly: 59.90,
    priceAnnual: 502.80, // 41.90 * 12
    maxBarbers: 1,
    features: {
      analytics: true,
      marketing: true,
      googleCalendar: true,
      onlinePayments: false,
      packagesAndSubscriptions: true,
      clientManagement: true,
    }
  },
  {
    id: 'PRO',
    name: 'Pro',
    description: 'Plano para profissionais.',
    priceMonthly: 84.90,
    priceAnnual: 718.80, // 59.90 * 12
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
    priceMonthly: 142.90,
    priceAnnual: 1198.80, // 99.90 * 12
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
