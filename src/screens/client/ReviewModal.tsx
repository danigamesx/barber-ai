import React, { useState, useContext } from 'react';
import { Appointment } from '../../types';
import { XCircleIcon, StarIcon } from '../../components/icons/OutlineIcons';
import Button from '../../components/Button';
import { AppContext } from '../../App';

interface ReviewModalProps {
    appointment: Appointment;
    onClose: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ appointment, onClose }) => {
    const { user, addReview } = useContext(AppContext);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');

    const handleSubmit = () => {
        if (!user || rating === 0) {
            alert('Por favor, selecione uma nota.');
            return;
        }

        addReview({
            client_id: user.id,
            client_name: user.name.split(' ')[0] + ' ' + user.name.split(' ').pop()?.[0] + '.',
            barber_id: appointment.barber_id,
            barbershop_id: appointment.barbershop_id,
            rating,
            comment,
            appointment_id: appointment.id
        }, appointment.id);

        onClose();
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <XCircleIcon className="w-8 h-8"/>
                </button>
                <h2 className="text-xl font-bold mb-2 text-center">Deixe sua Avaliação</h2>
                <p className="text-sm text-gray-400 text-center mb-6">Como foi seu serviço de {appointment.service_name} com {appointment.barber_name}?</p>

                <div className="flex justify-center items-center my-6">
                    {[1, 2, 3, 4, 5].map(index => (
                        <StarIcon 
                            key={index}
                            className={`w-10 h-10 cursor-pointer transition-colors ${
                                (hoverRating || rating) >= index ? 'text-brand-primary' : 'text-gray-600'
                            }`}
                            onClick={() => setRating(index)}
                            onMouseEnter={() => setHoverRating(index)}
                            onMouseLeave={() => setHoverRating(0)}
                        />
                    ))}
                </div>

                <textarea 
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    rows={4}
                    placeholder="Conte mais sobre sua experiência (opcional)..."
                    className="w-full p-2 bg-brand-secondary border border-gray-600 rounded-lg text-sm"
                />

                <div className="mt-6">
                    <Button onClick={handleSubmit} disabled={rating === 0}>Enviar Avaliação</Button>
                </div>
            </div>
        </div>
    );
};

export default ReviewModal;