import React, { useContext, useMemo } from 'react';
import { Barber } from '../../types';
import { XCircleIcon, StarIcon } from '../../components/icons/OutlineIcons';
import { AppContext } from '../../App';

interface BarberProfileModalProps {
    barber: Barber;
    barbershopId: string;
    onClose: () => void;
}

const BarberProfileModal: React.FC<BarberProfileModalProps> = ({ barber, barbershopId, onClose }) => {
    const { reviews } = useContext(AppContext);

    const barberReviews = useMemo(() => {
        return reviews.filter(r => r.barber_id === barber.id && r.barbershop_id === barbershopId);
    }, [reviews, barber.id, barbershopId]);

    return (
         <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[60]">
            <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-6 relative flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <XCircleIcon className="w-8 h-8"/>
                </button>
                
                <div className="text-center mb-4">
                    <img src={barber.avatarUrl} alt={barber.name} className="w-24 h-24 rounded-full mx-auto ring-4 ring-brand-primary" />
                    <h2 className="text-2xl font-bold mt-3">{barber.name}</h2>
                </div>

                <div className="flex-grow space-y-4 overflow-y-auto pr-2">
                    {barber.bio && (
                        <p className="text-center text-gray-300 text-sm">{barber.bio}</p>
                    )}

                    {barber.specialties && barber.specialties.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-brand-primary mb-2">Especialidades</h3>
                            <div className="flex flex-wrap gap-2">
                                {barber.specialties.map(spec => (
                                    <span key={spec} className="bg-brand-secondary text-xs font-semibold px-2 py-1 rounded-full">{spec}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {barber.portfolioImages && barber.portfolioImages.length > 0 && (
                        <div>
                             <h3 className="font-semibold text-brand-primary mb-2">Portfólio</h3>
                             <div className="grid grid-cols-2 gap-2">
                                {barber.portfolioImages.map((img, index) => (
                                    <img key={index} src={img} alt={`Trabalho de ${barber.name} ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                                ))}
                             </div>
                        </div>
                    )}

                    <div>
                        <h3 className="font-semibold text-brand-primary mb-2">Avaliações</h3>
                        <div className="space-y-3">
                            {barberReviews.length > 0 ? barberReviews.map(review => (
                                <div key={review.id} className="bg-brand-secondary p-3 rounded-lg">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="font-semibold text-sm">{review.client_name}</p>
                                        <div className="flex items-center">
                                            <span className="text-sm mr-1">{review.rating}</span>
                                            <StarIcon className="w-4 h-4 text-brand-primary" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-300 italic">"{review.comment}"</p>
                                </div>
                            )) : <p className="text-xs text-gray-400">Nenhuma avaliação ainda.</p>}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default BarberProfileModal;