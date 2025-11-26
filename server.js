const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os'); // Importante para compatibilidad de sistema
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8080;

// -- Middleware --
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// -- Storage Configuration --
// Usamos el directorio temporal del sistema operativo.
// En Cloud Run (Linux) será /tmp. En Windows será C:\Users\...\AppData\Local\Temp
const uploadDir = path.join(os.tmpdir(), 'juez-videos-uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

console.log(`Storage directory set to: ${uploadDir}`);

// Serve uploaded videos statically
app.use('/uploads', express.static(uploadDir));

// Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

// Limit file size to 3GB
const upload = multer({ 
  storage,
  limits: { fileSize: 3000 * 1024 * 1024 } 
});

// -- In-Memory State --
const tournaments = {}; 

// -- Routes --
app.get('/api/health', (req, res) => res.send('OK'));

app.post('/api/upload', (req, res) => {
  console.log(`[Upload] Starting upload for file: ${req.headers['content-length']} bytes`);
  const uploadSingle = upload.single('video');

  uploadSingle(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error("[Upload] Multer Error:", err);
      return res.status(500).json({ error: err.message });
    } else if (err) {
      console.error("[Upload] Unknown Error:", err);
      return res.status(500).json({ error: "Unknown upload error" });
    }

    if (!req.file) {
      console.error("[Upload] No file received");
      return res.status(400).json({ error: 'No video file provided' });
    }
    
    console.log(`[Upload] Success: ${req.file.filename}`);
    
    // Devolvemos la URL relativa. En el frontend se puede usar directamente.
    const publicUrl = `/uploads/${req.file.filename}`;
    res.json({ 
      url: publicUrl, 
      filename: req.file.filename
    });
  });
});

app.post('/api/tournaments', (req, res) => {
  try {
    const { name, hostId, videos } = req.body;
    console.log(`[Tournament] Creating tournament: ${name}`);
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    tournaments[code] = {
      id: code,
      name,
      hostId,
      videos,
      createdAt: Date.now(),
      votes: [] 
    };
    console.log(`[Tournament] Created with code: ${code}`);
    res.json(tournaments[code]);
  } catch (e) {
    console.error("[Tournament] Create Error", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get('/api/tournaments/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const tournament = tournaments[code];
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
  res.json(tournament);
});

app.post('/api/tournaments/:code/vote', (req, res) => {
  const code = req.params.code.toUpperCase();
  const { voteRecord } = req.body;
  if (tournaments[code]) {
    tournaments[code].votes.push(voteRecord);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Tournament not found' });
  }
});

app.get('/api/tournaments/:code/results', (req, res) => {
  const code = req.params.code.toUpperCase();
  if (tournaments[code]) {
    res.json({ votes: tournaments[code].votes, videos: tournaments[code].videos });
  } else {
    res.status(404).json({ error: 'Tournament not found' });
  }
});

// -- Serve Frontend --
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.log("DIST folder not found. Running in API-only mode or dev mode.");
  app.get('/', (req, res) => res.send('Backend running. Frontend not built.'));
}

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Timeout settings for slow uploads (3GB support)
server.keepAliveTimeout = 3600000;
server.headersTimeout = 3600000;
server.timeout = 3600000;