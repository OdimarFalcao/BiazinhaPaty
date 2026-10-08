const form = document.querySelector('#voteForm');
const dialog = document.querySelector('#successDialog');
const STORAGE_KEY = 'bia-sunset-votes';

function getVotes(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  data.sentAt = new Date().toISOString();
  const button = form.querySelector('.submit');
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = 'enviando para o sunset… <span>⌁</span>';
  try {
    const response = await fetch('/api/votes', {
      method: 'POST',
      headers: {'content-type':'application/json'},
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('vote failed');
    const saved = getVotes();
    saved.push(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    dialog.showModal();
    form.reset();
  } catch {
    alert('A conexão falhou. Seu voto não foi enviado — tente novamente em instantes.');
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
});

document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});

document.querySelector('#exportMine').addEventListener('click', () => {
  const votes = getVotes();
  if (!votes.length) {
    document.querySelector('#vote').scrollIntoView({behavior:'smooth'});
    return;
  }
  const columns = ['name','choice','sentAt'];
  const escape = value => `"${String(value ?? '').replaceAll('"','""')}"`;
  const csv = [columns.join(','), ...votes.map(v => columns.map(c => escape(v[c])).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'voto-sunset-bia.csv';
  link.click();
  URL.revokeObjectURL(link.href);
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => entry.target.classList.toggle('in-view', entry.isIntersecting));
}, {threshold:.15});
document.querySelectorAll('.detail-card,.vote-card,.manifesto h2').forEach(el => observer.observe(el));
