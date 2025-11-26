import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { UserCircle, ArrowRight, ShieldCheck, Users, KeyRound } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (user: User, tournamentCode?: string) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('guest');
  const [tournamentCode, setTournamentCode] = useState('');
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Por favor ingresa un nombre.');
      return;
    }

    if (role === 'guest' && !tournamentCode.trim()) {
      setError('Debes ingresar el Código del Torneo para entrar.');
      return;
    }

    onLogin({
      username: username.trim(),
      id: crypto.randomUUID(),
      role: role
    }, tournamentCode.trim().toUpperCase());
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
        
        {/* Header Icon */}
        <div className="flex justify-center mb-6">
          <div className={`p-4 rounded-full shadow-lg transition-colors duration-300 ${role === 'admin' ? 'bg-purple-600' : 'bg-indigo-600'}`}>
            {role === 'admin' ? (
              <ShieldCheck className="w-12 h-12 text-white" />
            ) : (
              <UserCircle className="w-12 h-12 text-white" />
            )}
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center text-white mb-2">Juez de Videos IA</h1>
        <p className="text-gray-400 text-center mb-8">
          {role === 'admin' 
            ? 'Crea un torneo y comparte el código' 
            : 'Ingresa el código para votar'}
        </p>

        {/* Role Toggles */}
        <div className="flex p-1 bg-gray-700 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => setRole('guest')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
              role === 'guest' 
                ? 'bg-indigo-600 text-white shadow' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Soy Invitado
          </button>
          <button
            type="button"
            onClick={() => setRole('admin')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
              role === 'admin' 
                ? 'bg-purple-600 text-white shadow' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Soy Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
              {role === 'admin' ? 'Tu Nombre (Organizador)' : 'Tu Nombre (Juez)'}
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              placeholder={role === 'admin' ? "Ej. Admin Supremo" : "Ej. Juez Implacable"}
              autoFocus
            />
          </div>

          {role === 'guest' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label htmlFor="code" className="block text-sm font-medium text-gray-300 mb-1">
                Código del Torneo
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  id="code"
                  value={tournamentCode}
                  onChange={(e) => setTournamentCode(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition uppercase tracking-widest font-mono"
                  placeholder="Ej. X9Y2Z"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Pídele el código al administrador.</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-200 text-sm flex items-start gap-2">
              <span>{error}</span>
            </div>
          )}
          
          <button
            type="submit"
            className={`w-full flex items-center justify-center gap-2 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-[1.02] ${
              role === 'admin' 
                ? 'bg-purple-600 hover:bg-purple-700' 
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {role === 'admin' ? 'Crear Torneo' : 'Unirse al Torneo'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;