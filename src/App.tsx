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
import { HomeIcon, CalendarIcon, BellIcon, UserIcon, ClipboardListIcon, MegaphoneIcon, ChartBarIcon, CogIcon, UsersIcon, MenuIcon, ShareIcon } from './components/icons/OutlineIcons';
import BarbershopSetupScreen from './screens/barbershop/BarbershopSetupScreen';
import ClientNotificationsScreen from './screens/client/ClientNotificationsScreen';
import CommunicationsScreen from './screens/barbershop/CommunicationsScreen';
import WaitingListScreen from './screens/barbershop/WaitingListScreen';
import AdminDashboardScreen from './screens/admin/AdminDashboardScreen';
import * as api from './api';
import { SUPER_ADMIN_USER_ID, PLANS } from './constants';
import TrialBanner from './components/TrialBanner';
import TrialExpiredScreen from './screens/barbershop/TrialExpiredScreen';
import LandingScreen from './screens/LandingScreen';
import Button from './components/Button';
import BarbershopPublicPage from './screens/public/BarbershopPublicPage';

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
});

export const PlanContext = React.createContext<{
    plan: any; 
    features: any;
}>({
    plan: PLANS[0],
    features: PLANS[0].features,
});

const App: React.FC = () => {
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

  const [activeClientScreen, setActiveClientScreen] = useState('home');
  const [activeBarbershopScreen, setActiveBarbershopScreen] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isSuperAdmin = useMemo(() => user?.id === SUPER_ADMIN_USER_ID, [user]);

  const [accessStatus, setAccessStatus] = useState<{
    hasAccess: boolean;
    isTrial: boolean;
    planId: string;
    trialEndDate: Date | null;
  }>({ hasAccess: false, isTrial: false, planId: 'BASIC', trialEndDate: null });

  useEffect(() => {
    // Fetch all static data on initial load, regardless of auth state
    setLoading(true);
    Promise.all([
        api.getBarbershops(),
        api.getAllUsers(),
        api.getReviews(),
    ]).then(([barbershopsData, usersData, reviewsData]) => {
        setBarbershops(barbershopsData);
        setUsers(usersData);
        setReviews(reviewsData);
    }).catch(err => {
        console.error("Failed to fetch initial public data:", err);
        setError("Não foi possível carregar os dados essenciais. Verifique sua conexão.");
    }).finally(() => {
        // Now check auth state
        api.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (!session) setLoading(false);
        });
    });

    const { data: authListener } = api.onAuthStateChange((_event, session) => {
        setSession(session);
        if (!session) {
            setUser(null);
            setAppointments([]); // Only clear user-specific data
            setGoogleToken(null);
            setLoading(false);
        }
    });

    return () => {
        authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session?.user) {
        setLoading(true);
        setError(null);
        fetchAuthenticatedData(session.user.id)
            .catch(err => {
                console.error("Failed to fetch authenticated data:", err);
                let errorMessage = "Ocorreu um erro ao carregar seus dados. Tente novamente mais tarde.";
                if (err && typeof err === 'object' && 'message' in err) {
                    const supabaseError = err as { message: string, details?: string };
                    errorMessage = `Erro ao carregar dados: ${supabaseError.message}`;
                    if (supabaseError.message.toLowerCase().includes('failed to fetch')) {
                        errorMessage = "Falha na conexão. Verifique sua internet e tente novamente.";
                    } else if (supabaseError.message.toLowerCase().includes('security policy')) {
                        errorMessage = "Erro de permissão ao buscar dados. Verifique as políticas de segurança (RLS) no Supabase.";
                    }
                } else if (err instanceof Error) {
                     errorMessage = err.message;
                }
                setError(errorMessage);
            })
            .finally(() => setLoading(false));
    }
  }, [session]);

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
      
      let hasAccess = false;
      let isTrial = false;
      let planId = 'BASIC';
      let trialEndDate: Date | null = null;
      
      if (integrations?.plan_status === 'suspended') {
          setAccessStatus({ hasAccess: false, isTrial: false, planId: integrations.plan || 'BASIC', trialEndDate: null });
          return;
      }

      if (barbershopData.trial_ends_at) {
          const trialEnd = new Date(barbershopData.trial_ends_at);
          if (trialEnd > now) {
              hasAccess = true;
              isTrial = true;
              planId = 'PREMIUM'; 
              trialEndDate = trialEnd;
          }
      }

      if (!hasAccess && integrations?.plan_expires_at) {
          const planEndDate = new Date(integrations.plan_expires_at);
          if (planEndDate > now) {
              hasAccess = true;
              isTrial = false;
              planId = integrations.plan || 'BASIC';
          }
      }

      if (!hasAccess && !isTrial && (new Date(barbershopData.trial_ends_at || 0) < now)) {
        hasAccess = false;
      } else if (!hasAccess && !isTrial) {
        planId = 'BASIC';
        hasAccess = true; // Basic plan has access
      }

      setAccessStatus({ hasAccess, isTrial, planId, trialEndDate });

  }, [user, barbershopData]);

  const planContextValue = useMemo(() => {
    const integrations = barbershopData?.integrations as IntegrationSettings;
    const planDetails = PLANS.find(p => p.id === accessStatus.planId) || PLANS.find(p => p.id === 'BASIC');

    if (!planDetails) {
        return { 
            plan: {}, 
            features: {
                analytics: false,
                marketing: false,
                googleCalendar: false,
                onlinePayments: false,
                packagesAndSubscriptions: false,
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


  const fetchAuthenticatedData = async (userId: string) => {
      try {
          const [appointmentsData, userProfile] = await Promise.all([
              api.getAppointments(),
              api.getUserProfile(userId),
          ]);
          setAppointments(appointmentsData);
          setUser(userProfile);
      } catch (error) {
          console.error("Error fetching authenticated data:", error);
          throw error;
      }
  };
  
  const signupAndRefetch = async (name: string, email: string, password: string, accountType: 'client' | 'barbershop', phone: string, birthDate?: string, barbershopName?: string) => {
    await api.signUpUser(name, email, password, accountType, phone, birthDate, barbershopName);
    const { data: { session } } = await api.getSession();
    if (session?.user?.id) {
        await fetchAuthenticatedData(session.user.id);
        // Also refetch public data that might have changed
        setBarbershops(await api.getBarbershops());
        setUsers(await api.getAllUsers());
    }
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
    login: api.signInUser,
    logout: api.signOutUser,
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
      } catch (error) {
        console.error("Falha ao atualizar barbearia:", error);
        alert("Ocorreu um erro ao salvar as alterações. A interface será atualizada para refletir os dados reais do servidor.");
      } finally {
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
    if (!accessStatus.hasAccess) {
        return <TrialExpiredScreen />;
    }
      
    let navItems = [
      { id: 'dashboard', label: 'Painel', icon: HomeIcon, enabled: true },
      { id: 'appointments', label: 'Agenda', icon: CalendarIcon, enabled: true },
      { id: 'waiting_list', label: 'Espera', icon: ClipboardListIcon, enabled: true },
      { id: 'professionals', label: 'Equipe', icon: UsersIcon, enabled: true },
      { id: 'clients', label: 'Clientes', icon: UserIcon, enabled: true },
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
    // Check for barbershopId in URL hash first for public page
    const hash = window.location.hash;
    if (hash.includes('barbershopId')) {
        const queryString = hash.substring(hash.indexOf('?'));
        const urlParams = new URLSearchParams(queryString);
        const barbershopId = urlParams.get('barbershopId');

        if (barbershopId) {
            const shop = barbershops.find(b => b.id === barbershopId);
            if (shop) {
                return <BarbershopPublicPage barbershop={shop} />;
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

  // The context value no longer needs `directBarbershop` or its setter
  const finalAppContextValue = { ...appContextValue, directBarbershop: null, setDirectBarbershop: () => {} };

  return (
    <AppContext.Provider value={finalAppContextValue}>
      <PlanContext.Provider value={planContextValue}>
        <div className="antialiased font-sans bg-brand-dark min-h-screen">
          {renderContent()}
        </div>
      </PlanContext.Provider>
    </AppContext.Provider>
  );
};

export default App;