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

  // Subhead
  document.getElementById('formSubhead').textContent = isMentor
    ? 'Mentor applications are reviewed for quality. Fill every field carefully.'
    : 'Read each field carefully and fill in your details accurately.';

  // Left panel
  const eyebrow = document.getElementById('panelEyebrow');
  eyebrow.className   = 'panel-eyebrow ' + role;
  eyebrow.textContent = isMentor ? 'For Alumni' : 'For Students';

  const titleEm = document.getElementById('panelTitleEm');
  titleEm.className   = role;
  titleEm.textContent = isMentor ? 'mentor' : 'student';

  document.getElementById('panelDesc').textContent = isMentor
    ? 'Share your experience with students who need it most. Create opportunities, set your own criteria, and build a legacy beyond your career.'
    : "Find the right mentor, apply for opportunities that match your goals, and get guidance from alumni who've walked the path you're on.";

  document.getElementById('strictNotice').className = 'strict-notice' + (isMentor ? ' visible' : '');

  const dot = isMentor ? 'mentor' : 'student';
  const perks = isMentor
    ? ['Create mentorship opportunities','Define mentorship details and participation criteria','Review incoming applications','Accept or reject applicants','Manage your participants']
    : ['Discover mentorship opportunities by domain','Apply with a single click','Track your application status in real time','Connect with alumni who know your path'];
  document.getElementById('perkList').innerHTML = perks.map(p =>
    `<li><span class="perk-dot ${dot}"></span> ${p}</li>`).join('');

  // Show/hide mentor-only fields
  document.getElementById('mentorFields').style.display  = isMentor ? 'block' : 'none';
  document.getElementById('conductRow').style.display    = isMentor ? 'flex'  : 'none';
  document.getElementById('completenessWrap').className  = 'completeness-bar-wrap' + (isMentor ? ' visible' : '');

  // Field labels
  document.getElementById('institutionLabel').textContent = isMentor ? 'Company / Organisation' : 'College / Institution';
  document.getElementById('institution').placeholder      = isMentor ? 'e.g. Google, Infosys, TCS' : 'e.g. IIT Bombay, NIT Trichy';
  document.getElementById('emailHint').textContent        = isMentor ? 'Use your company email for faster verification.' : '';
  document.getElementById('linkedinHint').textContent     = isMentor
    ? 'Required for credential verification.'
    : 'Optional but recommended — helps mentors learn about you.';
  document.getElementById('tagsLabel').textContent  = isMentor ? 'Areas of Expertise' : 'Department / Branch';
  document.getElementById('extraLabel').textContent = isMentor ? 'Expertise tags' : 'Department tags';
  document.getElementById('tagHint').textContent    = isMentor
    ? 'Add up to 5 tags. Press Enter or comma to add — e.g. Placements, Data Science.'
    : 'Add up to 3 tags. Press Enter or comma to add — e.g. Computer Science, ECE.';
  document.getElementById('tagInput').placeholder   = isMentor
    ? 'e.g. Placements, Entrepreneurship, ML'
    : 'e.g. Computer Science, Mechanical';

  tags = [];
  renderTags();
  updateCompleteness();
}

/* ── PROFILE COMPLETENESS (mentor only) ── */
function updateCompleteness() {
  if (currentRole !== 'mentor') return;
  const fields = [
    document.getElementById('firstName').value.trim(),
    document.getElementById('lastName').value.trim(),
    document.getElementById('email').value.trim(),
    document.getElementById('institution').value.trim(),
    document.getElementById('yearsExp').value,
    document.getElementById('availability').value,
    document.getElementById('linkedin').value.trim(),
    document.getElementById('bio').value.trim(),
    document.getElementById('motivation').value.trim(),
    tags.length > 0 ? 'ok' : '',
    document.getElementById('password').value,
    document.getElementById('confirmPassword').value,
    document.getElementById('terms').checked ? 'ok' : '',
    document.getElementById('conduct').checked ? 'ok' : '',
  ];
  const filled = fields.filter(Boolean).length;
  const pct    = Math.round((filled / fields.length) * 100);
  const fill   = document.getElementById('cFill');
  const label  = document.getElementById('completenessLabel');
  fill.style.width      = pct + '%';
  fill.style.background = pct < 40 ? '#F56565' : pct < 75 ? '#F5A623' : '#2DD4A0';
  label.textContent     = pct + '%';
  label.style.color     = pct < 40 ? '#F56565' : pct < 75 ? '#F5A623' : '#2DD4A0';
}

/* ── WORD COUNT ── */
function countWords(inputId, countId, min) {
  const text  = document.getElementById(inputId).value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  const el    = document.getElementById(countId);
  el.textContent = `${words} / ${min} words minimum`;
  el.className   = 'word-count' + (words >= min ? ' ok' : '');
}

/* ── TAG INPUT ── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('tagInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(this.value); }
    if (e.key === 'Backspace' && this.value === '' && tags.length) { tags.pop(); renderTags(); updateCompleteness(); }
  });
});

function addTag(val) {
  const v     = val.trim().replace(/,$/, '');
  const limit = currentRole === 'mentor' ? 5 : 3;
  if (!v || tags.includes(v) || tags.length >= limit) { document.getElementById('tagInput').value = ''; return; }
  tags.push(v);
  renderTags();
  document.getElementById('tagInput').value = '';
  updateCompleteness();
}

function removeTag(i) { tags.splice(i, 1); renderTags(); updateCompleteness(); }

function renderTags() {
  const cls = currentRole === 'student' ? 'tag-chip student-tag' : 'tag-chip';
  document.getElementById('tagsDisplay').innerHTML = tags.map((t, i) =>
    `<span class="${cls}">${t}<span class="tag-remove" onclick="removeTag(${i})">×</span></span>`).join('');
}

/* ── PASSWORD TOGGLE ── */
function togglePassword(inputId, iconId) {
  const input  = document.getElementById(inputId);
  const isText = input.type === 'text';
  input.type   = isText ? 'password' : 'text';
  document.getElementById(iconId).innerHTML = isText
    ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
    : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
}

/* ── PASSWORD STRENGTH ── */
function checkStrength(val) {
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const map = [
    {w:'0%',   c:'transparent', t:''},
    {w:'25%',  c:'#F56565',     t:'Weak'},
    {w:'50%',  c:'#F5A623',     t:'Fair'},
    {w:'75%',  c:'#4A84F5',     t:'Good'},
    {w:'100%', c:'#2DD4A0',     t:'Strong'},
  ];
  const s = val.length === 0 ? 0 : score + 1;
  document.getElementById('strengthFill').style.width      = map[s].w;
  document.getElementById('strengthFill').style.background = map[s].c;
  document.getElementById('strengthLabel').textContent     = map[s].t;
  document.getElementById('strengthLabel').style.color     = map[s].c;
}

/* ── VALIDATION HELPERS ── */
function showErr(id, msg) { const e=document.getElementById(id); e.textContent=msg; e.classList.add('visible'); }
function clearErr(id)     { const e=document.getElementById(id); e.textContent='';  e.classList.remove('visible'); }
function markEl(id, err)  { document.getElementById(id).classList.toggle('error-input', err); }

/* ── VALIDATE ── */
function validate() {
  let ok = true;

  // Basic — both roles
  if (!document.getElementById('firstName').value.trim())
    { showErr('firstNameError','First name is required.'); markEl('firstName',true); ok=false; }
  else { clearErr('firstNameError'); markEl('firstName',false); }

  if (!document.getElementById('lastName').value.trim())
    { showErr('lastNameError','Last name is required.'); markEl('lastName',true); ok=false; }
  else { clearErr('lastNameError'); markEl('lastName',false); }

  const email = document.getElementById('email').value.trim();
  if (!email)
    { showErr('emailError','Email is required.'); markEl('email',true); ok=false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    { showErr('emailError','Enter a valid email address.'); markEl('email',true); ok=false; }
  else { clearErr('emailError'); markEl('email',false); }

  if (!document.getElementById('institution').value.trim())
    { showErr('institutionError', currentRole==='mentor' ? 'Company name is required.' : 'Institution name is required.'); markEl('institution',true); ok=false; }
  else { clearErr('institutionError'); markEl('institution',false); }

  // Mentor-only strict validation
  if (currentRole === 'mentor') {
    const yrs = document.getElementById('yearsExp').value;
    if (!yrs)
      { showErr('yearsExpError','Years of experience is required.'); markEl('yearsExp',true); ok=false; }
    else if (parseInt(yrs) < 2)
      { showErr('yearsExpError','Minimum 2 years of experience required.'); markEl('yearsExp',true); ok=false; }
    else { clearErr('yearsExpError'); markEl('yearsExp',false); }

    if (!document.getElementById('availability').value)
      { showErr('availabilityError','Please commit to an availability.'); markEl('availability',true); ok=false; }
    else { clearErr('availabilityError'); markEl('availability',false); }

    const li = document.getElementById('linkedin').value.trim();
    if (!li)
      { showErr('linkedinError','LinkedIn URL is required for verification.'); markEl('linkedin',true); ok=false; }
    else if (!li.includes('linkedin.com'))
      { showErr('linkedinError','Please enter a valid LinkedIn URL.'); markEl('linkedin',true); ok=false; }
    else { clearErr('linkedinError'); markEl('linkedin',false); }

    const bioWords = document.getElementById('bio').value.trim().split(/\s+/).filter(Boolean).length;
    if (bioWords < 30)
      { showErr('bioError',`Bio must be at least 30 words. Currently ${bioWords}.`); markEl('bio',true); ok=false; }
    else { clearErr('bioError'); markEl('bio',false); }

    const motWords = document.getElementById('motivation').value.trim().split(/\s+/).filter(Boolean).length;
    if (motWords < 20)
      { showErr('motivationError',`Motivation must be at least 20 words. Currently ${motWords}.`); markEl('motivation',true); ok=false; }
    else { clearErr('motivationError'); markEl('motivation',false); }

    if (!document.getElementById('conduct').checked)
      { showErr('conductError','You must confirm the mentor conduct agreement.'); ok=false; }
    else { clearErr('conductError'); }

  } else {
    // Student: LinkedIn optional but must be valid if provided
    const li = document.getElementById('linkedin').value.trim();
    if (li && !li.includes('linkedin.com'))
      { showErr('linkedinError','Please enter a valid LinkedIn URL.'); markEl('linkedin',true); ok=false; }
    else { clearErr('linkedinError'); markEl('linkedin',false); }
  }

  const pass = document.getElementById('password').value;
  if (!pass)
    { showErr('passError','Password is required.'); markEl('password',true); ok=false; }
  else if (pass.length < 8)
    { showErr('passError','Password must be at least 8 characters.'); markEl('password',true); ok=false; }
  else { clearErr('passError'); markEl('password',false); }

  const confirm = document.getElementById('confirmPassword').value;
  if (!confirm)
    { showErr('confirmPassError','Please confirm your password.'); markEl('confirmPassword',true); ok=false; }
  else if (pass !== confirm)
    { showErr('confirmPassError','Passwords do not match.'); markEl('confirmPassword',true); ok=false; }
  else { clearErr('confirmPassError'); markEl('confirmPassword',false); }

  if (!document.getElementById('terms').checked)
    { showErr('termsError','You must agree to the Terms of Service.'); ok=false; }
  else { clearErr('termsError'); }

  return ok;
}

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
    const res  = await fetch('http://127.0.0.1:8000/api/auth/signup', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    const data = await res.json();
    if (res.ok) {
      // Store what we need for the tracking page and beyond
      sessionStorage.setItem('arc_role',       currentRole);
      sessionStorage.setItem('arc_first_name', payload.first_name);
      sessionStorage.setItem('arc_email',      payload.email);
      sessionStorage.setItem('arc_stage',      '0');

      // If backend returns a token (student accounts activate immediately), store it
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('role',  currentRole);
      }

      // If backend returns a user id, store it for polling later
      if (data.user_id) {
        sessionStorage.setItem('arc_user_id', data.user_id);
      }

      showToast(currentRole === 'mentor'
        ? "Application submitted! Redirecting to your tracking page…"
        : 'Account created! Setting things up…', 'success');

      setTimeout(() => {
        window.location.href = `track.html?role=${currentRole}&stage=0`;
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