
import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import { CalendarDaysIcon, UsersIcon, MegaphoneIcon, ChartBarIcon, CurrencyDollarIcon, CreditCardIcon, CheckIcon } from '../components/icons/OutlineIcons';

interface LandingScreenProps {
  onEnter: () => void;
}

const featuresList = [
    { name: 'Agenda Inteligente', description: 'Otimize seus horários e permita agendamentos online 24/7.', icon: CalendarDaysIcon },
    { name: 'Gestão de Clientes (CRM)', description: 'Conheça seus clientes e crie relacionamentos duradouros.', icon: UsersIcon },
    { name: 'Marketing e Fidelidade', description: 'Envie promoções e crie programas de fidelidade com facilidade.', icon: MegaphoneIcon },
    { name: 'Análises e Relatórios', description: 'Tome decisões baseadas em dados com nossos relatórios.', icon: ChartBarIcon },
    { name: 'Pagamentos Online', description: 'Receba pagamentos antecipados de forma segura.', icon: CreditCardIcon },
    { name: 'Gestão Financeira', description: 'Controle comissões, vales e despesas de forma simples.', icon: CurrencyDollarIcon },
];

const plans = [
    { name: 'Básico', id: 'basic', price: { monthly: 59.90, annual: 41.90 }, features: ['Até 1 Barbeiro', 'Gestão de Clientes', 'Análises de Desempenho', 'Ferramentas de Marketing', 'Integração Google Agenda', 'Pacotes e Assinaturas'], mostPopular: false },
    { name: 'Pro', id: 'pro', price: { monthly: 84.90, annual: 59.90 }, features: ['Até 5 Barbeiros', 'Tudo do Básico', 'Pagamentos Online'], mostPopular: true },
    { name: 'Premium', id: 'enterprise', price: { monthly: 142.90, annual: 99.90 }, features: ['Barbeiros Ilimitados', 'Tudo do Pro', 'Suporte Prioritário'], mostPopular: false },
];

const LandingScreen: React.FC<LandingScreenProps> = ({ onEnter }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-brand-dark text-brand-light">
      <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${isScrolled ? 'bg-brand-secondary/70 backdrop-blur-lg' : 'bg-transparent'}`}>
        <nav className="flex items-center justify-between p-6 lg:px-8 max-w-7xl mx-auto" aria-label="Global">
          <div className="flex lg:flex-1">
            <a href="#inicio" className="-m-1.5 p-1.5 text-2xl font-black text-brand-primary">
              BarberAI
            </a>
          </div>
          <div className="hidden lg:flex lg:gap-x-12">
            <a href="#inicio" className="text-sm font-semibold leading-6 text-white hover:text-brand-primary">Início</a>
            <a href="#sobre" className="text-sm font-semibold leading-6 text-white hover:text-brand-primary">Sobre</a>
            <a href="#funcoes" className="text-sm font-semibold leading-6 text-white hover:text-brand-primary">Funções</a>
            <a href="#planos" className="text-sm font-semibold leading-6 text-white hover:text-brand-primary">Planos</a>
          </div>
          <div className="hidden lg:flex lg:flex-1 lg:justify-end items-center gap-x-6">
             <Button onClick={onEnter} variant="primary" className="py-2 px-4 text-sm w-auto">
                Teste Grátis
              </Button>
            <Button onClick={onEnter} variant="secondary" className="py-2 px-4 text-sm w-auto">
              Entrar
            </Button>
          </div>
        </nav>
      </header>

      <main className="isolate">
        <section id="inicio" className="relative pt-14">
            <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
                <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#FBBF24] to-[#3B82F6] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)'}}></div>
            </div>
            <div className="py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center">
                        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">A Revolução na Gestão da Sua Barbearia</h1>
                        <p className="mt-6 text-lg leading-8 text-gray-300">Agendamentos inteligentes, gestão de clientes e marketing automatizado. Tudo em um só lugar para levar seu negócio ao próximo nível.</p>
                        <div className="mt-10 flex items-center justify-center gap-x-6">
                            <Button onClick={onEnter} variant="primary" className="py-3 px-8 text-base w-auto shadow-lg shadow-amber-500/20">
                                Teste Grátis por 30 Dias
                            </Button>
                        </div>
                    </div>
                     <div className="mt-16 flow-root sm:mt-24">
                        <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                            <img src="https://placehold.co/1200x800/111827/FBBF24?text=BarberAI+Painel" alt="App screenshot" width={2432} height={1442} className="rounded-md shadow-2xl ring-1 ring-white/10" />
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section id="sobre" className="py-24 sm:py-32 bg-brand-secondary">
             <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl lg:text-center">
                    <h2 className="text-base font-semibold leading-7 text-brand-primary">Nossa Missão</h2>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Feito por barbeiros, para barbeiros</p>
                    <p className="mt-6 text-lg leading-8 text-gray-300">Nascemos da necessidade de uma ferramenta que realmente entende o dia a dia de uma barbearia. BarberAI foi criado para eliminar a papelada, otimizar seu tempo e te dar o controle total do seu negócio, de forma simples e intuitiva.</p>
                </div>
            </div>
        </section>

        <section id="funcoes" className="py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl lg:text-center">
                    <h2 className="text-base font-semibold leading-7 text-brand-primary">Recursos Poderosos</h2>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Tudo que você precisa para crescer</p>
                </div>
                <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                    <dl className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3 lg:gap-y-16">
                        {featuresList.map((feature) => (
                            <div key={feature.name} className="relative pl-16 transition-transform duration-300 hover:scale-105">
                                <dt className="text-base font-semibold leading-7 text-white">
                                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary">
                                        <feature.icon className="h-6 w-6 text-brand-dark" aria-hidden="true" />
                                    </div>
                                    {feature.name}
                                </dt>
                                <dd className="mt-2 text-base leading-7 text-gray-400">{feature.description}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        </section>
        
        <section id="planos" className="py-24 sm:py-32 bg-brand-secondary">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Planos para todos os tamanhos</h2>
                    <p className="mt-6 text-lg leading-8 text-gray-300">Escolha o plano perfeito para o momento atual da sua barbearia.</p>
                </div>
                <div className="flex justify-center my-10">
                    <div className="bg-brand-dark rounded-lg p-1 flex">
                        <button onClick={() => setBillingCycle('monthly')} className={`px-6 py-2 rounded-md font-semibold transition text-sm ${billingCycle === 'monthly' ? 'bg-brand-primary text-brand-dark' : 'text-gray-300'}`}>Mensal</button>
                        <button onClick={() => setBillingCycle('annual')} className={`px-6 py-2 rounded-md font-semibold transition text-sm relative ${billingCycle === 'annual' ? 'bg-brand-primary text-brand-dark' : 'text-gray-300'}`}>Anual <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">30% Desconto</span></button>
                    </div>
                </div>

                <div className="isolate mx-auto mt-10 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
                    {plans.map((plan) => (
                        <div key={plan.id} className={`rounded-3xl p-8 ring-1 xl:p-10 ${plan.mostPopular ? 'ring-2 ring-brand-primary bg-gray-800/50' : 'ring-gray-700'}`}>
                            <h3 className="text-lg font-semibold leading-8 text-white">{plan.name}</h3>
                            <p className="mt-4 text-sm leading-6 text-gray-300">{plan.id === 'basic' ? 'Para quem está começando.' : plan.id === 'pro' ? 'Para negócios em crescimento.' : 'Para barbearias estabelecidas.'}</p>
                            <p className="mt-6 flex items-baseline gap-x-1">
                                <span className="text-4xl font-bold tracking-tight text-white">R${plan.price[billingCycle]}</span>
                                <span className="text-sm font-semibold leading-6 text-gray-300">/mês</span>
                            </p>
                            <Button onClick={onEnter} variant={plan.mostPopular ? 'primary' : 'secondary'} className="mt-6 w-full">Contratar Plano</Button>
                            <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-300 xl:mt-10">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex gap-x-3"><CheckIcon className="h-6 w-5 flex-none text-brand-primary" aria-hidden="true" />{feature}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </section>
      </main>

      <footer className="bg-brand-dark">
        <div className="mx-auto max-w-7xl overflow-hidden px-6 py-12 lg:px-8">
            <p className="text-center text-xs leading-5 text-gray-500">&copy; {new Date().getFullYear()} BarberAI. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingScreen;
