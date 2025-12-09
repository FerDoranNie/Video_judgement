
import React, { useState, useEffect } from 'react';
import { User, VideoItem, VoteRecord, Tournament, VotingMethod, RankingQuestion, AppTheme } from './types';
import AuthScreen from './components/AuthScreen';
import UploadScreen from './components/UploadScreen';
import VotingArena from './components/VotingArena';
import ResultsScreen from './components/ResultsScreen';
import TournamentLobby from './components/TournamentLobby';
import FirebaseSetupScreen from './components/FirebaseSetupScreen'; 
import { api } from './services/api';
import { isConfigured, saveConfig } from './firebaseConfig'; 
import { Palette } from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [sessionVideos, setSessionVideos] = useState<VideoItem[]>([]);
  const [showLobby, setShowLobby] = useState(false);
  const [votingComplete, setVotingComplete] = useState(false);
  const [winner, setWinner] = useState<VideoItem | null>(null);
  const [voteHistory, setVoteHistory] = useState<VoteRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Procesando...');
  
  // Theme State: Default to 'orange'
  const [theme, setTheme] = useState<AppTheme>('orange');

  // Protección contra cierre accidental del navegador
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isVotingOrResults = tournament && (!showLobby || votingComplete);
      if (isVotingOrResults) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [tournament, showLobby, votingComplete]);

  if (!isConfigured) return <FirebaseSetupScreen onSave={saveConfig} />;

  const shuffleVideos = (array: VideoItem[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const handleLogin = async (userData: User, tournamentCode?: string) => {
    if (userData.role === 'admin') {
      setUser(userData);
      setTournament(null); 
      return;
    }
    if (!tournamentCode) { alert("Error: Código de torneo requerido."); return; }
    
    setLoading(true);
    setStatusMessage("Verificando acceso...");
    try {
      const t = await api.getTournament(tournamentCode);
      if (t.isActive === false) {
           alert("Este evento ha sido finalizado por el organizador.");
           setLoading(false); return;
      }
      if (userData.role === 'director') {
          const allowedIds = t.validDirectorIds || [];
          if (!userData.employeeId || !allowedIds.includes(userData.employeeId)) {
              alert("ACCESO DENEGADO: Número de empleado no autorizado como Director.");
              setLoading(false); return;
          }
      }
      const hasVoted = await api.checkIfUserVoted(tournamentCode, userData.username, userData.employeeId);
      if (hasVoted) {
           alert(`Acceso denegado: El usuario "${userData.username}" o el número de empleado "${userData.employeeId || 'N/A'}" ya registraron su votación.`);
           setLoading(false); return;
      }
      setTournament(t);
      setUser(userData);
      setSessionVideos(shuffleVideos(t.videos));
    } catch (e) {
      alert("No se encontró el torneo o hubo un error de conexión.");
      console.error(e);
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  const handleAdminPublish = async (name: string, videos: VideoItem[], directorIds: string[], votingMethod: VotingMethod, rankingScale?: number, questions?: RankingQuestion[]): Promise<void> => {
    try {
      const newTournament = await api.createTournament(
        name, 
        user?.id || 'admin', 
        videos, 
        user?.username,
        directorIds,
        votingMethod,
        rankingScale,
        questions
      );
      setTournament(newTournament);
      setShowLobby(true);
      const url = new URL(window.location.href);
      url.searchParams.set('code', newTournament.id);
      window.history.pushState({}, '', url);
    } catch (e: any) {
      alert(`Ups! Error al crear torneo:\n\n${e.message || "Error desconocido"}`);
      console.error(e);
      throw e; 
    }
  };

  const handleStartVotingFromLobby = () => {
    if (tournament) {
      setSessionVideos(shuffleVideos(tournament.videos));
      setShowLobby(false);
    }
  };

  const handleVotingComplete = (winners: VideoItem[], history: VoteRecord[]) => {
    setWinner(winners[0] || null); 
    setVoteHistory(history);
    setVotingComplete(true);
  };

  const handleResetApp = () => window.location.reload();

  const ThemeToggle = () => (
    <button 
      onClick={() => setTheme(prev => prev === 'orange' ? 'blue' : 'orange')}
      className="fixed bottom-4 right-4 z-50 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur border border-white/10 transition-all shadow-xl"
      title="Cambiar Tema"
    >
      <Palette size={20} className={theme === 'orange' ? 'text-orange-400' : 'text-indigo-400'} />
    </button>
  );

  if (loading) return (
      <div className={`flex items-center justify-center min-h-screen text-white ${theme === 'orange' ? 'bg-stone-950' : 'bg-gray-900'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${theme === 'orange' ? 'border-orange-500' : 'border-indigo-500'}`}></div>
          <p className="text-gray-400 animate-pulse text-lg">{statusMessage}</p>
        </div>
      </div>
  );

  if (!user) return (
    <>
      <AuthScreen onLogin={handleLogin} theme={theme} />
      <ThemeToggle />
    </>
  );
  
  if (user.role === 'admin' && !tournament) return (
    <>
      <UploadScreen onPublish={handleAdminPublish} theme={theme} />
      <ThemeToggle />
    </>
  );

  if (user.role === 'admin' && showLobby && tournament) return (
    <>
      <TournamentLobby tournament={tournament} onStartVoting={handleStartVotingFromLobby} theme={theme} />
      <ThemeToggle />
    </>
  );

  if (votingComplete && tournament) {
    return (
      <>
        <ResultsScreen 
          winner={winner} 
          history={voteHistory} 
          allVideos={sessionVideos} 
          tournamentCode={tournament.id}
          hostName={tournament.hostName || "Admin"}
          isHost={user.role === 'admin'} 
          isActive={tournament.isActive !== false}
          votingMethod={tournament.votingMethod || 'like'} 
          rankingScale={tournament.rankingScale}
          rankingQuestions={tournament.rankingQuestions}
          theme={theme}
        />
        <ThemeToggle />
      </>
    );
  }

  if (sessionVideos.length > 0 && tournament) {
    return (
      <>
        <VotingArena 
          videos={sessionVideos} 
          userId={user.id}
          username={user.username}
          userRole={user.role}
          employeeId={user.employeeId}
          tournamentCode={tournament.id}
          votingMethod={tournament.votingMethod || 'like'}
          rankingScale={tournament.rankingScale}
          rankingQuestions={tournament.rankingQuestions}
          onComplete={handleVotingComplete} 
          onExit={handleResetApp}
          theme={theme}
        />
        <ThemeToggle />
      </>
    );
  }

  return <div className="text-white p-10">Cargando aplicación...</div>;
}

export default App;
