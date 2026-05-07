import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArchiveRestore,
  Check,
  ChevronDown,
  Circle,
  Clock3,
  FileText,
  Filter,
  GripVertical,
  Lightbulb,
  ListPlus,
  Lock,
  LogOut,
  Plus,
  Redo2,
  RotateCcw,
  Search,
  Trash2,
  Undo2,
  X
} from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'registro-vivo-state';
const TOKEN_KEY = 'registro-vivo-token';
const COLORS = ['#69b578', '#e0a458', '#5d8aa8', '#d96570', '#7b6bb7'];

const emptyState = {
  version: 1,
  updatedAt: new Date().toISOString(),
  documents: [],
  activity: []
};

function uid(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function isoNow() {
  return new Date().toISOString();
}

function formatShortDate(value) {
  if (!value) return 'sem data';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value));
}

function completion(doc) {
  if (!doc.tasks?.length) return 0;
  return Math.round((doc.tasks.filter((task) => task.done).length / doc.tasks.length) * 100);
}

function isComplete(doc) {
  return doc.tasks?.length > 0 && doc.tasks.every((task) => task.done);
}

async function api(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function readLocalState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || emptyState;
  } catch {
    return emptyState;
  }
}

function writeLocalState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, updatedAt: isoNow() }));
}

function addActivity(state, action, details = {}) {
  return {
    ...state,
    activity: [
      {
        id: uid('act'),
        action,
        details,
        createdAt: isoNow()
      },
      ...(state.activity || [])
    ].slice(0, 120)
  };
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [state, setState] = useState(emptyState);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('active');
  const [syncMode, setSyncMode] = useState('carregando');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [trashPasswordOpen, setTrashPasswordOpen] = useState(false);
  const saveTimer = useRef(null);
  const firstLoad = useRef(true);

  const selected = useMemo(
    () => state.documents.find((doc) => doc.id === selectedId) || state.documents.find((doc) => !doc.deletedAt),
    [selectedId, state.documents]
  );

  const visibleDocs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return state.documents
      .filter((doc) => {
        if (filter === 'trash') return Boolean(doc.deletedAt);
        if (doc.deletedAt) return false;
        if (filter === 'done') return isComplete(doc);
        if (filter === 'pending') return !isComplete(doc);
        return true;
      })
      .filter((doc) => {
        if (!needle) return true;
        return [doc.title, doc.owner, doc.context, ...(doc.tasks || []).map((task) => task.text)]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      });
  }, [filter, query, state.documents]);

  const activeCount = state.documents.filter((doc) => !doc.deletedAt).length;
  const pendingCount = state.documents.filter((doc) => !doc.deletedAt && !isComplete(doc)).length;
  const doneCount = state.documents.filter((doc) => !doc.deletedAt && isComplete(doc)).length;

  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        const remote = await api('/api/state');
        setState(remote);
        setSyncMode('sincronizado');
      } catch {
        const local = readLocalState();
        setState(local);
        setSyncMode('local');
      } finally {
        firstLoad.current = false;
      }
    }
    load();
  }, [token]);

  useEffect(() => {
    if (!token || firstLoad.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const remote = await api('/api/state', {
          method: 'PUT',
          body: JSON.stringify({ state })
        });
        setState(remote);
        setSyncMode('sincronizado');
      } catch {
        writeLocalState(state);
        setSyncMode('local');
      }
    }, 350);
    return () => clearTimeout(saveTimer.current);
  }, [state, token]);

  const commit = useCallback((producer, actionLabel, details) => {
    setState((current) => {
      setHistory((items) => [current, ...items].slice(0, 30));
      setFuture([]);
      const next = producer(current);
      return addActivity({ ...next, updatedAt: isoNow() }, actionLabel, details);
    });
  }, []);

  function login(event) {
    event.preventDefault();
    setLoginError('');
    api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ password })
    })
      .then((result) => {
        localStorage.setItem(TOKEN_KEY, result.token);
        setToken(result.token);
        setPassword('');
      })
      .catch(() => {
        if (password === 'admin') {
          localStorage.setItem(TOKEN_KEY, 'local-demo');
          setToken('local-demo');
          setState(readLocalState());
          setSyncMode('local');
          firstLoad.current = false;
          return;
        }
        setLoginError('Senha incorreta.');
      });
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setState(emptyState);
  }

  function undo() {
    if (!history.length) return;
    setFuture((items) => [state, ...items].slice(0, 30));
    setState(history[0]);
    setHistory((items) => items.slice(1));
  }

  function redo() {
    if (!future.length) return;
    setHistory((items) => [state, ...items].slice(0, 30));
    setState(future[0]);
    setFuture((items) => items.slice(1));
  }

  function createDocument(payload) {
    const document = {
      id: uid('doc'),
      title: payload.title.trim() || 'Documento sem nome',
      owner: payload.owner.trim(),
      context: payload.context.trim(),
      color: payload.color,
      createdAt: isoNow(),
      updatedAt: isoNow(),
      deletedAt: null,
      tasks: payload.tasks.map((task, index) => ({
        id: uid('task'),
        text: task,
        done: false,
        order: index,
        note: '',
        createdAt: isoNow(),
        updatedAt: isoNow()
      }))
    };
    commit(
      (current) => ({ ...current, documents: [document, ...current.documents] }),
      'document_created',
      { title: document.title }
    );
    setSelectedId(document.id);
    setWizardOpen(false);
  }

  function patchDocument(docId, updater, action = 'document_updated') {
    commit(
      (current) => ({
        ...current,
        documents: current.documents.map((doc) =>
          doc.id === docId ? { ...updater(doc), updatedAt: isoNow() } : doc
        )
      }),
      action
    );
  }

  function moveTask(docId, taskId, direction) {
    patchDocument(docId, (doc) => {
      const tasks = [...doc.tasks].sort((a, b) => a.order - b.order);
      const index = tasks.findIndex((task) => task.id === taskId);
      const target = index + direction;
      if (target < 0 || target >= tasks.length) return doc;
      [tasks[index], tasks[target]] = [tasks[target], tasks[index]];
      return { ...doc, tasks: tasks.map((task, order) => ({ ...task, order })) };
    });
  }

  function emptyTrash(passwordValue) {
    api('/api/trash', {
      method: 'DELETE',
      body: JSON.stringify({ password: passwordValue })
    })
      .then((remote) => {
        setState(remote);
        setTrashPasswordOpen(false);
      })
      .catch(() => {
        if (passwordValue === 'admin') {
          commit(
            (current) => ({
              ...current,
              documents: current.documents.filter((doc) => !doc.deletedAt)
            }),
            'trash_emptied'
          );
          setTrashPasswordOpen(false);
        }
      });
  }

  if (!token) {
    return <Login password={password} setPassword={setPassword} login={login} error={loginError} />;
  }

  return (
    <main className="shell">
      <Header
        syncMode={syncMode}
        activeCount={activeCount}
        pendingCount={pendingCount}
        doneCount={doneCount}
        onAdd={() => setWizardOpen(true)}
        onUndo={undo}
        onRedo={redo}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        onLogout={logout}
      />

      <section className="workspace">
        <aside className="sidebar" aria-label="Documentos">
          <div className="searchbox">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar documento ou alteracao" />
          </div>

          <div className="filters">
            {[
              ['active', 'Ativos'],
              ['pending', 'Pendentes'],
              ['done', 'Finalizados'],
              ['trash', 'Lixeira']
            ].map(([id, label]) => (
              <button className={filter === id ? 'active' : ''} key={id} onClick={() => setFilter(id)}>
                <Filter size={15} />
                {label}
              </button>
            ))}
          </div>

          <div className="doc-list">
            {visibleDocs.map((doc) => (
              <button className={`doc-card ${selected?.id === doc.id ? 'selected' : ''}`} key={doc.id} onClick={() => setSelectedId(doc.id)}>
                <span className="doc-accent" style={{ background: doc.color }} />
                <span className="doc-title-row">
                  <strong>{doc.title}</strong>
                  {isComplete(doc) ? <Lightbulb className="lamp on" size={18} /> : <Lightbulb className="lamp" size={18} />}
                </span>
                <span>{doc.context || doc.owner || 'Sem observacao'}</span>
                <span className="progress"><i style={{ width: `${completion(doc)}%`, background: doc.color }} /></span>
              </button>
            ))}
            {!visibleDocs.length && <div className="empty">Nada por aqui ainda.</div>}
          </div>
        </aside>

        <section className="detail">
          {selected ? (
            <DocumentDetail
              doc={selected}
              patchDocument={patchDocument}
              moveTask={moveTask}
            />
          ) : (
            <BlankState onAdd={() => setWizardOpen(true)} />
          )}
        </section>

        <aside className="right-rail" aria-label="Historico">
          <ActivityPanel activity={state.activity} />
          {filter === 'trash' && (
            <button className="danger full" onClick={() => setTrashPasswordOpen(true)}>
              <Trash2 size={17} />
              Esvaziar lixeira
            </button>
          )}
        </aside>
      </section>

      {wizardOpen && <CreateWizard onClose={() => setWizardOpen(false)} onCreate={createDocument} />}
      {trashPasswordOpen && <PasswordModal onClose={() => setTrashPasswordOpen(false)} onConfirm={emptyTrash} />}
    </main>
  );
}

function Login({ password, setPassword, login, error }) {
  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="brand-mark"><FileText size={30} /></div>
        <h1>Registro Vivo</h1>
        <p>Controle compartilhado para documentos, alteracoes, pendencias e reunioes.</p>
        <form onSubmit={login}>
          <label>
            <span>Acesso</span>
            <input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <small className="error">{error}</small>}
          <button className="primary" type="submit">
            <Lock size={18} />
            Entrar
          </button>
        </form>
      </section>
    </main>
  );
}

function Header({ syncMode, activeCount, pendingCount, doneCount, onAdd, onUndo, onRedo, canUndo, canRedo, onLogout }) {
  return (
    <header className="topbar">
      <div>
        <span className="eyebrow">Controle de documentos</span>
        <h1>Registro Vivo</h1>
      </div>
      <div className="stats">
        <Stat label="ativos" value={activeCount} />
        <Stat label="pendentes" value={pendingCount} tone="warm" />
        <Stat label="finalizados" value={doneCount} tone="good" />
      </div>
      <div className="toolbar">
        <span className={`sync ${syncMode}`}>{syncMode}</span>
        <IconButton label="Desfazer" icon={Undo2} onClick={onUndo} disabled={!canUndo} />
        <IconButton label="Refazer" icon={Redo2} onClick={onRedo} disabled={!canRedo} />
        <button className="primary" onClick={onAdd}>
          <Plus size={18} />
          Novo
        </button>
        <IconButton label="Sair" icon={LogOut} onClick={onLogout} />
      </div>
    </header>
  );
}

function Stat({ label, value, tone = '' }) {
  return (
    <div className={`stat ${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function IconButton({ label, icon: Icon, ...props }) {
  return (
    <button className="icon-button" title={label} aria-label={label} {...props}>
      <Icon size={18} />
    </button>
  );
}

function DocumentDetail({ doc, patchDocument, moveTask }) {
  const [newTask, setNewTask] = useState('');
  const [draggingTask, setDraggingTask] = useState(null);
  const sortedTasks = [...(doc.tasks || [])].sort((a, b) => a.order - b.order);

  function addTask() {
    const text = newTask.trim();
    if (!text) return;
    patchDocument(doc.id, (current) => ({
      ...current,
      tasks: [
        ...current.tasks,
        {
          id: uid('task'),
          text,
          done: false,
          order: current.tasks.length,
          note: '',
          createdAt: isoNow(),
          updatedAt: isoNow()
        }
      ]
    }));
    setNewTask('');
  }

  function dropTask(targetId) {
    if (!draggingTask || draggingTask === targetId) return;
    patchDocument(doc.id, (current) => {
      const tasks = [...current.tasks].sort((a, b) => a.order - b.order);
      const from = tasks.findIndex((task) => task.id === draggingTask);
      const to = tasks.findIndex((task) => task.id === targetId);
      if (from < 0 || to < 0) return current;
      const [moved] = tasks.splice(from, 1);
      tasks.splice(to, 0, moved);
      return { ...current, tasks: tasks.map((task, order) => ({ ...task, order })) };
    });
    setDraggingTask(null);
  }

  return (
    <article className="doc-detail">
      <div className="detail-head">
        <div>
          <span className="eyebrow">Documento</span>
          <input
            className="title-input"
            value={doc.title}
            onChange={(event) => patchDocument(doc.id, (current) => ({ ...current, title: event.target.value }))}
          />
          <div className="meta-line">
            <span><Clock3 size={15} /> Atualizado {formatShortDate(doc.updatedAt)}</span>
            <span><Check size={15} /> {completion(doc)}%</span>
          </div>
        </div>
        <div className={`big-lamp ${isComplete(doc) ? 'complete' : ''}`}>
          <Lightbulb size={25} />
        </div>
      </div>

      <div className="field-grid">
        <label>
          <span>Responsavel ou pedido por</span>
          <input value={doc.owner} onChange={(event) => patchDocument(doc.id, (current) => ({ ...current, owner: event.target.value }))} />
        </label>
        <label>
          <span>Contexto rapido</span>
          <input value={doc.context} onChange={(event) => patchDocument(doc.id, (current) => ({ ...current, context: event.target.value }))} />
        </label>
      </div>

      <section className="task-panel">
        <div className="section-title">
          <h2>Alteracoes e pendencias</h2>
          <span>{sortedTasks.filter((task) => task.done).length}/{sortedTasks.length}</span>
        </div>
        <div className="task-list">
          {sortedTasks.map((task, index) => (
            <div
              className={`task ${task.done ? 'done' : ''}`}
              draggable
              key={task.id}
              onDragStart={() => setDraggingTask(task.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dropTask(task.id)}
            >
              <GripVertical size={18} />
              <button
                className="check-button"
                onClick={() =>
                  patchDocument(doc.id, (current) => ({
                    ...current,
                    tasks: current.tasks.map((item) => item.id === task.id ? { ...item, done: !item.done, updatedAt: isoNow() } : item)
                  }))
                }
                aria-label="Marcar item"
              >
                {task.done ? <Check size={18} /> : <Circle size={18} />}
              </button>
              <input
                value={task.text}
                onChange={(event) =>
                  patchDocument(doc.id, (current) => ({
                    ...current,
                    tasks: current.tasks.map((item) => item.id === task.id ? { ...item, text: event.target.value, updatedAt: isoNow() } : item)
                  }))
                }
              />
              <div className="order-buttons">
                <button disabled={index === 0} onClick={() => moveTask(doc.id, task.id, -1)}>↑</button>
                <button disabled={index === sortedTasks.length - 1} onClick={() => moveTask(doc.id, task.id, 1)}>↓</button>
              </div>
              <button
                className="ghost"
                onClick={() =>
                  patchDocument(doc.id, (current) => ({
                    ...current,
                    tasks: current.tasks.filter((item) => item.id !== task.id).map((item, order) => ({ ...item, order }))
                  }))
                }
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <div className="task add-task">
            <ListPlus size={18} />
            <input
              value={newTask}
              onChange={(event) => setNewTask(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && addTask()}
              placeholder="Adicionar outra alteracao"
            />
            <button className="primary compact" onClick={addTask}><Plus size={17} /></button>
          </div>
        </div>
      </section>

      <section className="meeting-strip">
        <div>
          <h2>Cola para reuniao</h2>
          <p>{sortedTasks.length ? 'Use os marcadores para saber o que ja foi falado.' : 'Adicione alteracoes para montar a pauta.'}</p>
        </div>
        <div className="chips">
          {sortedTasks.map((task) => (
            <span className={task.done ? 'chip done' : 'chip'} key={task.id}>{task.text}</span>
          ))}
        </div>
      </section>

      {doc.deletedAt ? (
        <button
          className="primary"
          onClick={() => patchDocument(doc.id, (current) => ({ ...current, deletedAt: null }), 'document_restored')}
        >
          <RotateCcw size={17} />
          Restaurar
        </button>
      ) : (
        <button
          className="danger"
          onClick={() => patchDocument(doc.id, (current) => ({ ...current, deletedAt: isoNow() }), 'document_deleted')}
        >
          <Trash2 size={17} />
          Mover para lixeira
        </button>
      )}
    </article>
  );
}

function ActivityPanel({ activity }) {
  const labels = {
    document_created: 'Documento criado',
    document_updated: 'Documento atualizado',
    document_deleted: 'Movido para lixeira',
    document_restored: 'Documento restaurado',
    trash_emptied: 'Lixeira limpa'
  };
  return (
    <section className="rail-panel">
      <div className="section-title">
        <h2>Historico</h2>
        <ArchiveRestore size={18} />
      </div>
      <div className="timeline">
        {(activity || []).slice(0, 7).map((item) => (
          <div key={item.id}>
            <strong>{labels[item.action] || item.action}</strong>
            <span>{formatShortDate(item.createdAt)}</span>
          </div>
        ))}
        {!activity?.length && <p className="muted">O historico aparece aqui.</p>}
      </div>
    </section>
  );
}

function CreateWizard({ onClose, onCreate }) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState('');
  const [context, setContext] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [taskText, setTaskText] = useState('');
  const [tasks, setTasks] = useState([]);
  const [dragging, setDragging] = useState(null);

  function addTask() {
    const text = taskText.trim();
    if (!text) return;
    setTasks((items) => [...items, text]);
    setTaskText('');
  }

  function move(index, direction) {
    const next = [...tasks];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setTasks(next);
  }

  function drop(index) {
    if (dragging === null || dragging === index) return;
    const next = [...tasks];
    const [moved] = next.splice(dragging, 1);
    next.splice(index, 0, moved);
    setTasks(next);
    setDragging(null);
  }

  return (
    <div className="modal-backdrop">
      <section className="modal">
        <div className="modal-head">
          <div>
            <span className="eyebrow">Novo registro</span>
            <h2>{step === 1 ? 'O que voce gostaria de se lembrar?' : 'O que foi alterado?'}</h2>
          </div>
          <IconButton label="Fechar" icon={X} onClick={onClose} />
        </div>

        {step === 1 ? (
          <div className="wizard-fields">
            <label>
              <span>Nome do documento</span>
              <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: PTP da perna" />
            </label>
            <label>
              <span>Quem pediu ou acompanha</span>
              <input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="Ex.: Maria, Rosa" />
            </label>
            <label>
              <span>Observacao curta</span>
              <input value={context} onChange={(event) => setContext(event.target.value)} placeholder="Ex.: revisar antes da reuniao" />
            </label>
            <div className="swatches">
              {COLORS.map((item) => (
                <button
                  aria-label="Cor do documento"
                  className={color === item ? 'chosen' : ''}
                  key={item}
                  style={{ background: item }}
                  onClick={() => setColor(item)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="wizard-fields">
            <div className="task add-task">
              <ListPlus size={18} />
              <input
                autoFocus
                value={taskText}
                onChange={(event) => setTaskText(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && addTask()}
                placeholder="Digite uma alteracao ou pendencia"
              />
              <button className="primary compact" onClick={addTask}><Plus size={17} /></button>
            </div>
            <div className="task-list compact-list">
              {tasks.map((task, index) => (
                <div
                  className="task"
                  draggable
                  key={`${task}-${index}`}
                  onDragStart={() => setDragging(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => drop(index)}
                >
                  <GripVertical size={17} />
                  <span>{task}</span>
                  <div className="order-buttons">
                    <button onClick={() => move(index, -1)}>↑</button>
                    <button onClick={() => move(index, 1)}>↓</button>
                  </div>
                  <button className="ghost" onClick={() => setTasks((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="modal-actions">
          {step === 2 && <button onClick={() => setStep(1)}>Voltar</button>}
          {step === 1 ? (
            <button className="primary" disabled={!title.trim()} onClick={() => setStep(2)}>
              Continuar
              <ChevronDown size={17} />
            </button>
          ) : (
            <button className="primary" onClick={() => onCreate({ title, owner, context, color, tasks })}>
              Criar registro
              <Check size={17} />
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

function PasswordModal({ onClose, onConfirm }) {
  const [value, setValue] = useState('');
  return (
    <div className="modal-backdrop">
      <section className="modal small-modal">
        <div className="modal-head">
          <h2>Confirmacao</h2>
          <IconButton label="Fechar" icon={X} onClick={onClose} />
        </div>
        <input autoFocus type="password" value={value} onChange={(event) => setValue(event.target.value)} />
        <footer className="modal-actions">
          <button onClick={onClose}>Cancelar</button>
          <button className="danger" onClick={() => onConfirm(value)}>Confirmar</button>
        </footer>
      </section>
    </div>
  );
}

function BlankState({ onAdd }) {
  return (
    <section className="blank">
      <FileText size={40} />
      <h2>Comece pelo primeiro documento</h2>
      <p>Crie um registro, adicione o que foi alterado e use os marcadores durante a reuniao.</p>
      <button className="primary" onClick={onAdd}><Plus size={18} />Adicionar</button>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
