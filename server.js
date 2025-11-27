const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// Base de datos en memoria (Volátil: se borra si el servidor se reinicia)
const tournaments = {}; 

// --- MIDDLEWARE ---
app.use(cors()); 
// Aumentamos el límite a 50mb por si envían muchísimos links de golpe
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Log de tráfico básico
app.use((req, res, next) => {
  if (!req.url.includes('assets')) {
    console.log(`[REQ] ${req.method} ${req.url}`);
  }
  next();
});

// --- CONTROLADORES ---

const healthHandler = (req, res) => {
  res.json({ status: 'online', mode: 'drive-links' });
};

const createTournamentHandler = (req, res) => {
  console.log(`[API] Intentando crear torneo...`);
  try {
    const { name, hostId, videos, hostName } = req.body;
    
    // Validación estricta
    if (!name || !videos || !Array.isArray(videos)) {
      console.error("[Error] Datos inválidos al crear torneo:", req.body ? "Body recibido" : "Body vacío");
      return res.status(400).json({ error: 'Faltan datos requeridos o el formato de videos es incorrecto.' });
    }

    if (videos.length < 2) {
       return res.status(400).json({ error: 'Se necesitan al menos 2 videos.' });
    }
    
    // Generar código corto de 5 letras
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    tournaments[code] = { 
      id: code, 
      name, 
      hostId, 
      hostName: hostName || 'Admin', // Guardar nombre del creador
      videos, 
      createdAt: Date.now(), 
      votes: [] 
    };
    
    console.log(`[Tournament] Creado EXITOSO: ${code} - "${name}" por ${hostName} con ${videos.length} videos`);
    res.json(tournaments[code]);
  } catch (e) {
    console.error("Server Error en createTournament:", e);
    res.status(500).json({ error: e.message || "Error interno del servidor" });
  }
};

const getTournamentHandler = (req, res) => {
  const code = req.params.code.toUpperCase();
  const t = tournaments[code];
  if (t) {
    res.json(t);
  } else {
    res.status(404).json({ error: 'Torneo no encontrado' });
  }
};

const voteHandler = (req, res) => {
  const code = req.params.code.toUpperCase();
  const t = tournaments[code];
  if (t) {
    t.votes.push(req.body.voteRecord);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Torneo no encontrado' });
  }
};

const resultsHandler = (req, res) => {
  const code = req.params.code.toUpperCase();
  const t = tournaments[code];
  if (t) {
    res.json({ votes: t.votes, videos: t.videos });
  } else {
    res.status(404).json({ error: 'Torneo no encontrado' });
  }
};

// --- RUTAS API (Definidas explícitamente para evitar problemas de array) ---

// Health
app.get('/api/health', healthHandler);
app.get('/api/v2/health', healthHandler);

// Tournaments
app.post('/api/tournaments', createTournamentHandler);
app.post('/api/v2/tournaments', createTournamentHandler);

app.get('/api/tournaments/:code', getTournamentHandler);
app.get('/api/v2/tournaments/:code', getTournamentHandler);

// Actions
app.post('/api/tournaments/:code/vote', voteHandler);
app.post('/api/v2/tournaments/:code/vote', voteHandler);

app.get('/api/tournaments/:code/results', resultsHandler);
app.get('/api/v2/tournaments/:code/results', resultsHandler);


// Manejo de 404 para API (evita devolver HTML en rutas API desconocidas)
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `Ruta API no encontrada: ${req.method} ${req.url}` });
});

// --- SERVIR FRONTEND ---
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('*', (req, res) => {
    // Si no hay build, al menos responder algo en la raíz
    res.send('<h1>Servidor Backend Activo</h1><p>El frontend no está compilado en /dist.</p>');
  });
}

// Escuchar en 0.0.0.0 para que sea accesible desde la red local
app.listen(PORT, '0.0.0.0', () => {
  console.log(`--- SERVER (DRIVE MODE) ONLINE ON PORT ${PORT} ---`);
  console.log(`    Local:   http://localhost:${PORT}`);
  console.log(`    Network: Escuchando en todas las interfaces (0.0.0.0)`);
});