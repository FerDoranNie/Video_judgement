const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8080;

// --- 0. DIAGNÓSTICO DE INICIO ---
console.log("================================================");
console.log("   SERVIDOR INICIANDO - VERSIÓN V5 (DUAL ROUTE)");
console.log("   Soporta: /api/upload Y /api/v2/upload");
console.log("================================================");

// --- 1. MIDDLEWARE BASE ---
app.use((req, res, next) => {
  console.log(`[TRAFICO] ${req.method} ${req.url}`);
  next();
});

app.use(cors());

// Aumentamos límites masivos para videos
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// --- 2. CONFIGURACIÓN DE ALMACENAMIENTO ---
const uploadDir = path.join(os.tmpdir(), 'juez-videos-uploads');

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  console.log(`[Storage] Carpeta temporal lista en: ${uploadDir}`);
} catch (err) {
  console.error("[Storage] Error crítico creando carpeta:", err);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 4000 * 1024 * 1024 } // 4GB Limit
});

// --- 3. BASE DE DATOS EN MEMORIA ---
const tournaments = {}; 

// --- 4. CONTROLADOR DE SUBIDA UNIFICADO ---
const handleUpload = (req, res) => {
  console.log(`[Upload] Recibida petición en ${req.url}. Memoria Libre: ${(os.freemem()/1024/1024).toFixed(0)}MB`);
  
  const uploadSingle = upload.single('video');

  uploadSingle(req, res, function (err) {
    if (err) {
      console.error("[Upload] Falló:", err);
      // Devolver JSON incluso en error de Multer
      return res.status(500).json({ error: `Server Upload Error: ${err.message}` });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió archivo (req.file empty)' });
    }
    
    console.log(`[Upload] Éxito: ${req.file.filename} (${(req.file.size/1024/1024).toFixed(2)} MB)`);
    
    res.json({ 
      url: `/uploads/${req.file.filename}`, 
      filename: req.file.filename,
      size: req.file.size
    });
  });
};

// --- RUTAS API (DEFINIDAS ANTES DE ESTÁTICOS) ---

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: 'v5-dual', storage: uploadDir });
});

// RUTA V2 (Nueva)
app.post('/api/v2/upload', handleUpload);

// RUTA V1 (Legacy/Zombie Frontend Support)
// Esto arreglará el error 404 si el frontend viejo sigue vivo en caché
app.post('/api/upload', handleUpload);


// --- RUTAS DE TORNEO ---
app.post('/api/v2/tournaments', (req, res) => {
  try {
    const { name, hostId, videos } = req.body;
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    tournaments[code] = { 
      id: code, 
      name, 
      hostId, 
      videos, 
      createdAt: Date.now(), 
      votes: [] 
    };
    
    console.log(`[Tournament] Creado: ${code} con ${videos.length} videos`);
    res.json(tournaments[code]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/v2/tournaments/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const t = tournaments[code];
  if (t) {
    res.json(t);
  } else {
    res.status(404).json({ error: 'Torneo no encontrado' });
  }
});

app.post('/api/v2/tournaments/:code/vote', (req, res) => {
  const code = req.params.code.toUpperCase();
  const t = tournaments[code];
  if (t) {
    t.votes.push(req.body.voteRecord);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Torneo no encontrado' });
  }
});

app.get('/api/v2/tournaments/:code/results', (req, res) => {
  const code = req.params.code.toUpperCase();
  const t = tournaments[code];
  if (t) {
    res.json({ votes: t.votes, videos: t.videos });
  } else {
    res.status(404).json({ error: 'Torneo no encontrado' });
  }
});

// --- MANEJO DE ERRORES API ---
app.all('/api*', (req, res) => {
  console.log(`[API 404] ${req.method} ${req.url}`);
  res.status(404).json({ error: `Ruta API no encontrada: ${req.url}` });
});

// --- 5. SERVIR ARCHIVOS ESTÁTICOS ---

// Servir videos subidos
app.use('/uploads', express.static(uploadDir));

// Servir Frontend compilado
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  console.log(`[Frontend] Sirviendo desde: ${distPath}`);
  app.use(express.static(distPath));
  
  // SPA Fallback
  app.get('*', (req, res) => {
    // Si llegamos aquí y es POST, es un error 404 real de API que se escapó
    if (req.method === 'POST') {
       return res.status(404).json({ error: "Cannot POST to non-api route" });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.log("[Frontend] ALERTA: Carpeta 'dist' no encontrada.");
  app.get('/', (req, res) => res.send('Backend V5 Online. Frontend no compilado. Revisa logs de build.'));
}

// --- 6. INICIAR SERVIDOR ---
const server = app.listen(PORT, () => {
  console.log(`--- ESCUCHANDO EN PUERTO ${PORT} ---`);
});

// Timeouts extendidos para subidas grandes
server.keepAliveTimeout = 3600000;
server.headersTimeout = 3600000;
server.timeout = 3600000;