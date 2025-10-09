
import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import { CalendarDaysIcon, UsersIcon, MegaphoneIcon, ChartBarIcon, CurrencyDollarIcon, CreditCardIcon, CheckIcon, MenuIcon, XCircleIcon } from '../components/icons/OutlineIcons';

interface LandingScreenProps {
  onEnter: (type: 'client' | 'barbershop') => void;
}

const featuresList = [
    { name: 'Agenda Cheia, Zero Estresse', description: 'Otimize seus horários com agendamentos online 24/7 e diga adeus aos conflitos de agenda.', icon: CalendarDaysIcon },
    { name: 'Conexões que Fidelizam', description: 'Mantenha um histórico detalhado de cada cliente, suas preferências e serviços anteriores.', icon: UsersIcon },
    { name: 'Marketing que Funciona', description: 'Envie promoções direcionadas e crie programas de fidelidade que trazem seus clientes de volta.', icon: MegaphoneIcon },
    { name: 'Decisões Inteligentes', description: 'Acesse relatórios claros sobre faturamento, serviços populares e desempenho dos barbeiros.', icon: ChartBarIcon },
    { name: 'Receba Pagamentos Online', description: 'Reduza faltas e garanta seu faturamento com pagamentos antecipados de forma segura.', icon: CreditCardIcon },
    { name: 'Finanças sob Controle', description: 'Gerencie comissões, vales e despesas de forma simples e visual, sem planilhas complicadas.', icon: CurrencyDollarIcon },
];

const plans = [
    { name: 'Básico', id: 'basic', price: { monthly: 59.90, annual: 41.90 }, features: ['Até 1 Barbeiro', 'Gestão de Clientes', 'Análises de Desempenho', 'Ferramentas de Marketing', 'Integração Google Agenda', 'Pacotes e Assinaturas'], mostPopular: false },
    { name: 'Pro', id: 'pro', price: { monthly: 84.90, annual: 59.90 }, features: ['Até 5 Barbeiros', 'Tudo do Básico', 'Pagamentos Online'], mostPopular: true },
    { name: 'Premium', id: 'enterprise', price: { monthly: 142.90, annual: 99.90 }, features: ['Barbeiros Ilimitados', 'Tudo do Pro', 'Suporte Prioritário'], mostPopular: false },
];


const LandingScreen: React.FC<LandingScreenProps> = ({ onEnter }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-brand-dark text-brand-light">
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
          isScrolled ? 'bg-brand-secondary/80 backdrop-blur-lg' : 'bg-transparent'
        }`}
      >
        <nav
          className="flex items-center justify-between p-4 lg:px-8 max-w-7xl mx-auto"
          aria-label="Global"
        >
          <div className="flex lg:flex-1">
            <a href="#inicio" className="-m-1.5 p-1.5 text-2xl font-black text-brand-primary">
              BarberAI
            </a>
          </div>

          <div className="flex lg:hidden">
            <button
              type="button"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-400"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">Abrir menu</span>
              <MenuIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <div className="hidden lg:flex lg:gap-x-12">
            <a href="#inicio" className="text-sm font-semibold leading-6 text-white hover:text-brand-primary transition-colors"> Início </a>
            <a href="#sobre" className="text-sm font-semibold leading-6 text-white hover:text-brand-primary transition-colors"> Sobre </a>
            <a href="#funcoes" className="text-sm font-semibold leading-6 text-white hover:text-brand-primary transition-colors"> Funções </a>
            <a href="#planos" className="text-sm font-semibold leading-6 text-white hover:text-brand-primary transition-colors"> Planos </a>
          </div>

          <div className="hidden lg:flex lg:flex-1 lg:justify-end items-center gap-x-4">
            <Button onClick={() => onEnter('client')} variant="secondary" className="py-2 px-4 text-sm w-auto whitespace-nowrap"> Sou Cliente </Button>
            <Button onClick={() => onEnter('barbershop')} variant="primary" className="py-2 px-4 text-sm w-auto whitespace-nowrap"> Teste Grátis </Button>
          </div>
        </nav>

        {mobileMenuOpen && (
          <div className="lg:hidden" role="dialog" aria-modal="true">
            <div className="fixed inset-0 z-50" />
            <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-brand-dark px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-white/10">
              <div className="flex items-center justify-between">
                <a href="#inicio" className="-m-1.5 p-1.5 text-2xl font-black text-brand-primary">BarberAI</a>
                <button
                  type="button"
                  className="-m-2.5 rounded-md p-2.5 text-gray-400"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sr-only">Fechar menu</span>
                  <XCircleIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-6 flow-root">
                <div className="-my-6 divide-y divide-gray-500/25">
                  <div className="space-y-2 py-6">
                    <a href="#inicio" onClick={() => setMobileMenuOpen(false)} className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-white hover:bg-brand-secondary"> Início </a>
                    <a href="#sobre" onClick={() => setMobileMenuOpen(false)} className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-white hover:bg-brand-secondary"> Sobre </a>
                    <a href="#funcoes" onClick={() => setMobileMenuOpen(false)} className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-white hover:bg-brand-secondary"> Funções </a>
                    <a href="#planos" onClick={() => setMobileMenuOpen(false)} className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-white hover:bg-brand-secondary"> Planos </a>
                  </div>
                  <div className="py-6 space-y-4">
                    <Button onClick={() => onEnter('client')} variant="secondary" className="w-full"> Sou Cliente </Button>
                    <Button onClick={() => onEnter('barbershop')} variant="primary" className="w-full"> Teste Grátis </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>


      <main className="isolate">
        <section id="inicio" className="relative pt-14">
            <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
                <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#FBBF24] to-[#3B82F6] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)'}}></div>
            </div>
            <div className="py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-3xl text-center">
                        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">Transforme Sua Barbearia com a Gestão que Você Merece</h1>
                        <p className="mt-6 text-lg leading-8 text-gray-300">Menos administração, mais arte. O BarberAI automatiza seus agendamentos, pagamentos e marketing para que você possa focar no que faz de melhor: cortes incríveis.</p>
                        <div className="mt-10 flex items-center justify-center gap-x-6">
                            <Button onClick={() => onEnter('barbershop')} variant="primary" className="py-3 px-8 text-base w-auto shadow-lg shadow-amber-500/20 transform hover:scale-105 transition-transform">
                                Teste Grátis por 30 Dias
                            </Button>
                        </div>
                    </div>
                     <div className="mt-16 flow-root sm:mt-24">
                        <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                            <img src="https://i.ibb.co/TBq81Jv/Gemini-Generated-Image-j8j3xej8j3xej8j3.png" alt="Painel de controle do BarberAI em um laptop dentro de uma barbearia moderna" width={2432} height={1442} className="rounded-md shadow-2xl ring-1 ring-white/10" />
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section id="sobre" className="py-24 sm:py-32 bg-brand-secondary">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:items-center">
                    <div>
                        <h2 className="text-base font-semibold leading-7 text-brand-primary">Nossa Missão</h2>
                        <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Feito por barbeiros, para barbeiros</p>
                        <p className="mt-6 text-lg leading-8 text-gray-300">Nascemos da correria e da paixão do dia a dia da barbearia. Cansados de agendamentos em papel e mensagens perdidas, criamos uma ferramenta que realmente entende suas necessidades. Com o BarberAI, você ganha um assistente digital que cuida da parte chata para você poder focar na sua arte.</p>
                    </div>
                    <div className="flex justify-center">
                        <img src="https://i.ibb.co/v4PTHhk/Gemini-Generated-Image-kxvv7skxvv7skxvv.png" alt="Barbeiro sorrindo enquanto atende um cliente" className="w-full max-w-sm sm:max-w-md md:max-w-lg rounded-xl shadow-xl ring-1 ring-white/10" />
                    </div>
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
                    <p className="mt-6 text-lg leading-8 text-gray-300">Comece de graça e cresça conosco. Escolha o plano perfeito para o seu momento.</p>
                </div>
                <div className="flex justify-center my-10">
                    <div className="bg-brand-dark rounded-lg p-1 flex">
                        <button onClick={() => setBillingCycle('monthly')} className={`px-6 py-2 rounded-md font-semibold transition text-sm ${billingCycle === 'monthly' ? 'bg-brand-primary text-brand-dark' : 'text-gray-300'}`}>Mensal</button>
                        <button
                            onClick={() => setBillingCycle('annual')}
                            className={`relative px-6 py-2 rounded-md font-semibold transition text-sm ${billingCycle === 'annual' ? 'bg-brand-primary text-brand-dark' : 'text-gray-300'}`}
                        >
                            Anual
                            <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                                30% OFF
                            </span>
                        </button>
                    </div>
                </div>

                <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
                    {plans.map((plan) => (
                        <div key={plan.id} className={`rounded-3xl p-8 ring-1 xl:p-10 flex flex-col relative ${plan.mostPopular ? 'ring-2 ring-brand-primary bg-gray-800/50' : 'ring-gray-700'}`}>
                            {plan.mostPopular && <div className="absolute top-0 -translate-y-1/2 self-center bg-brand-primary text-brand-dark font-bold text-sm px-4 py-1 rounded-full">MAIS POPULAR</div>}
                            <h3 className="text-lg font-semibold leading-8 text-white">{plan.name}</h3>
                            <p className="mt-4 text-sm leading-6 text-gray-300">{plan.id === 'basic' ? 'Para quem está começando.' : plan.id === 'pro' ? 'Para negócios em crescimento.' : 'Para barbearias estabelecidas.'}</p>
                            <p className="mt-6 flex items-baseline gap-x-1">
                                <span className="text-4xl font-bold tracking-tight text-white">R${plan.price[billingCycle].toFixed(2).replace('.',',')}</span>
                                <span className="text-sm font-semibold leading-6 text-gray-300">/mês</span>
                            </p>
                            <Button onClick={() => onEnter('barbershop')} variant={plan.mostPopular ? 'primary' : 'secondary'} className="mt-6 w-full">Comece agora</Button>
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

      <footer className="bg-brand-dark border-t border-gray-800">
        <div className="mx-auto max-w-7xl overflow-hidden px-6 py-12 lg:px-8">
            <p className="text-center text-xs leading-5 text-gray-500">&copy; {new Date().getFullYear()} BarberAI. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingScreen;
