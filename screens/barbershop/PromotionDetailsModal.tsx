import React from 'react';
import { Promotion } from '../../types';
import { XCircleIcon } from '../../components/icons/OutlineIcons';

interface PromotionDetailsModalProps {
    promotion: Promotion;
    onClose: () => void;
}

const PromotionDetailsModal: React.FC<PromotionDetailsModalProps> = ({ promotion, onClose }) => {
    
    const readCount = promotion.recipients.filter(r => r.status === 'read').length;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-6 relative flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <XCircleIcon className="w-8 h-8"/>
                </button>
                
                <div className="mb-4">
                    <h2 className="text-xl font-bold text-brand-primary">{promotion.title}</h2>
                    <p className="text-sm text-gray-400">Enviado em: {new Date(promotion.sentAt).toLocaleString()}</p>
                    <div className="mt-3 bg-brand-secondary p-3 rounded-lg text-sm">
                        <p>{promotion.message}</p>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto pr-2">
                    <h3 className="font-semibold text-lg mb-2">
                        Status de Entrega ({readCount} / {promotion.recipients.length} lidas)
                    </h3>
                    <div className="space-y-2 text-sm">
                        {promotion.recipients.map(recipient => (
                            <div key={recipient.clientId} className="bg-brand-secondary p-2 rounded-md">
                                <p className="font-semibold">{recipient.clientName}</p>
                                <div className="text-xs text-gray-400">
                                    <p>Recebido: {new Date(recipient.receivedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                                    {recipient.status === 'read' && recipient.readAt ? (
                                        <p className="text-green-400">Lido: {new Date(recipient.readAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                                    ) : (
                                        <p className="text-amber-400">Não lido</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PromotionDetailsModal;
