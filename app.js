// ============================================================
// Passômetro UTI — app.js
// Banco: Supabase | Realtime compartilhado
// ============================================================

// CONFIG — substitua com suas credenciais do Supabase
const SUPABASE_URL  = window.SUPABASE_URL  || 'https://nmvgafaiwdxznzemytzc.supabase.co';
const SUPABASE_KEY  = window.SUPABASE_KEY  || 'sb_publishable_4Yx89nubqKACma0nBRnxnw_7uxypTRe';

// ---- Init ----
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let allPatients = [];
let filtered    = [];

// ============================================================
// BOOTSTRAP
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  setupUI();
  loadPatients();
  subscribeRealtime();
});

// ============================================================
// SUPABASE — CRUD
// ============================================================
async function loadPatients() {
  showLoading(true);
  try {
    const { data, error } = await db
      .from('patients')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    allPatients = data || [];
    applyFilters();
    updateStats();
  } catch (e) {
    toast('Erro ao carregar pacientes: ' + e.message, 'error');
  } finally {
    showLoading(false);
  }
}

async function savePatient(patient, isNew) {
  try {
    patient.last_modified = new Date().toISOString();
    if (isNew) patient.created_at = patient.last_modified;

    const { error } = await db.from('patients').upsert(patient);
    if (error) throw error;

    toast(isNew ? 'Paciente adicionado!' : 'Paciente atualizado!', 'success');
    closeModal();
    await loadPatients();
  } catch (e) {
    toast('Erro ao salvar: ' + e.message, 'error');
  }
}

async function deletePatient(id) {
  if (!confirm('Excluir este paciente?')) return;
  try {
    const { error } = await db.from('patients').delete().eq('id', id);
    if (error) throw error;
    toast('Paciente excluído!', 'success');
    await loadPatients();
  } catch (e) {
    toast('Erro ao excluir: ' + e.message, 'error');
  }
}

// ============================================================
// REALTIME — atualização automática entre usuários
// ============================================================
function subscribeRealtime() {
  db.channel('patients-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => {
      loadPatients(); // recarrega silenciosamente
    })
    .subscribe((status) => {
      const dot = document.getElementById('realtimeDot');
      if (dot) dot.style.background = status === 'SUBSCRIBED' ? '#22c55e' : '#f59e0b';
    });
}

// ============================================================
// UI SETUP
// ============================================================
function setupUI() {
  document.getElementById('addPatientBtn').addEventListener('click', () => openModal());
  document.getElementById('refreshBtn').addEventListener('click', loadPatients);
  document.getElementById('printBtn').addEventListener('click', () => window.print());
  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('filterPriority').addEventListener('change', applyFilters);
  document.getElementById('filterAuthor').addEventListener('change', applyFilters);
  document.getElementById('patientForm').addEventListener('submit', handleFormSubmit);
  document.getElementById('addAntibioticBtn').addEventListener('click', addAntibioticField);
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
}

// ============================================================
// FILTERS
// ============================================================
function applyFilters() {
  const search   = document.getElementById('searchInput').value.toLowerCase();
  const priority = document.getElementById('filterPriority').value;
  const author   = document.getElementById('filterAuthor').value;

  filtered = allPatients.filter(p => {
    const matchSearch = !search ||
      (p.name || '').toLowerCase().includes(search) ||
      (p.bed_number || '').toLowerCase().includes(search) ||
      (p.diagnosis || '').toLowerCase().includes(search) ||
      (p.current_condition || '').toLowerCase().includes(search) ||
      (p.pending_actions || '').toLowerCase().includes(search);
    const matchPriority = !priority || p.priority === priority;
    const matchAuthor   = !author   || p.author === author;
    return matchSearch && matchPriority && matchAuthor;
  });

  renderPatients();
  updateAuthorFilter();
}

function updateAuthorFilter() {
  const sel    = document.getElementById('filterAuthor');
  const cur    = sel.value;
  const authors = [...new Set(allPatients.map(p => p.author).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">Todos os Autores</option>' +
    authors.map(a => `<option value="${esc(a)}" ${a === cur ? 'selected' : ''}>${esc(a)}</option>`).join('');
}

// ============================================================
// RENDER
// ============================================================
function renderPatients() {
  const grid  = document.getElementById('patientsGrid');
  const empty = document.getElementById('emptyState');

  if (filtered.length === 0) {
    grid.innerHTML  = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const order = { Alta: 1, Média: 2, Baixa: 3 };
  const sorted = [...filtered].sort((a, b) =>
    (order[a.priority] || 9) - (order[b.priority] || 9)
  );

  grid.innerHTML = sorted.map(renderCard).join('');
}

function renderCard(p) {
  const dih  = calcDIH(p.admission_date);
  const atbs = (p.antibiotics || []);
  const pClass = (p.priority || 'Baixa').toLowerCase().replace('é','e');
  const updated = formatDate(p.last_modified || p.created_at);

  return `
  <div class="patient-card priority-${p.priority || 'Baixa'}">
    <div class="card-header">
      <div class="card-title">
        <h3>${esc(p.name)}</h3>
        <div class="card-badges">
          ${p.bed_number ? `<span class="badge badge-bed"><i class="fas fa-bed" style="font-size:10px"></i> ${esc(p.bed_number)}</span>` : ''}
          ${dih !== null ? `<span class="badge badge-dih">DIH ${dih}d</span>` : ''}
          <span class="badge badge-${pClass}">${esc(p.priority || 'Baixa')}</span>
        </div>
      </div>
      <div class="card-actions">
        <button class="btn btn-secondary btn-icon btn-sm" onclick="openModal('${p.id}')" title="Editar">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-danger btn-icon btn-sm" onclick="deletePatient('${p.id}')" title="Excluir">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
    <div class="card-body">
      ${p.diagnosis ? `
        <div class="card-field">
          <div class="card-field-label">Diagnóstico</div>
          <div class="card-field-value">${esc(p.diagnosis)}</div>
        </div>` : ''}
      ${p.current_condition ? `
        <div class="card-field">
          <div class="card-field-label">Condição Atual</div>
          <div class="card-field-value">${esc(p.current_condition)}</div>
        </div>` : ''}
      ${atbs.length ? `
        <div class="card-field">
          <div class="card-field-label">Antibióticos</div>
          <div class="antibiotics-list">
            ${atbs.map(a => `
              <span class="antibiotic-tag">
                <i class="fas fa-capsules" style="font-size:10px"></i>
                ${esc(a.name)}
                ${a.days ? `<span class="days">D${a.days}</span>` : ''}
              </span>`).join('')}
          </div>
        </div>` : ''}
      ${p.pending_actions ? `
        <div class="card-field">
          <div class="card-field-label">Pendências</div>
          <div class="card-field-value">${esc(p.pending_actions)}</div>
        </div>` : ''}
      ${p.next_steps ? `
        <div class="card-field">
          <div class="card-field-label">Próximos Passos</div>
          <div class="card-field-value">${esc(p.next_steps)}</div>
        </div>` : ''}
    </div>
    <div class="card-footer">
      <span>${p.author ? '👤 ' + esc(p.author) : ''}</span>
      <span>${updated}</span>
    </div>
  </div>`;
}

function updateStats() {
  const total = allPatients.length;
  const alta  = allPatients.filter(p => p.priority === 'Alta').length;
  const media = allPatients.filter(p => p.priority === 'Média').length;
  const baixa = allPatients.filter(p => p.priority === 'Baixa').length;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statAlta').textContent  = alta;
  document.getElementById('statMedia').textContent = media;
  document.getElementById('statBaixa').textContent = baixa;
}

// ============================================================
// MODAL — Add / Edit
// ============================================================
function openModal(patientId) {
  const modal = document.getElementById('modalOverlay');
  const form  = document.getElementById('patientForm');
  form.reset();
  document.getElementById('patientIdField').value = '';
  document.getElementById('antibioticsContainer').innerHTML = '';
  document.getElementById('modalTitle').textContent = 'Novo Paciente';

  if (patientId) {
    const p = allPatients.find(x => x.id === patientId);
    if (!p) return;
    document.getElementById('modalTitle').textContent = 'Editar Paciente';
    document.getElementById('patientIdField').value    = p.id;
    document.getElementById('fieldName').value         = p.name || '';
    document.getElementById('fieldBed').value          = p.bed_number || '';
    document.getElementById('fieldDiagnosis').value    = p.diagnosis || '';
    document.getElementById('fieldPriority').value     = p.priority || 'Baixa';
    document.getElementById('fieldAdmission').value    = p.admission_date || '';
    document.getElementById('fieldCondition').value    = p.current_condition || '';
    document.getElementById('fieldPending').value      = p.pending_actions || '';
    document.getElementById('fieldNextSteps').value    = p.next_steps || '';
    document.getElementById('fieldAuthor').value       = p.author || '';

    (p.antibiotics || []).forEach(a => addAntibioticField(null, a.name, a.days));
  } else {
    // preenche data de hoje
    document.getElementById('fieldAdmission').value = new Date().toISOString().split('T')[0];
  }

  modal.classList.add('open');
  document.getElementById('fieldName').focus();
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const existingId = document.getElementById('patientIdField').value;
  const isNew      = !existingId;

  // Coleta antibióticos
  const antibiotics = [];
  document.querySelectorAll('.antibiotic-row').forEach(row => {
    const name = row.querySelector('.atb-name').value.trim();
    const days = row.querySelector('.atb-days').value.trim();
    if (name) antibiotics.push({ name, days: days || '' });
  });

  const patient = {
    id:                existingId || generateId(),
    name:              document.getElementById('fieldName').value.trim(),
    bed_number:        document.getElementById('fieldBed').value.trim(),
    diagnosis:         document.getElementById('fieldDiagnosis').value.trim(),
    priority:          document.getElementById('fieldPriority').value,
    admission_date:    document.getElementById('fieldAdmission').value,
    current_condition: document.getElementById('fieldCondition').value.trim(),
    pending_actions:   document.getElementById('fieldPending').value.trim(),
    next_steps:        document.getElementById('fieldNextSteps').value.trim(),
    author:            document.getElementById('fieldAuthor').value.trim(),
    antibiotics,
  };

  await savePatient(patient, isNew);
}

// ============================================================
// ANTIBIOTICS
// ============================================================
function addAntibioticField(e, name = '', days = '') {
  const container = document.getElementById('antibioticsContainer');
  const row = document.createElement('div');
  row.className = 'antibiotic-row';
  row.innerHTML = `
    <input class="atb-name" type="text" placeholder="Nome do antibiótico" value="${esc(name)}" />
    <input class="atb-days" type="text" placeholder="D?" class="days-input" value="${esc(days)}" style="width:70px" />
    <button type="button" class="btn btn-danger btn-icon btn-sm" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>`;
  container.appendChild(row);
}

// ============================================================
// HELPERS
// ============================================================
function calcDIH(admissionDate) {
  if (!admissionDate) return null;
  const admit = new Date(admissionDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff  = Math.floor((today - admit) / 86400000);
  return diff >= 0 ? diff : null;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function generateId() {
  return 'pat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showLoading(show) {
  document.getElementById('loadingOverlay').classList.toggle('show', show);
}

function toast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: 'check-circle', error: 'exclamation-circle', info: 'info-circle' };
  el.innerHTML = `<i class="fas fa-${icons[type] || 'info-circle'}"></i> ${msg}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}
