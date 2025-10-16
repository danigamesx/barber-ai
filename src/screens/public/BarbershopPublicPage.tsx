import React, { useState, useContext, useMemo, useEffect } from 'react';
import { Barbershop, Service, Barber, Address, SocialMedia, Review, IntegrationSettings } from '../../types';
import { AppContext } from '../../App';
import Button from '../../components/Button';
import { StarIcon, PhoneIcon, InstagramIcon, FacebookIcon, GlobeAltIcon, XCircleIcon, ArrowLeftIcon } from '../../components/icons/OutlineIcons';
import BookingModal from '../client/BookingModal';
import { Appointment } from '../../types';
import * as api from '../../api';

type NewAppointmentData = Omit<Appointment, 'id' | 'start_time' | 'end_time' | 'created_at'> & { start_time: Date, end_time: Date };

interface BarbershopPublicPageProps {
  identifier: string;
}

const BarbershopPublicPage: React.FC<BarbershopPublicPageProps> = ({ identifier }) => {
    const { reviews, user } = useContext(AppContext);
    const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
    const [loading, setLoading] = useState(true);
    const [componentError, setComponentError] = useState<string | null>(null);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    
    useEffect(() => {
        if (!identifier) return;

        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(identifier);

        const fetchBarbershop = async () => {
            setLoading(true);
            setComponentError(null);
            try {
                const shopData = isUUID
                    ? await api.getBarbershopById(identifier)
                    : await api.getBarbershopBySlug(identifier);
                setBarbershop(shopData);
            } catch (err) {
                console.error("Failed to fetch barbershop:", err);
                setComponentError("Não foi possível carregar os dados da barbearia. Verifique o link ou tente novamente.");
            } finally {
                setLoading(false);
            }
        };

        fetchBarbershop();
    }, [identifier]);
    
    useEffect(() => {
        const hash = window.location.hash;
        const urlParams = new URLSearchParams(hash.substring(hash.indexOf('?')));
        if (urlParams.get('openBooking') === 'true' && user && barbershop) {
            setIsBookingModalOpen(true);
            const path = hash.split('?')[0];
            window.history.replaceState(null, '', path);
        }
    }, [user, barbershop]);

    const isAcceptingAppointments = useMemo(() => {
        if (!barbershop) return false;
        const now = new Date();
        const integrations = barbershop.integrations as IntegrationSettings;
    
        if (integrations?.plan_status === 'suspended') {
            return false;
        }
    
        if (barbershop.trial_ends_at) {
            const trialEnd = new Date(barbershop.trial_ends_at);
            if (trialEnd > now) {
                return true;
            }
        }
    
        if (integrations?.plan_expires_at) {
            const planEndDate = new Date(integrations.plan_expires_at);
            if (planEndDate > now) {
                return true;
            }
        }
    
        return false;
    }, [barbershop]);

    const handleScheduleClick = () => {
        if (user) {
            setIsBookingModalOpen(true);
        } else {
            setShowLoginPrompt(true);
        }
    };
    
    const redirectToLogin = () => {
        sessionStorage.setItem('bookingIntentIdentifier', identifier);
        window.location.hash = ''; // Navega para a tela de login
    };

    const handleInitiatePayment = async (appointmentData: NewAppointmentData) => {
        setIsBookingModalOpen(false);
        setIsRedirecting(true);
        try {
            const { redirectUrl } = await api.createMercadoPagoPreference(appointmentData);
            if (redirectUrl) {
                window.location.href = redirectUrl;
            } else {
                alert('Não foi possível obter a URL de pagamento. Tente novamente.');
                setIsRedirecting(false);
            }
        } catch (error: any) {
            console.error('Falha ao iniciar pagamento:', error);
            alert(`Erro ao iniciar pagamento: ${error.message}`);
            setIsRedirecting(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen"><p>Carregando barbearia...</p></div>;
    }

    if (componentError || !barbershop) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
                <h2 className="text-2xl font-bold text-red-500 mb-2">Barbearia não encontrada.</h2>
                <p className="text-gray-400 mb-6">{componentError || 'O link que você acessou pode estar quebrado ou a barbearia pode ter sido removida.'}</p>
                <a href="#" onClick={() => (window.location.hash = '')} className="text-brand-primary hover:underline">Voltar para o início</a>
            </div>
        );
    }
    
    const address = barbershop.address as Address;
    const social = barbershop.social_media as SocialMedia;
    const phone = barbershop.phone;
    const barbers = Array.isArray(barbershop.barbers) ? barbershop.barbers as Barber[] : [];
    const services = Array.isArray(barbershop.services) ? barbershop.services as Service[] : [];
    const gallery = barbershop.gallery_images || [];
    const whatsappLink = phone ? `https://wa.me/55${phone.replace(/\D/g, '')}` : null;
    const barbershopReviews = reviews.filter(r => r.barbershop_id === barbershop.id);
    const averageRating = barbershopReviews.length === 0 ? 'Novo' : (barbershopReviews.reduce((acc, r) => acc + r.rating, 0) / barbershopReviews.length).toFixed(1);

    return (
        <>
            {user && (
                <button 
                    onClick={() => window.location.hash = ''} 
                    className="fixed top-4 left-4 z-50 bg-brand-secondary/70 backdrop-blur-md text-white p-2 rounded-full shadow-lg hover:bg-brand-secondary transition-colors"
                    aria-label="Voltar para o início"
                >
                    <ArrowLeftIcon className="w-6 h-6" />
                </button>
            )}
            <div className="bg-brand-dark min-h-screen text-brand-light">
                <header className="relative">
                    <img src={barbershop.image_url || `https://placehold.co/1200x400/111827/FBBF24?text=${encodeURIComponent(barbershop.name)}`} alt={`Capa de ${barbershop.name}`} className="w-full h-48 object-cover"/>
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-dark to-transparent"></div>
                    <div className="relative -mt-16 px-4">
                        <h1 className="text-3xl font-bold text-white">{barbershop.name}</h1>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-300">
                             <div className="flex items-center">
                                <StarIcon className="w-5 h-5 text-brand-primary" />
                                <span className="font-semibold ml-1">{averageRating}</span>
                                <span className="ml-2">({barbershopReviews.length} avaliações)</span>
                            </div>
                        </div>
                        {address && <p className="text-sm text-gray-400 mt-1">{`${address.street}, ${address.number} - ${address.neighborhood}, ${address.city}`}</p>}
                        
                        <div className="flex items-center gap-4 mt-4">
                            {whatsappLink && (
                                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-brand-primary" aria-label="WhatsApp">
                                    <PhoneIcon className="w-6 h-6" />
                                </a>
                            )}
                            {social?.instagram && (
                                <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-brand-primary" aria-label="Instagram">
                                    <InstagramIcon className="w-6 h-6" />
                                </a>
                            )}
                            {social?.facebook && (
                                <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-brand-primary" aria-label="Facebook">
                                    <FacebookIcon className="w-6 h-6" />
                                </a>
                            )}
                             {social?.website && (
                                <a href={social.website} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-brand-primary" aria-label="Website">
                                    <GlobeAltIcon className="w-6 h-6" />
                                </a>
                            )}
                        </div>
                    </div>
                </header>

                <main className="p-4 space-y-8">
                     {isAcceptingAppointments ? (
                         <>
                            <Button onClick={handleScheduleClick}>Agendar Horário</Button>

                             {barbershop.description && (
                                <section>
                                    <h2 className="text-xl font-semibold text-brand-primary mb-3">Sobre Nós</h2>
                                    <p className="text-gray-300 whitespace-pre-wrap">{barbershop.description}</p>
                                </section>
                             )}

                             <section>
                                <h2 className="text-xl font-semibold text-brand-primary mb-3">Nossos Barbeiros</h2>
                                <div className="flex gap-4 overflow-x-auto pb-2">
                                    {barbers.map(barber => (
                                        <div key={barber.id} className="text-center flex-shrink-0 w-24">
                                            <img src={barber.avatarUrl} alt={barber.name} className="w-20 h-20 rounded-full mx-auto object-cover"/>
                                            <p className="mt-2 text-sm font-medium truncate">{barber.name}</p>
                                        </div>
                                    ))}
                                </div>
                             </section>

                             <section>
                                <h2 className="text-xl font-semibold text-brand-primary mb-3">Serviços</h2>
                                <div className="space-y-2">
                                    {services.map(service => (
                                        <div key={service.id} className="bg-brand-secondary p-3 rounded-lg flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">{service.name}</p>
                                                <p className="text-sm text-gray-400">{service.duration} min</p>
                                            </div>
                                            <p className="font-semibold">R$ {service.price.toFixed(2)}</p>
                                        </div>
                                    ))}
                                </div>
                             </section>
                         </>
                     ) : (
                         <div className="bg-brand-secondary p-6 rounded-lg text-center my-8">
                            <h2 className="text-xl font-bold text-amber-400">Agendamentos Suspensos</h2>
                            <p className="text-gray-300 mt-2">Esta barbearia não está aceitando agendamentos online no momento.</p>
                         </div>
                     )}

                      {gallery.length > 0 && (
                        <section>
                            <h2 className="text-xl font-semibold text-brand-primary mb-3">Galeria</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {gallery.map((imgUrl, index) => (
                                    imgUrl && <img key={index} src={imgUrl} alt={`Galeria ${index + 1}`} className="w-full h-32 object-cover rounded-lg"/>
                                ))}
                            </div>
                        </section>
                     )}
                     
                     <section>
                        <h2 className="text-xl font-semibold text-brand-primary mb-3">O que dizem nossos clientes</h2>
                         <div className="space-y-3">
                            {barbershopReviews.slice(0, 5).map(review => (
                                 <div key={review.id} className="bg-brand-secondary p-4 rounded-lg">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="font-semibold">{review.client_name}</p>
                                        <div className="flex items-center gap-1">
                                            <span className="font-bold">{review.rating}</span>
                                            <StarIcon className="w-4 h-4 text-brand-primary" />
                                        </div>
                                    </div>
                                    <p className="text-gray-300 italic">"{review.comment}"</p>
                                </div>
                            ))}
                         </div>
                     </section>

                </main>
            </div>

            {isRedirecting && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center p-4 z-[100]">
                    <svg className="animate-spin h-8 w-8 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-white text-lg">Redirecionando para o pagamento...</p>
                </div>
            )}

            {showLoginPrompt && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[70]">
                    <div className="bg-brand-dark w-full max-w-sm rounded-lg shadow-xl p-6 text-center relative">
                        <button onClick={() => setShowLoginPrompt(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <XCircleIcon className="w-8 h-8" />
                        </button>
                        <h2 className="text-xl font-bold mb-4">Quase lá!</h2>
                        <p className="text-gray-300 mb-6">Para agendar seu horário, por favor, entre na sua conta ou crie um cadastro.</p>
                        <Button onClick={redirectToLogin}>Entrar ou Cadastrar</Button>
                    </div>
                </div>
            )}

            {isBookingModalOpen && (
                <BookingModal
                    barbershop={barbershop}
                    onClose={() => setIsBookingModalOpen(false)}
                    onInitiatePayment={handleInitiatePayment}
                />
            )}
        </>
    );
};

export default BarbershopPublicPage;