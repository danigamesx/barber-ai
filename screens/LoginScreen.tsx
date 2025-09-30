
import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../App';
import Button from '../components/Button';
import { formatPhone } from '../utils/formatters';

interface LoginScreenProps {
  initialAccountType: 'client' | 'barbershop' | null;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ initialAccountType }) => {
  const { login, signup } = useContext(AppContext);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [barbershopName, setBarbershopName] = useState('');
  const [accountType, setAccountType] = useState<'client' | 'barbershop'>(initialAccountType || 'client');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialAccountType) {
      setAccountType(initialAccountType);
    }
  }, [initialAccountType]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false); // Only set loading to false on error
    }
  };
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        setError("A senha deve ter pelo menos 6 caracteres.");
        return;
    }
     if (accountType === 'barbershop' && !barbershopName) {
        setError("O nome da barbearia é obrigatório.");
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await signup(name, email, password, accountType, phone, birthDate, barbershopName);
      // On success, the App component will handle the screen transition, and this component will unmount.
      // We don't need to call setIsLoading(false) as it would be on an unmounted component.
    } catch (err: any) {
      if (err.message && err.message.includes('security policy')) { // Catches RLS errors more broadly
        setError('RLS_ERROR'); // Define um código de erro especial para RLS
      } else {
        setError(err.message || 'Ocorreu um erro desconhecido.');
      }
      // If an error occurs, we stop the loading state to allow the user to try again.
      setIsLoading(false);
    }
  };

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="space-y-6">
      <input
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full px-4 py-3 bg-brand-secondary border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
      />
      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        className="w-full px-4 py-3 bg-brand-secondary border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
      />
      {error && <p className="text-red-500 text-sm text-center -my-2">{error}</p>}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  );
  
const insertPolicyFix = `-- 1. Limpa políticas antigas que podem causar conflito
DROP POLICY IF EXISTS "Owners can create their own barbershop." ON public.barbershops;
DROP POLICY IF EXISTS "Permite donos criarem suas barbearias" ON public.barbershops;
DROP POLICY IF EXISTS "Permitir donos autenticados criarem suas barbearias" ON public.barbershops;

-- 2. Cria a única política de INSERT necessária
-- Permite que um usuário AUTENTICADO insira uma nova barbearia
-- APENAS SE o 'owner_id' da nova barbearia for igual ao seu próprio ID.
CREATE POLICY "Donos podem criar sua própria barbearia"
ON public.barbershops
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);`;

const updatePolicyFix = `-- 1. Habilita RLS na tabela (se ainda não estiver habilitado)
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;

-- 2. Limpa políticas de UPDATE antigas para evitar conflitos
DROP POLICY IF EXISTS "Administradores podem atualizar qualquer barbearia." ON public.barbershops;
DROP POLICY IF EXISTS "Admins can update any barbershop." ON public.barbershops;
DROP POLICY IF EXISTS "Owners can update their own barbershop." ON public.barbershops;

-- 3. Cria a política de UPDATE para o SUPER ADMIN
-- Permite que o Super Admin (com ID específico) atualize QUALQUER barbearia.
CREATE POLICY "Administradores podem atualizar qualquer barbearia"
ON public.barbershops
FOR UPDATE
USING (auth.uid() = '5b6749fa-13ff-498f-b18b-8374ac069b87') -- SUBSTITUA PELO SEU ID DE SUPER ADMIN SE FOR DIFERENTE
WITH CHECK (auth.uid() = '5b6749fa-13ff-498f-b18b-8374ac069b87');

-- 4. (Opcional, mas recomendado) Permite que donos de barbearias atualizem seus próprios dados
CREATE POLICY "Donos podem atualizar sua própria barbearia"
ON public.barbershops
FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);`;


  const renderSignupForm = () => (
    <form onSubmit={handleSignup} className="space-y-6">
       <input
        type="text"
        placeholder={accountType === 'client' ? "Nome Completo" : "Nome do Proprietário"}
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full px-4 py-3 bg-brand-secondary border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
      />
       {accountType === 'barbershop' && (
           <input
            type="text"
            placeholder="Nome da Barbearia"
            value={barbershopName}
            onChange={(e) => setBarbershopName(e.target.value)}
            required
            className="w-full px-4 py-3 bg-brand-secondary border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
      )}
      <input
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full px-4 py-3 bg-brand-secondary border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
      />
      <input
        type="tel"
        placeholder="Celular (com DDD)"
        value={phone}
        onChange={(e) => setPhone(formatPhone(e.target.value))}
        required
        maxLength={15}
        className="w-full px-4 py-3 bg-brand-secondary border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
      />
      {accountType === 'client' && (
        <div>
            <label htmlFor="birthDate" className="block text-sm font-medium text-gray-400 mb-1">Data de Nascimento</label>
            <input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
                className="w-full px-4 py-3 bg-brand-secondary border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
        </div>
      )}
      <input
        type="password"
        placeholder="Senha (mín. 6 caracteres)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        className="w-full px-4 py-3 bg-brand-secondary border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
      />
      {error && error !== 'RLS_ERROR' && <p className="text-red-500 text-sm text-center -my-2">{error}</p>}
      {error === 'RLS_ERROR' && (
        <div className="bg-red-900/50 border border-red-700 p-4 rounded-lg text-sm space-y-3 text-left">
            <p className="font-bold text-lg text-red-300">Falha de Permissão (RLS)!</p>
            
            <div className="border-t border-red-800 pt-3">
                <p className="font-bold text-red-300">Causa Provável #1: Confirmação de E-mail Ativada</p>
                <p className="text-red-400 mt-1">
                    Se a opção "Confirm email" está LIGADA no Supabase, o usuário não é logado automaticamente após o cadastro. Isso causa uma falha de permissão ao tentar criar a barbearia.
                </p>
                <p className="font-bold text-amber-300 mt-2">SOLUÇÃO PRINCIPAL:</p>
                <ol className="list-decimal list-inside text-amber-400 space-y-1">
                    <li>No painel do Supabase, vá em <strong>Authentication &rarr; Providers</strong>.</li>
                    <li>Encontre e clique no provedor <strong>Email</strong>.</li>
                    <li><strong>DESLIGUE</strong> a opção <strong>"Confirm email"</strong>.</li>
                    <li>Salve e tente cadastrar novamente.</li>
                </ol>
            </div>

            <div className="border-t border-red-800 pt-3">
                <p className="font-bold text-red-300">Causa Provável #2: Política de Segurança (RLS) para INSERT</p>
                <p className="text-red-400 mt-1">
                    A política para inserir (`INSERT`) uma nova barbearia pode estar incorreta ou ausente.
                </p>
                <p className="font-bold text-amber-300 mt-2">VERIFICAÇÃO:</p>
                <ol className="list-decimal list-inside text-amber-400 space-y-1">
                    <li>Vá em <strong>Database &rarr; Policies</strong> e selecione a tabela `barbershops`.</li>
                    <li><strong>APAGUE TODAS</strong> as políticas existentes para a operação <strong>`INSERT`</strong>.</li>
                    <li>Vá para o <strong>SQL Editor</strong>, cole o comando abaixo e clique em "RUN":</li>
                </ol>
                <pre className="bg-gray-900 text-green-300 p-2 rounded-md text-xs overflow-x-auto mt-2">
                    <code>
                        {insertPolicyFix}
                    </code>
                </pre>
            </div>
            
            <div className="border-t border-red-800 pt-3">
                <p className="font-bold text-red-300">Causa Provável #3: Política de Segurança (RLS) para UPDATE</p>
                <p className="text-red-400 mt-1">
                    Se você é o <strong>administrador</strong> e não consegue <strong>salvar as alterações de um plano</strong> (como a data de expiração), o problema é a falta de uma política de `UPDATE`.
                </p>
                <p className="font-bold text-amber-300 mt-2">SOLUÇÃO (ADMIN):</p>
                 <ol className="list-decimal list-inside text-amber-400 space-y-1">
                    <li>No Supabase, vá para o <strong>SQL Editor</strong>.</li>
                    <li>Cole o comando SQL abaixo e clique em "RUN". Isso permitirá que o super admin e os donos das barbearias atualizem os dados.</li>
                </ol>
                <pre className="bg-gray-900 text-green-300 p-2 rounded-md text-xs overflow-x-auto mt-2">
                    <code>
                        {updatePolicyFix}
                    </code>
                </pre>
            </div>
        </div>
      )}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Criando...' : 'Criar Conta'}
      </Button>
    </form>
  );
  
  const switchMode = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setError(null);
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setBirthDate('');
    setBarbershopName('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-brand-dark">
      <div className="w-full max-w-sm mx-auto">
        <div className="grid grid-cols-2 gap-2 mb-8 p-1 bg-brand-dark rounded-lg ring-1 ring-brand-secondary">
          <button onClick={() => setAccountType('client')} className={`py-3 rounded-md font-semibold transition ${accountType === 'client' ? 'bg-brand-primary text-brand-dark' : 'text-gray-300'}`}>
              Sou Cliente
          </button>
          <button onClick={() => setAccountType('barbershop')} className={`py-3 rounded-md font-semibold transition ${accountType === 'barbershop' ? 'bg-brand-primary text-brand-dark' : 'text-gray-300'}`}>
              Sou Barbeiro
          </button>
        </div>

        <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-brand-primary mb-2">BarberAI</h1>
            <p className="text-gray-400">
                {accountType === 'client' 
                    ? 'Seu Estilo, Sua Agenda.'
                    : 'Gestão Inteligente para sua Barbearia.'}
            </p>
        </div>
        
        <div className="bg-brand-secondary rounded-lg p-2 flex mb-6">
            <button onClick={() => switchMode('login')} className={`w-1/2 py-2 rounded-md font-semibold transition ${mode === 'login' ? 'bg-brand-primary text-brand-dark' : 'text-gray-300'}`}>
                Entrar
            </button>
            <button onClick={() => switchMode('signup')} className={`w-1/2 py-2 rounded-md font-semibold transition ${mode === 'signup' ? 'bg-brand-primary text-brand-dark' : 'text-gray-300'}`}>
                Cadastrar
            </button>
        </div>

        {mode === 'login' ? renderLoginForm() : renderSignupForm()}

        <p className="text-xs text-gray-500 mt-8 text-center">
            Ao continuar, você concorda com os Termos de Serviço e a Política de Privacidade do BarberAI.
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
