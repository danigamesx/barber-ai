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
import { HomeIcon, CalendarIcon, BellIcon, UserIcon, ClipboardListIcon, MegaphoneIcon, ChartBarIcon, CogIcon, UsersIcon, MenuIcon } from './components/icons/OutlineIcons';
import BarbershopSetupScreen from './screens/barbershop/BarbershopSetupScreen';
import ClientNotificationsScreen from './screens/client/ClientNotificationsScreen';
import CommunicationsScreen from './screens/barbershop/CommunicationsScreen';
import WaitingListScreen from './screens/barbershop/WaitingListScreen';
import AdminDashboardScreen from './screens/admin/AdminDashboardScreen';
import * as api from './api';
import { SUPER_ADMIN_USER_ID, PLANS } from './constants';
import TrialBanner from './components/TrialBanner';
import TrialExpiredScreen from './screens/barbershop/TrialExpiredScreen';
import Button from './components/Button';
import LandingScreen from './screens/LandingScreen';
import BarbershopPublicPage from './screens/public/BarbershopPublicPage';
import InactivePlanBanner from './components/InactivePlanBanner';
import { supabaseInitializationError } from './supabaseClient';
import PlanPaymentModal from './screens/barbershop/PlanPaymentModal';
import { PackagePaymentModal } from './screens/client/PaymentModal';

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
  installPrompt: any;
  triggerInstall: () => void;
  setPurchaseIntent: React.Dispatch<React.SetStateAction<{ planId: string; billingCycle: 'monthly' | 'annual'; } | null>>;
  setPackageSubscriptionIntent: React.Dispatch<React.SetStateAction<{ type: "package" | "subscription"; itemId: string; barbershop: Barbershop; } | null>>;
  deleteBarbershopAccount: () => Promise<void>;
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
  installPrompt: null,
  triggerInstall: () => {},
  setPurchaseIntent: () => {},
  setPackageSubscriptionIntent: () => {},
  deleteBarbershopAccount: async () => {},
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

const MainApp: React.FC = () => {
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
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [purchaseIntent, setPurchaseIntent] = useState<{ planId: string, billingCycle: 'monthly' | 'annual' } | null>(null);
  const [packageSubscriptionIntent, setPackageSubscriptionIntent] = useState<{ type: 'package' | 'subscription', itemId: string, barbershop: Barbershop } | null>(null);

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

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const checkLoginIntent = () => {
        const intent = sessionStorage.getItem('bookingIntentBarbershopId') || sessionStorage.getItem('purchaseIntent');
        if (intent) {
            setShowLanding(false);
        }
    };
    checkLoginIntent();


    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  
  const triggerInstall = () => {
    if (installPrompt) {
        installPrompt.prompt();
        installPrompt.userChoice.then(() => {
            setInstallPrompt(null);
        });
    }
  };
  
  useEffect(() => {
    if (currentHash.includes('payment_status')) {
      const paramsString = currentHash.includes('?') ? currentHash.substring(currentHash.indexOf('?')) : '';
      const params = new URLSearchParams(paramsString);
      const status = params.get('payment_status') as 'success' | 'failure' | 'pending' | null;

      if (status && ['success', 'failure', 'pending'].includes(status)) {
        setPaymentStatus(status);
        if (status === 'success' && params.get('return_to') === 'settings') {
            setActiveBarbershopScreen('settings');
        }
      }

      // Clean the hash
      params.delete('payment_status');
      params.delete('return_to');
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

    const loadInitialData = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { session: currentSession } } = await api.getSession();
            setSession(currentSession);

            if (currentSession?.user) {
                const [barbershopsData, usersData, reviewsData, appointmentsData, userProfile] = await Promise.all([
                    api.getBarbershops(),
                    api.getAllUsers(),
                    api.getReviews(),
                    api.getAppointments(),
                    api.getUserProfile(currentSession.user.id),
                ]);
                setBarbershops(barbershopsData);
                setUsers(usersData);
                setReviews(reviewsData);
                setAppointments(appointmentsData);
                setUser(userProfile);
            } else {
                setUser(null);
                setAppointments([]);
                setGoogleToken(null);
                const barbershopsData = await api.getBarbershops();
                setBarbershops(barbershopsData);
            }
        } catch (err: any) {
            console.error("Falha ao carregar dados iniciais:", err);
            setError("Não foi possível carregar os dados. Verifique sua conexão.");
        } finally {
            setLoading(false);
        }
    };
    
    loadInitialData();

    const { data: authListener } = api.onAuthStateChange((_event, newSession) => {
        const userJustLoggedIn = newSession && !session;
        const userJustLoggedOut = !newSession && session;
        
        setSession(newSession);

        if (userJustLoggedIn) {
            loadInitialData();
        } else if (userJustLoggedOut) {
            setUser(null);
            setAppointments([]);
            setUsers([]);
            setReviews([]);
            setGoogleToken(null);
            setShowLanding(true);
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
      
      let hasAccess = false;
      let isTrial = false;
      let finalPlanId = 'INACTIVE';
      let trialEndDate: Date | null = null;
      
      if (integrations?.plan_status === 'suspended') {
          hasAccess = true; // Still has access to basic features
          finalPlanId = 'INACTIVE';
      } else if (barbershopData.trial_ends_at && new Date(barbershopData.trial_ends_at) > now) {
          hasAccess = true;
          isTrial = true;
          trialEndDate = new Date(barbershopData.trial_ends_at);
          finalPlanId = 'PREMIUM';
      } else if (integrations?.plan_expires_at && new Date(integrations.plan_expires_at) > now) {
          hasAccess = true;
          finalPlanId = integrations.plan || 'INACTIVE';
      } else if (barbershopData.trial_ends_at && new Date(barbershopData.trial_ends_at) <= now) {
          hasAccess = false; // Trial has expired, no active plan
      }
      
      setAccessStatus({ hasAccess, isTrial, planId: finalPlanId, trialEndDate });
  
  }, [user, barbershopData]);

  const planContextValue = useMemo(() => {
    const integrations = barbershopData?.integrations as IntegrationSettings;
    const planDetails = PLANS.find(p => p.id === accessStatus.planId) || PLANS.find(p => p.id === 'INACTIVE');

    if (!planDetails) {
        return { 
            plan: {}, 
            features: {
                analytics: false, marketing: false, googleCalendar: false, onlinePayments: false, packagesAndSubscriptions: false, clientManagement: false,
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
            let clientProfile = users.find(u => u.id === appointment.client_id) || await api.getUserProfile(appointment.client_id);
        
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
    deleteBarbershopAccount: async () => {
        if (barbershopData) {
            await api.deleteUserAndBarbershop();
            await api.signOutUser();
        } else {
            throw new Error("Nenhuma barbearia encontrada para excluir.");
        }
    },
    setGoogleToken,
    patchUser,
  };

  const finalAppContextValue = { ...appContextValue };

  return (
    <AppContext.Provider value={finalAppContextValue}>
      <PlanContext.Provider value={planContextValue}>
        <div className="antialiased font-sans bg-brand-dark min-h-screen">
          {renderContent()}
          {purchaseIntent && <PlanPaymentModal planId={purchaseIntent.planId} billingCycle={purchaseIntent.billingCycle} onClose={() => setPurchaseIntent(null)} />}
          {packageSubscriptionIntent && <PackagePaymentModal intent={packageSubscriptionIntent} onClose={() => setPackageSubscriptionIntent(null)} />}
          {paymentStatus && (
              <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[100]">
                  <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-8 text-center">
                      {paymentStatus === 'success' && (
                          <>
                              <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
                              <h2 className="text-2xl font-bold mb-2">Pagamento Aprovado!</h2>
                              <p className="text-gray-400 mb-6">Sua compra foi concluída com sucesso. O status será atualizado em breve.</p>
                              <Button onClick={() => {
                                  setPaymentStatus(null);
                                  if (user?.user_type === 'CLIENT') {
                                     setActiveClientScreen('appointments');
                                  }
                              }}>
                                  Ok
                              </Button>
                          </>
                      )}
                      {paymentStatus === 'failure' && (
                          <>
                              <XCircleIcon className="w-20 h-20 text-red-500 mx-auto mb-4" />
                              <h2 className="text-2xl font-bold mb-2">Pagamento Recusado</h2>
                              <p className="text-gray-400 mb-6">Não foi possível processar seu pagamento. Nenhum valor foi cobrado. Por favor, tente novamente.</p>
                              <Button variant="secondary" onClick={() => setPaymentStatus(null)}>
                                  Tentar Novamente
                              </Button>
                          </>
                      )}
                      {paymentStatus === 'pending' && (
                          <>
                              <ClockIcon className="w-20 h-20 text-amber-500 mx-auto mb-4" />
                              <h2 className="text-2xl font-bold mb-2">Pagamento Pendente</h2>
                              <p className="text-gray-400 mb-6">Seu pagamento está sendo processado. Sua compra será confirmada assim que o pagamento for aprovado.</p>
                               <Button variant="secondary" onClick={() => setPaymentStatus(null)}>
                                  Ok
                              </Button>
                          </>
                      )}
                  </div>
              </div>
          )}
        </div>
      </PlanContext.Provider>
    </AppContext.Provider>
  );
};

export default MainApp;