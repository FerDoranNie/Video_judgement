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
console.log("   SERVIDOR INICIANDO - VERSIÓN V3 (API PRIMERO)");
console.log("   Si ves esto, la actualización fue exitosa.");
console.log("================================================");

// --- 1. MIDDLEWARE BASE ---
app.use((req, res, next) => {
  // Log para ver cada petición que entra. Si no sale esto en Cloud Run, la petición no llega.
  console.log(`[TRAFICO] ${req.method} ${req.url}`);
  next();
});

app.use(cors());

// Aumentamos límites para evitar errores 413
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// --- 2. CONFIGURACIÓN DE ALMACENAMIENTO ---
// En Cloud Run, SOLO se puede escribir en /tmp (y usa RAM)
// Si subes videos de 1GB, necesitas instancias de 2GB+ de RAM.
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

// Límite de 3GB (Cloud Run debe tener 4GB+ RAM)
const upload = multer({ 
  storage,
  limits: { fileSize: 3000 * 1024 * 1024 } 
});

// --- 3. BASE DE DATOS EN MEMORIA ---
// ¡OJO! Si Cloud Run escala a 0, esto se borra. Usar --min-instances 1
const tournaments = {}; 

// --- 4. RUTAS API (DEFINIDAS ANTES DE CUALQUIER OTRA COSA) ---

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: 'v3', storage: uploadDir });
});

app.post('/api/upload', (req, res) => {
  console.log(`[Upload] Iniciando subida... Memoria Libre: ${(os.freemem()/1024/1024).toFixed(0)}MB`);
  
  const uploadSingle = upload.single('video');

  uploadSingle(req, res, function (err) {
    if (err) {
      console.error("[Upload] Error:", err);
      // Devolver JSON siempre para errores de API
      return res.status(500).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió archivo' });
    }
    
    console.log(`[Upload] Éxito: ${req.file.filename} (${(req.file.size/1024/1024).toFixed(2)} MB)`);
    
    // Devolvemos la URL para acceder al archivo
    res.json({ 
      url: `/uploads/${req.file.filename}`, 
      filename: req.file.filename 
    });
  });
});

app.post('/api/tournaments', (req, res) => {
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

app.get('/api/tournaments/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const t = tournaments[code];
  if (t) {
    res.json(t);
  } else {
    res.status(404).json({ error: 'Torneo no encontrado' });
  }
});

app.post('/api/tournaments/:code/vote', (req, res) => {
  const code = req.params.code.toUpperCase();
  const t = tournaments[code];
  if (t) {
    t.votes.push(req.body.voteRecord);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Torneo no encontrado' });
  }
});

app.get('/api/tournaments/:code/results', (req, res) => {
  const code = req.params.code.toUpperCase();
  const t = tournaments[code];
  if (t) {
    res.json({ votes: t.votes, videos: t.videos });
  } else {
    res.status(404).json({ error: 'Torneo no encontrado' });
  }
});

// --- 5. SERVIR ARCHIVOS ESTÁTICOS ---

// A) Videos subidos
app.use('/uploads', express.static(uploadDir));

// B) Frontend (App React)
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
  console.log(`[Frontend] Sirviendo carpeta dist: ${distPath}`);
  app.use(express.static(distPath));
  
  // SPA Fallback: Cualquier ruta no-API devuelve index.html
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return res.status(404).json({ error: 'Not Found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.error("!!! ERROR CRÍTICO: NO EXISTE LA CARPETA 'dist' !!!");
  console.error("El build de Docker falló o no se ejecutó.");
  app.get('/', (req, res) => res.send('Backend V3 Online. Error: Frontend no compilado.'));
}

// --- 6. INICIAR SERVIDOR ---
const server = app.listen(PORT, () => {
  console.log(`--- ESCUCHANDO EN PUERTO ${PORT} ---`);
});

// Timeouts largos para subir archivos grandes
server.keepAliveTimeout = 3600000; // 1 hora
server.headersTimeout = 3600000;
server.timeout = 3600000;