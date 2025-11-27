
import React, { useState } from 'react';
import { Save, AlertTriangle, ExternalLink, Settings, XCircle, Database } from 'lucide-react';

interface FirebaseSetupScreenProps {
  onSave: (config: any) => void;
}

const FirebaseSetupScreen: React.FC<FirebaseSetupScreenProps> = ({ onSave }) => {
  const [formData, setFormData] = useState({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    databaseId: 'app-videos' // Default actualizado
  });
  
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (e.target.name === 'projectId') {
      setValidationError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.apiKey || !formData.projectId) {
      alert("Por favor ingresa al menos API Key y Project ID");
      return;
    }
    // Asegurar que si está vacío se mande app-videos
    const finalData = {
        ...formData,
        databaseId: formData.databaseId.trim() || 'app-videos'
    };
    onSave(finalData);
  };

  const handleJsonPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text');
    try {
      const match = pasted.match(/{[\s\S]*}/);
      if (match) {
        let jsonStr = match[0]
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
          .replace(/'/g, '"');
        
        const parsed = JSON.parse(jsonStr);
        setFormData(prev => ({
          ...prev,
          apiKey: parsed.apiKey || prev.apiKey,
          authDomain: parsed.authDomain || prev.authDomain,
          projectId: parsed.projectId || prev.projectId,
          storageBucket: parsed.storageBucket || prev.storageBucket,
          messagingSenderId: parsed.messagingSenderId || prev.messagingSenderId,
          appId: parsed.appId || prev.appId,
          databaseId: parsed.databaseId || 'app-videos'
        }));
        e.preventDefault();
        setValidationError(null); 
      }
    } catch (err) {
      console.log("No se pudo parsear JSON automáticamente", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 text-white">
      <div className="max-w-2xl w-full bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-orange-600 rounded-full mb-4 shadow-lg">
            <Settings className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Configuración Firebase</h1>
          <p className="text-gray-400">
            Conecta tu proyecto. Si usas una base de datos personalizada, indícalo abajo.
          </p>
        </div>

        <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 mb-6 flex gap-3">
          <InfoIcon className="w-5 h-5 text-blue-400 flex-none mt-1" />
          <div className="text-sm text-blue-200">
             Copia el objeto de configuración desde tu consola de Firebase (Project Settings {'>'} Web App).
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">API Key</label>
              <input 
                name="apiKey"
                value={formData.apiKey}
                onChange={handleChange}
                onPaste={handleJsonPaste}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm focus:border-orange-500 outline-none font-mono"
                placeholder="Pegar config completa aquí..."
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Project ID</label>
              <input 
                name="projectId"
                value={formData.projectId}
                onChange={handleChange}
                className={`w-full bg-gray-900 border rounded p-2 text-sm outline-none font-mono ${validationError ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-orange-500'}`}
                placeholder="ej. gen-lang-client-..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Database ID (Firestore)</label>
              <div className="relative">
                <Database className="absolute left-2 top-2 text-gray-500 w-4 h-4" />
                <input 
                    name="databaseId"
                    value={formData.databaseId}
                    onChange={handleChange}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 pl-8 text-sm focus:border-orange-500 outline-none font-mono"
                    placeholder="app-videos"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                 Por defecto usará <code>app-videos</code>. Si usas la predeterminada, escribe <code>(default)</code>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Storage Bucket</label>
              <input 
                name="storageBucket"
                value={formData.storageBucket}
                onChange={handleChange}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm focus:border-orange-500 outline-none font-mono"
                placeholder="project.appspot.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Auth Domain</label>
              <input 
                name="authDomain"
                value={formData.authDomain}
                onChange={handleChange}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm focus:border-orange-500 outline-none font-mono"
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full mt-6 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition"
          >
            <Save className="w-5 h-5" />
            Guardar Configuración
          </button>
        </form>
      </div>
    </div>
  );
};

const InfoIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default FirebaseSetupScreen;
