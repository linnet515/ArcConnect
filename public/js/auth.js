let currentRole = 'mentor'; // default

// ── ROLE CONFIG ──
const ROLES = {
  mentor: {
    toggleId: 'toggleMentor',
    activeClass: 'active-mentor',
    submitLabel: 'Sign in as Mentor',
    eyebrow: 'For Alumni',
    titleWord: 'guide',
    desc: 'Sign in to manage your mentorship opportunities, review applicants, and connect with the next generation of talent.',
    perks: [
      'Post and manage opportunities',
      'Review incoming applications',
      'Accept or reject applicants',
      'Track all your active mentees'
    ],
    redirect: (stage) => `track.html?role=mentor&stage=${stage}&source=login`
  },
  student: {
    toggleId: 'toggleStudent',
    activeClass: 'active-student',
    submitLabel: 'Sign in as Student',
    eyebrow: 'For Students',
    titleWord: 'grow',
    desc: "Sign in to discover mentorship opportunities, track your applications, and connect with alumni who've been where you are.",
    perks: [
      'Browse open opportunities',
      'Apply with a single click',
      'Track your application status',
      'Connect with experienced alumni'
    ],
    redirect: (stage) => `track.html?role=student&stage=${stage}&source=login`
  },
  admin: {
    toggleId: 'toggleAdmin',
    activeClass: 'active-admin',
    submitLabel: 'Sign in as Admin',
    eyebrow: 'For Administrators',
    titleWord: 'manage',
    desc: 'Sign in to oversee users, moderate opportunities, and keep the platform running smoothly.',
    perks: [
      'Manage mentors and students',
      'Moderate opportunities and applications',
      'View platform-wide activity',
      'Control access and permissions'
    ],
    redirect: () => 'admin.html?source=login' // admins skip the track page
  }
};

// ── ROLE TOGGLE ──
function setRole(role) {
  if (!ROLES[role]) role = 'mentor';
  currentRole = role;
  const cfg = ROLES[role];

  // Toggle button active states
  Object.entries(ROLES).forEach(([key, r]) => {
    const btn = document.getElementById(r.toggleId);
    if (btn) btn.className = 'toggle-option' + (key === role ? ' ' + r.activeClass : '');
  });

  // Submit button colour + label
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.className = 'btn-submit ' + role;
  submitBtn.textContent = cfg.submitLabel;

  // Left panel updates
  const eyebrow = document.getElementById('panelEyebrow');
  const titleEm = document.getElementById('panelTitleEm');

  eyebrow.className   = 'panel-eyebrow ' + role;
  eyebrow.textContent = cfg.eyebrow;
  titleEm.className   = role;
  titleEm.textContent = cfg.titleWord;
  document.getElementById('panelDesc').textContent = cfg.desc;
  document.getElementById('perkList').innerHTML = cfg.perks
    .map(p => `<li><span class="perk-dot ${role}"></span> ${p}</li>`)
    .join('');
}

// ── FORM VALIDATION ──
function validateField(id, errorId, message) {
  const input = document.getElementById(id);
  const error = document.getElementById(errorId);
  if (!input.value.trim()) {
    input.classList.add('error-input');
    error.textContent = message;
    error.classList.add('visible');
    return false;
  }
  input.classList.remove('error-input');
  error.classList.remove('visible');
  return true;
}

function validateEmail(id, errorId) {
  const input = document.getElementById(id);
  const error = document.getElementById(errorId);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
  if (!input.value.trim()) {
    input.classList.add('error-input');
    error.textContent = 'Email is required.';
    error.classList.add('visible');
    return false;
  }
  if (!valid) {
    input.classList.add('error-input');
    error.textContent = 'Enter a valid email address.';
    error.classList.add('visible');
    return false;
  }
  input.classList.remove('error-input');
  error.classList.remove('visible');
  return true;
}

// ── TOAST ──
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className   = `toast ${type} show`;
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}

// ── LOGIN SUBMIT ──
async function handleLogin(e) {
  e.preventDefault();

  const emailOk = validateEmail('email', 'emailError');
  const passOk  = validateField('password', 'passError', 'Password is required.');
  if (!emailOk || !passOk) return;

  const btn = document.getElementById('submitBtn');
  btn.textContent = 'Signing in…';
  btn.disabled    = true;

  const resetBtn = () => {
    btn.textContent = ROLES[currentRole].submitLabel;
    btn.disabled    = false;
  };

  try {
    const res = await fetch('http://127.0.0.1:8000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
        role: currentRole
      })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('role',  currentRole);

      const stage = data.user.stage || 1;

      // Save info for track.html / admin.html
      sessionStorage.setItem('arc_source', 'login');
      sessionStorage.setItem('arc_role', currentRole);
      sessionStorage.setItem('arc_stage', String(stage)); // not used by admin
      sessionStorage.setItem('arc_first_name', data.user.first_name);
      sessionStorage.setItem('arc_email', data.user.email);

      showToast('Welcome back! Redirecting…', 'success');

      setTimeout(() => {
        window.location.href = ROLES[currentRole].redirect(stage);
      }, 1200);
    } else {
      showToast(data.detail || 'Invalid credentials. Please try again.', 'fail');
      resetBtn();
    }
  } catch (err) {
    showToast('Network error. Please try again.', 'fail');
    resetBtn();
  }
}

// ── INIT: pre-select role from URL param ──
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  setRole(params.get('role')); // falls back to 'mentor' if missing/invalid
});