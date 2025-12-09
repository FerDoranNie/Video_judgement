
import React, { useState } from 'react';
import { VideoItem, VotingMethod, RankingQuestion, AppTheme } from '../types';
import { Link, Plus, Trash2, Share2, Loader2, UploadCloud, FileVideo, Settings, Activity, CheckCircle, XCircle, Database, BadgeCheck, ListChecks, ThumbsUp, X, FileText, FileType, PlayCircle, Paperclip, MonitorPlay, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import { clearConfig, db } from '../firebaseConfig';

interface UploadScreenProps {
  onPublish: (name: string, videos: VideoItem[], directorIds: string[], votingMethod: VotingMethod, rankingScale?: number, questions?: RankingQuestion[]) => Promise<void>;
  theme: AppTheme;
}

const UploadScreen: React.FC<UploadScreenProps> = ({ onPublish, theme }) => {
  // Configuración General
  const [tournamentName, setTournamentName] = useState('');
  const [directorListInput, setDirectorListInput] = useState('');

  // Configuración Votación
  const [votingMethod, setVotingMethod] = useState<VotingMethod>('like');
  const [rankingQuestions, setRankingQuestions] = useState<RankingQuestion[]>([]);
  const [rankingScale, setRankingScale] = useState(10); 
  const [newQuestionText, setNewQuestionText] = useState('');

  // Gestión de Contenido
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Estado Global
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  // Diagnóstico
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const projectId = db?.app?.options?.projectId || "desconocido";
  const authDomain = db?.app?.options?.authDomain || "desconocido";
  
  const isOrange = theme === 'orange';
  const bgBase = isOrange ? 'bg-stone-900' : 'bg-gray-900';
  const cardBg = isOrange ? 'bg-stone-800' : 'bg-gray-800';
  const cardBorder = isOrange ? 'border-stone-700' : 'border-gray-700';
  const accentColor = isOrange ? 'text-orange-400' : 'text-indigo-400';
  const primaryButton = isOrange ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500';

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMsg("Probando lectura/escritura...");
    const result = await api.testConnection();
    setTestStatus(result.success ? 'success' : 'error');
    setTestMsg(result.message);
    if (!result.success) setShowDiagnostics(true);
  };

  // --- LOGICA VIDEOS ---

  const parseLink = (inputUrl: string): { url: string, type: 'drive' | 'youtube' | 'direct' } => {
    let url = inputUrl.trim();
    const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && (url.includes('drive.google.com') || url.includes('googleusercontent'))) {
      const id = driveMatch[1];
      return { url: `https://drive.google.com/uc?export=download&id=${id}`, type: 'drive' };
    }
    return { url, type: 'direct' };
  };

  const handleAddLink = () => {
    if (!urlInput.trim()) return;
    const lines = urlInput.split(/[\n\s,]+/);
    const newVideos: VideoItem[] = [];
    lines.forEach(line => {
      if (!line || line.trim().length < 5) return;
      const { url, type } = parseLink(line);
      newVideos.push({
        id: crypto.randomUUID(),
        title: `Video Enlazado ${videos.length + newVideos.length + 1}`,
        url: url,
        thumbnail: '',
        driveId: type === 'drive' ? 'drive-linked' : undefined
      });
    });
    if (newVideos.length > 0) {
      setVideos(prev => [...prev, ...newVideos]);
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      // Procesar inmediatamente la subida o encolar
      setUploadQueue(prev => [...prev, ...newFiles]);
    }
  };

  const processUploads = async () => {
    if (uploadQueue.length === 0) return;
    setUploading(true);
    setUploadProgress(0);

    const uploadedVideos: VideoItem[] = [];
    const totalFiles = uploadQueue.length;

    try {
      for (let i = 0; i < totalFiles; i++) {
        const file = uploadQueue[i];
        const downloadUrl = await api.uploadVideoFile(file, (pct) => {
          const totalProgress = ((i * 100) + pct) / totalFiles;
          setUploadProgress(totalProgress);
        });

        uploadedVideos.push({
          id: crypto.randomUUID(),
          title: file.name.replace(/\.[^/.]+$/, ""),
          url: downloadUrl,
          thumbnail: ''
        });
      }

      setVideos(prev => [...prev, ...uploadedVideos]);
      setUploadQueue([]);
      setUploading(false);
    } catch (error) {
      console.error(error);
      alert("Error al subir archivos.");
      setUploading(false);
    }
  };

  // --- LOGICA SCRIPTS ---
  const handleScriptSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files: File[] = Array.from(e.target.files);
      let matchedCount = 0;
      const updatedVideos = [...videos];

      for (const file of files) {
        if (file.type === "text/plain" || file.name.endsWith(".txt")) {
          const text = await file.text();
          const scriptName = file.name.replace(/\.[^/.]+$/, "").trim();
          const videoIndex = updatedVideos.findIndex(v => v.title.trim() === scriptName);
          if (videoIndex !== -1) {
             updatedVideos[videoIndex].scriptText = text;
             matchedCount++;
          }
        }
      }
      setVideos(updatedVideos);
      alert(matchedCount > 0 
        ? `Se asignaron ${matchedCount} guiones correctamente.` 
        : "No se encontraron coincidencias de nombre. Asegúrate que el .txt se llame igual que el video.");
    }
  };

  // --- LOGICA PREGUNTAS ---
  const handleAddQuestion = () => {
    if (!newQuestionText.trim()) return;
    if (rankingQuestions.length >= 3) { alert("Máximo 3 preguntas."); return; }
    setRankingQuestions(prev => [...prev, { id: crypto.randomUUID(), text: newQuestionText.trim() }]);
    setNewQuestionText('');
  };

  const handlePublish = async () => {
    if (!tournamentName.trim()) { alert("Nombre del evento requerido"); return; }
    if (videos.length < 2) { alert("Mínimo 2 videos requeridos"); return; }
    if (votingMethod === 'ranking' && rankingQuestions.length === 0) { alert("Agrega preguntas para el ranking"); return; }

    const directorIds = directorListInput.split(/[\n,]+/).map(id => id.trim()).filter(id => id.length > 0);
    setIsPublishing(true);
    try {
      await onPublish(
        tournamentName, videos, directorIds, votingMethod, 
        votingMethod === 'ranking' ? rankingScale : undefined, 
        votingMethod === 'ranking' ? rankingQuestions : undefined
      );
    } catch (e) { setIsPublishing(false); }
  };

  return (
    <div className={`min-h-screen ${bgBase} text-white pb-32`}>
      
      {/* HEADER BAR */}
      <header className={`${cardBg} border-b ${cardBorder} p-4 sticky top-0 z-30 shadow-md`}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className={`bg-gradient-to-tr ${isOrange ? 'from-orange-600 to-red-600' : 'from-indigo-600 to-purple-600'} p-2 rounded-lg`}>
                <MonitorPlay className="text-white w-6 h-6" />
             </div>
             <div>
               <h1 className="font-bold text-xl leading-none">Panel de Juez</h1>
               <p className="text-xs text-gray-400">Configuración del Evento</p>
             </div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={handleTestConnection} disabled={testStatus === 'testing'} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition" title="Probar Conexión">
              {testStatus === 'testing' ? <Loader2 className="animate-spin" size={18} /> : <Activity size={18} className={testStatus==='success'?'text-green-500':testStatus==='error'?'text-red-500':''} />}
            </button>
            <button onClick={() => setShowDiagnostics(!showDiagnostics)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition" title="Info Database">
              <Database size={18} />
            </button>
            <button onClick={() => { if(confirm("¿Resetear configuración?")) clearConfig(); }} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition" title="Reset Config">
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* DIAGNOSTICS PANEL */}
      {(showDiagnostics || testStatus === 'error') && (
        <div className="max-w-6xl mx-auto mt-4 px-4 animate-in slide-in-from-top-2">
           <div className="bg-black/30 border border-gray-700 rounded-lg p-4 text-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                 <div className="font-mono text-xs text-gray-500 mb-1">PROJECT ID</div>
                 <code className="text-orange-300 bg-orange-900/20 px-2 py-1 rounded">{projectId}</code>
              </div>
              <div className="flex-1">
                 {testMsg && <span className={`font-bold ${testStatus==='success'?'text-green-400':'text-red-400'}`}>{testMsg}</span>}
              </div>
              <a href={`https://console.firebase.google.com/project/${projectId}/firestore/rules`} target="_blank" className="text-blue-400 hover:underline text-xs flex items-center gap-1">
                 <ExternalLink size={12}/> Ver Reglas Firestore
              </a>
           </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">

        {/* STEP 1: GENERAL INFO */}
        <section className={`${cardBg} rounded-2xl border ${cardBorder} overflow-hidden shadow-lg`}>
           <div className={`${isOrange ? 'bg-stone-800/50' : 'bg-gray-800/50'} p-6 border-b ${cardBorder} flex items-center gap-3`}>
              <div className={`w-8 h-8 rounded-full ${isOrange ? 'bg-orange-600' : 'bg-indigo-600'} flex items-center justify-center font-bold text-white`}>1</div>
              <h2 className="text-lg font-bold text-gray-200">Configuración General</h2>
           </div>
           <div className="p-6 grid md:grid-cols-2 gap-6">
              <div>
                 <label className="block text-sm font-bold text-gray-400 mb-2">Nombre del Evento</label>
                 <input 
                   value={tournamentName}
                   onChange={e => setTournamentName(e.target.value)}
                   className={`w-full ${isOrange ? 'bg-stone-900 border-stone-600' : 'bg-gray-900 border-gray-600'} border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-${isOrange ? 'orange' : 'indigo'}-500 outline-none transition`}
                   placeholder="Ej. Hackathon 2024"
                 />
              </div>
              <div>
                 <label className="block text-sm font-bold text-gray-400 mb-2 flex justify-between">
                    <span>Lista Blanca Directores</span>
                    <span className={`text-xs font-normal ${accentColor} flex items-center gap-1`}><BadgeCheck size={12}/> IDs de Empleado</span>
                 </label>
                 <textarea 
                   value={directorListInput}
                   onChange={e => setDirectorListInput(e.target.value)}
                   className={`w-full ${isOrange ? 'bg-stone-900 border-stone-600' : 'bg-gray-900 border-gray-600'} border rounded-xl px-4 py-3 text-sm font-mono h-[52px] focus:ring-2 focus:ring-${isOrange ? 'orange' : 'indigo'}-500 outline-none resize-none transition`}
                   placeholder="Ej. 1001, 1002, 1003 (Separados por comas)"
                 />
              </div>
           </div>
        </section>

        {/* STEP 2: RULES */}
        <section className={`${cardBg} rounded-2xl border ${cardBorder} overflow-hidden shadow-lg`}>
           <div className={`${isOrange ? 'bg-stone-800/50' : 'bg-gray-800/50'} p-6 border-b ${cardBorder} flex items-center gap-3`}>
              <div className={`w-8 h-8 rounded-full ${isOrange ? 'bg-orange-600' : 'bg-indigo-600'} flex items-center justify-center font-bold text-white`}>2</div>
              <h2 className="text-lg font-bold text-gray-200">Reglas de Calificación</h2>
           </div>
           
           <div className="p-6">
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                 <button onClick={() => setVotingMethod('like')} className={`relative p-5 rounded-xl border-2 text-left transition-all group ${votingMethod === 'like' ? 'border-green-500 bg-green-500/10' : `${cardBorder} hover:border-gray-600 ${isOrange ? 'bg-stone-900' : 'bg-gray-900'}`}`}>
                    <div className="flex justify-between items-start mb-2">
                       <div className={`p-2 rounded-lg ${votingMethod === 'like' ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400'}`}><ThumbsUp size={20}/></div>
                       {votingMethod === 'like' && <CheckCircle className="text-green-500" size={20}/>}
                    </div>
                    <h3 className="font-bold text-white mb-1">Me Gusta / No Me Gusta</h3>
                    <p className="text-xs text-gray-400">Votación binaria simple. Ideal para rondas rápidas.</p>
                 </button>

                 <button onClick={() => setVotingMethod('ranking')} className={`relative p-5 rounded-xl border-2 text-left transition-all group ${votingMethod === 'ranking' ? `border-${isOrange ? 'orange' : 'indigo'}-500 bg-${isOrange ? 'orange' : 'indigo'}-500/10` : `${cardBorder} hover:border-gray-600 ${isOrange ? 'bg-stone-900' : 'bg-gray-900'}`}`}>
                    <div className="flex justify-between items-start mb-2">
                       <div className={`p-2 rounded-lg ${votingMethod === 'ranking' ? `${isOrange ? 'bg-orange-500' : 'bg-indigo-500'} text-white` : 'bg-gray-800 text-gray-400'}`}><ListChecks size={20}/></div>
                       {votingMethod === 'ranking' && <CheckCircle className={isOrange ? 'text-orange-500' : 'text-indigo-500'} size={20}/>}
                    </div>
                    <h3 className="font-bold text-white mb-1">Ranking por Puntos</h3>
                    <p className="text-xs text-gray-400">Calificación numérica basada en preguntas personalizadas.</p>
                 </button>
              </div>

              {votingMethod === 'ranking' && (
                <div className={`bg-black/20 rounded-xl p-5 border border-${isOrange ? 'orange' : 'indigo'}-500/20 animate-in fade-in`}>
                   <div className="flex justify-between items-center mb-4">
                      <h4 className={`font-bold ${isOrange ? 'text-orange-300' : 'text-indigo-300'} text-sm`}>Preguntas de Evaluación</h4>
                      <select value={rankingScale} onChange={e => setRankingScale(Number(e.target.value))} className={`bg-${isOrange ? 'stone-900' : 'gray-900'} border border-gray-600 rounded text-xs px-2 py-1 outline-none`}>
                         {[5,10,20].map(n => <option key={n} value={n}>Escala 1-{n}</option>)}
                      </select>
                   </div>
                   
                   <div className="space-y-2 mb-3">
                      {rankingQuestions.map((q, i) => (
                         <div key={q.id} className={`${isOrange ? 'bg-stone-900 border-stone-700' : 'bg-gray-900 border-gray-700'} p-3 rounded-lg border flex items-center gap-3`}>
                            <span className="text-xs font-bold text-gray-500 bg-gray-800 px-2 py-1 rounded">P{i+1}</span>
                            <span className="flex-1 text-sm">{q.text}</span>
                            <button onClick={() => setRankingQuestions(prev => prev.filter(x => x.id !== q.id))} className="text-gray-500 hover:text-red-400"><X size={16}/></button>
                         </div>
                      ))}
                   </div>

                   {rankingQuestions.length < 3 && (
                     <div className="flex gap-2">
                        <input 
                          value={newQuestionText} 
                          onChange={e => setNewQuestionText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddQuestion()}
                          placeholder="Escribe una pregunta..." 
                          className={`flex-1 ${isOrange ? 'bg-stone-900 border-stone-600' : 'bg-gray-900 border-gray-600'} border rounded-lg px-3 py-2 text-sm outline-none focus:border-${isOrange ? 'orange' : 'indigo'}-500`}
                        />
                        <button onClick={handleAddQuestion} className={`${isOrange ? 'bg-orange-600 hover:bg-orange-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white px-4 rounded-lg`}><Plus size={18}/></button>
                     </div>
                   )}
                </div>
              )}
           </div>
        </section>

        {/* STEP 3: CONTENT */}
        <section className={`${cardBg} rounded-2xl border ${cardBorder} overflow-hidden shadow-lg`}>
           <div className={`${isOrange ? 'bg-stone-800/50' : 'bg-gray-800/50'} p-6 border-b ${cardBorder} flex justify-between items-center`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${isOrange ? 'bg-orange-600' : 'bg-indigo-600'} flex items-center justify-center font-bold text-white`}>3</div>
                <h2 className="text-lg font-bold text-gray-200">Videos y Guiones</h2>
              </div>
              <span className={`text-sm font-bold ${isOrange ? 'text-orange-400 bg-orange-900/30' : 'text-indigo-400 bg-indigo-900/30'} px-3 py-1 rounded-full`}>{videos.length} items</span>
           </div>

           {/* Toolbar */}
           <div className={`p-4 ${isOrange ? 'bg-stone-900/50 border-stone-700' : 'bg-gray-900/50 border-gray-700'} border-b flex flex-wrap gap-3`}>
              {/* FILE UPLOAD BUTTON */}
              <div className="relative overflow-hidden group">
                 <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition">
                    <UploadCloud size={16}/> Subir MP4
                 </button>
                 <input type="file" multiple accept="video/*" onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" title="Subir videos" />
              </div>

              {/* LINK TOGGLE */}
              <button onClick={() => setShowUrlInput(!showUrlInput)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition">
                 <Link size={16}/> Agregar Link
              </button>

              {/* SCRIPT UPLOAD BUTTON */}
              <div className="relative overflow-hidden group ml-auto">
                 <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition">
                    <FileText size={16}/> Asignar Guiones (.txt)
                 </button>
                 <input type="file" multiple accept=".txt,text/plain" onChange={handleScriptSelect} className="absolute inset-0 opacity-0 cursor-pointer" title="Subir scripts masivamente" />
              </div>
           </div>

           {/* Progress Bar */}
           {uploading && (
             <div className="w-full bg-gray-900 h-1">
                <div className="bg-green-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
             </div>
           )}

           {/* Link Input Drawer */}
           {showUrlInput && (
             <div className="p-4 bg-gray-800 border-b border-gray-700 animate-in slide-in-from-top-2">
                <div className="flex gap-2">
                   <textarea 
                     value={urlInput}
                     onChange={e => setUrlInput(e.target.value)}
                     className="flex-1 bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm h-20 outline-none"
                     placeholder="Pega enlaces de Drive, Dropbox o Directos (uno por línea)..."
                   />
                   <button onClick={handleAddLink} className="bg-blue-600 text-white px-4 rounded-lg font-bold">Añadir</button>
                </div>
             </div>
           )}

           {/* Upload Queue (Pending) */}
           {uploadQueue.length > 0 && !uploading && (
              <div className="p-4 bg-blue-900/10 border-b border-blue-500/20">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-blue-300 uppercase">Cola de subida ({uploadQueue.length})</span>
                    <button onClick={processUploads} className="text-xs bg-blue-600 px-3 py-1 rounded text-white font-bold">Iniciar Subida</button>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    {uploadQueue.map((f, i) => (
                       <span key={i} className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300 border border-gray-600">{f.name}</span>
                    ))}
                 </div>
              </div>
           )}

           {/* Video List */}
           <div className={`divide-y ${isOrange ? 'divide-stone-700 bg-stone-900' : 'divide-gray-700 bg-gray-900'} min-h-[200px]`}>
              {videos.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                    <PlayCircle size={48} className="mb-2 opacity-20"/>
                    <p>No hay videos añadidos aún.</p>
                 </div>
              ) : (
                 videos.map((video, idx) => (
                    <div key={video.id} className={`p-4 ${isOrange ? 'hover:bg-stone-800' : 'hover:bg-gray-800'} transition flex items-center gap-4 group`}>
                       <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-700">
                          {idx + 1}
                       </div>
                       
                       <div className="flex-1 min-w-0">
                          <input 
                            value={video.title}
                            onChange={e => {
                               const newV = [...videos];
                               newV[idx].title = e.target.value;
                               setVideos(newV);
                            }}
                            className="bg-transparent text-white font-medium text-sm w-full outline-none border-b border-transparent focus:border-indigo-500 transition"
                            placeholder="Título del video"
                          />
                          <div className="flex items-center gap-2 mt-1">
                             {video.driveId && <span className="text-[10px] bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">Drive</span>}
                             <span className="text-[10px] text-gray-600 truncate max-w-[200px]">{video.url}</span>
                          </div>
                       </div>

                       {/* Script Status */}
                       <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded border ${video.scriptText ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400' : 'bg-gray-800 border-gray-700 text-gray-600'}`}>
                          <FileText size={12}/>
                          <span className="hidden md:inline">{video.scriptText ? 'Guion Activo' : 'Sin Guion'}</span>
                       </div>

                       <button onClick={() => setVideos(prev => prev.filter(v => v.id !== video.id))} className="p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition">
                          <Trash2 size={16}/>
                       </button>
                    </div>
                 ))
              )}
           </div>
        </section>

      </main>

      {/* FOOTER PUBLISH */}
      <div className={`fixed bottom-0 left-0 right-0 ${isOrange ? 'bg-stone-900/90' : 'bg-gray-900/90'} backdrop-blur border-t ${cardBorder} p-4 z-40`}>
         <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="text-xs text-gray-500 hidden md:block">
               {videos.length} Videos • {votingMethod === 'like' ? 'Voto Simple' : 'Ranking 3D'} • {rankingQuestions.length} Preguntas
            </div>
            <button
               onClick={handlePublish}
               disabled={isPublishing || videos.length < 2 || uploading}
               className={`ml-auto px-8 py-3 rounded-xl font-bold text-white flex items-center gap-2 shadow-lg transition-transform active:scale-95 ${
                  isPublishing || videos.length < 2 || uploading 
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                  : primaryButton
               }`}
            >
               {isPublishing ? <Loader2 className="animate-spin"/> : <Share2 size={18} />}
               {isPublishing ? 'Publicando...' : 'Publicar Evento'}
            </button>
         </div>
      </div>

    </div>
  );
};

export default UploadScreen;
