const API = {
  get: (path) => fetch(path, { headers: { Authorization: 'Bearer ' + token() } }),
  post: (path, body) => fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() }, body: JSON.stringify(body) }),
  patch: (path, body) => fetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() }, body: JSON.stringify(body) }),
  delete: (path) => fetch(path, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token() } }),
};

function token() { return localStorage.getItem('token') || ''; }

// ── BOOT ──
document.addEventListener('DOMContentLoaded', async () => {
  if (!token()) { window.location.href = 'login.html'; return; }
  await Promise.all([loadProfile(), loadDashboardData()]);
});

// ── PROFILE ──
async function loadProfile() {
  const res = await API.get('/auth/me');
  if (res.status === 401) { window.location.href = 'login.html'; return; }
  if (!res.ok) return;

  const u = await res.json();
  const name     = `${u.first_name} ${u.last_name}`.trim() || 'Mentor';
  const initials = (u.first_name?.[0] || '') + (u.last_name?.[0] || '');

  document.getElementById('userName').textContent      = name;
  document.getElementById('userInitials').textContent  = initials.toUpperCase();

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('welcomeMsg').textContent    = `${greet}, ${u.first_name || 'Mentor'} 👋`;

  const pfName    = document.getElementById('profileName');
  const pfAvatar  = document.getElementById('profileAvatarLg');
  if (pfName)   pfName.textContent   = name;
  if (pfAvatar) pfAvatar.textContent = initials.toUpperCase();

  // Pre-fill profile form
  setVal('pfFirstName', u.first_name);
  setVal('pfLastName',  u.last_name);
  setVal('pfEmail',     u.email);
  setVal('pfCompany',   u.institution);
  setVal('pfLinkedin',  u.linkedin);
  setVal('pfBio',       u.bio);

  if (u.tags && Array.isArray(u.tags)) {
    expTags = [...u.tags];
    renderExpTags();
  }

  localStorage.setItem('arc_name',  name);
  localStorage.setItem('arc_email', u.email || '');
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el && val != null) el.value = val;
}

// ── DASHBOARD DATA ──
// Loads opportunities + all applicants for each, then renders everything
async function loadDashboardData() {
  const res = await API.get('/opportunities/mine/list');
  if (!res.ok) return;
  const opportunities = await res.json();

  // Fetch all applicants for each opportunity
  const appsByOpp = {};
  await Promise.all(opportunities.map(async (opp) => {
    const r = await API.get(`/applications/opportunity/${opp.id}`);
    if (r.ok) appsByOpp[opp.id] = await r.json();
    else appsByOpp[opp.id] = [];
  }));

  renderStats(opportunities, appsByOpp);
  renderOpportunitiesPanel(opportunities, appsByOpp);
  renderApplicantsPanel(opportunities, appsByOpp);
  renderOverviewApplicants(appsByOpp);
  renderOverviewActivity(opportunities, appsByOpp);
}

// ── STATS ──
function renderStats(opps, appsByOpp) {
  let pending = 0, accepted = 0;
  Object.values(appsByOpp).forEach(apps => {
    apps.forEach(a => {
      if (a.status === 'pending')  pending++;
      if (a.status === 'accepted') accepted++;
    });
  });

  const statCards = document.querySelectorAll('.stat-card');
  if (statCards[0]) {
    statCards[0].querySelector('.stat-value').textContent = accepted;
    statCards[0].querySelector('.stat-sub').textContent   = `${opps.length} active opportunit${opps.length === 1 ? 'y' : 'ies'}`;
  }
  if (statCards[1]) {
    statCards[1].querySelector('.stat-value').textContent = pending;
    statCards[1].querySelector('.stat-sub').textContent   = 'Awaiting your review';
  }
  // Badge in sidebar
  const badge = document.querySelector('.nav-item[onclick*="applicants"] .nav-badge');
  if (badge) badge.textContent = pending;
}

// ── HELPER: extract flat fields from nested API response ──
function appName(app) {
  const s = app.student;
  if (!s) return 'Applicant';
  return `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Applicant';
}
function appInstitution(app)     { return app.student?.institution || ''; }
function appOppTitle(app, opps)  { return app.opportunity?.title || opps.find(o => o.id === app.opportunity_id)?.title || ''; }

// ── OVERVIEW: mini applicant preview ──
function renderOverviewApplicants(appsByOpp) {
  const container = document.querySelector('#panel-overview .applicant-row')?.closest('.card-box');
  if (!container) return;

  const allPending = [];
  Object.values(appsByOpp).forEach(apps =>
    apps.filter(a => a.status === 'pending').forEach(a => allPending.push(a))
  );

  const titleEl = container.querySelector('.card-box-title');
  if (titleEl) {
    const link = titleEl.querySelector('a');
    titleEl.innerHTML = `Pending Applicants`;
    if (link) titleEl.appendChild(link);
  }

  // Remove old rows
  container.querySelectorAll('.applicant-row').forEach(el => el.remove());

  if (allPending.length === 0) {
    container.insertAdjacentHTML('beforeend', emptyState('No pending applications right now.'));
    return;
  }

  allPending.slice(0, 3).forEach(app => {
    const name = appName(app);
    container.insertAdjacentHTML('beforeend', `
      <div class="applicant-row" id="ov-app-${app.id}">
        <div class="applicant-avatar">${initOf(name)}</div>
        <div class="applicant-info">
          <strong>${esc(name)}</strong>
          <span>${esc(app.opportunity?.title || '')} · ${esc(app.student?.institution || '')}</span>
        </div>
        <div class="applicant-actions">
          <button class="btn-accept" onclick="acceptApp(${app.id}, 'ov-app-${app.id}')">✓</button>
          <button class="btn-reject" onclick="rejectApp(${app.id}, 'ov-app-${app.id}')">✕</button>
        </div>
      </div>`);
  });
}

// ── OVERVIEW: recent activity ──
function renderOverviewActivity(opps, appsByOpp) {
  const container = document.querySelector('#panel-overview .activity-item')?.closest('.card-box');
  if (!container) return;

  container.querySelectorAll('.activity-item').forEach(el => el.remove());

  const events = [];
  Object.values(appsByOpp).forEach(apps => {
    apps.forEach(a => {
      const name = appName(a);
      const oppTitle = a.opportunity?.title || opps.find(o => o.id === a.opportunity_id)?.title || 'your opportunity';
      events.push({ time: new Date(a.created_at || 0), text: `<strong>${esc(name)}</strong> applied for ${esc(oppTitle)}`, color: 'var(--cobalt2)' });
      if (a.status === 'accepted')
        events.push({ time: new Date(a.updated_at || a.created_at || 0), text: `<strong>${esc(name)}</strong> accepted your mentorship offer`, color: 'var(--green)' });
    });
  });

  events.sort((a, b) => b.time - a.time).slice(0, 5).forEach(ev => {
    container.insertAdjacentHTML('beforeend', `
      <div class="activity-item">
        <div class="activity-dot" style="background:${ev.color}"></div>
        <div>
          <div class="activity-text">${ev.text}</div>
          <div class="activity-time">${relTime(ev.time)}</div>
        </div>
      </div>`);
  });

  if (events.length === 0)
    container.insertAdjacentHTML('beforeend', emptyState('No recent activity yet.'));
}

// ── APPLICANTS PANEL ──
function renderApplicantsPanel(opps, appsByOpp) {
  const box = document.getElementById('applicantsBox');
  if (!box) return;

  const allPending = [];
  Object.values(appsByOpp).forEach(apps =>
    apps.filter(a => a.status === 'pending').forEach(a => allPending.push(a))
  );

  const title = box.querySelector('.card-box-title');
  if (title) title.textContent = `Pending Review (${allPending.length})`;

  box.querySelectorAll('.applicant-row, .empty-state').forEach(el => el.remove());

  if (allPending.length === 0) {
    box.insertAdjacentHTML('beforeend', emptyState('No pending applications right now.'));
    return;
  }

  allPending.forEach(app => {
    const name    = appName(app);
    const oppTitle = app.opportunity?.title || opps.find(o => o.id === app.opportunity_id)?.title || '';
    const inst     = app.student?.institution || '';
    box.insertAdjacentHTML('beforeend', `
      <div class="applicant-row" id="app-row-${app.id}">
        <div class="applicant-avatar">${initOf(name)}</div>
        <div class="applicant-info">
          <strong>${esc(name)}</strong>
          <span>${esc(oppTitle)} · ${esc(inst)}</span>
        </div>
        <div class="applicant-actions">
          <button class="btn-sm" onclick="viewApplication(${app.id})">View</button>
          <button class="btn-accept" onclick="acceptApp(${app.id}, 'app-row-${app.id}')">Accept</button>
          <button class="btn-reject" onclick="rejectApp(${app.id}, 'app-row-${app.id}')">Reject</button>
        </div>
      </div>`);
  });
}

// ── MY OPPORTUNITIES PANEL ──
function renderOpportunitiesPanel(opps, appsByOpp) {
  const panel = document.getElementById('panel-opportunities');
  if (!panel) return;

  // Clear everything after section-head and search-bar
  panel.querySelectorAll('.opp-card, .empty-state').forEach(el => el.remove());

  if (opps.length === 0) {
    panel.insertAdjacentHTML('beforeend', emptyState('You have no opportunities posted yet. Click "+ New Opportunity" to get started.'));
    return;
  }

  opps.forEach(opp => {
    const apps    = appsByOpp[opp.id] || [];
    const pending = apps.filter(a => a.status === 'pending').length;
    const accepted = apps.filter(a => a.status === 'accepted').length;
    panel.insertAdjacentHTML('beforeend', `
      <div class="opp-card" id="opp-${opp.id}">
        <div class="opp-info">
          <h3>${esc(opp.title)}</h3>
          <p>${esc(opp.description || '')}</p>
          <div class="opp-meta">
            <span class="domain-badge">${esc(opp.domain || '')}</span>
            <span style="font-size:0.72rem;color:var(--muted)">${pending} pending · ${accepted} accepted · ${opp.slots || 0} slot${opp.slots === 1 ? '' : 's'}</span>
            ${opp.criteria ? `<span style="font-size:0.72rem;color:var(--muted)">Criteria: ${esc(opp.criteria)}</span>` : ''}
          </div>
        </div>
        <div class="opp-actions">
          <button class="btn-sm" onclick="showPanel('applicants')">Applicants (${apps.length})</button>
          <button class="btn-sm" onclick="deleteOpp(${opp.id})">Delete</button>
        </div>
      </div>`);
  });
}

// ── ACCEPT / REJECT ──
async function acceptApp(id, rowId) {
  const res = await API.patch(`/applications/${id}/status`, { status: 'accepted' });
  if (res.ok) {
    showToast('Application accepted ✓', 'success');
    removeRow(rowId);
    refreshCounts();
  } else {
    showToast('Could not update — please try again', 'fail');
  }
}

async function rejectApp(id, rowId) {
  const res = await API.patch(`/applications/${id}/status`, { status: 'rejected' });
  if (res.ok) {
    showToast('Application rejected', 'fail');
    removeRow(rowId);
    refreshCounts();
  } else {
    showToast('Could not update — please try again', 'fail');
  }
}

function removeRow(rowId) {
  const el = document.getElementById(rowId);
  if (el) el.remove();
}

async function refreshCounts() {
  await loadDashboardData();
}

async function viewApplication(id) {
  const res = await API.get(`/applications/${id}`);
  if (!res.ok) { showToast('Could not load application', 'fail'); return; }
  const a = await res.json();
  const name = appName(a);
  alert(`Applicant: ${name}\nInstitution: ${a.student?.institution || '—'}\nLinkedIn: ${a.student?.linkedin || '—'}\n\nCover note:\n${a.cover_note || '(none)'}\n\nStatus: ${a.status}`);
}

async function deleteOpp(id) {
  if (!confirm('Delete this opportunity? This cannot be undone.')) return;
  const res = await API.delete(`/opportunities/${id}`);
  if (res.ok) {
    showToast('Opportunity deleted', 'fail');
    document.getElementById(`opp-${id}`)?.remove();
  } else {
    showToast('Could not delete — please try again', 'fail');
  }
}

// ── CREATE OPPORTUNITY ──
async function saveOpportunity() {
  const title    = document.getElementById('oppTitle').value.trim();
  const desc     = document.getElementById('oppDesc').value.trim();
  const domain   = document.getElementById('oppDomain').value;
  const slots    = parseInt(document.getElementById('oppSlots').value) || 1;
  const criteria = document.getElementById('oppCriteria').value.trim();

  if (!title)  { showToast('Please enter a title', 'fail'); return; }
  if (!domain) { showToast('Please select a domain', 'fail'); return; }

  const res = await API.post('/opportunities', {
    title, description: desc, domain, slots, criteria
  });

  if (res.ok) {
    showToast('Opportunity published ✓', 'success');
    closeModal();
    // Clear fields
    ['oppTitle','oppDesc','oppDomain','oppSlots','oppCriteria'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    await loadDashboardData();
  } else {
    const err = await res.json().catch(() => ({}));
    showToast(err.detail || 'Could not publish — please try again', 'fail');
  }
}

// ── PANEL NAVIGATION ──
const panelTitles = {
  overview:'Dashboard', sessions:'Sessions', applicants:'Applicants',
  mentees:'Mentee Directory', goals:'Goal Tracker', feedback:'Feedback',
  opportunities:'My Opportunities', activity:'Activity Feed',
  tools:'Tools & Resources', notifications:'Notifications', profile:'My Profile'
};

function showPanel(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const panel = document.getElementById('panel-' + id);
  if (panel) panel.classList.add('active');
  document.getElementById('pageTitle').textContent = panelTitles[id] || id;
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('onclick')?.includes(`'${id}'`)) item.classList.add('active');
  });
  return false;
}

// ── SEARCH ──
function searchApplicants(q) {
  const term = q.toLowerCase();
  document.querySelectorAll('#applicantsBox .applicant-row').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(term) ? 'flex' : 'none';
  });
}

function searchOpportunities(q) {
  const term = q.toLowerCase();
  document.querySelectorAll('.opp-card').forEach(card => {
    card.style.display = card.textContent.toLowerCase().includes(term) ? 'flex' : 'none';
  });
}

// ── SESSION FILTER ──
function filterSessions(type, btn) {
  document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.session-card').forEach(card => {
    card.style.display = (type === 'all' || card.dataset.type === type) ? 'flex' : 'none';
  });
  document.querySelectorAll('.domain-group').forEach(group => {
    const visible = [...group.querySelectorAll('.session-card')].some(c => c.style.display !== 'none');
    group.style.display = visible ? 'block' : 'none';
  });
}

// ── EXPERTISE TAGS ──
let expTags = [];
document.addEventListener('DOMContentLoaded', () => {
  const expInput = document.getElementById('expInput');
  if (expInput) {
    expInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const v = this.value.trim().replace(/,$/, '');
        if (v && !expTags.includes(v) && expTags.length < 5) { expTags.push(v); renderExpTags(); }
        this.value = '';
      }
      if (e.key === 'Backspace' && this.value === '' && expTags.length) { expTags.pop(); renderExpTags(); }
    });
  }
});

function removeExpTag(i) { expTags.splice(i, 1); renderExpTags(); }
function renderExpTags() {
  const el = document.getElementById('expDisplay');
  if (el) el.innerHTML = expTags.map((t, i) =>
    `<span class="exp-chip">${esc(t)}<span class="exp-remove" onclick="removeExpTag(${i})">×</span></span>`
  ).join('');
}

// ── GOAL TRACKER ──
function toggleGoal(el) {
  const isDone = el.classList.toggle('done');
  el.textContent = isDone ? '✓' : '';
  const due = el.closest('.goal-item')?.querySelector('.goal-due');
  if (due) due.textContent = isDone ? 'Completed' : due.dataset.original || 'Pending';
  showToast(isDone ? 'Goal marked complete ✓' : 'Goal marked incomplete', isDone ? 'success' : 'fail');
}

// ── PROFILE SAVE ──
function saveProfile() {
  const first = document.getElementById('pfFirstName').value.trim();
  const last  = document.getElementById('pfLastName').value.trim();
  if (first) {
    const name = first + (last ? ' ' + last : '');
    const initials = (first[0] + (last ? last[0] : '')).toUpperCase();
    document.getElementById('userName').textContent         = name;
    document.getElementById('profileName').textContent      = name;
    document.getElementById('userInitials').textContent     = initials;
    document.getElementById('profileAvatarLg').textContent  = initials;
    localStorage.setItem('arc_name', name);
  }
  showToast('Profile saved ✓', 'success');
}

// ── MODAL ──
function openModal()  { document.getElementById('modal').classList.add('open'); }
function closeModal() { document.getElementById('modal').classList.remove('open'); }
document.getElementById('modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

// ── TOAST ──
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = `toast ${type} show`;
  setTimeout(() => { t.className = 'toast'; }, 3000);
}

// ── HELPERS ──
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function initOf(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function emptyState(msg) {
  return `<div class="empty-state"><div class="empty-icon">📭</div><p>${esc(msg)}</p></div>`;
}

function relTime(date) {
  if (!(date instanceof Date) || isNaN(date)) return '';
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'Just now';
  if (m < 60)  return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h} hour${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d} day${d > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}
