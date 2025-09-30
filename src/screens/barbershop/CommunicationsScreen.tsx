import React, { useContext, useState } from 'react';
import { AppContext } from '../../App';
import Button from '../../components/Button';
import { Promotion } from '../../types';
import PromotionDetailsModal from './PromotionDetailsModal';

const CommunicationsScreen: React.FC = () => {
    const { barbershopData, sendPromotion } = useContext(AppContext);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !message) {
            setError('Título e mensagem são obrigatórios.');
            return;
        }
        if (barbershopData) {
            sendPromotion(barbershopData.id, title, message);
            setTitle('');
            setMessage('');
            setError('');
            alert('Mensagem enviada com sucesso para todos os clientes!');
        }
    };

    const promotions = Array.isArray(barbershopData?.promotions)
        ? barbershopData.promotions as unknown as Promotion[]
        : [];
    const promotionsHistory = [...promotions].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

    return (
        <>
            <div className="p-4 space-y-8">
                <div>
                    <h1 className="text-2xl font-bold mb-2 text-brand-light">Comunicações</h1>
                    <p className="text-gray-400">Envie notícias e promoções para seus clientes.</p>
                </div>

                <div className="bg-brand-secondary p-4 rounded-lg">
                    <h2 className="text-lg font-semibold text-brand-primary mb-3">Nova Mensagem</h2>
                    <form onSubmit={handleSend} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Título da Mensagem"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                        <textarea
                            rows={4}
                            placeholder="Escreva sua mensagem aqui..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <Button type="submit">Enviar para Todos os Clientes</Button>
                    </form>
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-brand-primary mb-3">Histórico de Envios</h2>
                    <div className="space-y-3">
                        {promotionsHistory.length > 0 ? (
                            promotionsHistory.map(promo => (
                                <div key={promo.id} onClick={() => setSelectedPromotion(promo)} className="bg-brand-secondary p-3 rounded-lg cursor-pointer hover:bg-gray-700">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold">{promo.title}</p>
                                            <p className="text-xs text-gray-400 mt-1">{promo.message.substring(0, 50)}...</p>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-4">
                                            <p className="text-xs text-gray-400">{new Date(promo.sentAt).toLocaleDateString()}</p>
                                             <p className="text-xs text-gray-400">{new Date(promo.sentAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-400 text-center py-4">Nenhuma mensagem enviada ainda.</p>
                        )}
                    </div>
                </div>
            </div>

            {selectedPromotion && (
                <PromotionDetailsModal
                    promotion={selectedPromotion}
                    onClose={() => setSelectedPromotion(null)}
                />
            )}
        </>
    );
};

export default CommunicationsScreen;