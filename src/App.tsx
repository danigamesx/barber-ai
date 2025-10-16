import React, { useState, useMemo, useEffect } from 'react';
import { User, Appointment, Barbershop, Review, ClientNotification, Session, Barber, FinancialRecord, Json, IntegrationSettings, CancellationPolicy } from './types';
import LoginScreen from './screens/LoginScreen';
import ClientHomeScreen from './screens/client/ClientHomeScreen';
import BarbershopDashboardScreen from './screens/barbershop/BarbershopDashboardScreen';
import ClientAppointmentsScreen from './screens/client/ClientAppointmentsScreen';
import ClientProfileScreen from './screens/client/ClientProfileScreen';
import BarbershopAppointmentsScreen from './screens/barbershop/BarbershopAppointmentsScreen';
import BarbershopSettingsScreen from './screens/barbershop/BarbershopSettingsScreen';
import AnalyticsScreen from './screens/barbershop/AnalyticsScreen';
import ProfessionalsScreen from './screens/barbershop/ProfessionalsScreen';
import ClientsScreen from './screens/barbershop/ClientsScreen';
import { HomeIcon, CalendarIcon, BellIcon, UserIcon, ClipboardListIcon, MegaphoneIcon, ChartBarIcon, CogIcon, UsersIcon, MenuIcon, ShareIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from './components/icons/OutlineIcons';
import BarbershopSetupScreen from './screens/barbershop/BarbershopSetupScreen';
import ClientNotificationsScreen from './screens/client/ClientNotificationsScreen';
import CommunicationsScreen from './screens/barbershop/CommunicationsScreen';
import WaitingListScreen from './screens/barbershop/WaitingListScreen';
import AdminDashboardScreen from './screens/admin/AdminDashboardScreen';
import * as api from './api';
import { SUPER_ADMIN_USER_ID, PLANS } from './constants';
import TrialBanner from './components/TrialBanner';
import LandingScreen from './screens/LandingScreen';
import Button from './components/Button';
import BarbershopPublicPage from './screens/public/BarbershopPublicPage';
import InactivePlanBanner from './components/InactivePlanBanner';
import { supabaseInitializationError } from './supabaseClient';
// FIX: Import PlanPaymentModal to handle plan purchases.
import PlanPaymentModal from './screens/barbershop/PlanPaymentModal';

export const AppContext = React.createContext<{
  user: User | null;
  users: User[];
  barbershops: Barbershop[];
  barbershopData: Barbershop | null;
  appointments: Appointment[];
  allAppointments: Appointment[];
  reviews: Review[];
  googleToken: string | null;
  isSuperAdmin: boolean;
  accessStatus: {
    hasAccess: boolean;
    isTrial: boolean;
    planId: string;
    trialEndDate: Date | null;
  };
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (name: string, email: string, password: string, accountType: 'client' | 'barbershop', phone: string, birthDate?: string, barbershopName?: string) => Promise<void>;
  addAppointment: (appointment: Omit<Appointment, 'id' | 'start_time' | 'end_time' | 'created_at'> & { start_time: Date, end_time: Date }) => Promise<Appointment>;
  updateAppointmentStatus: (appointment: Appointment, status: 'confirmed' | 'cancelled' | 'declined' | 'completed') => Promise<void>;
  updateAppointment: (appointmentId: string, updates: { start_time: Date, end_time: Date }) => Promise<Appointment>;
  updateBarbershopData: (barbershopId: string, fieldsToUpdate: Partial<Omit<Barbershop, 'id'>>) => Promise<void>;
  updateBarberData: (barbershopId: string, barberId: string, fieldsToUpdate: Partial<Omit<Barber, 'id'>>) => Promise<void>;
  addReview: (review: Omit<Review, 'id' | 'created_at'>, appointmentId: string) => Promise<void>;
  toggleFavoriteBarbershop: (barbershopId: string) => Promise<void>;
  updateClientNotes: (barbershopId: string, clientId: string, notes: string) => Promise<void>;
  addFinancialRecord: (barbershopId: string, barberId: string, type: 'advances' | 'consumptions', recordData: Omit<FinancialRecord, 'id' | 'date'>) => Promise<void>;
  deleteFinancialRecord: (barbershopId: string, barberId: string, type: 'advances' | 'consumptions', recordId: string) => Promise<void>;
  sendPromotion: (barbershopId: string, title: string, message: string) => Promise<void>;
  markNotificationsAsRead: (notificationIds: string[]) => Promise<void>;
  addToWaitingList: (barbershopId: string, date: string) => Promise<void>;
  removeFromWaitingList: (barbershopId: string, date: string, clientId: string) => Promise<void>;
  setGoogleToken: (token: string | null) => void;
  patchUser: (user: User) => void;
  // FIX: Added setPurchaseIntent to the context to handle plan purchases globally.
  setPurchaseIntent: (intent: { planId: string; billingCycle: 'monthly' | 'annual' } | null) => void;
}>({
  user: null,
  users: [],
  barbershops: [],
  barbershopData: null,
  appointments: [],
  allAppointments: [],
  reviews: [],
  googleToken: null,
  isSuperAdmin: false,
  accessStatus: { hasAccess: false, isTrial: false, planId: 'BASIC', trialEndDate: null },
  login: async () => {},
  logout: async () => {},
  signup: async () => {},
  addAppointment: async () => ({} as Appointment),
  updateAppointmentStatus: async () => {},
  updateAppointment: async () => ({} as Appointment),
  updateBarbershopData: async () => {},
  updateBarberData: async () => {},
  addReview: async () => {},
  toggleFavoriteBarbershop: async () => {},
  updateClientNotes: async () => {},
  addFinancialRecord: async () => {},
  deleteFinancialRecord: async () => {},
  sendPromotion: async () => {},
  markNotificationsAsRead: async () => {},
  addToWaitingList: async () => {},
  removeFromWaitingList: async () => {},
  setGoogleToken: () => {},
  patchUser: () => {},
  // FIX: Added default value for setPurchaseIntent.
  setPurchaseIntent: () => {},
});

export const PlanContext = React.createContext<{
    plan: any; 
    features: any;
}>({
    plan: PLANS[0],
    features: PLANS[0].features,
});

const App: React.FC = () => {
  if (supabaseInitializationError) {
    return (
        <div className="flex flex-col items-center justify-center h-screen p-6 bg-brand-dark text-center">
            <div className="w-full max-w-lg bg-brand-secondary p-8 rounded-lg shadow-lg">
                <h1 className="text-2xl font-bold text-red-500 mb-4">Erro Crítico de Configuração</h1>
                <p className="text-gray-300">{supabaseInitializationError}</p>
                <p className="text-gray-400 mt-4 text-sm">
                    Esta é uma configuração do ambiente da plataforma e não pode ser resolvida alterando o código-fonte diretamente. Por favor, verifique se as variáveis de ambiente estão corretamente configuradas nas configurações do seu projeto.
                </p>
            </div>
        </div>
    );
  }

  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLanding, setShowLanding] = useState(true);
  const [loginAccountType, setLoginAccountType] = useState<'client' | 'barbershop' | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failure' | 'pending' | null>(null);
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  // FIX: Added state to manage the plan purchase flow.
  const [purchaseIntent, setPurchaseIntent] = useState<{ planId: string, billingCycle: 'monthly' | 'annual' } | null>(null);


  const [activeClientScreen, setActiveClientScreen] = useState('home');
  const [activeBarbershopScreen, setActiveBarbershopScreen] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isSuperAdmin = useMemo(() => user?.id === SUPER_ADMIN_USER_ID, [user]);

  const [accessStatus, setAccessStatus] = useState<{
    hasAccess: boolean;
    isTrial: boolean;
    planId: string;
    trialEndDate: Date | null;
  }>({ hasAccess: true, isTrial: false, planId: 'BASIC', trialEndDate: null });
  
  const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
          const [barbershopsData, usersData, reviewsData] = await Promise.all([
              api.getBarbershops(),
              api.getAllUsers(),
              api.getReviews(),
          ]);
          setBarbershops(barbershopsData);
          setUsers(usersData);
          setReviews(reviewsData);

          const { data: { session: currentSession } } = await api.getSession();
          setSession(currentSession);

          if (currentSession?.user) {
              const [appointmentsData, userProfile] = await Promise.all([
                  api.getAppointments(),
                  api.getUserProfile(currentSession.user.id),
              ]);
              setAppointments(appointmentsData);
              setUser(userProfile);
          } else {
              setUser(null);
              setAppointments([]);
              setGoogleToken(null);
          }
      } catch (err: any) {
          console.error("Falha ao carregar dados iniciais:", err);
          setError("Não foi possível carregar os dados. Verifique sua conexão.");
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    if (currentHash.includes('payment_status')) {
      const paramsString = currentHash.includes('?') ? currentHash.substring(currentHash.indexOf('?')) : '';
      const params = new URLSearchParams(paramsString);
      const status = params.get('payment_status') as 'success' | 'failure' | 'pending' | null;

      if (status && ['success', 'failure', 'pending'].includes(status)) {
        setPaymentStatus(status);
      }

      // Clean the hash
      params.delete('payment_status');
      const path = currentHash.split('?')[0];
      const newParamsString = params.toString();
      const newHash = newParamsString ? `${path}?${newParamsString}` : path;
      window.history.replaceState(null, '', newHash);
      setCurrentHash(newHash); // Update state to reflect the cleaned URL
    }
  }, [currentHash]);

  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    
    loadInitialData();

    const { data: authListener } = api.onAuthStateChange((_event, newSession) => {
        const userJustLoggedIn = newSession && !session;
        const userJustLoggedOut = !newSession && session;
        
        setSession(newSession);

        if (userJustLoggedIn) {
            const bookingIntentIdentifier = sessionStorage.getItem('bookingIntentIdentifier');
            if (bookingIntentIdentifier) {
                const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(bookingIntentIdentifier);
                if (isUUID) {
                    window.location.hash = `/?barbershopId=${bookingIntentIdentifier}&openBooking=true`;
                } else {
                    window.location.hash = `/${bookingIntentIdentifier}?openBooking=true`;
                }
                sessionStorage.removeItem('bookingIntentIdentifier');
            }

            // FIX: Handle plan purchase intent after login.
            const purchaseIntentRaw = sessionStorage.getItem('purchaseIntent');
            if (purchaseIntentRaw) {
                try {
                    const intent = JSON.parse(purchaseIntentRaw);
                    if(intent.planId && intent.billingCycle) {
                        setPurchaseIntent(intent);
                    }
                } catch (e) {
                    console.error('Could not parse purchase intent', e);
                }
                sessionStorage.removeItem('purchaseIntent');
            }

            loadInitialData();
        } else if (userJustLoggedOut) {
            setUser(null);
            setAppointments([]);
            setUsers([]);
            setBarbershops([]);
            setReviews([]);
            setGoogleToken(null);
            sessionStorage.removeItem('bookingIntentIdentifier');
            setShowLanding(true); 
            setLoginAccountType(null);
        }
    });

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []); 

    const barbershopData = useMemo(() => {
        if (user?.user_type === 'BARBERSHOP') {
        return barbershops.find(b => b.owner_id === user.id) || null;
        }
        return null;
    }, [user, barbershops]);

    useEffect(() => {
      if (user?.user_type !== 'BARBERSHOP' || !barbershopData) {
          setAccessStatus({ hasAccess: true, isTrial: false, planId: 'BASIC', trialEndDate: null });
          return;
      }
  
      const integrations = barbershopData.integrations as IntegrationSettings;
      const now = new Date();
      
      let finalPlanId = 'INACTIVE';
      let isTrial = false;
      let trialEndDate: Date | null = null;
      
      if (integrations?.plan_status === 'suspended') {
          finalPlanId = 'INACTIVE';
          setAccessStatus({ hasAccess: true, isTrial: false, planId: finalPlanId, trialEndDate: null });
          return;
      }
  
      if (barbershopData.trial_ends_at) {
          const trialEnd = new Date(barbershopData.trial_ends_at);
          if (trialEnd > now) {
              isTrial = true;
              trialEndDate = trialEnd;
              finalPlanId = 'PREMIUM'; 
              setAccessStatus({ hasAccess: true, isTrial, planId: finalPlanId, trialEndDate });
              return;
          }
      }
  
      if (integrations?.plan_expires_at) {
          const planEndDate = new Date(integrations.plan_expires_at);
          if (planEndDate > now) {
              finalPlanId = integrations.plan || 'BASIC';
              setAccessStatus({ hasAccess: true, isTrial: false, planId: finalPlanId, trialEndDate: null });
              return;
          }
      }
      
      setAccessStatus({ hasAccess: true, isTrial: false, planId: 'INACTIVE', trialEndDate: null });
  
  }, [user, barbershopData]);

  const planContextValue = useMemo(() => {
    const integrations = barbershopData?.integrations as IntegrationSettings;
    const planDetails = PLANS.find(p => p.id === accessStatus.planId) || PLANS.find(p => p.id === 'INACTIVE');

    if (!planDetails) {
        return { 
            plan: {}, 
            features: {
                analytics: false,
                marketing: false,
                googleCalendar: false,
                onlinePayments: false,
                packagesAndSubscriptions: false,
                clientManagement: false,
            } 
        };
    }
    
    let currentFeatures = { ...planDetails.features };

    if (planDetails.id === 'BASIC' && integrations?.plan_type === 'annual') {
        currentFeatures.onlinePayments = true;
    }

    return {
        plan: planDetails,
        features: currentFeatures,
    };
  }, [accessStatus, barbershopData]);
  
  const signupAndRefetch = async (name: string, email: string, password: string, accountType: 'client' | 'barbershop', phone: string, birthDate?: string, barbershopName?: string) => {
    await api.signUpUser(name, email, password, accountType, phone, birthDate, barbershopName);
    await loadInitialData();
  };
  
  const patchUser = (updatedUser: User) => {
    setUsers(prevUsers => {
        const userExists = prevUsers.some(u => u.id === updatedUser.id);
        if (userExists) {
            return prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
        } else {
            return [...prevUsers, updatedUser];
        }
    });
    if (user?.id === updatedUser.id) {
        setUser(updatedUser);
    }
  };

  const contextFunctions = {
    login: async (email: string, password: string) => {
        await api.signInUser(email, password);
        await loadInitialData();
    },
    logout: async () => {
      await api.signOutUser();
      setUser(null);
      setAppointments([]);
      setUsers([]);
      setBarbershops([]);
      setReviews([]);
      setGoogleToken(null);
      setShowLanding(true); 
      setLoginAccountType(null);
    },
    signup: signupAndRefetch,
    addAppointment: async (data: Omit<Appointment, 'id' | 'start_time' | 'end_time' | 'created_at'> & { start_time: Date, end_time: Date }): Promise<Appointment> => {
        const newAppointment = await api.addAppointment(data);
        setAppointments(await api.getAppointments());
        return newAppointment;
    },
     updateAppointment: async (appointmentId: string, updates: { start_time: Date, end_time: Date }): Promise<Appointment> => {
        const updatedAppointment = await api.updateAppointment(appointmentId, updates);
        setAppointments(await api.getAppointments());
        return updatedAppointment;
    },
    updateAppointmentStatus: async (appointment: Appointment, status: 'confirmed' | 'cancelled' | 'declined' | 'completed') => {
        await api.updateAppointmentStatus(appointment, status, barbershopData, googleToken);
        const updatedAppointments = await api.getAppointments();
        setAppointments(updatedAppointments);
    
        try {
            let clientProfile = await api.getUserProfile(appointment.client_id);
        
            if (status === 'cancelled' && user && clientProfile) {
                const barbershop = barbershops.find(b => b.id === appointment.barbershop_id);
                if (barbershop) {
                    const policy = barbershop.cancellation_policy as CancellationPolicy | undefined;
                    const currentCredits = (clientProfile.store_credits as Record<string, number>) || {};
                    const currentDebts = (clientProfile.outstanding_debts as Record<string, number>) || {};
                    const shopId = barbershop.id;
                    
                    let creditUpdate = 0;
                    let debtUpdate = 0;
        
                    if (user.user_type === 'BARBERSHOP' && appointment.status === 'paid') {
                        creditUpdate = appointment.price || 0;
                    } else if (user.user_type === 'CLIENT') {
                        const hoursUntilAppointment = (appointment.start_time.getTime() - new Date().getTime()) / (1000 * 60 * 60);
                        if (policy?.enabled && hoursUntilAppointment < policy.timeLimitHours) {
                            if (appointment.status !== 'paid') {
                                debtUpdate = (appointment.price || 0) * (policy.feePercentage / 100);
                            }
                        } else if (appointment.status === 'paid') {
                            creditUpdate = appointment.price || 0;
                        }
                    }
        
                    const updates: Partial<User> = {};
                    if (creditUpdate > 0) updates.store_credits = { ...currentCredits, [shopId]: (currentCredits[shopId] || 0) + creditUpdate } as Json;
                    if (debtUpdate > 0) updates.outstanding_debts = { ...currentDebts, [shopId]: (currentDebts[shopId] || 0) + debtUpdate } as Json;
        
                    if (Object.keys(updates).length > 0) {
                        clientProfile = await api.updateUserProfile(clientProfile.id, updates);
                    }
                }
            }
        
            if (clientProfile) {
                patchUser(clientProfile);
            }
        } catch (error) {
             console.error(`Falha ao buscar ou atualizar o perfil do cliente ${appointment.client_id} após a atualização de status.`, error);
        }
    },
    updateBarbershopData: async (id: string, fields: Partial<Omit<Barbershop, 'id'>>) => {
      try {
        await api.updateBarbershop(id, fields);
        setBarbershops(await api.getBarbershops());
      } catch (error: any) {
        console.error("Falha ao atualizar barbearia:", error);
        alert(error.message || "Ocorreu um erro ao salvar as alterações. A interface será atualizada para refletir os dados reais do servidor.");
        setBarbershops(await api.getBarbershops());
      }
    },
    updateBarberData: async (barbershopId: string, barberId: string, fields: Partial<Omit<Barber, 'id'>>) => {
        const shop = barbershops.find(b => b.id === barbershopId);
        if (!shop) return;
        const updatedBarbers = ((shop.barbers as Barber[]) || []).map(b => b.id === barberId ? { ...b, ...fields } : b);
        await api.updateBarbershop(barbershopId, { barbers: updatedBarbers as unknown as Json });
        setBarbershops(await api.getBarbershops());
    },
    addReview: async (review: Omit<Review, 'id' | 'created_at'>, appointmentId: string) => {
        await api.addReview(review, appointmentId);
        setReviews(await api.getReviews());
        setAppointments(await api.getAppointments());
    },
    toggleFavoriteBarbershop: async (barbershopId: string) => {
        if (!user) return;
        const updatedUser = await api.toggleFavoriteBarbershop(user.id, user.favorite_barbershop_ids || [], barbershopId);
        setUser(updatedUser);
    },
    updateClientNotes: async (barbershopId: string, clientId: string, notes: string) => {
        const shop = barbershops.find(b => b.id === barbershopId);
        if (!shop) return;
        const updatedRecords = { ...(shop.client_records as object || {}), [clientId]: { notes } };
        await api.updateBarbershop(barbershopId, { client_records: updatedRecords as unknown as Json });
        setBarbershops(await api.getBarbershops());
    },
    addFinancialRecord: async (barbershopId: string, barberId: string, type: 'advances' | 'consumptions', record: Omit<FinancialRecord, 'id' | 'date'>) => {
        await api.addFinancialRecord(barbershopId, barberId, type, record, barbershops);
        setBarbershops(await api.getBarbershops());
    },
    deleteFinancialRecord: async (barbershopId: string, barberId: string, type: 'advances' | 'consumptions', recordId: string) => {
        await api.deleteFinancialRecord(barbershopId, barberId, type, recordId, barbershops);
        setBarbershops(await api.getBarbershops());
    },
    sendPromotion: async (barbershopId: string, title: string, message: string) => {
        const clients = users.filter(u => u.user_type === 'CLIENT');
        await api.sendPromotion(barbershopId, title, message, clients, barbershops);
        setBarbershops(await api.getBarbershops());
    },
    markNotificationsAsRead: async (notificationIds: string[]) => {
        if (!user) return;
        const updatedUser = await api.markNotificationsAsRead(user.id, user.notifications as ClientNotification[], notificationIds);
        setUser(updatedUser);
    },
    addToWaitingList: async (barbershopId: string, date: string) => {
      if(!user) return;
      await api.addToWaitingList(barbershopId, date, user, barbershops);
      setBarbershops(await api.getBarbershops());
    },
    removeFromWaitingList: async (barbershopId: string, date: string, clientId: string) => {
      await api.removeFromWaitingList(barbershopId, date, clientId, barbershops);
      setBarbershops(await api.getBarbershops());
    },
    setGoogleToken,
    patchUser,
    // FIX: Pass the state setter through the context.
    setPurchaseIntent,
  };

  const appContextValue = { 
      user, users, barbershops, barbershopData, appointments, allAppointments: appointments, reviews, googleToken, isSuperAdmin, accessStatus,
      ...contextFunctions
  };
  
  const handleEnterApp = (type: 'client' | 'barbershop') => {
    setLoginAccountType(type);
    setShowLanding(false);
  };

  const renderClientApp = () => {
    const notifications = user?.notifications as ClientNotification[] | undefined;
    const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.isRead).length : 0;
    return (
    <div className="flex flex-col h-screen">
      <main className="flex-grow overflow-y-auto pb-20">
        {activeClientScreen === 'home' && <ClientHomeScreen />}
        {activeClientScreen === 'appointments' && <ClientAppointmentsScreen />}
        {activeClientScreen === 'notifications' && <ClientNotificationsScreen />}
        {activeClientScreen === 'profile' && <ClientProfileScreen />}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-brand-secondary border-t border-gray-700 flex justify-around p-2">
        <button onClick={() => setActiveClientScreen('home')} className={`flex flex-col items-center w-full p-2 rounded-lg ${activeClientScreen === 'home' ? 'text-brand-primary' : 'text-gray-400'}`}>
          <HomeIcon className="w-6 h-6" />
          <span className="text-xs mt-1">Início</span>
        </button>
        <button onClick={() => setActiveClientScreen('appointments')} className={`flex flex-col items-center w-full p-2 rounded-lg ${activeClientScreen === 'appointments' ? 'text-brand-primary' : 'text-gray-400'}`}>
          <CalendarIcon className="w-6 h-6" />
          <span className="text-xs mt-1">Agendamentos</span>
        </button>
         <button onClick={() => setActiveClientScreen('notifications')} className={`relative flex flex-col items-center w-full p-2 rounded-lg ${activeClientScreen === 'notifications' ? 'text-brand-primary' : 'text-gray-400'}`}>
          <BellIcon className="w-6 h-6" />
          <span className="text-xs mt-1">Notificações</span>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-6 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">{unreadCount}</span>
          )}
        </button>
         <button onClick={() => setActiveClientScreen('profile')} className={`flex flex-col items-center w-full p-2 rounded-lg ${activeClientScreen === 'profile' ? 'text-brand-primary' : 'text-gray-400'}`}>
          <UserIcon className="w-6 h-6" />
          <span className="text-xs mt-1">Perfil</span>
        </button>
      </nav>
    </div>
  )};

  const renderBarbershopApp = () => {
    let navItems = [
      { id: 'dashboard', label: 'Painel', icon: HomeIcon, enabled: true },
      { id: 'appointments', label: 'Agenda', icon: CalendarIcon, enabled: true },
      { id: 'waiting_list', label: 'Espera', icon: ClipboardListIcon, enabled: true },
      { id: 'professionals', label: 'Equipe', icon: UsersIcon, enabled: true },
      { id: 'clients', label: 'Clientes', icon: UserIcon, enabled: planContextValue.features.clientManagement },
      { id: 'communications', label: 'Marketing', icon: MegaphoneIcon, enabled: planContextValue.features.marketing },
      { id: 'analytics', label: 'Análises', icon: ChartBarIcon, enabled: planContextValue.features.analytics },
      { id: 'settings', label: 'Ajustes', icon: CogIcon, enabled: true },
    ];
    
    const activeItem = navItems.find(item => item.id === activeBarbershopScreen);

    const sidebarContent = (
      <nav className="flex flex-col space-y-2 p-4">
        <h2 className="text-2xl font-bold text-brand-primary mb-4 px-2 truncate">{barbershopData?.name}</h2>
        {navItems.map(item => (
            item.enabled ? (
              <button
                key={item.id}
                onClick={() => {
                  setActiveBarbershopScreen(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-colors w-full text-left ${
                  activeBarbershopScreen === item.id
                    ? 'bg-brand-primary text-brand-dark font-semibold'
                    : 'text-gray-300 hover:bg-brand-secondary'
                }`}
              >
                <item.icon className="w-6 h-6 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            ) : (
                 <div key={item.id} className="flex items-center space-x-3 p-3 rounded-lg text-gray-500 cursor-not-allowed" title="Faça upgrade para acessar">
                    <item.icon className="w-6 h-6 flex-shrink-0" />
                    <span>{item.label}</span>
                 </div>
            )
        ))}
      </nav>
    );

    return (
      <div className="flex h-screen bg-brand-dark text-brand-light">
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
        )}
        
        <aside className={`fixed top-0 left-0 h-full w-64 bg-gray-800 shadow-lg transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out z-30 md:hidden`}>
          {sidebarContent}
        </aside>

        <aside className="hidden md:block md:w-64 bg-brand-secondary flex-shrink-0">
          {sidebarContent}
        </aside>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="md:hidden flex items-center justify-between p-4 bg-brand-secondary shadow-md">
             <button onClick={() => setIsMobileMenuOpen(true)} className="text-brand-light">
              <MenuIcon className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-brand-light">{activeItem?.label}</h1>
            <div className="w-6"></div>
          </header>
          
          {accessStatus.isTrial && accessStatus.trialEndDate && (
             <TrialBanner trialEndDate={accessStatus.trialEndDate} />
          )}

          {accessStatus.planId === 'INACTIVE' && !accessStatus.isTrial && (
            <InactivePlanBanner />
          )}

          <main className="flex-grow overflow-y-auto">
            {activeBarbershopScreen === 'dashboard' && <BarbershopDashboardScreen />}
            {activeBarbershopScreen === 'appointments' && <BarbershopAppointmentsScreen />}
            {activeBarbershopScreen === 'professionals' && <ProfessionalsScreen />}
            {activeBarbershopScreen === 'clients' && <ClientsScreen />}
            {activeBarbershopScreen === 'waiting_list' && <WaitingListScreen />}
            {activeBarbershopScreen === 'communications' && <CommunicationsScreen />}
            {activeBarbershopScreen === 'analytics' && <AnalyticsScreen />}
            {activeBarbershopScreen === 'settings' && <BarbershopSettingsScreen />}
          </main>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    const hashContent = currentHash.substring(1); // Content after '#'

    if (hashContent.startsWith('/')) {
        const pathAndQuery = hashContent.substring(1); // Content after '#/'
        const [path, query] = pathAndQuery.split('?');

        if (path) { // It's a slug, e.g., /#/[slug]
            return <BarbershopPublicPage identifier={path} />;
        } else if (query) { // It's the old format, e.g., /#/?barbershopId=[id]
            const params = new URLSearchParams(query);
            const barbershopId = params.get('barbershopId');
            if (barbershopId) {
                return <BarbershopPublicPage identifier={barbershopId} />;
            }
        }
    }

    if (showLanding && !session) {
        return <LandingScreen onEnter={handleEnterApp} />;
    }
    if (loading) {
      return <div className="flex items-center justify-center h-screen"><p>Carregando aplicativo...</p></div>;
    }
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
                <p className="text-red-500 text-lg mb-4">{error}</p>
                <Button 
                    onClick={() => window.location.reload()} 
                    className="w-auto px-6 py-2"
                >
                    Tentar Novamente
                </Button>
            </div>
        );
    }
    if (!user) {
        return <LoginScreen initialAccountType={loginAccountType} />;
    }
    if (isSuperAdmin) {
        return <AdminDashboardScreen />
    }
    if (user.user_type === 'CLIENT') {
      return renderClientApp();
    }
    if (user.user_type === 'BARBERSHOP') {
      if (barbershopData && !barbershopData.has_completed_setup) {
        return <BarbershopSetupScreen />;
      }
      return renderBarbershopApp();
    }
    return <LoginScreen initialAccountType={loginAccountType} />;
  };

  const finalAppContextValue = { ...appContextValue };

  return (
    <AppContext.Provider value={finalAppContextValue}>
      <PlanContext.Provider value={planContextValue}>
        <div className="antialiased font-sans bg-brand-dark min-h-screen">
          {renderContent()}
          {paymentStatus && (
              <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[100]">
                  <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-8 text-center">
                      {paymentStatus === 'success' && (
                          <>
                              <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
                              <h2 className="text-2xl font-bold mb-2">Pagamento Aprovado!</h2>
                              <p className="text-gray-400 mb-6">Seu agendamento está confirmado. O status será atualizado em breve para "Pago".</p>
                              <Button onClick={() => {
                                  setPaymentStatus(null);
                                  if (user?.user_type === 'CLIENT') {
                                     setActiveClientScreen('appointments');
                                  }
                              }}>
                                  Ver Meus Agendamentos
                              </Button>
                          </>
                      )}
                      {paymentStatus === 'failure' && (
                          <>
                              <XCircleIcon className="w-20 h-20 text-red-500 mx-auto mb-4" />
                              <h2 className="text-2xl font-bold mb-2">Pagamento Recusado</h2>
                              <p className="text-gray-400 mb-6">Não foi possível processar seu pagamento. Nenhum valor foi cobrado. Por favor, tente novamente ou escolha outro método de pagamento.</p>
                              <Button variant="secondary" onClick={() => setPaymentStatus(null)}>
                                  Tentar Novamente
                              </Button>
                          </>
                      )}
                      {paymentStatus === 'pending' && (
                          <>
                              <ClockIcon className="w-20 h-20 text-amber-500 mx-auto mb-4" />
                              <h2 className="text-2xl font-bold mb-2">Pagamento Pendente</h2>
                              <p className="text-gray-400 mb-6">Seu pagamento está sendo processado. Seu agendamento será confirmado assim que o pagamento for aprovado.</p>
                               <Button variant="secondary" onClick={() => {
                                  setPaymentStatus(null);
                                  if (user?.user_type === 'CLIENT') {
                                     setActiveClientScreen('appointments');
                                  }
                              }}>
                                  Ver Meus Agendamentos
                              </Button>
                          </>
                      )}
                  </div>
              </div>
          )}
          {/* FIX: Render the plan payment modal when a purchase is initiated. */}
          {purchaseIntent && barbershopData && (
            <PlanPaymentModal 
              planId={purchaseIntent.planId}
              billingCycle={purchaseIntent.billingCycle}
              onClose={() => setPurchaseIntent(null)}
            />
          )}
        </div>
      </PlanContext.Provider>
    </AppContext.Provider>
  );
};

export default App;
