import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const dbPath = process.env.DB_PATH || path.join(dataDir, 'registro-vivo.json');
const appPassword = process.env.APP_PASSWORD || 'admin';
const sessionSecret = process.env.APP_SECRET || crypto.randomBytes(32).toString('hex');
const port = Number(process.env.PORT || 4174);
const trashTtlMs = 30 * 24 * 60 * 60 * 1000;

const defaultState = {
  version: 1,
  updatedAt: new Date().toISOString(),
  documents: [],
  activity: []
};

function now() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', sessionSecret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verify(token) {
  if (!token || !token.includes('.')) return false;
  const [body, signature] = token.split('.');
  const expected = crypto.createHmac('sha256', sessionSecret).update(body).digest('base64url');
  if (signature.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  return payload.exp > Date.now();
}

async function ensureDb() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dbPath);
  } catch {
    await saveState(defaultState);
  }
}

async function loadState() {
  await ensureDb();
  const raw = await fs.readFile(dbPath, 'utf8');
  const state = JSON.parse(raw);
  return cleanupTrash({ ...defaultState, ...state });
}

async function saveState(state) {
  const clean = cleanupTrash({
    ...defaultState,
    ...state,
    updatedAt: now()
  });
  const tmpPath = `${dbPath}.tmp`;
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(tmpPath, JSON.stringify(clean, null, 2));
  await fs.rename(tmpPath, dbPath);
  return clean;
}

function cleanupTrash(state) {
  const cutoff = Date.now() - trashTtlMs;
  return {
    ...state,
    documents: state.documents.filter((doc) => !doc.deletedAt || new Date(doc.deletedAt).getTime() > cutoff)
  };
}

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!verify(token)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}

function pushActivity(state, action, details = {}) {
  state.activity = [
    {
      id: makeId('act'),
      action,
      details,
      createdAt: now()
    },
    ...state.activity
  ].slice(0, 120);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.post('/api/login', (req, res) => {
  if (req.body?.password !== appPassword) {
    res.status(401).json({ error: 'invalid_password' });
    return;
  }
  res.json({
    token: sign({ sub: 'registro-vivo', exp: Date.now() + 1000 * 60 * 60 * 18 })
  });
});

app.get('/api/state', requireAuth, async (_req, res) => {
  res.json(await loadState());
});

app.put('/api/state', requireAuth, async (req, res) => {
  const incoming = req.body?.state;
  if (!incoming || typeof incoming !== 'object') {
    res.status(400).json({ error: 'invalid_state' });
    return;
  }
  const saved = await saveState(incoming);
  res.json(saved);
});

app.post('/api/documents', requireAuth, async (req, res) => {
  const state = await loadState();
  const document = {
    id: makeId('doc'),
    title: String(req.body?.title || 'Documento sem nome').trim(),
    owner: String(req.body?.owner || '').trim(),
    context: String(req.body?.context || '').trim(),
    color: req.body?.color || '#69b578',
    createdAt: now(),
    updatedAt: now(),
    deletedAt: null,
    tasks: Array.isArray(req.body?.tasks)
      ? req.body.tasks.map((task, index) => ({
          id: makeId('task'),
          text: String(task.text || task || '').trim(),
          done: Boolean(task.done),
          order: index,
          note: '',
          createdAt: now(),
          updatedAt: now()
        }))
      : []
  };
  state.documents.unshift(document);
  pushActivity(state, 'document_created', { title: document.title });
  res.status(201).json(await saveState(state));
});

app.delete('/api/trash', requireAuth, async (req, res) => {
  if (req.body?.password !== appPassword) {
    res.status(401).json({ error: 'invalid_password' });
    return;
  }
  const state = await loadState();
  state.documents = state.documents.filter((doc) => !doc.deletedAt);
  pushActivity(state, 'trash_emptied');
  res.json(await saveState(state));
});

const distDir = path.join(rootDir, 'dist');
app.use(express.static(distDir));
app.get(/^(?!\/api).*/, async (_req, res, next) => {
  try {
    await fs.access(path.join(distDir, 'index.html'));
    res.sendFile(path.join(distDir, 'index.html'));
  } catch (error) {
    next(error);
  }
});

app.listen(port, () => {
  console.log(`Registro Vivo API running on http://127.0.0.1:${port}`);
});
