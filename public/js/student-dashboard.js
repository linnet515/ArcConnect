const API = {
  get:   (path)        => fetch(path, { headers: { Authorization: 'Bearer ' + token() } }),
  post:  (path, body)  => fetch(path, { method: 'POST',  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() }, body: JSON.stringify(body) }),
};

function token() { return localStorage.getItem('token') || ''; }

const DOMAIN_ICONS = {
  'Campus Placements':      '🎓',
  'Internships':            '💼',
  'Higher Studies (MS/MBA)':'🎓',
  'Entrepreneurship':       '🚀',
  'Software Engineering':   '💻',
  'Data Science & AI':      '📊',
  'Finance & Banking':      '💹',
  'Consulting':             '📈',
  'Design & UX':            '🎨',
  'Core Engineering':       '⚙️',
  'Product Management':     '📦',
  'Research':               '🔬',
};

function domainIcon(d) { return DOMAIN_ICONS[d] || '🌐'; }

// ── STATE ──
let allOpportunities = [];
let myApplications   = [];
let appliedOppIds    = new Set();
let activeFilter     = 'all';
let currentOppId     = null;

// ── BOOT ──
document.addEventListener('DOMContentLoaded', async () => {
  if (!token()) { window.location.href = 'login.html'; return; }
  await Promise.all([loadProfile(), loadData()]);

  // Apply modal close on overlay click
  const modal = document.getElementById('applyModal');
  if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeApplyModal(); });

  // Expertise tag input
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

// ── PROFILE ──
async function loadProfile() {
  const res = await API.get('/auth/me');
  if (res.status === 401) { window.location.href = 'login.html'; return; }
  if (!res.ok) return;

  const u    = await res.json();
  const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Student';
  const init = ((u.first_name?.[0] || '') + (u.last_name?.[0] || '')).toUpperCase();

  document.getElementById('userName').textContent     = name;
  document.getElementById('userInitials').textContent = init || 'ST';

  const hour  = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('welcomeMsg').textContent = `${greet}, ${u.first_name || 'Student'} 👋`;

  const pfName   = document.getElementById('profileName');
  const pfAvatar = document.getElementById('profileAvatarLg');
  if (pfName)   pfName.textContent   = name;
  if (pfAvatar) pfAvatar.textContent = init || 'ST';

  setVal('pfFirstName',   u.first_name);
  setVal('pfLastName',    u.last_name);
  setVal('pfEmail',       u.email);
  setVal('pfInstitution', u.institution);
  setVal('pfLinkedin',    u.linkedin);

  if (Array.isArray(u.tags)) { expTags = [...u.tags]; renderExpTags(); }
  localStorage.setItem('arc_name', name);
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el && val != null) el.value = val;
}

// ── LOAD ALL DATA ──
async function loadData() {
  const [oppsRes, appsRes] = await Promise.all([
    API.get('/opportunities'),
    API.get('/applications/mine'),
  ]);

  if (oppsRes.ok) allOpportunities = await oppsRes.json();
  if (appsRes.ok) myApplications   = await appsRes.json();

  appliedOppIds = new Set(myApplications.map(a => a.opportunity_id));

  renderStats();
  renderOverviewApps();
  renderOverviewSessions();
  renderOverviewDomains();
  renderBrowsePanel();
  renderApplicationsPanel();
  renderSessionsPanel();
  renderNotifications();
}

// ── STATS ──
function renderStats() {
  const pending  = myApplications.filter(a => a.status === 'pending').length;
  const accepted = myApplications.filter(a => a.status === 'accepted').length;

  document.getElementById('stat-applied').textContent  = myApplications.length;
  document.getElementById('stat-pending').textContent  = pending;
  document.getElementById('stat-accepted').textContent = accepted;
  document.getElementById('stat-open').textContent     = allOpportunities.length;

  const appBadge = document.getElementById('badge-applications');
  if (appBadge) appBadge.textContent = pending;

  const sesBadge = document.getElementById('badge-sessions');
  if (sesBadge) sesBadge.textContent = accepted;
}

// ── OVERVIEW: recent applications ──
function renderOverviewApps() {
  const el = document.getElementById('overviewApplicationsList');
  if (!el) return;
  el.innerHTML = '';

  if (myApplications.length === 0) {
    el.innerHTML = emptyState('No applications yet. Browse opportunities to get started.');
    return;
  }

  myApplications.slice(0, 3).forEach(app => {
    const title  = app.opportunity?.title  || 'Opportunity';
    const domain = app.opportunity?.domain || '';
    el.insertAdjacentHTML('beforeend', `
      <div class="app-card" data-status="${app.status}">
        <div class="app-info">
          <h3>${esc(title)}</h3>
          <div class="app-meta">
            ${domain ? `<span class="domain-badge">${esc(domain)}</span>` : ''}
            <span class="status-badge ${app.status}">${cap(app.status)}</span>
            <span style="font-size:0.7rem;color:var(--muted)">${relTime(new Date(app.created_at))}</span>
          </div>
        </div>
      </div>`);
  });
}

// ── OVERVIEW: active sessions (accepted apps) ──
function renderOverviewSessions() {
  const el = document.getElementById('overviewSessions');
  if (!el) return;
  el.innerHTML = '';

  const active = myApplications.filter(a => a.status === 'accepted');
  if (active.length === 0) {
    el.innerHTML = emptyState('No active mentorships yet. Apply to an opportunity to get started.');
    return;
  }

  active.slice(0, 4).forEach(app => {
    const title  = app.opportunity?.title  || 'Mentorship';
    const domain = app.opportunity?.domain || '';
    el.insertAdjacentHTML('beforeend', `
      <div class="session-card">
        <div class="session-dot"></div>
        <div class="session-info">
          <strong>${esc(title)}</strong>
          <span>${esc(domain)}</span>
        </div>
        <span class="session-tag">Active</span>
      </div>`);
  });
}

// ── OVERVIEW: domain chips ──
function renderOverviewDomains() {
  const el = document.getElementById('overviewDomainChips');
  if (!el) return;
  const domains = [...new Set(allOpportunities.map(o => o.domain).filter(Boolean))].slice(0, 8);
  el.innerHTML = domains.map(d =>
    `<span class="domain-pill" onclick="filterByDomain('${esc(d)}')">${domainIcon(d)} ${esc(d)}</span>`
  ).join('');
}

function filterByDomain(domain) {
  showPanel('browse');
  setTimeout(() => setDomainFilter(domain), 50);
}

// ── BROWSE PANEL ──
let activeDomainFilter = '';
let searchTerm = '';

function renderBrowsePanel() {
  renderDomainFilterChips();
  renderOpportunityCards();
}

function renderDomainFilterChips() {
  const el = document.getElementById('domainFilter');
  if (!el) return;
  const domains = [...new Set(allOpportunities.map(o => o.domain).filter(Boolean))].sort();
  el.innerHTML = `<button class="domain-chip active" onclick="setDomainFilter('', this)">All</button>` +
    domains.map(d =>
      `<button class="domain-chip" onclick="setDomainFilter('${esc(d)}', this)">${domainIcon(d)} ${esc(d)}</button>`
    ).join('');
}

function setDomainFilter(domain, btn) {
  activeDomainFilter = domain;
  document.querySelectorAll('.domain-chip').forEach(c => c.classList.remove('active'));
  if (btn) {
    btn.classList.add('active');
  } else {
    document.querySelectorAll('.domain-chip').forEach(c => {
      if (c.textContent.includes(domain)) c.classList.add('active');
    });
  }
  renderOpportunityCards();
}

function searchOpps(q) {
  searchTerm = q.toLowerCase();
  renderOpportunityCards();
}

function renderOpportunityCards() {
  const el = document.getElementById('opportunitiesList');
  if (!el) return;
  el.innerHTML = '';

  let filtered = allOpportunities;
  if (activeDomainFilter) filtered = filtered.filter(o => o.domain === activeDomainFilter);
  if (searchTerm)         filtered = filtered.filter(o =>
    (o.title + o.description + o.domain).toLowerCase().includes(searchTerm)
  );

  if (filtered.length === 0) {
    el.innerHTML = emptyState('No opportunities found. Try a different domain or search term.');
    return;
  }

  // Group by domain
  const groups = {};
  filtered.forEach(o => {
    const d = o.domain || 'Other';
    if (!groups[d]) groups[d] = [];
    groups[d].push(o);
  });

  Object.entries(groups).forEach(([domain, opps]) => {
    const groupEl = document.createElement('div');
    groupEl.className = 'domain-group';
    groupEl.innerHTML = `
      <div class="domain-group-label">
        ${domainIcon(domain)} ${esc(domain)}
        <span>${opps.length} opportunit${opps.length === 1 ? 'y' : 'ies'}</span>
      </div>`;

    opps.forEach(opp => {
      const applied  = appliedOppIds.has(opp.id);
      const slots    = opp.slots || 0;
      const full     = slots > 0 && (opp.accepted_count || 0) >= slots;
      const disabled = applied || full;
      groupEl.insertAdjacentHTML('beforeend', `
        <div class="opp-card" data-opp-id="${opp.id}">
          <div class="opp-info">
            <h3>${esc(opp.title)}</h3>
            <p>${esc(opp.description || '')}</p>
            <div class="opp-meta">
              <span class="domain-badge">${esc(domain)}</span>
              ${opp.criteria ? `<span style="font-size:0.72rem;color:var(--muted)">Criteria: ${esc(opp.criteria)}</span>` : ''}
            </div>
          </div>
          <div class="opp-actions">
            <button class="btn-apply" onclick="openApplyModal(${opp.id})" ${disabled ? 'disabled' : ''}>
              ${applied ? 'Applied ✓' : full ? 'Full' : 'Apply'}
            </button>
            <span class="slots-badge">${slots} slot${slots === 1 ? '' : 's'}</span>
          </div>
        </div>`);
    });

    el.appendChild(groupEl);
  });
}

// ── APPLICATIONS PANEL ──
function renderApplicationsPanel(filter) {
  const el = document.getElementById('applicationsList');
  if (!el) return;
  el.innerHTML = '';

  let apps = myApplications;
  if (filter && filter !== 'all') apps = apps.filter(a => a.status === filter);

  if (apps.length === 0) {
    el.innerHTML = emptyState(filter && filter !== 'all'
      ? `No ${filter} applications.`
      : "You haven't applied to any opportunities yet.");
    return;
  }

  // Group by domain
  const groups = {};
  apps.forEach(app => {
    const d = app.opportunity?.domain || 'Other';
    if (!groups[d]) groups[d] = [];
    groups[d].push(app);
  });

  Object.entries(groups).forEach(([domain, domainApps]) => {
    const groupEl = document.createElement('div');
    groupEl.className = 'domain-group';
    groupEl.innerHTML = `
      <div class="domain-group-label">
        ${domainIcon(domain)} ${esc(domain)}
        <span>${domainApps.length} application${domainApps.length === 1 ? '' : 's'}</span>
      </div>`;

    domainApps.forEach(app => {
      const title = app.opportunity?.title || 'Opportunity';
      groupEl.insertAdjacentHTML('beforeend', `
        <div class="app-card" data-status="${app.status}">
          <div class="app-info">
            <h3>${esc(title)}</h3>
            <p>${esc(app.cover_note || 'No cover note provided.')}</p>
            <div class="app-meta">
              <span class="status-badge ${app.status}">${cap(app.status)}</span>
              <span style="font-size:0.7rem;color:var(--muted)">Applied ${relTime(new Date(app.created_at))}</span>
            </div>
          </div>
        </div>`);
    });

    el.appendChild(groupEl);
  });
}

function filterApps(status, btn) {
  document.querySelectorAll('.status-tabs .stab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderApplicationsPanel(status);
}

// ── SESSIONS PANEL ──
function renderSessionsPanel() {
  const el = document.getElementById('sessionsList');
  if (!el) return;
  el.innerHTML = '';

  const accepted = myApplications.filter(a => a.status === 'accepted');
  if (accepted.length === 0) {
    el.innerHTML = emptyState('No active sessions yet. Get accepted into a mentorship to see sessions here.');
    return;
  }

  const groups = {};
  accepted.forEach(app => {
    const d = app.opportunity?.domain || 'Other';
    if (!groups[d]) groups[d] = [];
    groups[d].push(app);
  });

  Object.entries(groups).forEach(([domain, apps]) => {
    const groupEl = document.createElement('div');
    groupEl.className = 'domain-group';
    groupEl.innerHTML = `
      <div class="domain-group-label">
        ${domainIcon(domain)} ${esc(domain)}
        <span>${apps.length} session${apps.length === 1 ? '' : 's'}</span>
      </div>`;

    apps.forEach(app => {
      const title = app.opportunity?.title || 'Mentorship';
      groupEl.insertAdjacentHTML('beforeend', `
        <div class="session-card">
          <div class="session-dot"></div>
          <div class="session-info">
            <strong>${esc(title)}</strong>
            <span>${esc(domain)} · Accepted ${relTime(new Date(app.updated_at || app.created_at))}</span>
          </div>
          <span class="session-tag">Active</span>
        </div>`);
    });

    el.appendChild(groupEl);
  });
}

// ── NOTIFICATIONS ──
function renderNotifications() {
  const el = document.getElementById('notifList');
  if (!el) return;

  const recentAccepted = myApplications.filter(a => a.status === 'accepted');
  const recentPending  = myApplications.filter(a => a.status === 'pending');

  if (recentAccepted.length === 0 && recentPending.length === 0) {
    el.innerHTML = emptyState('No notifications yet.');
    return;
  }

  el.innerHTML = '';
  recentAccepted.forEach(app => {
    el.insertAdjacentHTML('beforeend', `
      <div class="notif-item" style="display:flex;align-items:flex-start;gap:0.85rem;padding:1rem 0;border-bottom:1px solid var(--border);">
        <div style="width:36px;height:36px;border-radius:10px;background:rgba(45,212,160,0.12);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;">✅</div>
        <div>
          <strong style="display:block;font-size:0.845rem;font-weight:600;margin-bottom:0.15rem;">Application accepted!</strong>
          <p style="font-size:0.78rem;color:var(--muted);">Your application for <strong>${esc(app.opportunity?.title || 'an opportunity')}</strong> was accepted. Your mentorship is now active.</p>
          <div style="font-size:0.68rem;color:var(--muted);margin-top:0.2rem;">${relTime(new Date(app.updated_at || app.created_at))}</div>
        </div>
      </div>`);
  });

  recentPending.forEach(app => {
    el.insertAdjacentHTML('beforeend', `
      <div class="notif-item" style="display:flex;align-items:flex-start;gap:0.85rem;padding:1rem 0;border-bottom:1px solid var(--border);">
        <div style="width:36px;height:36px;border-radius:10px;background:rgba(245,166,35,0.1);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;">⏳</div>
        <div>
          <strong style="display:block;font-size:0.845rem;font-weight:600;margin-bottom:0.15rem;">Application under review</strong>
          <p style="font-size:0.78rem;color:var(--muted);">Your application for <strong>${esc(app.opportunity?.title || 'an opportunity')}</strong> is pending mentor review.</p>
          <div style="font-size:0.68rem;color:var(--muted);margin-top:0.2rem;">${relTime(new Date(app.created_at))}</div>
        </div>
      </div>`);
  });
}

// ── APPLY MODAL ──
function openApplyModal(oppId) {
  const opp = allOpportunities.find(o => o.id === oppId);
  if (!opp) return;
  currentOppId = oppId;
  document.getElementById('applyModalTitle').textContent = `Apply — ${opp.title}`;
  document.getElementById('applyOppPreview').innerHTML = `
    <h3>${esc(opp.title)}</h3>
    <p>${esc(opp.domain || '')}${opp.criteria ? ' · Criteria: ' + opp.criteria : ''}</p>`;
  document.getElementById('coverNote').value = '';
  document.getElementById('applyModal').classList.add('open');
}

function closeApplyModal() {
  document.getElementById('applyModal').classList.remove('open');
  currentOppId = null;
}

async function submitApplication() {
  if (!currentOppId) return;
  const note = document.getElementById('coverNote').value.trim();
  if (!note) { showToast('Please write a cover note', 'fail'); return; }

  const btn = document.querySelector('#applyModal .btn-save');
  btn.textContent = 'Submitting…'; btn.disabled = true;

  const res = await API.post('/applications', { opportunity_id: currentOppId, cover_note: note });

  btn.textContent = 'Submit Application'; btn.disabled = false;

  if (res.ok) {
    showToast('Application submitted ✓', 'success');
    closeApplyModal();
    await loadData();
  } else {
    const err = await res.json().catch(() => ({}));
    showToast(err.detail || 'Could not submit — please try again', 'fail');
  }
}

// ── PANEL NAVIGATION ──
const panelTitles = {
  overview:     'Dashboard',
  applications: 'My Applications',
  browse:       'Browse Opportunities',
  sessions:     'My Sessions',
  notifications:'Notifications',
  profile:      'My Profile',
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

// ── EXPERTISE TAGS ──
let expTags = [];
function removeExpTag(i) { expTags.splice(i, 1); renderExpTags(); }
function renderExpTags() {
  const el = document.getElementById('expDisplay');
  if (el) el.innerHTML = expTags.map((t, i) =>
    `<span class="exp-chip">${esc(t)}<span class="exp-remove" onclick="removeExpTag(${i})">×</span></span>`
  ).join('');
}

// ── PROFILE SAVE ──
function saveProfile() {
  const first = document.getElementById('pfFirstName').value.trim();
  const last  = document.getElementById('pfLastName').value.trim();
  if (first) {
    const name = first + (last ? ' ' + last : '');
    const init = (first[0] + (last ? last[0] : '')).toUpperCase();
    document.getElementById('userName').textContent        = name;
    document.getElementById('profileName').textContent     = name;
    document.getElementById('userInitials').textContent    = init;
    document.getElementById('profileAvatarLg').textContent = init;
    localStorage.setItem('arc_name', name);
  }
  showToast('Profile saved ✓', 'success');
}

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
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
function emptyState(msg) {
  return `<div class="empty-state"><div class="empty-icon">📭</div><p>${esc(msg)}</p></div>`;
}
function relTime(date) {
  if (!(date instanceof Date) || isNaN(date)) return '';
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : date.toLocaleDateString();
}
