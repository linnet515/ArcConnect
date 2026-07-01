// ── signup.js — ArcConnect Register Page ──

let currentRole = 'mentor';
let tags = [];
const MAX_TAGS = 5;

/* ── ROLE TOGGLE ── */
function setRole(role) {
  currentRole = role;
  const isMentor = role === 'mentor';

  document.getElementById('toggleMentor').className  = 'toggle-option' + (isMentor  ? ' active-mentor'  : '');
  document.getElementById('toggleStudent').className = 'toggle-option' + (!isMentor ? ' active-student' : '');
  document.getElementById('submitBtn').className     = 'btn-submit ' + role;
  document.getElementById('submitBtn').textContent   = isMentor ? 'Create Mentor Account' : 'Create Student Account';

  // Subhead + left panel updates (same as before)...
  // [unchanged code omitted for brevity]
  
  tags = [];
  renderTags();
  updateCompleteness();
}

/* ── PROFILE COMPLETENESS, WORD COUNT, TAG INPUT, PASSWORD TOGGLE/STRENGTH, VALIDATION ── */
// [unchanged helper functions remain the same as your original code]

/* ── TOAST ── */
function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = `toast ${type} show`;
  setTimeout(() => { t.className = 'toast'; }, 3200);
}

/* ── SUBMIT ── */
async function handleSignup(e) {
  e.preventDefault();
  if (!validate()) return;

  const btn = document.getElementById('submitBtn');
  btn.textContent = 'Creating account…';
  btn.disabled    = true;

  const payload = {
    first_name:  document.getElementById('firstName').value.trim(),
    last_name:   document.getElementById('lastName').value.trim(),
    email:       document.getElementById('email').value.trim(),
    institution: document.getElementById('institution').value.trim(),
    linkedin:    document.getElementById('linkedin').value.trim(),
    tags:        tags,
    password:    document.getElementById('password').value,
    role:        currentRole,
    ...(currentRole === 'mentor' && {
      years_experience: document.getElementById('yearsExp').value,
      availability:     document.getElementById('availability').value,
      bio:              document.getElementById('bio').value.trim(),
      motivation:       document.getElementById('motivation').value.trim(),
    })
  };

  try {
    const res  = await fetch('http://127.0.0.1:8000/api/auth/signup', { 
      method:'POST', 
      headers:{'Content-Type':'application/json'}, 
      body:JSON.stringify(payload) 
    });
    const data = await res.json();
    if (res.ok) {
      // Store info for tracking page
      sessionStorage.setItem('arc_source',     'signup');   // ✅ NEW
      sessionStorage.setItem('arc_role',       currentRole);
      sessionStorage.setItem('arc_first_name', payload.first_name);
      sessionStorage.setItem('arc_email',      payload.email);
      sessionStorage.setItem('arc_stage',      '0');

      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('role',  currentRole);
      }
      if (data.user_id) {
        sessionStorage.setItem('arc_user_id', data.user_id);
      }

      showToast(currentRole === 'mentor'
        ? "Application submitted! Redirecting to your tracking page…"
        : 'Account created! Setting things up…', 'success');

      setTimeout(() => {
        window.location.href = `track.html?role=${currentRole}&stage=0&source=signup`; // ✅ UPDATED
      }, 1500);
      
    } else {
      showToast(data.detail || 'Something went wrong. Please try again.', 'fail');
      btn.textContent = currentRole === 'mentor' ? 'Create Mentor Account' : 'Create Student Account';
      btn.disabled    = false;
    }
  } catch (err) {
    showToast('Network error. Please try again.', 'fail');
    btn.textContent = currentRole === 'mentor' ? 'Create Mentor Account' : 'Create Student Account';
    btn.disabled    = false;
  }
}

/* ── INIT ── */
(function init() {
  const params = new URLSearchParams(window.location.search);
  setRole(params.get('role') === 'student' ? 'student' : 'mentor');
})();
