// ── Smart Track.js — ArcConnect Application Tracking ──

// Read URL params + session
const params = new URLSearchParams(window.location.search);
const role   = params.get('role') || sessionStorage.getItem('arc_role') || 'mentor';
const stage  = parseInt(params.get('stage') || sessionStorage.getItem('arc_stage') || '0', 10);
const activeStage = Math.min(stage, 2);
const sourcePage  = params.get('source') || sessionStorage.getItem('arc_source') || 'signup';

// ── Role-aware content ──
const CONTENT = {
  mentor: {
    eyebrow: 'Application received',
    title:   'Your application is <em>on its way</em>',
    desc:    "We've received your mentor application and it's now moving through our review process.",
    stages: [
      { x:40,  color:'#4A84F5', icon:'📨', title:'Application Submitted', desc:"Your application has been received." },
      { x:300, color:'#F5A623', icon:'🔍', title:'Under Review',           desc:'Our team is verifying your credentials.' },
      { x:560, color:'#2DD4A0', icon:'✅', title:'Decision Made',          desc:'A decision has been made. Check your email.' },
    ],
    next: [
      'We will verify your LinkedIn profile and credentials.',
      'Your bio and motivation statement will be reviewed.',
      "You'll receive an email notification at each stage.",
      "Once approved, you can sign in and post mentorship opportunities.",
    ]
  },
  student: {
    eyebrow: 'Registration received',
    title:   'Your account is <em>being set up</em>',
    desc:    "We've received your student registration and it's being processed.",
    stages: [
      { x:40,  color:'#4A84F5', icon:'📝', title:'Registration Submitted',  desc:'Your details have been received.' },
      { x:300, color:'#F5A623', icon:'⚙️', title:'Profile Being Processed', desc:"We're setting up your student profile." },
      { x:560, color:'#2DD4A0', icon:'🎉', title:'Account Activated',       desc:'Your account is ready. Sign in to explore opportunities.' },
    ],
    next: [
      'Your registration details are being processed.',
      "You'll receive a confirmation email with activation link.",
      'Once active, sign in to browse mentorship opportunities.',
      'You can track all applications from your dashboard.',
    ]
  }
};

const content = CONTENT[role] || CONTENT.mentor;
const STAGES  = content.stages;

// ── Utility easing ──
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// ── Animate tracker ──
function runTracker() {
  const fillLine  = document.getElementById('fillLine');
  const travelDot = document.getElementById('travelDot');
  const targetX   = STAGES[activeStage].x;
  const startX    = STAGES[0].x;
  const duration  = 1800;
  let start = null;

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

// ── Activate stage nodes ──
function activateStages() {
  STAGES.forEach((s, i) => {
    const node = document.getElementById('node' + i);
    const dot  = document.getElementById('dot' + i);
    const num  = document.getElementById('num' + i);
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
      document.getElementById('statusTitle').textContent = s.title;
      document.getElementById('statusDesc').textContent  = s.desc;
      document.querySelector('.status-icon').textContent = s.icon;
    } else {
      label.className = 'stage-name pending';
    }
  });
}

// ── Boot ──
window.addEventListener('DOMContentLoaded', () => {
  const firstName = sessionStorage.getItem('arc_first_name');
  const email     = sessionStorage.getItem('arc_email');

  // Eyebrow based on source
  if (sourcePage === 'signup') {
    document.querySelector('.track-eyebrow').textContent = "Thanks for signing up!";
  } else if (sourcePage === 'login') {
    document.querySelector('.track-eyebrow').textContent = "Welcome back!";
  } else {
    document.querySelector('.track-eyebrow').textContent = content.eyebrow;
  }

  // Title personalization
  const titleEl = document.querySelector('.track-title');
  if (firstName) {
    titleEl.innerHTML = `Hey <em>${firstName}</em>, your ${role === 'mentor' ? 'application' : 'account'} is on its way`;
  } else {
    titleEl.innerHTML = content.title;
  }

  // Description
  const desc = document.getElementById('trackDesc');
  desc.textContent = content.desc + (email ? ` We'll send updates to ${email}.` : '');

  // Stage labels
  document.getElementById('stageName0').textContent = STAGES[0].title;
  document.getElementById('stageName1').textContent = STAGES[1].title;
  document.getElementById('stageName2').textContent = STAGES[2].title;

  // Next steps
  document.getElementById('nextList').innerHTML = content.next
    .map(item => `<li><span class="next-dot"></span> ${item}</li>`)
    .join('');

  runTracker();
});
