import React, { useState, useRef, useEffect } from 'react';
import { VideoItem } from '../types';
import { Upload, FileVideo, Trash2, Cloud, Loader2, Share2, CheckCircle2, AlertCircle, RefreshCw, Server, Wifi } from 'lucide-react';
import { MOCK_VIDEOS } from '../services/mockData';
import { api } from '../services/api';

interface UploadScreenProps {
  onPublish: (name: string, videos: VideoItem[]) => void;
}

const UploadScreen: React.FC<UploadScreenProps> = ({ onPublish }) => {
  const [tournamentName, setTournamentName] = useState('');
  const [files, setFiles] = useState<VideoItem[]>([]);
  const [rawFilesMap, setRawFilesMap] = useState<Record<string, File>>({});
  
  const [fileStatus, setFileStatus] = useState<Record<string, 'loading' | 'ready' | 'error' | 'uploading' | 'local'>>({});
  const [errorDetails, setErrorDetails] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Server Status State - Optimista: Asumimos online para no bloquear la UI
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'warning'>('checking');

  const checkConnection = () => {
    setServerStatus('checking');
    api.checkHealth().then(isOnline => {
      // Si falla, ponemos warning pero NO bloqueamos
      setServerStatus(isOnline ? 'online' : 'warning');
    });
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const updateFileStatus = (id: string, status: 'loading' | 'ready' | 'error' | 'uploading' | 'local') => {
    setFileStatus(prev => ({ ...prev, [id]: status }));
  };

  const uploadSingleFile = async (file: File, id: string) => {
    updateFileStatus(id, 'uploading');
    try {
      const serverUrl = await api.uploadVideo(file);
      
      setFiles(prev => prev.map(item => item.id === id ? { ...item, url: serverUrl, driveId: 'uploaded' } : item));
      updateFileStatus(id, 'ready');
      
    } catch (error: any) {
      console.error("Upload failed", error);
      updateFileStatus(id, 'error');
      const errorMsg = error.message || "Unknown Error";
      setErrorDetails(prev => ({...prev, [id]: errorMsg}));
    }
  };

  const processFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    const incomingFiles = Array.from(fileList).filter(file => file.type.startsWith('video/'));
    
    const newItems: VideoItem[] = incomingFiles.map(file => ({
      id: crypto.randomUUID(),
      title: file.name.replace(/\.[^/.]+$/, ""),
      url: '', 
      thumbnail: '',
      driveId: 'pending'
    }));

    setFiles(prev => [...prev, ...newItems]);
    
    const newRawMap = { ...rawFilesMap };
    newItems.forEach((item, index) => {
      newRawMap[item.id] = incomingFiles[index];
    });
    setRawFilesMap(newRawMap);

    for (let i = 0; i < incomingFiles.length; i++) {
      await uploadSingleFile(incomingFiles[i], newItems[i].id);
    }
  };

  const handleRetry = async (id: string) => {
    const file = rawFilesMap[id];
    if (file) {
      await uploadSingleFile(file, id);
    } else {
      alert("No se encontró el archivo original.");
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files); };
  const handleRemove = (id: string) => { 
    setFiles(prev => prev.filter(v => v.id !== id)); 
    const newMap = { ...rawFilesMap };
    delete newMap[id];
    setRawFilesMap(newMap);
  };

  const handleStart = () => {
    if (!tournamentName.trim()) { alert("Ponle un nombre a tu torneo."); return; }
    if (files.length < 2) { alert("Necesitas al menos 2 videos."); return; }
    
    const notReady = files.filter(f => fileStatus[f.id] !== 'ready');
    if (notReady.length > 0) {
      alert(`Error: Tienes ${notReady.length} videos sin subir correctamente. Reintenta subir los que están en rojo.`);
      return;
    }

    setIsPublishing(true);
    onPublish(tournamentName.trim(), files);
  };

  const handleUseDemoData = () => {
     setTournamentName("Demo Local (Solo pruebas)");
     setFiles(MOCK_VIDEOS);
     const s: any = {};
     MOCK_VIDEOS.forEach(v => s[v.id] = 'ready');
     setFileStatus(s);
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-900 text-white p-6 pb-24">
      <div className="w-full max-w-6xl">
        <div className="mb-8 text-center relative">
          
          {/* Status Indicator (Non-blocking) */}
          <div className="absolute top-0 right-0 flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-full shadow-sm border border-gray-700">
             {serverStatus === 'checking' && <span className="text-gray-400 text-xs flex items-center gap-1"><Loader2 className="animate-spin h-3 w-3"/> Verificando Servidor...</span>}
             {serverStatus === 'online' && <span className="text-green-500 text-xs flex items-center gap-1"><Server className="h-3 w-3"/> Nube Conectada</span>}
             {serverStatus === 'warning' && (
               <span className="text-yellow-500 text-xs flex items-center gap-1" title="Podría haber lentitud">
                 <Wifi className="h-3 w-3"/> Conexión inestable
               </span>
             )}
          </div>

          <Cloud className="w-12 h-12 text-purple-500 mx-auto mb-2" />
          <h1 className="text-3xl font-bold">Crear Torneo</h1>
          <p className="text-gray-400">Sube tus videos a Cloud Run para generar un código compartido.</p>
        </div>

        <div className="max-w-md mx-auto mb-8">
          <input 
            type="text" 
            value={tournamentName}
            onChange={(e) => setTournamentName(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-lg focus:ring-2 focus:ring-purple-500 outline-none"
            placeholder="Nombre del Torneo..."
          />
        </div>

        <div 
          className={`border-2 border-dashed rounded-2xl p-8 mb-8 text-center cursor-pointer transition-colors ${isDragging ? 'border-purple-500 bg-purple-900/20' : 'border-gray-700 bg-gray-800 hover:bg-gray-750'}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        >
          <input type="file" ref={fileInputRef} className="hidden" multiple accept="video/*" onChange={(e) => processFiles(e.target.files)} />
          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="font-medium">Haga clic o arrastre los archivos de video aquí</p>
          <p className="text-xs text-gray-500 mt-1">Soportados MP4, WebM (Máx 4GB)</p>
        </div>
        
        {files.length === 0 && (
           <button onClick={handleUseDemoData} className="block mx-auto text-sm text-gray-600 hover:text-gray-400 underline mb-8">
             ¿Solo probando? Cargar Datos de Demo
           </button>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
            {files.map((file, index) => (
              <div key={file.id} className={`relative bg-gray-800 rounded-xl overflow-hidden border-2 transition-all ${fileStatus[file.id] === 'error' ? 'border-red-500 bg-red-900/10' : 'border-gray-700'}`}>
                
                <div className="absolute top-2 left-2 z-20 flex gap-2">
                   {fileStatus[file.id] === 'uploading' && <span className="bg-blue-600 text-xs px-2 py-1 rounded text-white animate-pulse shadow">Subiendo...</span>}
                   {fileStatus[file.id] === 'ready' && <span className="bg-green-600 text-xs px-2 py-1 rounded text-white font-bold flex items-center gap-1 shadow"><CheckCircle2 size={12}/> Listo</span>}
                   {fileStatus[file.id] === 'error' && <span className="bg-red-600 text-xs px-2 py-1 rounded text-white font-bold shadow">Error</span>}
                </div>

                <button onClick={() => handleRemove(file.id)} className="absolute top-2 right-2 z-20 bg-black/50 p-1.5 rounded-full hover:bg-red-600 text-white transition backdrop-blur-sm"><Trash2 size={16}/></button>
                
                <div className="aspect-video bg-black flex items-center justify-center relative group">
                   {file.url ? (
                      <video src={file.url} className="w-full h-full object-contain" controls preload="metadata" />
                   ) : (
                      <div className="text-gray-500 flex flex-col items-center">
                         {fileStatus[file.id] === 'uploading' ? <Loader2 className="animate-spin mb-2 w-8 h-8 text-blue-500"/> : <FileVideo className="w-8 h-8 mb-2"/>}
                         <span className="text-xs font-mono">{fileStatus[file.id] === 'uploading' ? 'Enviando...' : 'Pendiente'}</span>
                      </div>
                   )}

                   {/* Error Overlay with Retry */}
                   {fileStatus[file.id] === 'error' && (
                     <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center z-10 p-4 text-center">
                        <AlertCircle className="text-red-500 w-8 h-8 mb-2" />
                        <p className="text-red-200 text-xs mb-3 font-medium">{errorDetails[file.id] || "Error de red"}</p>
                        <button 
                          onClick={() => handleRetry(file.id)}
                          className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-gray-200 transition shadow-lg"
                        >
                          <RefreshCw size={14} /> Reintentar
                        </button>
                     </div>
                   )}
                </div>
                
                <div className="p-3 border-t border-gray-700/50">
                   <p className="truncate text-sm font-bold text-gray-200" title={file.title}>{file.title}</p>
                </div>
              </div>
            ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900/95 backdrop-blur border-t border-gray-800 flex justify-center z-50 shadow-2xl">
           <button
             onClick={handleStart}
             disabled={isPublishing || files.length < 2}
             className={`
               font-bold py-4 px-10 rounded-xl flex items-center gap-2 text-lg shadow-xl transition-all
               ${(isPublishing || files.length < 2) 
                 ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' 
                 : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transform hover:scale-105'}
             `}
           >
             {isPublishing ? <Loader2 className="animate-spin"/> : <Share2 />}
             {isPublishing ? 'Publicando Torneo...' : 'Publicar y Obtener Código'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default UploadScreen;