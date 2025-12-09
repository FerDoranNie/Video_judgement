import React, { useEffect, useState, useRef } from 'react';
import { VideoItem, VoteRecord, UserRole, VotingMethod, RankingQuestion } from '../types';
import { Download, BarChart2, ScatterChart as ScatterIcon, Loader2, Info } from 'lucide-react';
import { api } from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine
} from 'recharts';

interface AnalysisViewProps {
  currentUserVotes: VoteRecord[];
  videos: VideoItem[];
  tournamentCode: string;
  userRole: UserRole;
  votingMethod: VotingMethod;
  rankingQuestions?: RankingQuestion[];
  rankingScale?: number;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({
  currentUserVotes,
  videos,
  tournamentCode,
  userRole,
  votingMethod,
  rankingQuestions = [],
  rankingScale = 10
}) => {
  const [globalVotes, setGlobalVotes] = useState<VoteRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const isPrivileged = userRole === 'admin' || userRole === 'director';

  useEffect(() => {
    if (isPrivileged) {
      setLoading(true);
      api.getGlobalResults(tournamentCode)
        .then(res => setGlobalVotes(res.votes))
        .catch(err => console.error("Error cargando votos globales", err))
        .finally(() => setLoading(false));
    }
  }, [tournamentCode, isPrivileged]);

  const handleDownload = async () => {
    if (!chartRef.current) return;
    try {
      // @ts-ignore
      const canvas = await window.html2canvas(chartRef.current, {
        backgroundColor: '#111827', // bg-gray-900
        scale: 2,
        ignoreElements: (element) => element.classList.contains('no-export')
      });
      const link = document.createElement('a');
      link.download = `Analisis_${tournamentCode}_${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (e) {
      console.error("Error exportando imagen", e);
      alert("No se pudo generar la imagen.");
    }
  };

  // --- TOOLTIPS PERSONALIZADOS (DARK MODE) ---
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 p-3 rounded shadow-xl text-xs z-50">
          <p className="font-bold text-gray-200 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: <span className="font-mono font-bold">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-600 p-3 rounded shadow-xl text-xs z-50">
          <p className="font-bold text-white mb-2 text-sm border-b border-gray-600 pb-1">{data.name}</p>
          <p className="text-indigo-300">
             <span className="font-bold">Eje X (P2):</span> {data.x.toFixed(1)}
          </p>
          <p className="text-indigo-300">
             <span className="font-bold">Eje Y (P3):</span> {data.y.toFixed(1)}
          </p>
          <p className="text-yellow-300 mt-1">
             <span className="font-bold">Tamaño (P1):</span> {data.z.toFixed(1)}
          </p>
        </div>
      );
    }
    return null;
  };

  // --- RENDERIZADO DE GRÁFICOS ---

  // 1. LIKE METHOD (Bar Chart)
  const renderLikeCharts = () => {
    let data = [];

    if (!isPrivileged) {
      // COLABORADOR: Conteo de sus propias elecciones
      const likes = currentUserVotes.filter(v => v.liked).length;
      const dislikes = currentUserVotes.length - likes;
      
      data = [
        { name: 'Mis Votos', likes, dislikes }
      ];
    } else {
      // DIRECTOR/ADMIN: Comparativa
      const collabVotes = globalVotes.filter(v => v.userRole === 'colaborador' || v.userRole === 'prueba');
      const directorVotes = globalVotes.filter(v => v.userRole === 'director' || v.userRole === 'admin');

      const collabLikes = collabVotes.filter(v => v.liked).length;
      const collabDislikes = collabVotes.length - collabLikes;
      
      const dirLikes = directorVotes.filter(v => v.liked).length;
      const dirDislikes = directorVotes.length - dirLikes;

      data = [
        { name: 'Colaboradores', likes: collabLikes, dislikes: collabDislikes },
        { name: 'Directores', likes: dirLikes, dislikes: dirDislikes }
      ];
    }

    return (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
            <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
            <Tooltip content={<CustomTooltip />} cursor={{fill: '#1f2937'}} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Bar dataKey="likes" name="Me Gusta" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="dislikes" name="No Me Gusta" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // 2. RANKING METHOD (Scatter Plot with Bubbles)
  const renderScatterSection = (dataPoints: any[], title: string, color: string) => {
     // dataPoints format: { x, y, z, name }
     // X = Q2, Y = Q3, Z = Q1 (Size)

     return (
       <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 h-[400px] flex flex-col">
         <h4 className={`text-center font-bold mb-2 flex items-center justify-center gap-2 ${color}`}>{title}</h4>
         <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="P2" 
                  domain={[0, rankingScale]} 
                  stroke="#9CA3AF" 
                  tick={{ fill: '#9CA3AF' }}
                  label={{ value: 'P2 (Eje X)', position: 'insideBottom', offset: -10, fill: '#6B7280', fontSize: 12 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="P3" 
                  domain={[0, rankingScale]} 
                  stroke="#9CA3AF" 
                  tick={{ fill: '#9CA3AF' }}
                  label={{ value: 'P3 (Eje Y)', angle: -90, position: 'insideLeft', fill: '#6B7280', fontSize: 12 }}
                />
                <ZAxis type="number" dataKey="z" range={[60, 500]} name="P1 (Tamaño)" />
                <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name={title} data={dataPoints} fill={color === 'text-blue-400' ? '#60A5FA' : '#818CF8'} shape="circle" />
                
                {/* Líneas medias para referencia visual */}
                <ReferenceLine x={rankingScale/2} stroke="#4B5563" strokeDasharray="3 3" />
                <ReferenceLine y={rankingScale/2} stroke="#4B5563" strokeDasharray="3 3" />
              </ScatterChart>
            </ResponsiveContainer>
         </div>
         <div className="mt-2 text-[10px] text-gray-500 text-center grid grid-cols-1 gap-1">
             <div>Eje X = P2: {rankingQuestions[1]?.text.substring(0, 30)}...</div>
             <div>Eje Y = P3: {rankingQuestions[2]?.text.substring(0, 30)}...</div>
             <div>Tamaño = P1: {rankingQuestions[0]?.text.substring(0, 30)}...</div>
         </div>
       </div>
     );
  };

  const renderRankingCharts = () => {
    if (rankingQuestions.length < 3) {
      return (
        <div className="p-8 text-center bg-yellow-900/20 border border-yellow-700/50 rounded-xl">
           <Info className="w-10 h-10 text-yellow-500 mx-auto mb-2"/>
           <p className="text-yellow-200">Se necesitan 3 preguntas para generar el gráfico de dispersión 3D.</p>
        </div>
      );
    }

    const q1Id = rankingQuestions[0].id;
    const q2Id = rankingQuestions[1].id;
    const q3Id = rankingQuestions[2].id;

    if (!isPrivileged) {
      // COLABORADOR: Puntos individuales
      const dataPoints = currentUserVotes.map(v => ({
         x: v.rankingScores?.[q2Id] || 0,
         y: v.rankingScores?.[q3Id] || 0,
         z: v.rankingScores?.[q1Id] || 1,
         name: videos.find(vid => vid.id === v.videoId)?.title || 'Video'
      }));

      return renderScatterSection(dataPoints, "Mis Calificaciones", "text-blue-400");

    } else {
      // ADMIN/DIRECTOR: Promedios
      const calculatePoints = (targetRole: 'collab' | 'director') => {
        const stats: Record<string, { q1: number, q2: number, q3: number, count: number }> = {};
        
        videos.forEach(v => stats[v.id] = { q1:0, q2:0, q3:0, count:0 });

        globalVotes.forEach(v => {
          const isDir = v.userRole === 'director' || v.userRole === 'admin';
          if ((targetRole === 'director' && isDir) || (targetRole === 'collab' && !isDir)) {
             if (v.rankingScores && stats[v.videoId]) {
                stats[v.videoId].q1 += v.rankingScores[q1Id] || 0;
                stats[v.videoId].q2 += v.rankingScores[q2Id] || 0;
                stats[v.videoId].q3 += v.rankingScores[q3Id] || 0;
                stats[v.videoId].count++;
             }
          }
        });

        return videos.map(v => {
           const s = stats[v.id];
           if (s.count === 0) return null;
           return {
             x: s.q2 / s.count,
             y: s.q3 / s.count,
             z: s.q1 / s.count,
             name: v.title
           };
        }).filter(Boolean);
      };

      const collabPoints = calculatePoints('collab');
      const dirPoints = calculatePoints('director');

      return (
        <div className="grid md:grid-cols-2 gap-6 w-full">
           {renderScatterSection(collabPoints, "Colaboradores (Promedio)", "text-blue-400")}
           {renderScatterSection(dirPoints, "Directores (Promedio)", "text-indigo-400")}
        </div>
      );
    }
  };

  return (
    <div className="bg-gray-900 p-6 rounded-2xl w-full max-w-6xl mx-auto my-8 border border-gray-700 shadow-2xl" ref={chartRef}>
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-700">
         <div>
           <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <ScatterIcon className="text-indigo-400" /> Análisis Visual
           </h2>
           <p className="text-gray-400 text-sm">
             {isPrivileged ? "Datos globales en tiempo real" : "Resumen de tu sesión"}
           </p>
         </div>
         
         {userRole === 'admin' && (
           <button 
             onClick={handleDownload}
             className="no-export bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all"
           >
             <Download size={16}/> Descargar Gráficos
           </button>
         )}
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-gray-400">
           <Loader2 className="animate-spin w-8 h-8 mr-2"/> Cargando datos...
        </div>
      ) : (
        <div className="animate-in fade-in duration-500 w-full">
          {votingMethod === 'like' ? renderLikeCharts() : renderRankingCharts()}
        </div>
      )}
    </div>
  );
};

export default AnalysisView;