import React, { useContext, useState, useEffect } from 'react';
import { AppContext, PlanContext } from '../../App';
import Button from '../../components/Button';
import { PencilIcon, PlusCircleIcon, TrashIcon, XCircleIcon } from '../../components/icons/OutlineIcons';
import { Barber, Barbershop, Service, Json, ServicePackage, SubscriptionPlan, Address, CancellationPolicy, IntegrationSettings, OpeningHours, DayOpeningHours, SocialMedia } from '../../types';
import ManageServiceModal from './ManageServiceModal';
import ManageBarberModal from './ManageBarberModal';
import ManageScheduleModal from './ManageScheduleModal';
import IntegrationsModal from './IntegrationsModal';
import ManageLoyaltyModal from './ManageLoyaltyModal';
import ManagePackagesModal from './ManagePackagesModal';
import ManageSubscriptionsModal from './ManageSubscriptionsModal';
import { states, cities } from '../../data/brazil-locations';
import { formatCEP, formatPhone } from '../../utils/formatters';
import SearchableSelect from '../../components/SearchableSelect';
import UpgradePlanModal from './UpgradePlanModal';
import PlansModal from './PlansModal';
import * as api from '../../api';


const dayTranslations: { [key: string]: string } = {
    sunday: 'Domingo',
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
};

type ModalState = 
  | { type: 'service'; data: Service | null }
  | { type: 'barber'; data: Barber | null }
  | { type: 'schedule' }
  | { type: 'integrations' }
  | { type: 'loyalty' }
  | { type: 'packages' }
  | { type: 'subscriptions' }
  | { type: 'upgrade', feature: string, plan: string }
  | null;

const BarbershopSettingsScreen: React.FC = () => {
  const { barbershopData, updateBarbershopData, logout, accessStatus } = useContext(AppContext);
  const { plan, features } = useContext(PlanContext);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);

  const [policy, setPolicy] = useState<CancellationPolicy>({
    enabled: false, feePercentage: 50, timeLimitHours: 2
  });
  
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [socialMedia, setSocialMedia] = useState<SocialMedia>({});
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [newGalleryFiles, setNewGalleryFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [address, setAddress] = useState<Address>({
    street: '', number: '', neighborhood: '', city: '', state: '', zip: '', country: 'Brasil'
  });
  
  useEffect(() => {
    if(barbershopData) {
        setName(barbershopData.name || '');
        setPhone(barbershopData.phone || '');
        setDescription(barbershopData.description || '');
        setSocialMedia((barbershopData.social_media as SocialMedia) || {});
        setGalleryImages(barbershopData.gallery_images || []);
        setPolicy((barbershopData.cancellation_policy as CancellationPolicy) || { enabled: false, feePercentage: 50, timeLimitHours: 2 });
        setAddress((barbershopData.address as Address) || { street: '', number: '', neighborhood: '', city: '', state: '', zip: '', country: 'Brasil' });
        setAutoConfirm(!!(barbershopData.integrations as IntegrationSettings)?.auto_confirm_appointments);
    }
  }, [barbershopData]);
  
  if (!barbershopData) {
    return <div className="p-4">Carregando...</div>;
  }
  
  const getStatusInfo = () => {
    const integrations = barbershopData.integrations as IntegrationSettings;
    if (accessStatus.isTrial && accessStatus.trialEndDate) {
        return {
            status: 'Em teste',
            date: accessStatus.trialEndDate,
            label: 'Seu teste termina em',
            color: 'text-amber-400'
        };
    }
    if (integrations?.plan_expires_at) {
        return {
            status: 'Ativo',
            date: new Date(integrations.plan_expires_at),
            label: 'Sua assinatura renova em',
            color: 'text-green-400'
        };
    }
    return {
        status: 'Básico',
        date: null,
        label: 'Plano gratuito sem data de expiração',
        color: 'text-gray-400'
    };
  };

  const statusInfo = getStatusInfo();

  const handleAddressChange = (field: keyof Address, value: string) => {
    setAddress(prev => {
        const newAddress = { ...prev, [field]: value };
        if (field === 'state') {
            newAddress.city = '';
        }
        return newAddress;
    });
  };
  
    const handleMainImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && barbershopData) {
            const file = e.target.files[0];
            setIsUploading(true);
            try {
                const imageUrl = await api.uploadImage(file, 'barbershop-media', barbershopData.id);
                await updateBarbershopData(barbershopData.id, { image_url: imageUrl });
                alert('Imagem principal atualizada!');
            } catch (error) {
                console.error(error);
                alert('Falha ao enviar a imagem.');
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleGalleryFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setNewGalleryFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeExistingGalleryImage = (url: string) => {
        setGalleryImages(prev => prev.filter(imgUrl => imgUrl !== url));
    };
  
  const handleSaveInfo = async () => {
    if (!barbershopData) return;
    setIsUploading(true);
    try {
        let finalGalleryUrls = [...galleryImages];
        if (newGalleryFiles.length > 0) {
            const uploadPromises = newGalleryFiles.map(file => 
                api.uploadImage(file, 'barbershop-media', barbershopData.id)
            );
            const uploadedUrls = await Promise.all(uploadPromises);
            finalGalleryUrls.push(...uploadedUrls);
        }

        await updateBarbershopData(barbershopData.id, { 
            name, 
            phone,
            description,
            social_media: socialMedia as Json,
            gallery_images: finalGalleryUrls.filter(Boolean),
            address: address as unknown as Json 
        });

        setNewGalleryFiles([]);
        alert('Informações salvas com sucesso!');
    } catch (error) {
        console.error("Failed to save barbershop info:", error);
        alert("Ocorreu um erro ao salvar as informações.");
    } finally {
        setIsUploading(false);
    }
  };

  const handleSavePolicy = () => {
    if (!barbershopData) return;
    updateBarbershopData(barbershopData.id, { cancellation_policy: policy as unknown as Json });
    alert('Política de cancelamento salva com sucesso!');
  };
  
  const handleSaveAutoConfirm = () => {
    const currentIntegrations = (barbershopData.integrations as IntegrationSettings) || {};
    const updatedIntegrations = { ...currentIntegrations, auto_confirm_appointments: autoConfirm };
    updateBarbershopData(barbershopData.id, { integrations: updatedIntegrations as unknown as Json });
    alert('Preferência de agendamento salva!');
  };

  const handleSaveService = (serviceData: Omit<Service, 'id'> & { id?: string }) => {
    let updatedServices: Service[];
    const currentServices = Array.isArray(barbershopData.services) ? barbershopData.services as Service[] : [];
    if (serviceData.id) {
        updatedServices = currentServices.map(s => s.id === serviceData.id ? serviceData as Service : s);
    } else {
        const newService: Service = { ...serviceData, id: `s_${Date.now()}` };
        updatedServices = [...currentServices, newService];
    }
    updateBarbershopData(barbershopData.id, { services: updatedServices as unknown as Json });
    setModalState(null);
  };

  const handleDeleteService = (serviceId: string) => {
    if(window.confirm('Tem certeza que deseja excluir este serviço?')){
      const currentServices = Array.isArray(barbershopData.services) ? barbershopData.services as Service[] : [];
      const updatedServices = currentServices.filter(s => s.id !== serviceId);
      updateBarbershopData(barbershopData.id, { services: updatedServices as unknown as Json });
    }
  };
  
  const handleSaveBarber = (barberData: Omit<Barber, 'id'> & { id?: string }) => {
    let updatedBarbers: Barber[];
    const currentBarbers = Array.isArray(barbershopData.barbers) ? barbershopData.barbers as Barber[] : [];
    if (barberData.id) {
        updatedBarbers = currentBarbers.map(b => b.id === barberData.id ? barberData as Barber : b);
    } else {
        const newBarber: Barber = { ...barberData, id: `b_${Date.now()}` };
        updatedBarbers = [...currentBarbers, newBarber];
    }
    updateBarbershopData(barbershopData.id, { barbers: updatedBarbers as unknown as Json });
    setModalState(null);
  };
  
  const handleDeleteBarber = (barberId: string) => {
     if(window.confirm('Tem certeza que deseja excluir este barbeiro?')){
      const currentBarbers = Array.isArray(barbershopData.barbers) ? barbershopData.barbers as Barber[] : [];
      const updatedBarbers = currentBarbers.filter(b => b.id !== barberId);
      updateBarbershopData(barbershopData.id, { barbers: updatedBarbers as unknown as Json });
    }
  };

  const handleSaveIntegrations = (integrations: Barbershop['integrations']) => {
    updateBarbershopData(barbershopData.id, { integrations });
    setModalState(null);
  };

  const handleSaveSchedule = (data: { openingHours: Barbershop['opening_hours'], blockedDates: string[], blockedTimeSlots: Barbershop['blocked_time_slots'] }) => {
    updateBarbershopData(barbershopData.id, { 
      opening_hours: data.openingHours, 
      blocked_dates: data.blockedDates,
      blocked_time_slots: data.blockedTimeSlots,
    });
    setModalState(null);
  };

  const services = Array.isArray(barbershopData.services) ? barbershopData.services as Service[] : [];
  const barbers = Array.isArray(barbershopData.barbers) ? barbershopData.barbers as Barber[] : [];
  const packages = Array.isArray(barbershopData.packages) ? barbershopData.packages as ServicePackage[] : [];
  const subscriptions = Array.isArray(barbershopData.subscriptions) ? barbershopData.subscriptions as SubscriptionPlan[] : [];

  const handleAddBarberClick = () => {
      if (barbers.length >= (plan.maxBarbers || Infinity)) {
          setModalState({ type: 'upgrade', feature: `Adicionar mais de ${plan.maxBarbers} barbeiro(s)`, plan: 'Pro' });
      } else {
          setModalState({ type: 'barber', data: null });
      }
  };
  
  const handleFeatureClick = (feature: 'packages' | 'subscriptions', requiredPlan: string, featureName: string) => {
      if ((feature === 'packages' || feature === 'subscriptions') && !features.packagesAndSubscriptions) {
          setModalState({ type: 'upgrade', feature: featureName, plan: requiredPlan });
      } else {
          setModalState({ type: feature });
      }
  };

  return (
    <>
      <style>{`
          .toggle-checkbox { appearance: none; width: 4rem; height: 2rem; background-color: #374151; border-radius: 9999px; position: relative; cursor: pointer; transition: background-color 0.2s ease-in-out; }
          .toggle-checkbox::before { content: ''; width: 1.75rem; height: 1.75rem; background-color: white; border-radius: 9999px; position: absolute; top: 0.125rem; left: 0.125rem; transition: transform 0.2s ease-in-out; }
          .toggle-checkbox:checked { background-color: #FBBF24; }
          .toggle-checkbox:checked::before { transform: translateX(2rem); }
        `}</style>
      <div className="p-4 pb-24">
        <h1 className="text-2xl font-bold mb-6 text-brand-light">Ajustes</h1>

        <div className="space-y-6">
          
          <div className="bg-brand-secondary p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-brand-primary mb-3">Meu Plano</h2>
            <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">Plano Atual:</span>
                    <span className="font-bold text-lg text-white">{plan.name}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">Status:</span>
                    <span className={`font-semibold ${statusInfo.color}`}>{statusInfo.status}</span>
                </div>
                <div className="flex justify-between items-center">
                     <span className="text-gray-400">{statusInfo.label}:</span>
                     <span className="font-semibold text-white">{statusInfo.date ? statusInfo.date.toLocaleDateString('pt-BR') : 'N/A'}</span>
                </div>
            </div>
            <Button onClick={() => setIsPlansModalOpen(true)} variant="secondary">Ver todos os planos</Button>
          </div>
          
          <div className="bg-brand-secondary p-4 rounded-lg">
             <h2 className="text-lg font-semibold text-brand-primary mb-3">Página da Barbearia</h2>
             <div className="space-y-3">
                
                 <div className="flex items-center gap-4">
                    <img 
                        src={barbershopData.image_url || `https://placehold.co/400x400/1F2937/FBBF24?text=Logo`} 
                        alt="Logo da Barbearia"
                        className="w-24 h-24 rounded-lg object-cover bg-brand-secondary"
                    />
                    <div>
                        <label htmlFor="logo-upload" className="text-md font-semibold text-gray-300">Logo e Imagem de Capa</label>
                        <p className="text-xs text-gray-500 mb-2">Envie a imagem principal da sua barbearia.</p>
                        <input id="logo-upload" type="file" accept="image/*" onChange={handleMainImageChange} disabled={isUploading} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-primary file:text-brand-dark hover:file:bg-amber-300"/>
                        {isUploading && <p className="text-xs text-amber-400 mt-1">Enviando...</p>}
                    </div>
                </div>

                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome da Barbearia" className="w-full px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg"/>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Sobre sua barbearia..." rows={3} className="w-full px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg"/>
                <input type="tel" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="Telefone para Contato" maxLength={15} className="w-full px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg"/>
                
                <h3 className="text-md font-semibold text-gray-300 pt-2">Endereço</h3>
                <input type="text" value={address.street} onChange={e => handleAddressChange('street', e.target.value)} placeholder="Rua / Avenida" className="w-full px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg"/>
                <div className="flex gap-3">
                    <input type="text" value={address.number} onChange={e => handleAddressChange('number', e.target.value)} placeholder="Nº" className="w-1/3 px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg"/>
                    <input type="text" value={address.neighborhood} onChange={e => handleAddressChange('neighborhood', e.target.value)} placeholder="Bairro" className="w-2/3 px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg"/>
                </div>
                 <div className="flex gap-3">
                    <div className="w-1/2">
                        <select 
                            value={address.state}
                            onChange={(e) => handleAddressChange('state', e.target.value)}
                            className="w-full px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg h-[42px]"
                        >
                            <option value="">Estado</option>
                            {states.map(s => <option key={s.uf} value={s.uf}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="w-1/2">
                        <SearchableSelect 
                            options={cities[address.state || ''] || []}
                            value={address.city || ''}
                            onChange={(value) => handleAddressChange('city', value)}
                            placeholder="Cidade"
                        />
                    </div>
                </div>
                <input type="text" value={address.zip || ''} onChange={e => handleAddressChange('zip', formatCEP(e.target.value))} placeholder="CEP (xxxxx-xxx)" maxLength={9} className="w-full px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg"/>
                
                <h3 className="text-md font-semibold text-gray-300 pt-2">Redes Sociais</h3>
                <input type="url" value={socialMedia.instagram || ''} onChange={e => setSocialMedia(p => ({...p, instagram: e.target.value}))} placeholder="URL do Instagram" className="w-full px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg"/>
                <input type="url" value={socialMedia.facebook || ''} onChange={e => setSocialMedia(p => ({...p, facebook: e.target.value}))} placeholder="URL do Facebook" className="w-full px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg"/>
                <input type="url" value={socialMedia.website || ''} onChange={e => setSocialMedia(p => ({...p, website: e.target.value}))} placeholder="URL do seu Website" className="w-full px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg"/>
                
                 <h3 className="text-md font-semibold text-gray-300 pt-2">Galeria de Fotos</h3>
                 <div className="grid grid-cols-3 gap-2 mb-2">
                    {galleryImages.map((url) => (
                        <div key={url} className="relative group">
                            <img src={url} alt="Foto da galeria" className="w-full h-24 object-cover rounded-md" />
                            <button onClick={() => removeExistingGalleryImage(url)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <XCircleIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                 </div>
                 <input type="file" multiple accept="image/*" onChange={handleGalleryFilesChange} disabled={isUploading} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-primary file:text-brand-dark hover:file:bg-amber-300"/>
                 {newGalleryFiles.length > 0 && <p className="text-xs text-gray-400 mt-1">{newGalleryFiles.length} nova(s) imagem(ns) selecionada(s).</p>}


                <Button onClick={handleSaveInfo} variant="secondary" disabled={isUploading}>
                    {isUploading ? 'Salvando...' : 'Salvar Informações'}
                </Button>
             </div>
          </div>

          <div className="bg-brand-secondary p-4 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-brand-primary">Gerenciar Serviços</h2>
              <button onClick={() => setModalState({ type: 'service', data: null })} className="text-brand-primary hover:text-amber-300">
                <PlusCircleIcon className="w-7 h-7" />
              </button>
            </div>
            <div className="space-y-2">
              {services.map(service => (
                <div key={service.id} className="flex justify-between items-center bg-brand-dark p-3 rounded-md">
                  <div>
                    <p>{service.name}</p>
                    <p className="text-xs text-gray-400">{service.duration} min</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-semibold">R${service.price}</p>
                    <button onClick={() => setModalState({ type: 'service', data: service })} className="text-gray-400 hover:text-brand-primary"><PencilIcon className="w-5 h-5"/></button>
                    <button onClick={() => handleDeleteService(service.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-brand-secondary p-4 rounded-lg">
             <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-brand-primary">Gerenciar Barbeiros ({barbers.length}/{plan.maxBarbers === Infinity ? '∞' : plan.maxBarbers})</h2>
                <button onClick={handleAddBarberClick} className="text-brand-primary hover:text-amber-300">
                    <PlusCircleIcon className="w-7 h-7" />
                </button>
            </div>
            <div className="space-y-2">
              {barbers.map(barber => (
                <div key={barber.id} className="flex justify-between items-center bg-brand-dark p-2 rounded-md">
                   <div className="flex items-center space-x-3">
                    <img src={barber.avatarUrl} alt={barber.name} className="w-10 h-10 rounded-full" />
                    <p>{barber.name}</p>
                   </div>
                   <div className="flex items-center gap-4 mr-2">
                    <button onClick={() => setModalState({ type: 'barber', data: barber })} className="text-gray-400 hover:text-brand-primary"><PencilIcon className="w-5 h-5"/></button>
                    <button onClick={() => handleDeleteBarber(barber.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-brand-secondary p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-brand-primary mb-3">Agenda</h2>
             <div className="space-y-2 text-sm mb-4">
              {Object.keys((barbershopData.opening_hours as OpeningHours) || {}).map((day) => {
                const hours = (barbershopData.opening_hours as OpeningHours)[day] as DayOpeningHours | null;
                return (
                  <div key={day} className="flex justify-between items-center">
                    <p className="capitalize">{dayTranslations[day]}</p>
                    <p className="text-gray-300 text-right text-xs">
                        {hours ? `Manhã: ${hours.morning_open}-${hours.morning_close} | Tarde: ${hours.afternoon_open}-${hours.afternoon_close}` : 'Fechado'}
                    </p>
                  </div>
                );
              })}
            </div>
            <Button onClick={() => setModalState({type: 'schedule'})} variant="secondary">Gerenciar Agenda</Button>
          </div>
          
          <div className="bg-brand-secondary p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-brand-primary mb-3">Preferências de Agendamento</h2>
            <div className="flex justify-between items-center mb-3">
                <div>
                    <label htmlFor="autoConfirmToggle" className="font-semibold">Confirmar agendamentos automaticamente</label>
                    <p className="text-xs text-gray-400 font-normal mt-1">Se ativado, novos pedidos são aceitos na hora. Se desativado, você precisa confirmá-los manualmente.</p>
                </div>
                <input 
                  id="autoConfirmToggle" 
                  type="checkbox" 
                  className="toggle-checkbox" 
                  checked={autoConfirm}
                  onChange={e => setAutoConfirm(e.target.checked)}
                />
            </div>
            <Button onClick={handleSaveAutoConfirm} variant="secondary">Salvar Preferência</Button>
          </div>

           <div className="bg-brand-secondary p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-brand-primary mb-3">Recursos Adicionais</h2>
            <div className="space-y-4">
              <Button variant="secondary" onClick={() => setModalState({type: 'loyalty'})}>Gerenciar Fidelidade</Button>
              <Button variant="secondary" onClick={() => handleFeatureClick('packages', 'Premium', 'Gerenciar Pacotes')}>Gerenciar Pacotes</Button>
              <Button variant="secondary" onClick={() => handleFeatureClick('subscriptions', 'Premium', 'Gerenciar Assinaturas')}>Gerenciar Assinaturas</Button>
            </div>
          </div>

          <div className="bg-brand-secondary p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-brand-primary mb-3">Política de Cancelamento</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label htmlFor="enablePolicy" className="font-semibold flex-1 pr-4">Cobrar por cancelamentos tardios</label>
                <input 
                  id="enablePolicy" 
                  type="checkbox" 
                  className="toggle-checkbox" 
                  checked={policy.enabled}
                  onChange={e => setPolicy(p => ({ ...p, enabled: e.target.checked }))}
                />
              </div>
              {policy.enabled && (
                <>
                  <div>
                    <label htmlFor="feePercentage" className="block text-sm font-medium text-gray-400 mb-1">
                      Percentual da multa (%)
                    </label>
                    <input
                      id="feePercentage"
                      type="number"
                      value={policy.feePercentage}
                      onChange={e => setPolicy(p => ({ ...p, feePercentage: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg"
                      placeholder="Ex: 50"
                    />
                  </div>
                  <div>
                    <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-400 mb-1">
                      Cancelar sem custo até (horas antes)
                    </label>
                    <input
                      id="timeLimit"
                      type="number"
                      value={policy.timeLimitHours}
                      onChange={e => setPolicy(p => ({ ...p, timeLimitHours: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg"
                      placeholder="Ex: 2"
                    />
                  </div>
                </>
              )}
              <Button onClick={handleSavePolicy} variant="secondary">Salvar Política</Button>
            </div>
          </div>
          
          <div className="bg-brand-secondary p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-brand-primary mb-3">Integrações</h2>
            <p className="text-gray-400 text-sm mb-4">Sincronize sua agenda e receba pagamentos.</p>
            <div className="space-y-3">
               <div className="flex justify-between items-center">
                <span>Pagamentos Online (Stripe)</span>
                <span className={`px-2 py-1 text-xs rounded-full ${(barbershopData.integrations as IntegrationSettings)?.stripeAccountOnboarded ? 'bg-green-500/20 text-green-400' : 'bg-gray-600'}`}>
                  {(barbershopData.integrations as IntegrationSettings)?.stripeAccountOnboarded ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Google Agenda</span>
                <span className={`px-2 py-1 text-xs rounded-full ${(barbershopData.integrations as IntegrationSettings)?.googleCalendar ? 'bg-green-500/20 text-green-400' : 'bg-gray-600'}`}>
                  {(barbershopData.integrations as IntegrationSettings)?.googleCalendar ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
               <div className="flex justify-between items-center">
                <span>Notificações WhatsApp</span>
                 <span className={`px-2 py-1 text-xs rounded-full ${(barbershopData.integrations as IntegrationSettings)?.whatsapp ? 'bg-green-500/20 text-green-400' : 'bg-gray-600'}`}>
                  {(barbershopData.integrations as IntegrationSettings)?.whatsapp ? 'Ativado' : 'Desativado'}
                </span>
              </div>
              <Button onClick={() => setModalState({type: 'integrations'})} className="mt-4" variant="secondary">Gerenciar Integrações</Button>
            </div>
          </div>

          <div className="mt-6">
            <Button variant="danger" onClick={logout}>Sair da Conta</Button>
          </div>
        </div>
      </div>
      
      {modalState?.type === 'service' && (
        <ManageServiceModal 
            serviceToEdit={modalState.data}
            onClose={() => setModalState(null)}
            onSave={handleSaveService}
        />
      )}

      {modalState?.type === 'barber' && (
        <ManageBarberModal
            barberToEdit={modalState.data}
            onClose={() => setModalState(null)}
            onSave={handleSaveBarber}
        />
      )}

      {modalState?.type === 'schedule' && (
        <ManageScheduleModal 
            currentOpeningHours={barbershopData.opening_hours}
            currentBlockedDates={barbershopData.blocked_dates || []}
            currentBlockedTimeSlots={barbershopData.blocked_time_slots}
            onClose={() => setModalState(null)} 
            onSave={handleSaveSchedule}
        />
      )}

      {modalState?.type === 'integrations' && (
        <IntegrationsModal 
            currentIntegrations={barbershopData.integrations}
            onClose={() => setModalState(null)}
            onSave={handleSaveIntegrations}
        />
      )}
      
       {modalState?.type === 'loyalty' && (
        <ManageLoyaltyModal
            currentSettings={barbershopData.loyalty_program}
            onClose={() => setModalState(null)}
            onSave={(settings) => {
              updateBarbershopData(barbershopData.id, { loyalty_program: settings as unknown as Json });
              setModalState(null);
            }}
        />
      )}

      {modalState?.type === 'packages' && (
        <ManagePackagesModal
            currentPackages={packages}
            availableServices={services}
            onClose={() => setModalState(null)}
            onSave={(packages) => {
              updateBarbershopData(barbershopData.id, { packages: packages as unknown as Json });
              setModalState(null);
            }}
        />
      )}

      {modalState?.type === 'subscriptions' && (
        <ManageSubscriptionsModal
            currentSubscriptions={subscriptions}
            onClose={() => setModalState(null)}
            onSave={(subscriptions) => {
              updateBarbershopData(barbershopData.id, { subscriptions: subscriptions as unknown as Json });
              setModalState(null);
            }}
        />
      )}

       {modalState?.type === 'upgrade' && (
        <UpgradePlanModal
            featureName={modalState.feature}
            requiredPlan={modalState.plan}
            onClose={() => setModalState(null)}
        />
      )}
      {isPlansModalOpen && <PlansModal onClose={() => setIsPlansModalOpen(false)} />}
    </>
  );
};

export default BarbershopSettingsScreen;