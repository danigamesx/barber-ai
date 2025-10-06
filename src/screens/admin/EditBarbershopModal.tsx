import React, { useState, useContext } from 'react';
import { AppContext } from '../../App';
import { Barbershop } from '../../types';
import Button from '../../components/Button';
import { XCircleIcon } from '../../components/icons/OutlineIcons';

interface EditBarbershopModalProps {
  barbershop: Barbershop;
  onClose: () => void;
}

const EditBarbershopModal: React.FC<EditBarbershopModalProps> = ({ barbershop, onClose }) => {
  const { users, updateBarbershopData } = useContext(AppContext);
  const [name, setName] = useState(barbershop.name);

  const owner = users.find(u => u.id === barbershop.owner_id);

  const handleSave = () => {
    updateBarbershopData(barbershop.id, { name });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XCircleIcon className="w-8 h-8" />
        </button>
        <h2 className="text-xl font-bold mb-4 text-center">Editar Barbearia</h2>

        <div className="bg-brand-secondary p-3 rounded-lg mb-6 text-center">
            <p className="font-semibold text-brand-primary">{owner?.name}</p>
            <p className="text-sm text-gray-400">{owner?.email}</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="shop-name" className="block text-sm font-medium text-gray-400">Nome da Barbearia</label>
            <input
              id="shop-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full mt-1 px-4 py-3 bg-brand-secondary border border-gray-600 rounded-lg"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </div>
      </div>
    </div>
  );
};

export default EditBarbershopModal;