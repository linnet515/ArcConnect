// ── Smart Track.js — ArcConnect Application Tracking ──
// Shows where a registration stands. The admin accepts/rejects it in admin.html;
// this page reads that decision from the backend.

const API = 'http://127.0.0.1:8000';

// Read URL params + session
const params = new URLSearchParams(window.location.search);
const role   = params.get('role') || sessionStorage.getItem('arc_role') || 'mentor';
const stage  = parseInt(params.get('stage') || sessionStorage.getItem('arc_stage') || '0', 10);
const sourcePage = params.get('source') || sessionStorage.getItem('arc_source') || 'signup';
const email  = params.get('email') || sessionStorage.getItem('arc_email');

// Admins don't use the tracker; send them to the dashboard
if (role === 'admin') window.location.replace('admin.html');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ── Decision state: 'pending' | 'accepted' | 'rejected' ──
let outcome = stage >= 2 ? 'accepted' : 'pending';   // fallback until the backend answers
let adminNote = '';
let activeStage = outcome === 'pending' ? Math.min(stage, 1) : 2;

function setOutcome(status, note) {
  outcome = ['accepted', 'rejected'].includes(status) ? status : 'pending';
  adminNote = note || '';
  activeStage = outcome === 'pending' ? Math.min(stage, 1) : 2;
}

// ── Role-aware content ──
const CONTENT = {
  mentor: {
    eyebrow: 'Application received',
    title:   'Your application is <em>on its way</em>',
    desc:    "We've received your mentor application and it's now moving through our review process.",
    stages: [
      { x:40,  color:'#4A84F5', icon:'📨', title:'Application Submitted', desc:"Your application has been received." },
      { x:300, color:'#F5A623', icon:'🔍', title:'Under Review',           desc:'An admin is verifying your credentials.' },
      { x:560, color:'#2DD4A0', icon:'✅', title:'Application Approved',   desc:'You are approved. Sign in to post mentorship opportunities.' },
    ],
    next: [
      'We will verify your LinkedIn profile and credentials.',
      'Your bio and motivation statement will be reviewed.',
      "You'll see the decision on this page.",
      "Once approved, you can sign in and post mentorship opportunities.",
    ]
  },
  student: {
    eyebrow: 'Registration received',
    title:   'Your account is <em>being set up</em>',
    desc:    "We've received your student registration and it's being processed.",
    stages: [
      { x:40,  color:'#4A84F5', icon:'📝', title:'Registration Submitted',  desc:'Your details have been received.' },
      { x:300, color:'#F5A623', icon:'🔍', title:'Under Review',            desc:'An admin is verifying your details.' },
      { x:560, color:'#2DD4A0', icon:'🎉', title:'Account Activated',       desc:'Your account is ready. Sign in to explore opportunities.' },
    ],
    next: [
      'Your registration details are being reviewed by an admin.',
      "You'll see the decision on this page.",
      'Once approved, sign in to browse mentorship opportunities.',
      'You can track all applications from your dashboard.',
    ]
  }
};

const content = CONTENT[role] || CONTENT.mentor;
const STAGES  = content.stages;

const REJECTED = {
  color: '#F0605D', icon: '✕',
  title: role === 'mentor' ? 'Application Not Approved' : 'Registration Not Approved',
  desc:  'An admin reviewed your details and could not approve them this time.'
};
const stageInfo = i => (i === 2 && outcome === 'rejected') ? { ...STAGES[2], ...REJECTED } : STAGES[i];

const NEXT_BY_OUTCOME = () => ({
  pending:  content.next,
  accepted: ['Sign in with the email and password you registered with.',
             role === 'mentor' ? 'Post your first mentorship opportunity.' : 'Browse open opportunities and apply.'],
  rejected: ['Check that your registration details are accurate.', 'You can register again with corrected information.']
}[outcome]);

// ── Backend: the decision the admin made ──
// Expected response: { status: 'pending' | 'accepted' | 'rejected', note?: string }
async function fetchStatus() {
  if (!email) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  try {
    const res = await fetch(`${API}/auth/status?email=${encodeURIComponent(email)}`, { signal: ctrl.signal });
    return res.ok ? await res.json() : null;
  } catch (e) {
    return null;                       // offline: keep the fallback state
  } finally {
    clearTimeout(timer);
  }
}

// ── Utility easing ──
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

// ── Animate tracker ──
function runTracker() {
  const fillLine  = document.getElementById('fillLine');
  const travelDot = document.getElementById('travelDot');
  const targetX   = STAGES[activeStage].x;
  const startX    = STAGES[0].x;
  const duration  = 1800;
  let start = null;

  fillLine.setAttribute('stroke', outcome === 'rejected' ? REJECTED.color : 'url(#lineGrad)');

  function anim(ts) {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / duration, 1);
    const eased    = easeOutCubic(progress);
    const currentX = startX + (targetX - startX) * eased;

    fillLine.setAttribute('x2', currentX);
    travelDot.setAttribute('cx', currentX);
    travelDot.setAttribute('cy', 30);
    travelDot.setAttribute('opacity', progress < 0.1 ? progress * 10 : progress > 0.9 ? 1 - (progress - 0.9) * 10 : 1);

    if (progress < 1) requestAnimationFrame(anim);
    else {
      travelDot.setAttribute('opacity', '0');
      activateStages();
    }
  }

  requestAnimationFrame(anim);
}

function resetTracker() {
  document.getElementById('fillLine').setAttribute('x2', STAGES[0].x);
  STAGES.forEach((s, i) => {
    const node = document.getElementById('node' + i);
    node.setAttribute('stroke', '#1E2A40');
    node.removeAttribute('filter');
    document.getElementById('dot' + i).setAttribute('fill', '#1E2A40');
    document.getElementById('num' + i).setAttribute('fill', '#8892A4');
    const label = document.getElementById('stageName' + i);
    label.className = 'stage-name pending';
    label.style.color = '';
  });
}

// ── Activate stage nodes ──
function activateStages() {
  STAGES.forEach((_, i) => {
    const s = stageInfo(i);
    const node  = document.getElementById('node' + i);
    const dot   = document.getElementById('dot' + i);
    const num   = document.getElementById('num' + i);
    const label = document.getElementById('stageName' + i);

    if (i < activeStage) {
      node.setAttribute('stroke', '#2DD4A0');
      dot.setAttribute('fill', '#2DD4A0');
      num.setAttribute('fill', '#2DD4A0');
      label.className = 'stage-name done';
    } else if (i === activeStage) {
      node.setAttribute('stroke', s.color);
      node.setAttribute('filter', 'url(#glow)');
      dot.setAttribute('fill', s.color);
      num.setAttribute('fill', s.color);
      label.className = 'stage-name active';
      if (outcome === 'rejected') label.style.color = s.color;
      document.getElementById('statusTitle').textContent = s.title;
      document.getElementById('statusDesc').textContent  =
        s.desc + (outcome === 'rejected' && adminNote ? ` Note from admin: ${adminNote}` : '');
      document.querySelector('.status-icon').textContent = s.icon;
      document.querySelector('.status-icon').style.background = s.color + '1f';
    } else {
      label.className = 'stage-name pending';
    }
  });
}

// ── Page text that depends on the decision ──
function renderPage() {
  const firstName = sessionStorage.getItem('arc_first_name');
  const eyebrow = document.querySelector('.track-eyebrow');
  const titleEl = document.querySelector('.track-title');
  const noun = role === 'mentor' ? 'application' : 'account';

  if (outcome === 'accepted') {
    eyebrow.textContent = 'Approved';
    titleEl.innerHTML = `Your ${noun} is <em>approved</em>`;
  } else if (outcome === 'rejected') {
    eyebrow.textContent = 'Not approved';
    titleEl.innerHTML = `Your ${noun} was <em>not approved</em>`;
  } else {
    eyebrow.textContent = sourcePage === 'signup' ? 'Thanks for signing up!'
                        : sourcePage === 'login'  ? 'Welcome back!' : content.eyebrow;
    titleEl.innerHTML = firstName
      ? `Hey <em>${esc(firstName)}</em>, your ${noun} is on its way`
      : content.title;
  }

  document.getElementById('trackDesc').textContent = outcome === 'pending'
    ? content.desc + (email ? ` This page updates when an admin decides.` : '')
    : (outcome === 'accepted' ? 'An admin has approved your details.' : 'An admin has reviewed your details.');

  STAGES.forEach((_, i) => { document.getElementById('stageName' + i).textContent = stageInfo(i).title; });

  document.getElementById('nextList').innerHTML = NEXT_BY_OUTCOME()
    .map(item => `<li><span class="next-dot"></span> ${esc(item)}</li>`)
    .join('');

  const actions = document.getElementById('trackActions');
  actions.innerHTML = outcome === 'accepted'
    ? `<a href="login.html?role=${esc(role)}" class="btn-primary">Sign in</a><a href="index.html" class="btn-secondary">Back to Home</a>`
    : outcome === 'rejected'
    ? `<a href="register.html?role=${esc(role)}" class="btn-primary">Register again</a><a href="index.html" class="btn-secondary">Back to Home</a>`
    : `<button type="button" id="refreshBtn" class="btn-primary">Check status</button><a href="index.html" class="btn-secondary">Back to Home</a>`;
  const refresh = document.getElementById('refreshBtn');
  if (refresh) refresh.onclick = refreshStatus;
}

// ── Re-check the decision and replay the tracker if it changed ──
async function refreshStatus() {
  const data = await fetchStatus();
  const last = document.getElementById('lastChecked');
  if (last) { last.hidden = false; last.textContent = 'Last checked ' + new Date().toLocaleTimeString(); }
  if (data && data.status !== outcome) {
    setOutcome(data.status, data.note);
    resetTracker();
    renderPage();
    runTracker();
  }
}

// ── Boot ──
window.addEventListener('DOMContentLoaded', async () => {
  if (role === 'admin') return;

  const data = await fetchStatus();           // wait briefly so the first animation shows the right result
  if (data) setOutcome(data.status, data.note);

  renderPage();
  runTracker();

  // Keep checking while the admin hasn't decided yet
  const poll = setInterval(() => {
    if (outcome !== 'pending') return clearInterval(poll);
    refreshStatus();
  }, 30000);
});