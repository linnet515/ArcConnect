
const SYSTEM_PROMPT = `You are Arc Assistant, a friendly and knowledgeable AI helper for ArcConnect — a mentorship platform that connects alumni (mentors) and students.

About ArcConnect:
- ArcConnect is a structured mentorship platform built for alumni and students.
- Alumni (mentors) can post mentorship opportunities, define criteria and slots, review applicants, and accept or reject them.
- Students can browse opportunities, apply for mentorships, and track their application status in real time.
- The platform supports domains like placements, internships, higher studies (MS/MBA), entrepreneurship, software engineering, product management, data science, research, finance, consulting, design, and core engineering.
- Registration is free for both mentors and students.
- Mentors manage only their own opportunities; students can apply but cannot manage opportunities.
- Both roles get tailored dashboards.

Your job:
- Answer questions about ArcConnect clearly and helpfully.
- Keep answers concise — 2 to 4 sentences unless more detail is needed.
- Be warm, encouraging, and direct.
- If someone asks how to get started, guide them to register at the bottom of the page.
- Do not make up features that aren't described above.`;

let isOpen    = false;
let isLoading = false;
const history = [];

function toggleChat() {
  isOpen = !isOpen;
  document.getElementById('aiWindow').classList.toggle('open', isOpen);
  if (isOpen) document.getElementById('aiInput').focus();
}

function sendChip(btn) {
  const text = btn.textContent;
  document.getElementById('aiChips').style.display = 'none';
  sendMessage(text);
}

async function sendMessage(override) {
  if (isLoading) return;

  const input = document.getElementById('aiInput');
  const text  = override || input.value.trim();
  if (!text) return;
  input.value = '';

  appendMsg(text, 'user');
  history.push({ role: 'user', content: text });

  const typingId = appendMsg('Thinking…', 'bot typing');
  isLoading = true;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 1000,
        system:     SYSTEM_PROMPT,
        messages:   history
      })
    });

    const data  = await res.json();
    const reply = data.content?.map(b => b.text || '').join('')
                  || "Sorry, I couldn't get a response. Please try again.";

    removeMsg(typingId);
    appendMsg(reply, 'bot');
    history.push({ role: 'assistant', content: reply });

  } catch (e) {
    removeMsg(typingId);
    appendMsg('Something went wrong. Please try again.', 'bot');
  }

  isLoading = false;
}

function appendMsg(text, cls) {
  const id  = 'msg-' + Date.now() + Math.random();
  const box = document.getElementById('aiMessages');
  const div = document.createElement('div');
  div.className = 'ai-msg ' + cls;
  div.id        = id;
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return id;
}

function removeMsg(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}
