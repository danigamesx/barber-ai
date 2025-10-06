import React, { useState, useContext, useMemo, useEffect } from 'react';
import { Barbershop, Service, Barber, Address, SocialMedia, Review, IntegrationSettings } from '../../types';
import { AppContext } from '../../App';
import Button from '../../components/Button';
import { StarIcon, PhoneIcon, InstagramIcon, FacebookIcon, GlobeAltIcon, XCircleIcon } from '../../components/icons/OutlineIcons';
import BookingModal from '../client/BookingModal';
import PaymentModal from '../client/PaymentModal';
import { Appointment } from '../../types';

type NewAppointmentData = Omit<Appointment, 'id' | 'start_time' | 'end_time' | 'created_at'> & { start_time: Date, end_time: Date };

const BarbershopPublicPage: React.FC<{ barbershop: Barbershop }> = ({ barbershop }) => {
    const { reviews, user } = useContext(AppContext);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [appointmentToPay, setAppointmentToPay] = useState<NewAppointmentData | null>(null);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    
    useEffect(() => {
        const hash = window.location.hash;
        if (hash.includes('openBooking=true') && user) {
            const urlParams = new URLSearchParams(hash.substring(hash.indexOf('?')));
            setIsBookingModalOpen(true);
            // Limpa a URL para não reabrir o modal ao atualizar a página
            urlParams.delete('openBooking');
            const newHash = `#/?${urlParams.toString()}`;
            window.history.replaceState(null, '', newHash);
        }
    }, [user]);

    const isAcceptingAppointments = useMemo(() => {
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
        sessionStorage.setItem('bookingIntentBarbershopId', barbershop.id);
        // Limpar o hash redireciona para a tela de login/landing
        window.location.hash = '';
    };

    const address = barbershop.address as Address;
    const social = barbershop.social_media as SocialMedia;
    const phone = barbershop.phone;
    const barbers = Array.isArray(barbershop.barbers) ? barbershop.barbers as Barber[] : [];
    const services = Array.isArray(barbershop.services) ? barbershop.services as Service[] : [];
    const gallery = barbershop.gallery_images || [];

    const whatsappLink = phone ? `https://wa.me/55${phone.replace(/\D/g, '')}` : null;
    
    const barbershopReviews = useMemo(() => reviews.filter(r => r.barbershop_id === barbershop.id), [reviews, barbershop.id]);
    const averageRating = useMemo(() => {
        if (barbershopReviews.length === 0) return 'Novo';
        const sum = barbershopReviews.reduce((acc, review) => acc + review.rating, 0);
        return (sum / barbershopReviews.length).toFixed(1);
    }, [barbershopReviews]);

    const handleInitiatePayment = (appointmentData: NewAppointmentData) => {
        setAppointmentToPay(appointmentData);
        setIsBookingModalOpen(false);
    };

    return (
        <>
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
             {appointmentToPay && (
                <PaymentModal
                appointmentData={appointmentToPay}
                onClose={() => setAppointmentToPay(null)}
                />
            )}
        </>
    );
};

export default BarbershopPublicPage;