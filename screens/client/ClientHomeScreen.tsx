

import React, { useContext, useState, useMemo, useEffect } from 'react';
import { Barbershop, Appointment, Address, LoyaltyProgram } from '../../types';
import { StarIcon, HeartIcon } from '../../components/icons/OutlineIcons';
import BookingModal from './BookingModal';
import PaymentModal from './PaymentModal';
import { AppContext } from '../../App';

type NewAppointmentData = Omit<Appointment, 'id' | 'start_time' | 'end_time' | 'created_at'> & { start_time: Date, end_time: Date };

const BarbershopCard: React.FC<{ 
  barbershop: Barbershop; 
  onSelect: () => void;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
}> = ({ barbershop, onSelect, isFavorite, onToggleFavorite }) => {
  const address = (barbershop.address as Address) || {};
  const formattedAddress = `${address.street || 'Endereço não informado'}, ${address.number || ''} - ${address.city || ''}`;

  return (
    <div className="bg-brand-secondary rounded-lg overflow-hidden shadow-lg relative">
      <div onClick={onSelect} className="cursor-pointer">
        <img src={barbershop.image_url || `https://placehold.co/600x400/1F2937/FBBF24?text=${encodeURIComponent(barbershop.name)}`} alt={barbershop.name} className="w-full h-40 object-cover" />
        <div className="p-4">
          <h3 className="font-bold text-lg text-brand-light">{barbershop.name}</h3>
          <p className="text-gray-400 text-sm">{formattedAddress}</p>
          <div className="flex items-center mt-2">
            <StarIcon className="w-5 h-5 text-brand-primary" />
            <span className="text-brand-light font-semibold ml-1">{barbershop.rating || 'Novo'}</span>
          </div>
        </div>
      </div>
      <button onClick={onToggleFavorite} className="absolute top-3 right-3 bg-brand-dark/50 p-2 rounded-full">
        <HeartIcon className={`w-6 h-6 transition-all ${isFavorite ? 'text-red-500 fill-current' : 'text-white'}`} />
      </button>
    </div>
  );
};

const LoyaltyCard: React.FC<{ barbershopName: string, stamps: number, goal: number, reward: string }> = ({ barbershopName, stamps, goal, reward }) => (
    <div className="bg-brand-secondary p-4 rounded-lg">
        <h4 className="font-bold text-brand-primary">{barbershopName}</h4>
        <p className="text-sm text-gray-300 mb-3">Próxima recompensa: <span className="font-semibold">{reward}</span></p>
        <div className="flex justify-between items-center gap-2">
            {Array.from({ length: goal }).map((_, i) => (
                <div key={i} className={`w-full h-8 rounded-md flex items-center justify-center ${i < stamps ? 'bg-amber-400' : 'bg-brand-dark'}`}>
                    {i < stamps && <StarIcon className="w-5 h-5 text-brand-dark" />}
                </div>
            ))}
        </div>
        <p className="text-xs text-gray-400 mt-2 text-right">{stamps} de {goal} carimbos</p>
    </div>
);

const ClientHomeScreen: React.FC = () => {
  const { user, barbershops, toggleFavoriteBarbershop, directBarbershop, setDirectBarbershop } = useContext(AppContext);
  const [selectedBarbershop, setSelectedBarbershop] = useState<Barbershop | null>(null);
  const [appointmentToPay, setAppointmentToPay] = useState<NewAppointmentData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    if (directBarbershop) {
        setSelectedBarbershop(directBarbershop);
    }
  }, [directBarbershop]);

  const handleCloseBookingModal = () => {
      setSelectedBarbershop(null);
      if (directBarbershop) {
          setDirectBarbershop(null);
          // Limpa o parâmetro da URL para não reabrir o modal ao atualizar a página
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
  };
  
  const handleInitiatePayment = (appointmentData: NewAppointmentData) => {
    setAppointmentToPay(appointmentData);
    handleCloseBookingModal();
  };

  const handleToggleFavorite = (e: React.MouseEvent, shopId: string) => {
    e.stopPropagation();
    toggleFavoriteBarbershop(shopId);
  }

  const filteredBarbershops = useMemo(() => {
    if (!searchQuery.trim()) {
      return barbershops;
    }
    const lowercasedQuery = searchQuery.toLowerCase().trim();
    return barbershops.filter(shop => {
        const address = (shop.address as Address) || {};
        return shop.name.toLowerCase().includes(lowercasedQuery) ||
        (address.city || '').toLowerCase().includes(lowercasedQuery) ||
        (address.street || '').toLowerCase().includes(lowercasedQuery)
    });
  }, [barbershops, searchQuery]);

  const favoriteBarbershops = useMemo(() => {
    return filteredBarbershops.filter(shop => user?.favorite_barbershop_ids?.includes(shop.id));
  }, [filteredBarbershops, user]);

  const otherBarbershops = useMemo(() => {
    return filteredBarbershops.filter(shop => !user?.favorite_barbershop_ids?.includes(shop.id));
  }, [filteredBarbershops, user]);

  const loyaltyData = useMemo(() => {
    if (!user?.loyalty_stamps) return [];
    return Object.entries((user.loyalty_stamps as {[key: string]: number}) || {}).map(([shopId, stamps]) => {
        const shop = barbershops.find(b => b.id === shopId);
        const program = shop?.loyalty_program as LoyaltyProgram | undefined;
        return shop && program?.enabled ? { 
            shopId, 
            shopName: shop.name, 
            stamps, 
            goal: program.stampsNeeded, 
            reward: program.reward 
        } : null;
    }).filter(Boolean);
  }, [user, barbershops]);

  return (
    <div className="p-4 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-brand-light">Bem-vindo, {user?.name.split(' ')[0]}!</h1>
        <p className="text-gray-400">Encontre e agende seu próximo horário.</p>
      </header>
      
      <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar por nome, cidade ou rua..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-brand-secondary border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
      </div>

      {searchQuery.trim() === '' && loyaltyData.length > 0 && (
        <section>
            <h2 className="text-lg font-semibold mb-4 text-brand-primary">Cartão Fidelidade</h2>
            <div className="space-y-4">
                {loyaltyData.map(data => (
                    data && <LoyaltyCard key={data.shopId} barbershopName={data.shopName} stamps={data.stamps} goal={data.goal} reward={data.reward} />
                ))}
            </div>
        </section>
      )}

      {filteredBarbershops.length === 0 && searchQuery.trim() !== '' && (
        <div className="text-center py-10">
            <p className="text-gray-400">Nenhuma barbearia encontrada para "{searchQuery}".</p>
        </div>
      )}

      {favoriteBarbershops.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 text-brand-primary">Minhas Barbearias Favoritas</h2>
          <div className="space-y-4">
            {favoriteBarbershops.map(shop => (
              <BarbershopCard 
                key={shop.id} 
                barbershop={shop} 
                onSelect={() => setSelectedBarbershop(shop)}
                isFavorite={true}
                onToggleFavorite={(e) => handleToggleFavorite(e, shop.id)}
              />
            ))}
          </div>
        </section>
      )}

      {otherBarbershops.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 text-brand-primary">{favoriteBarbershops.length > 0 ? 'Outras Barbearias' : 'Barbearias Disponíveis'}</h2>
          <div className="space-y-4">
            {otherBarbershops.map(shop => (
              <BarbershopCard 
                  key={shop.id} 
                  barbershop={shop} 
                  onSelect={() => setSelectedBarbershop(shop)}
                  isFavorite={false}
                  onToggleFavorite={(e) => handleToggleFavorite(e, shop.id)}
                />
            ))}
          </div>
        </section>
      )}
      
      {selectedBarbershop && (
        <BookingModal 
          barbershop={selectedBarbershop} 
          onClose={handleCloseBookingModal}
          onInitiatePayment={handleInitiatePayment}
        />
      )}

      {appointmentToPay && (
        <PaymentModal
          appointmentData={appointmentToPay}
          onClose={() => setAppointmentToPay(null)}
        />
      )}
    </div>
  );
};

export default ClientHomeScreen;
