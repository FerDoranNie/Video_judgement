
import React, { useState, useEffect } from 'react';
import { User, UserRole, AppTheme } from '../types';
import { UserCircle, ArrowRight, ShieldCheck, Briefcase, BadgeCheck, Users, KeyRound, Lock, User as UserIcon } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (user: User, tournamentCode?: string) => void;
  theme: AppTheme;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, theme }) => {
  const [username, setUsername] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [role, setRole] = useState<UserRole>('prueba');
  const [tournamentCode, setTournamentCode] = useState('');
  const [error, setError] = useState<string>('');
  const [isCodeLocked, setIsCodeLocked] = useState(false);

  // Auto-detect code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (codeParam) {
      setTournamentCode(codeParam);
      setIsCodeLocked(true);
      setRole('prueba'); // Default inicial
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Por favor ingresa tu nombre.');
      return;
    }

    // Validación de número de empleado
    if (role !== 'prueba' && !employeeId.trim()) {
      setError('El número de empleado es obligatorio para este rol.');
      return;
    }

    if (role !== 'admin' && !tournamentCode.trim()) {
      setError('Debes ingresar el Código del Torneo para entrar.');
      return;
    }

    onLogin({
      username: username.trim(),
      id: crypto.randomUUID(),
      role: role,
      employeeId: role !== 'prueba' ? employeeId.trim() : undefined
    }, tournamentCode.trim().toUpperCase());
  };

  const isOrange = theme === 'orange';
  const bgGradient = isOrange ? 'from-stone-900 to-black' : 'from-gray-900 to-black';
  const cardBg = isOrange ? 'bg-stone-800' : 'bg-gray-800';
  const cardBorder = isOrange ? 'border-stone-700' : 'border-gray-700';

  const rolesConfig = [
    { id: 'prueba', label: 'Prueba', icon: UserIcon, color: 'bg-gray-600' },
    { id: 'colaborador', label: 'Colaborador', icon: Users, color: isOrange ? 'bg-blue-600' : 'bg-blue-600' },
    { id: 'director', label: 'Director', icon: BadgeCheck, color: isOrange ? 'bg-orange-600' : 'bg-indigo-600' },
    { id: 'admin', label: 'Admin', icon: ShieldCheck, color: 'bg-purple-600' },
  ];

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen bg-gradient-to-br ${bgGradient} p-4`}>
      <div className={`w-full max-w-lg ${cardBg} rounded-2xl shadow-2xl p-8 border ${cardBorder}`}>
        
        <div className="flex justify-center mb-6">
          <div className={`p-4 rounded-full shadow-lg transition-colors duration-300 ${rolesConfig.find(r => r.id === role)?.color || 'bg-gray-600'}`}>
             {role === 'admin' ? <ShieldCheck className="w-12 h-12 text-white" /> : 
              role === 'director' ? <BadgeCheck className="w-12 h-12 text-white" /> :
              role === 'colaborador' ? <Users className="w-12 h-12 text-white" /> :
              <UserCircle className="w-12 h-12 text-white" />}
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center text-white mb-2">Juez de Videos</h1>
        <p className="text-gray-400 text-center mb-6">
          Selecciona tu perfil para ingresar
        </p>

        {/* Role Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {rolesConfig.map((r) => {
            // Ocultar admin si el código está bloqueado (usuario invitado por link)
            if (isCodeLocked && r.id === 'admin') return null;
            
            const Icon = r.icon;
            const isSelected = role === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id as UserRole)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all border ${
                  isSelected 
                    ? `${r.color} border-transparent text-white shadow-lg scale-105` 
                    : `${isOrange ? 'bg-stone-700 border-stone-600' : 'bg-gray-700 border-gray-600'} text-gray-400 hover:text-white`
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-bold">{r.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
              Nombre Completo
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full px-4 py-3 ${isOrange ? 'bg-stone-700 border-stone-600 focus:ring-orange-500' : 'bg-gray-700 border-gray-600 focus:ring-blue-500'} border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition`}
              placeholder="Tu nombre aquí"
            />
          </div>

          {/* Campo Condicional: Número de Empleado */}
          {role !== 'prueba' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
               <label htmlFor="employeeId" className="block text-sm font-medium text-gray-300 mb-1">
                 Número de Empleado {role === 'director' && <span className={`${isOrange ? 'text-orange-400' : 'text-indigo-400'} text-xs`}>(Verificación Requerida)</span>}
               </label>
               <div className="relative">
                 <Briefcase className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                 <input
                   type="text"
                   id="employeeId"
                   value={employeeId}
                   onChange={(e) => setEmployeeId(e.target.value)}
                   className={`w-full pl-10 pr-4 py-3 ${isOrange ? 'bg-stone-700 border-stone-600 focus:ring-orange-500' : 'bg-gray-700 border-gray-600 focus:ring-blue-500'} border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition font-mono`}
                   placeholder="Ej. 12345"
                 />
               </div>
            </div>
          )}

          {role !== 'admin' && (
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
                  readOnly={isCodeLocked}
                  className={`w-full pl-10 pr-4 py-3 ${isOrange ? 'bg-stone-700 border-stone-600 focus:ring-orange-500' : 'bg-gray-700 border-gray-600 focus:ring-blue-500'} border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition uppercase tracking-widest font-mono ${isCodeLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="XXXXX"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-200 text-sm flex items-center gap-2">
               <Lock className="w-4 h-4 flex-none"/> {error}
            </div>
          )}
          
          <button
            type="submit"
            className={`w-full flex items-center justify-center gap-2 text-white font-bold py-3 px-4 rounded-lg transition-all hover:scale-[1.02] ${
              role === 'admin' ? 'bg-purple-600 hover:bg-purple-700' : 
              role === 'director' ? (isOrange ? 'bg-orange-600 hover:bg-orange-700' : 'bg-indigo-600 hover:bg-indigo-700') :
              role === 'colaborador' ? 'bg-blue-600 hover:bg-blue-700' :
              'bg-gray-600 hover:bg-gray-500'
            }`}
          >
            {role === 'admin' ? 'Crear/Administrar' : 'Entrar y Jugar'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;
