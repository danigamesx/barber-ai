import React, { useState, useEffect, useContext } from 'react';
import { AppContext, PlanContext } from '../../App';
import { Barbershop, IntegrationSettings, Json } from '../../types';
import Button from '../../components/Button';
import { XCircleIcon } from '../../components/icons/OutlineIcons';
import * as api from '../../api';

type Integrations = Barbershop['integrations'];

interface IntegrationsModalProps {
  currentIntegrations: Integrations;
  onClose: () => void;
  onSave: (integrations: Integrations) => void;
}

declare global {
    interface Window {
        google: any;
    }
}

const IntegrationsModal: React.FC<IntegrationsModalProps> = ({ currentIntegrations, onClose, onSave }) => {
  const { googleToken, setGoogleToken, barbershopData } = useContext(AppContext);
  const { features } = useContext(PlanContext);
  let tokenClient: any = null;

  const [integrations, setIntegrations] = useState<IntegrationSettings>(() => {
    const current = (currentIntegrations as IntegrationSettings) || {};
    return {
      ...current,
      googleCalendar: !!current?.googleCalendar,
      whatsapp: !!current?.whatsapp,
      whatsapp_reminder_minutes: current?.whatsapp_reminder_minutes ?? 120,
    };
  });
  
  const [isGisLoaded, setIsGisLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMercadoPagoConnected = integrations.mercadopagoPublicKey && integrations.mercadopagoAccessToken;

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setIsGisLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);
  
  const handleConnectGoogle = () => {
    if (!features.googleCalendar) {
        alert('Esta funcionalidade requer o plano Pro ou superior.');
        return;
    }
    if (!isGisLoaded) {
      setError("A biblioteca de autenticação do Google ainda não carregou. Tente novamente em alguns segundos.");
      return;
    }
    setError(null);

    const GOOGLE_CLIENT_ID = '934676693006-8n6s222268j2g00990s83q7s6qj0o9k3.apps.googleusercontent.com';

    try {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/calendar',
            callback: (tokenResponse: any) => {
                if (tokenResponse && tokenResponse.access_token) {
                    setGoogleToken(tokenResponse.access_token);
                    setIntegrations(prev => ({ ...prev, googleCalendar: true }));
                } else {
                    setError('Falha na autenticação com o Google.');
                }
            },
            error_callback: (error: any) => {
                 setError(`Erro de autenticação: ${error?.message || 'Tente novamente.'}`);
            }
        });
        tokenClient.requestAccessToken();
    } catch(e: any) {
        setError(`Erro ao iniciar o cliente do Google: ${e.message}`);
    }
  };

  const handleDisconnectGoogle = () => {
    setGoogleToken(null);
    setIntegrations(prev => ({ ...prev, googleCalendar: false }));
  };
  
  const handleChange = (field: keyof IntegrationSettings, value: any) => {
    setIntegrations(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = () => {
    onSave(integrations as Json);
  };
  
  const handleConnectMercadoPago = () => {
    if (!barbershopData) return;
    // As variáveis de ambiente do VITE precisam ser expostas com o prefixo VITE_
    const appId = import.meta.env.VITE_MERCADO_PAGO_APP_ID; 
    if (!appId) {
        setError("A configuração para conectar ao Mercado Pago está incompleta no servidor. (APP_ID ausente)");
        return;
    }
    const redirectUri = `${window.location.origin}/api/mp-oauth-callback`;
    const state = barbershopData.id;
    const oauthUrl = `https://auth.mercadopago.com.br/authorization?client_id=${appId}&response_type=code&platform_id=mp&state=${state}&redirect_uri=${redirectUri}`;
    window.location.href = oauthUrl;
  };


  const handleDisconnectMercadoPago = async () => {
      if (!barbershopData) return;
      if (!window.confirm("Tem certeza que deseja desconectar sua conta do Mercado Pago?")) return;
      
      try {
        await api.disconnectMercadoPago(barbershopData.id);
        setIntegrations(prev => ({ ...prev, mercadopagoPublicKey: undefined, mercadopagoAccessToken: undefined }));
      } catch (err: any) {
          setError(err.message || 'Falha ao desconectar. Tente novamente.');
      }
  };


  const isGoogleConnected = googleToken !== null && integrations.googleCalendar;

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XCircleIcon className="w-8 h-8" />
        </button>
        <h2 className="text-xl font-bold mb-6 text-center">Gerenciar Integrações</h2>
        
        <div className="space-y-4">
            <div className={`bg-brand-secondary p-4 rounded-lg space-y-3`}>
                <div className="flex justify-between items-center">
                    <label className="font-semibold">Pagamentos Online (Mercado Pago)</label>
                    <span className={`px-2 py-1 text-xs rounded-full ${isMercadoPagoConnected ? 'bg-green-500/20 text-green-400' : 'bg-gray-600'}`}>
                        {isMercadoPagoConnected ? 'Conectado' : 'Desconectado'}
                    </span>
                </div>
                
                {isMercadoPagoConnected ? (
                     <>
                        <p className="text-xs text-gray-400">Sua conta está conectada e pronta para receber pagamentos.</p>
                        <Button variant="danger" onClick={handleDisconnectMercadoPago}>Desconectar Conta</Button>
                    </>
                ) : (
                    <>
                        <p className="text-xs text-gray-400">Receba pagamentos online. O cliente é redirecionado para o Mercado Pago para autorizar a conexão de forma segura.</p>
                        <Button variant="secondary" onClick={handleConnectMercadoPago}>Conectar com Mercado Pago</Button>
                    </>
                )}
            </div>

            <div className={`bg-brand-secondary p-4 rounded-lg space-y-3 ${!features.googleCalendar ? 'opacity-50' : ''}`}>
                <div className="flex justify-between items-center">
                    <label className="font-semibold">Google Agenda</label>
                    <span className={`px-2 py-1 text-xs rounded-full ${isGoogleConnected ? 'bg-green-500/20 text-green-400' : 'bg-gray-600'}`}>
                      {isGoogleConnected ? 'Conectado' : 'Desconectado'}
                    </span>
                </div>
                 <p className="text-xs text-gray-400">Conecte sua agenda para sincronizar seus compromissos automaticamente.</p>
                { isGoogleConnected ? (
                    <Button variant="danger" onClick={handleDisconnectGoogle}>Desconectar do Google</Button>
                ) : (
                    <Button variant="secondary" onClick={handleConnectGoogle} disabled={!isGisLoaded || !features.googleCalendar}>Conectar com Google</Button>
                )}
            </div>

             <div className="flex justify-between items-center bg-brand-secondary p-4 rounded-lg">
                <label htmlFor="whatsapp" className="font-semibold">Notificações WhatsApp</label>
                <input id="whatsapp" type="checkbox" className="toggle-checkbox" checked={integrations.whatsapp} onChange={(e) => handleChange('whatsapp', e.target.checked)} />
            </div>
            {integrations.whatsapp && (
                 <div className="bg-brand-secondary p-4 rounded-lg">
                    <label htmlFor="whatsapp_reminder_minutes" className="block text-sm font-medium text-gray-400 mb-2">
                        Enviar lembrete
                    </label>
                     <div className="flex items-center gap-2">
                         <input
                           id="whatsapp_reminder_minutes"
                           type="number"
                           value={integrations.whatsapp_reminder_minutes}
                           onChange={(e) => handleChange('whatsapp_reminder_minutes', parseInt(e.target.value, 10) || 0)}
                           className="w-24 px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg text-center"
                         />
                         <span className="text-gray-400">minutos antes do horário.</span>
                     </div>
                     <p className="text-xs text-gray-500 mt-2">Um botão para enviar lembretes manuais também aparecerá nos detalhes do agendamento.</p>
                 </div>
            )}
        </div>

        {error && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}
        
        <style>{`
          .toggle-checkbox { appearance: none; width: 4rem; height: 2rem; background-color: #374151; border-radius: 9999px; position: relative; cursor: pointer; transition: background-color 0.2s ease-in-out; }
          .toggle-checkbox::before { content: ''; width: 1.75rem; height: 1.75rem; background-color: white; border-radius: 9999px; position: absolute; top: 0.125rem; left: 0.125rem; transition: transform 0.2s ease-in-out; }
          .toggle-checkbox:checked { background-color: #FBBF24; }
          .toggle-checkbox:checked::before { transform: translateX(2rem); }
        `}</style>

        <div className="mt-8">
            <Button onClick={handleSubmit}>Salvar Alterações</Button>
        </div>
      </div>
    </div>
    </>
  );
};

export default IntegrationsModal;