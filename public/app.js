const form = document.querySelector('#voteForm');
const nameInput = form.querySelector('input[name="name"]');
const pollList = document.querySelector('#pollOptions');
const pollMeta = document.querySelector('#pollMeta');
const pollStatus = document.querySelector('#pollStatus');
const dialog = document.querySelector('#successDialog');
const votersDialog = document.querySelector('#votersDialog');
const votersList = document.querySelector('#votersList');
const NAME_KEY = 'bia-sunset-name';

let state = { options: [...document.querySelectorAll('#pollOptions [data-option]')].map(el => el.dataset.option), votes: [] };
let busy = false;

// ---------- utilidades ----------
const store = {
  get(k) { try { return localStorage.getItem(k) || ''; } catch { return ''; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
const normalize = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const initials = name => name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
const AVATAR_COLORS = ['#ffa48c', '#bda8ea', '#9fd9d0', '#f6afcc', '#75b9d6', '#ffdc9a'];
const colorFor = name => AVATAR_COLORS[[...normalize(name)].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

nameInput.value = store.get(NAME_KEY);

function myVote() {
  const me = normalize(nameInput.value);
  return me ? state.votes.find(v => normalize(v.name) === me) : null;
}

// ---------- renderização (estilo enquete do WhatsApp) ----------
function render() {
  const mine = myVote();
  const total = state.votes.length;
  const max = Math.max(1, ...state.options.map(o => state.votes.filter(v => v.choice === o).length));

  pollList.replaceChildren(...state.options.map(option => {
    const voters = state.votes.filter(v => v.choice === option);
    const pct = total ? Math.round((voters.length / total) * 100) : 0;

    const btn = el('button', 'poll-option');
    btn.type = 'button';
    btn.dataset.option = option;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', String(mine?.choice === option));
    btn.classList.toggle('is-mine', mine?.choice === option);
    btn.classList.toggle('is-leading', voters.length === max && voters.length > 0);

    const row = el('span', 'poll-row');
    row.append(el('span', 'poll-check'), el('span', 'poll-label', option));

    const faces = el('span', 'poll-faces');
    voters.slice(-3).forEach(v => {
      const a = el('span', 'avatar', initials(v.name));
      a.style.background = colorFor(v.name);
      a.title = v.name;
      faces.append(a);
    });
    row.append(faces, el('span', 'poll-count', String(voters.length)));

    const bar = el('span', 'poll-bar');
    const fill = el('i');
    fill.style.width = `${pct}%`;
    bar.append(fill);

    btn.append(row, bar);
    btn.setAttribute('aria-label', `${option}: ${voters.length} voto${voters.length === 1 ? '' : 's'}`);
    return btn;
  }));

  pollMeta.textContent = total ? total === 1 ? '1 pessoa já votou' : `${total} pessoas já votaram` : 'Ninguém votou ainda — seja a primeira pessoa!';
}

function renderVoters() {
  votersList.replaceChildren(...state.options.map(option => {
    const voters = state.votes.filter(v => v.choice === option);
    const block = el('section', 'voters-group');
    const head = el('header');
    head.append(el('span', null, option), el('b', null, `${voters.length} voto${voters.length === 1 ? '' : 's'}`));
    block.append(head);
    if (!voters.length) block.append(el('p', 'voters-empty', 'Nenhum voto'));
    voters.forEach(v => {
      const li = el('div', 'voter');
      const a = el('span', 'avatar', initials(v.name));
      a.style.background = colorFor(v.name);
      const when = new Date(v.at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      li.append(a, el('span', 'voter-name', v.name), el('small', null, when));
      block.append(li);
    });
    return block;
  }));
}

// ---------- API ----------
async function load() {
  try {
    const res = await fetch('/api/votes', { cache: 'no-store' });
    if (!res.ok) throw new Error();
    const data = await res.json();
    if (!busy) { state = data; render(); }
    pollStatus.textContent = '';
  } catch {
    pollStatus.textContent = 'Não deu pra carregar os votos agora. Tentando de novo…';
  }
}

async function vote(choice) {
  const name = nameInput.value.replace(/\s+/g, ' ').trim();
  if (!name) {
    nameInput.focus();
    nameInput.closest('.field').classList.remove('shake');
    void nameInput.offsetWidth; // reinicia a animação
    nameInput.closest('.field').classList.add('shake');
    pollStatus.textContent = 'Coloca seu nome primeiro ✦';
    return;
  }
  const previous = myVote()?.choice;
  if (previous === choice || busy) return;

  // Atualização otimista: a tela muda na hora, como no WhatsApp
  busy = true;
  const backup = state;
  const me = normalize(name);
  state = { ...state, votes: [...state.votes.filter(v => normalize(v.name) !== me), { name, choice, at: new Date().toISOString() }] };
  render();
  pollStatus.textContent = 'enviando…';

  try {
    const res = await fetch('/api/votes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, choice }),
    });
    if (!res.ok) throw new Error();
    state = await res.json();
    store.set(NAME_KEY, name);
    pollStatus.textContent = '';
    render();
    if (!previous) dialog.showModal();
    else pollStatus.textContent = 'Voto atualizado ✓';
  } catch {
    state = backup;
    render();
    pollStatus.textContent = 'A conexão falhou e seu voto não foi salvo. Tenta de novo?';
  } finally {
    busy = false;
  }
}

// ---------- eventos ----------
pollList.addEventListener('click', e => {
  const btn = e.target.closest('.poll-option');
  if (btn) vote(btn.dataset.option);
});
form.addEventListener('submit', e => e.preventDefault());
nameInput.addEventListener('input', () => { pollStatus.textContent = ''; render(); });

document.querySelector('#viewVotes').addEventListener('click', () => { renderVoters(); votersDialog.showModal(); });

document.querySelectorAll('dialog').forEach(d => {
  d.querySelector('.dialog-close').addEventListener('click', () => d.close());
  d.addEventListener('click', e => { if (e.target === d) d.close(); });
});

document.querySelector('#exportMine').addEventListener('click', () => {
  if (!state.votes.length) { document.querySelector('#vote').scrollIntoView({ behavior: 'smooth' }); return; }
  const columns = ['name', 'choice', 'at'];
  const escape = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [columns.join(','), ...state.votes.map(v => columns.map(c => escape(v[c])).join(','))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'votos-sunset-bia.csv';
  link.click();
  URL.revokeObjectURL(link.href);
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => entry.target.classList.toggle('in-view', entry.isIntersecting));
}, { threshold: .15 });
document.querySelectorAll('.detail-card,.vote-card,.manifesto h2').forEach(n => observer.observe(n));

// Primeira carga + atualização a cada 15s (e quando a aba volta ao foco)
render();
load();
setInterval(() => { if (!document.hidden) load(); }, 15000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
