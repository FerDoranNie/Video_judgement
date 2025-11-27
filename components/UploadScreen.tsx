import React, { useState } from 'react';
import { VideoItem } from '../types';
import { Link, Plus, Trash2, Share2, Loader2, UploadCloud, FileVideo, Settings, Activity, CheckCircle, XCircle, ExternalLink, ShieldAlert, Database } from 'lucide-react';
import { MOCK_VIDEOS } from '../services/mockData';
import { api } from '../services/api';
import { clearConfig, db } from '../firebaseConfig';

interface UploadScreenProps {
  onPublish: (name: string, videos: VideoItem[]) => Promise<void>;
}

const UploadScreen: React.FC<UploadScreenProps> = ({ onPublish }) => {
  const [tournamentName, setTournamentName] = useState('');
  const [activeTab, setActiveTab] = useState<'links' | 'files'>('files');
  const [urlInput, setUrlInput] = useState('');
  
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMsg("Probando lectura/escritura...");
    const result = await api.testConnection();
    setTestStatus(result.success ? 'success' : 'error');
    setTestMsg(result.message);
    if (!result.success) setShowDiagnostics(true);
  };

  const projectId = db?.app?.options?.projectId || "desconocido";
  const authDomain = db?.app?.options?.authDomain || "desconocido";
  
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
        title: `Link Video ${videos.length + newVideos.length + 1}`,
        url: url,
        thumbnail: '',
        driveId: type === 'drive' ? 'drive-linked' : undefined
      });
    });
    if (newVideos.length > 0) {
      setVideos(prev => [...prev, ...newVideos]);
      setUrlInput('');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setUploadQueue(prev => [...prev, ...newFiles]);
    }
  };

  const removeFileFromQueue = (index: number) => {
    setUploadQueue(prev => prev.filter((_, i) => i !== index));
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
      alert("Error al subir archivos. Revisa la consola o tu configuración de Firebase.");
      setUploading(false);
    }
  };


  const handleRemove = (id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id));
  };

  const handleTitleChange = (id: string, newTitle: string) => {
    setVideos(prev => prev.map(v => v.id === id ? { ...v, title: newTitle } : v));
  };

  const handlePublish = async () => {
    if (!tournamentName.trim()) { alert("Ponle nombre al torneo"); return; }
    if (videos.length < 2) { alert("Agrega al menos 2 videos para crear un torneo."); return; }
    
    setIsPublishing(true);
    try {
      await onPublish(tournamentName, videos);
    } catch (e) {
      setIsPublishing(false);
    }
  };

  const loadDemo = () => {
    setTournamentName("Demo Enlaces Públicos");
    setVideos(MOCK_VIDEOS);
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-900 text-white p-6 pb-32">
      <div className="w-full max-w-4xl relative">
        
        {/* Top Controls */}
        <div className="flex justify-end gap-2 mb-4">
          <button 
            onClick={handleTestConnection}
            disabled={testStatus === 'testing'}
            className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition border ${
              testStatus === 'success' ? 'bg-green-900/30 border-green-500 text-green-400' :
              testStatus === 'error' ? 'bg-red-900/30 border-red-500 text-red-400' :
              'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            {testStatus === 'testing' ? <Loader2 className="animate-spin" size={14} /> : <Activity size={14} />}
            {testStatus === 'testing' ? 'Probando...' : 'Probar Conexión'}
          </button>

          <button 
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition border bg-gray-800 border-gray-700 text-gray-500 hover:text-white"
          >
             <Database size={14} /> Info
          </button>

          <button 
            onClick={() => {
              if (confirm("¿Borrar configuración y reiniciar?")) {
                clearConfig();
              }
            }}
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition border bg-gray-800 border-gray-700 text-gray-500 hover:text-white"
            title="Cambiar API Keys"
          >
            <Settings size={14} /> Reset
          </button>
        </div>

        {/* DIAGNOSTICS & ERROR BOX */}
        {(testStatus !== 'idle' || showDiagnostics) && (
          <div className={`mb-6 p-4 rounded-lg text-sm flex flex-col gap-3 transition-all ${
            testStatus === 'error' ? 'bg-red-900/20 text-red-300 border border-red-900/50' : 'bg-gray-800 border border-gray-700 text-gray-300'
          }`}>
             {testMsg && (
                <div className="flex items-center gap-2 font-bold mb-2">
                  {testStatus === 'success' && <CheckCircle size={16} className="text-green-500" />}
                  {testStatus === 'error' && <XCircle size={16} className="text-red-500" />}
                  <span>{testMsg}</span>
                </div>
             )}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono bg-black/20 p-3 rounded">
                <div>
                   <span className="text-gray-500 block mb-1">Project ID (Usado en Firestore):</span>
                   <code className="bg-black/40 px-2 py-1 rounded text-orange-300 break-all">{projectId}</code>
                </div>
                <div>
                   <span className="text-gray-500 block mb-1">Auth Domain:</span>
                   <code className="bg-black/40 px-2 py-1 rounded text-blue-300 break-all">{authDomain}</code>
                </div>
             </div>

             {testStatus === 'error' && (
               <div className="flex flex-wrap gap-2 mt-2">
                  <a 
                    href={`https://console.firebase.google.com/project/${projectId}/firestore/rules`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-red-800/50 hover:bg-red-700 text-white px-3 py-2 rounded transition"
                  >
                    <ExternalLink size={12} /> Ver Reglas DB
                  </a>
                  <a 
                    href={`https://console.firebase.google.com/project/${projectId}/settings/general`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded transition"
                  >
                    <ExternalLink size={12} /> Ver Project ID Real
                  </a>
               </div>
             )}
          </div>
        )}

        <div className="text-center mb-8 pt-4">
          <div className="inline-block p-3 bg-indigo-600 rounded-full mb-4 shadow-lg shadow-indigo-500/30">
            <UploadCloud className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Crear Torneo en la Nube</h1>
          <p className="text-gray-400">
            Sube tus videos o pega enlaces. Todo quedará guardado online.
          </p>
        </div>

        <div className="mb-8">
           <label className="block text-sm font-medium text-gray-400 mb-2">Nombre del Evento</label>
           <input 
             type="text" 
             value={tournamentName}
             onChange={e => setTournamentName(e.target.value)}
             className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
             placeholder="Ej. Campaña 2024"
           />
        </div>

        <div className="flex mb-6 bg-gray-800 rounded-lg p-1">
          <button 
            onClick={() => setActiveTab('files')}
            className={`flex-1 py-2 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition ${activeTab === 'files' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
            <UploadCloud size={16}/> Subir Archivos (MP4)
          </button>
          <button 
            onClick={() => setActiveTab('links')}
            className={`flex-1 py-2 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition ${activeTab === 'links' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
            <Link size={16}/> Enlaces Externos
          </button>
        </div>

        {activeTab === 'files' && (
          <div className="bg-gray-800 rounded-xl p-6 mb-8 border border-gray-700">
            <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer relative">
              <input 
                type="file" 
                multiple 
                accept="video/*"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FileVideo className="w-12 h-12 text-gray-500 mx-auto mb-2" />
              <p className="font-bold text-gray-300">Arrastra videos o haz clic para buscar</p>
              <p className="text-xs text-gray-500 mt-1">MP4, MOV, WebM</p>
            </div>

            {uploadQueue.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-bold text-gray-400">Archivos seleccionados:</h4>
                {uploadQueue.map((file, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-900/50 p-2 rounded text-sm">
                    <span className="truncate">{file.name}</span>
                    <button onClick={() => removeFileFromQueue(idx)} className="text-red-400 hover:text-red-300">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                {uploading ? (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Subiendo a la nube...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                      <div className="bg-green-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={processUploads}
                    className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2"
                  >
                    <UploadCloud size={16} /> Subir {uploadQueue.length} Videos
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'links' && (
          <div className="bg-gray-800 rounded-xl p-6 mb-8 border border-gray-700">
             <div className="flex gap-2 mb-2">
               <textarea 
                 value={urlInput}
                 onChange={e => setUrlInput(e.target.value)}
                 className="flex-1 bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm font-mono h-24 focus:ring-2 focus:ring-indigo-500 outline-none"
                 placeholder="Pega enlaces de Drive o URL directa..."
               />
             </div>
             <button 
               onClick={handleAddLink}
               className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition"
             >
               <Plus size={18} /> Añadir Enlaces
             </button>
          </div>
        )}

        {videos.length > 0 && (
          <div className="mb-8 space-y-3">
            <h3 className="font-bold text-gray-300">Videos Listos ({videos.length})</h3>
            {videos.map((video, idx) => (
              <div key={video.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex items-center gap-3">
                <div className="w-8 h-8 flex-none bg-black rounded flex items-center justify-center text-gray-500 font-bold text-xs">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <input 
                    type="text" 
                    value={video.title}
                    onChange={(e) => handleTitleChange(video.id, e.target.value)}
                    className="bg-transparent border-none text-white font-medium w-full focus:ring-0 p-0"
                  />
                  {video.url.includes('firebasestorage') && <span className="text-xs text-green-400 font-mono">Guardado en Nube</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleRemove(video.id)} className="p-2 text-gray-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {videos.length === 0 && (
           <button onClick={loadDemo} className="block mx-auto text-sm text-gray-500 hover:text-white underline">
             Cargar datos de ejemplo
           </button>
        )}

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900/95 backdrop-blur border-t border-gray-800 flex justify-center z-50">
           <button
             onClick={handlePublish}
             disabled={isPublishing || videos.length < 2 || uploading}
             className={`
               font-bold py-4 px-12 rounded-xl flex items-center gap-3 text-lg shadow-xl transition-all
               ${(isPublishing || videos.length < 2 || uploading) 
                 ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                 : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white transform hover:scale-105'}
             `}
           >
             {isPublishing ? <Loader2 className="animate-spin"/> : <Share2 />}
             {isPublishing ? 'Guardando en Base de Datos...' : 'Publicar Torneo'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default UploadScreen;