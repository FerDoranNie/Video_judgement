import React, { useState, useRef } from 'react';
import { VideoItem } from '../types';
import { Upload, FileVideo, Trash2, Cloud, PlayCircle, Loader2, Share2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { MOCK_VIDEOS } from '../services/mockData';
import { api } from '../services/api';

interface UploadScreenProps {
  onPublish: (name: string, videos: VideoItem[]) => void;
}

const UploadScreen: React.FC<UploadScreenProps> = ({ onPublish }) => {
  const [tournamentName, setTournamentName] = useState('');
  const [files, setFiles] = useState<VideoItem[]>([]);
  // Store raw files to enable retries
  const [rawFilesMap, setRawFilesMap] = useState<Record<string, File>>({});
  
  const [fileStatus, setFileStatus] = useState<Record<string, 'loading' | 'ready' | 'error' | 'uploading' | 'local'>>({});
  const [errorDetails, setErrorDetails] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateFileStatus = (id: string, status: 'loading' | 'ready' | 'error' | 'uploading' | 'local') => {
    setFileStatus(prev => ({ ...prev, [id]: status }));
  };

  const uploadSingleFile = async (file: File, id: string) => {
    updateFileStatus(id, 'uploading');
    try {
      const serverUrl = await api.uploadVideo(file);
      
      // Check if it's a blob URL (fallback) or real URL
      if (serverUrl.startsWith('blob:')) {
         // It failed to upload to server and used local fallback
         updateFileStatus(id, 'local');
         setErrorDetails(prev => ({...prev, [id]: "Subida falló. Video solo local."}));
         // Update url anyway so user can see preview
         setFiles(prev => prev.map(item => item.id === id ? { ...item, url: serverUrl } : item));
      } else {
         // Success
         setFiles(prev => prev.map(item => item.id === id ? { ...item, url: serverUrl, driveId: 'uploaded' } : item));
         updateFileStatus(id, 'ready');
         // Clear raw file from memory to save space if needed, but keeping it is safer for now
      }
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
    
    // Create placeholders
    const newItems: VideoItem[] = incomingFiles.map(file => ({
      id: crypto.randomUUID(),
      title: file.name.replace(/\.[^/.]+$/, ""),
      url: '', 
      thumbnail: '',
      driveId: 'pending'
    }));

    // Update State
    setFiles(prev => [...prev, ...newItems]);
    
    // Store raw files
    const newRawMap = { ...rawFilesMap };
    newItems.forEach((item, index) => {
      newRawMap[item.id] = incomingFiles[index];
    });
    setRawFilesMap(newRawMap);

    // Upload sequential logic
    for (let i = 0; i < incomingFiles.length; i++) {
      await uploadSingleFile(incomingFiles[i], newItems[i].id);
    }
  };

  const handleRetry = async (id: string) => {
    const file = rawFilesMap[id];
    if (file) {
      await uploadSingleFile(file, id);
    } else {
      alert("No se encontró el archivo original. Elimínalo y súbelo de nuevo.");
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
    
    // Validar que NO haya videos locales ni errores
    const notReady = files.filter(f => fileStatus[f.id] !== 'ready');
    
    if (notReady.length > 0) {
      alert(`No puedes publicar aún.\n\nTienes ${notReady.length} videos que no se han subido correctamente al servidor (están en rojo o amarillo).\n\nUsa el botón de "Reintentar" en cada video o elimínalos.`);
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

  const hasLocalOrError = files.some(f => fileStatus[f.id] === 'local' || fileStatus[f.id] === 'error');

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-900 text-white p-6 pb-24">
      <div className="w-full max-w-6xl">
        <div className="mb-8 text-center">
          <Cloud className="w-12 h-12 text-purple-500 mx-auto mb-2" />
          <h1 className="text-3xl font-bold">Crear Torneo</h1>
          <p className="text-gray-400">Sube tus videos al servidor para compartir el código.</p>
        </div>

        <div className="max-w-md mx-auto mb-8">
          <input 
            type="text" 
            value={tournamentName}
            onChange={(e) => setTournamentName(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-lg"
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
          <p>Click o Arrastrar videos aquí</p>
        </div>
        
        {files.length === 0 && (
           <button onClick={handleUseDemoData} className="block mx-auto text-sm text-gray-500 underline mb-8">Cargar Datos de Demo</button>
        )}

        {hasLocalOrError && (
          <div className="mb-6 p-4 bg-yellow-900/40 border border-yellow-600 rounded-xl flex items-start gap-3 max-w-2xl mx-auto">
             <AlertCircle className="w-6 h-6 text-yellow-500 flex-none" />
             <div>
               <h4 className="font-bold text-yellow-100">Atención: Videos no compartibles</h4>
               <p className="text-sm text-yellow-200">
                 Algunos videos fallaron al subir al servidor (marcados en amarillo/rojo). 
                 Debes dar click en <span className="font-bold">Reintentar</span> hasta que estén en <span className="text-green-400 font-bold">Verde</span>.
                 Si publicas así, tus invitados no verán nada.
               </p>
             </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
            {files.map((file, index) => (
              <div key={file.id} className={`relative bg-gray-800 rounded-xl overflow-hidden border-2 ${fileStatus[file.id] === 'error' ? 'border-red-500' : fileStatus[file.id] === 'local' ? 'border-yellow-500' : 'border-gray-700'}`}>
                
                {/* Status Badges */}
                <div className="absolute top-2 left-2 z-20 flex gap-2">
                   {fileStatus[file.id] === 'uploading' && <span className="bg-blue-600 text-xs px-2 py-1 rounded text-white animate-pulse">Subiendo...</span>}
                   {fileStatus[file.id] === 'ready' && <span className="bg-green-600 text-xs px-2 py-1 rounded text-white font-bold flex items-center gap-1"><CheckCircle2 size={12}/> Listo</span>}
                   {fileStatus[file.id] === 'error' && <span className="bg-red-600 text-xs px-2 py-1 rounded text-white font-bold">Error</span>}
                   {fileStatus[file.id] === 'local' && <span className="bg-yellow-600 text-xs px-2 py-1 rounded text-white font-bold">Solo Local</span>}
                </div>

                <button onClick={() => handleRemove(file.id)} className="absolute top-2 right-2 z-20 bg-black/50 p-1 rounded-full hover:bg-red-600 text-white transition"><Trash2 size={16}/></button>
                
                <div className="aspect-video bg-black flex items-center justify-center relative">
                   {file.url ? (
                      <video src={file.url} className="w-full h-full object-contain" controls />
                   ) : (
                      <div className="text-gray-500 flex flex-col items-center">
                         {fileStatus[file.id] === 'uploading' ? <Loader2 className="animate-spin mb-2"/> : <FileVideo />}
                         <span className="text-xs">{fileStatus[file.id] === 'uploading' ? 'Procesando...' : 'Esperando...'}</span>
                      </div>
                   )}

                   {/* Retry Overlay */}
                   {(fileStatus[file.id] === 'error' || fileStatus[file.id] === 'local') && (
                     <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                        <button 
                          onClick={() => handleRetry(file.id)}
                          className="bg-white text-black px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition"
                        >
                          <RefreshCw size={16} /> Reintentar
                        </button>
                     </div>
                   )}
                </div>
                
                <div className="p-3">
                   <p className="truncate text-sm font-bold">{file.title}</p>
                   {fileStatus[file.id] === 'error' && (
                     <p className="text-xs text-red-400 mt-1">{errorDetails[file.id]}</p>
                   )}
                   {fileStatus[file.id] === 'local' && (
                      <p className="text-xs text-yellow-500 mt-1">No subido al servidor.</p>
                   )}
                </div>
              </div>
            ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900 border-t border-gray-800 flex justify-center z-50 shadow-2xl">
           <button
             onClick={handleStart}
             disabled={isPublishing || files.length < 2 || hasLocalOrError}
             className={`
               font-bold py-4 px-10 rounded-xl flex items-center gap-2 text-lg shadow-lg transition-all
               ${(isPublishing || files.length < 2 || hasLocalOrError) 
                 ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                 : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transform hover:scale-105'}
             `}
           >
             {isPublishing ? <Loader2 className="animate-spin"/> : <Share2 />}
             {isPublishing ? 'Creando...' : 'Publicar y Obtener Código'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default UploadScreen;