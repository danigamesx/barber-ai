import React, { useContext, useState, useMemo } from 'react';
import { Barbershop, Address, Review } from '../../types';
import { StarIcon, HeartIcon } from '../../components/icons/OutlineIcons';
import { AppContext } from '../../App';

const BarbershopCard: React.FC<{ 
  barbershop: Barbershop; 
  onSelect: () => void;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
}> = ({ barbershop, onSelect, isFavorite, onToggleFavorite }) => {
  const address = (barbershop.address as Address) || {};
  const formattedAddress = `${address.street || 'Endereço não informado'}, ${address.number || ''} - ${address.city || ''}`;
  const { reviews } = useContext(AppContext);
  
  const barbershopReviews = useMemo(() => reviews.filter(r => r.barbershop_id === barbershop.id), [reviews, barbershop.id]);
  const averageRating = useMemo(() => {
      if (barbershopReviews.length === 0) return barbershop.rating || 'Novo';
      const sum = barbershopReviews.reduce((acc, review) => acc + review.rating, 0);
      return (sum / barbershopReviews.length).toFixed(1);
  }, [barbershopReviews, barbershop.rating]);


  const handleCardClick = () => {
    if (barbershop.slug) {
        window.location.hash = `/${barbershop.slug}`;
    } else {
        window.location.hash = `/?barbershopId=${barbershop.id}`;
    }
  };

  return (
    <div className="bg-brand-secondary rounded-lg overflow-hidden shadow-lg relative">
      <div onClick={handleCardClick} className="cursor-pointer">
        <img src={barbershop.image_url || `https://placehold.co/600x400/1F2937/FBBF24?text=${encodeURIComponent(barbershop.name)}`} alt={barbershop.name} className="w-full h-40 object-cover" />
        <div className="p-4">
          <h3 className="font-bold text-lg text-brand-light">{barbershop.name}</h3>
          <p className="text-gray-400 text-sm">{formattedAddress}</p>
          <div className="flex items-center mt-2">
            <StarIcon className="w-5 h-5 text-brand-primary" />
            <span className="text-brand-light font-semibold ml-1">{averageRating}</span>
             <span className="text-gray-400 text-sm ml-2">({barbershopReviews.length} avaliações)</span>
          </div>
        </div>
      </div>
      <button onClick={onToggleFavorite} className="absolute top-3 right-3 bg-brand-dark/50 p-2 rounded-full">
        <HeartIcon className={`w-6 h-6 transition-all ${isFavorite ? 'text-red-500 fill-current' : 'text-white'}`} />
      </button>
    </div>
  );
};

const ClientHomeScreen: React.FC = () => {
  const { user, barbershops, toggleFavoriteBarbershop } = useContext(AppContext);
  const [searchQuery, setSearchQuery] = useState('');
  
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
                onSelect={() => {}}
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
                  onSelect={() => {}}
                  isFavorite={false}
                  onToggleFavorite={(e) => handleToggleFavorite(e, shop.id)}
                />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ClientHomeScreen;