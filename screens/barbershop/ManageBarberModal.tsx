import React, { useState, useEffect, useContext } from 'react';
import { Barber } from '../../types';
import Button from '../../components/Button';
import { XCircleIcon } from '../../components/icons/OutlineIcons';
import * as api from '../../api';
import { AppContext } from '../../App';

interface ManageBarberModalProps {
  barberToEdit: Barber | null;
  onClose: () => void;
  onSave: (barber: Omit<Barber, 'id'> & { id?: string }) => void;
}

const ManageBarberModal: React.FC<ManageBarberModalProps> = ({ barberToEdit, onClose, onSave }) => {
  const { barbershopData } = useContext(AppContext);
  const [name, setName] = useState('');
  const [commissionPercentage, setCommissionPercentage] = useState('');
  const [error, setError] = useState('');
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (barberToEdit) {
      setName(barberToEdit.name);
      setAvatarPreview(barberToEdit.avatarUrl);
      setCommissionPercentage(barberToEdit.commissionPercentage?.toString() || '');
    } else {
      setName('');
      setAvatarPreview('');
      setCommissionPercentage('');
    }
    setAvatarFile(null); // Reset file on change
  }, [barberToEdit]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setAvatarFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError('O nome do barbeiro é obrigatório.');
      return;
    }
    
    if (!barbershopData) {
        setError('ID da barbearia não encontrado.');
        return;
    }
    
    setError('');
    setIsUploading(true);
    
    let finalAvatarUrl = barberToEdit?.avatarUrl || `https://picsum.photos/seed/${name.replace(/\s+/g, '')}/200/200`;

    if (avatarFile) {
        try {
            finalAvatarUrl = await api.uploadImage(avatarFile, 'barbershop-media', barbershopData.id);
        } catch (uploadError: any) {
            setError(`Falha no upload da imagem: ${uploadError.message}`);
            setIsUploading(false);
            return;
        }
    }

    onSave({
      id: barberToEdit?.id,
      name,
      avatarUrl: finalAvatarUrl,
      commissionPercentage: parseInt(commissionPercentage, 10) || 0,
    });
    
    setIsUploading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XCircleIcon className="w-8 h-8" />
        </button>
        <h2 className="text-xl font-bold mb-6 text-center">{barberToEdit ? 'Editar Barbeiro' : 'Adicionar Novo Barbeiro'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Foto do Barbeiro</label>
            <div className="flex items-center gap-4">
                <img src={avatarPreview || `https://placehold.co/200x200/1F2937/FBBF24?text=${name.charAt(0) || '?'}`} alt="Avatar Preview" className="w-16 h-16 rounded-full object-cover bg-brand-secondary" />
                <input
                    id="avatarFile"
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-primary file:text-brand-dark hover:file:bg-amber-300"
                />
            </div>
          </div>
          <div>
            <label htmlFor="barberName" className="block text-sm font-medium text-gray-400 mb-1">Nome do Barbeiro</label>
            <input
              id="barberName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="Ex: Carlos"
            />
          </div>
          <div>
            <label htmlFor="barberCommission" className="block text-sm font-medium text-gray-400 mb-1">Comissão (%)</label>
            <input
              id="barberCommission"
              type="number"
              value={commissionPercentage}
              onChange={(e) => setCommissionPercentage(e.target.value)}
              className="w-full px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="Ex: 40"
              min="0"
              max="100"
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div className="pt-4">
            <Button type="submit" disabled={isUploading}>
                {isUploading ? 'Salvando...' : 'Salvar Barbeiro'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManageBarberModal;