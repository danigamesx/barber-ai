import React from 'react';
import Button from './Button';
import { XCircleIcon, ShareIcon, PlusCircleIcon } from './icons/OutlineIcons';

interface IosInstallModalProps {
  onClose: () => void;
}

const IosInstallModal: React.FC<IosInstallModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[100]">
      <div className="bg-brand-dark w-full max-w-sm rounded-lg shadow-xl p-6 text-center relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XCircleIcon className="w-8 h-8" />
        </button>
        <h2 className="text-xl font-bold text-brand-primary mb-4">Instalar o Aplicativo</h2>
        <p className="text-gray-300 mb-6">Para instalar o BarberAI no seu iPhone, siga estes passos:</p>
        <div className="space-y-4 text-left text-gray-300">
            <div className="flex items-center gap-4">
                <span className="bg-brand-secondary p-2 rounded-lg"><ShareIcon className="w-6 h-6 text-brand-light" /></span>
                <p>1. Toque no ícone de <strong>Compartilhar</strong> na barra de ferramentas do Safari.</p>
            </div>
             <div className="flex items-center gap-4">
                <span className="bg-brand-secondary p-2 rounded-lg"><PlusCircleIcon className="w-6 h-6 text-brand-light" /></span>
                <p>2. Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.</p>
            </div>
        </div>
        <div className="mt-8">
            <Button variant="secondary" onClick={onClose}>
                Entendi
            </Button>
        </div>
      </div>
    </div>
  );
};

export default IosInstallModal;
