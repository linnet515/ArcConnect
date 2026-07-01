let currentRole = 'mentor'; // default

// ── ROLE TOGGLE ──
function setRole(role) {
  currentRole = role;

  const btnMentor  = document.getElementById('toggleMentor');
  const btnStudent = document.getElementById('toggleStudent');
  const submitBtn  = document.getElementById('submitBtn');

  // Toggle button active states
  btnMentor.className  = 'toggle-option' + (role === 'mentor'  ? ' active-mentor'  : '');
  btnStudent.className = 'toggle-option' + (role === 'student' ? ' active-student' : '');

  // Submit button colour + label
  submitBtn.className = 'btn-submit ' + role;
  submitBtn.textContent = role === 'mentor' ? 'Sign in as Mentor' : 'Sign in as Student';

  // Left panel updates
  const eyebrow   = document.getElementById('panelEyebrow');
  const titleEm   = document.getElementById('panelTitleEm');
  const panelDesc = document.getElementById('panelDesc');
  const perkList  = document.getElementById('perkList');

  if (role === 'mentor') {
    eyebrow.className   = 'panel-eyebrow mentor';
    eyebrow.textContent = 'For Alumni';
    titleEm.className   = 'mentor';
    titleEm.textContent = 'guide';
    panelDesc.textContent = 'Sign in to manage your mentorship opportunities, review applicants, and connect with the next generation of talent.';
    perkList.innerHTML  = `
      <li><span class="perk-dot mentor"></span> Post and manage opportunities</li>
      <li><span class="perk-dot mentor"></span> Review incoming applications</li>
      <li><span class="perk-dot mentor"></span> Accept or reject applicants</li>
      <li><span class="perk-dot mentor"></span> Track all your active mentees</li>`;
  } else {
    eyebrow.className   = 'panel-eyebrow student';
    eyebrow.textContent = 'For Students';
    titleEm.className   = 'student';
    titleEm.textContent = 'grow';
    panelDesc.textContent = 'Sign in to discover mentorship opportunities, track your applications, and connect with alumni who\'ve been where you are.';
    perkList.innerHTML  = `
      <li><span class="perk-dot student"></span> Browse open opportunities</li>
      <li><span class="perk-dot student"></span> Apply with a single click</li>
      <li><span class="perk-dot student"></span> Track your application status</li>
      <li><span class="perk-dot student"></span> Connect with experienced alumni</li>`;
  }
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

      // Save info for track.html
      sessionStorage.setItem('arc_source', 'login');
      sessionStorage.setItem('arc_role', currentRole);
      sessionStorage.setItem('arc_stage', data.user.stage || '1'); // backend should provide stage
      sessionStorage.setItem('arc_first_name', data.user.first_name);
      sessionStorage.setItem('arc_email', data.user.email);

      showToast('Welcome back! Redirecting…', 'success');

      // Redirect to track.html instead of dashboard
      setTimeout(() => {
        window.location.href = `track.html?role=${currentRole}&stage=${data.user.stage || 1}&source=login`;
      }, 1200);
    } else {
      showToast(data.detail || 'Invalid credentials. Please try again.', 'fail');
      btn.textContent = currentRole === 'mentor' ? 'Sign in as Mentor' : 'Sign in as Student';
      btn.disabled    = false;
    }
  } catch (err) {
    showToast('Network error. Please try again.', 'fail');
    btn.textContent = currentRole === 'mentor' ? 'Sign in as Mentor' : 'Sign in as Student';
    btn.disabled    = false;
  }
}

// ── INIT: pre-select role from URL param ──
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const role   = params.get('role');
  if (role === 'student') setRole('student');
  else setRole('mentor');
});
