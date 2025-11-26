const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8080;

// --- DIAGNÓSTICO DE SISTEMA DE ARCHIVOS (/tmp) ---
const uploadDir = path.join(os.tmpdir(), 'uploads');

console.log(`[System] Probando escritura en: ${uploadDir}`);
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  // Prueba de escritura real
  const testFile = path.join(uploadDir, 'write_test.txt');
  fs.writeFileSync(testFile, 'Cloud Run Write Test OK');
  fs.unlinkSync(testFile); // Borrarlo después
  console.log('[System] ✅ ÉXITO: El directorio /tmp es escribible.');
} catch (err) {
  console.error('[System] ❌ ERROR CRÍTICO: No se puede escribir en /tmp:', err);
}

// Configuración de Multer
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

// Base de datos en memoria
const tournaments = {}; 

// --- MIDDLEWARE ---
app.use(cors()); 
app.use(express.json({ limit: '500mb' })); 
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// Log de tráfico
app.use((req, res, next) => {
  if (!req.url.includes('assets') && !req.url.includes('node_modules')) {
    console.log(`[REQ] ${req.method} ${req.url}`);
  }
  next();
});

// --- RUTAS API (Prioridad Alta) ---

// Health Check (V1 y V2 para compatibilidad)
app.get(['/api/health', '/api/v2/health'], (req, res) => {
  res.json({ 
    status: 'online', 
    version: 'v6-production',
    writable: true 
  });
});

// Subida de Videos
const handleUpload = (req, res) => {
  console.log('[Upload] Recibiendo petición...');
  
  const uploader = upload.single('video');

  uploader(req, res, (err) => {
    if (err) {
      console.error('[Upload] Fallo Multer:', err);
      // Errores comunes de Multer
      if (err.code === 'LIMIT_FILE_SIZE') {
         return res.status(413).json({ error: 'El archivo es demasiado grande (Máx 4GB).' });
      }
      return res.status(500).json({ error: `Error interno de subida: ${err.message}` });
    }
    
    if (!req.file) {
      console.error('[Upload] No llegó archivo (req.file es undefined)');
      return res.status(400).json({ error: 'No se envió ningún archivo de video.' });
    }

    console.log(`[Upload] Éxito: ${req.file.filename}`);
    
    res.json({ 
      url: `/uploads/${req.file.filename}`, 
      filename: req.file.filename,
      originalName: req.file.originalname
    });
  });
};

app.post('/api/v2/upload', handleUpload);
app.post('/api/upload', handleUpload);

// Torneos
app.post(['/api/tournaments', '/api/v2/tournaments'], (req, res) => {
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

app.get(['/api/tournaments/:code', '/api/v2/tournaments/:code'], (req, res) => {
  const t = tournaments[req.params.code.toUpperCase()];
  t ? res.json(t) : res.status(404).json({ error: 'No encontrado' });
});

app.post(['/api/tournaments/:code/vote', '/api/v2/tournaments/:code/vote'], (req, res) => {
  const t = tournaments[req.params.code.toUpperCase()];
  if (t) {
    t.votes.push(req.body.voteRecord);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'No encontrado' });
  }
});

app.get(['/api/tournaments/:code/results', '/api/v2/tournaments/:code/results'], (req, res) => {
  const t = tournaments[req.params.code.toUpperCase()];
  t ? res.json({ votes: t.votes, videos: t.videos }) : res.status(404).json({ error: 'No encontrado' });
});

// --- SERVIR ARCHIVOS ESTÁTICOS ---

// 1. Videos (Desde /tmp)
app.use('/uploads', express.static(uploadDir));

// 2. Frontend (Desde /dist compilado)
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
  console.log('[Server] Sirviendo Frontend desde:', distPath);
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Fallback de emergencia si falló el build
  console.error('[Server] ALERTA: No existe carpeta dist. El build falló.');
  app.get('*', (req, res) => {
    res.status(500).send('<h1>Error de Despliegue</h1><p>El frontend no se compiló correctamente.</p>');
  });
}

const server = app.listen(PORT, () => {
  console.log(`--- SERVER V6 ONLINE ON PORT ${PORT} ---`);
});

// Timeouts extremos para subidas lentas
server.keepAliveTimeout = 3600000;
server.headersTimeout = 3600000;
server.timeout = 3600000;