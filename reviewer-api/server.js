require('dotenv').config();
const express = require('express');
const jwt     = require('jsonwebtoken');

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret"; // never hard-code in production
const PORT       = process.env.PORT || 3001;

// ── Fake data layer — replace with real DB queries ──
const db = {
  applications: {
    'demo-app-001': { id: 'demo-app-001', role: 'mentor', status: 'pending', email: 'jane@example.com' },
  },
  async getApplication(id) {
    return db.applications[id] || null;
  },
  async setApplicationStatus(id, status) {
    if (!db.applications[id]) return null;
    db.applications[id].status = status;
    db.applications[id].decidedAt = new Date().toISOString();
    return db.applications[id];
  },
};

// ── Auth middleware ──
function requireReviewer(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Missing reviewer token.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin' && payload.role !== 'mentor_reviewer') {
      return res.status(403).json({ message: 'Not authorized to review applications.' });
    }
    req.reviewer = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired reviewer token.' });
  }
}

// ── Reviewer login (issue token) ──
// For demo purposes only — replace with real credential check
app.post('/api/auth/reviewer-login', (req, res) => {
  const { email, password } = req.body;
  // TODO: validate reviewer credentials against DB
  if (email && password) {
    const token = jwt.sign({ sub: email, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ access_token: token });
  }
  return res.status(400).json({ message: 'Missing email or password.' });
});

// ── PATCH /api/applications/:id/decision ──
app.patch('/api/applications/:id/decision', requireReviewer, async (req, res) => {
  const { id } = req.params;
  const { decision } = req.body;

  if (decision !== 'accepted' && decision !== 'rejected') {
    return res.status(400).json({ message: 'decision must be "accepted" or "rejected".' });
  }

  const application = await db.getApplication(id);
  if (!application) {
    return res.status(404).json({ message: 'Application not found.' });
  }

  if (application.status !== 'pending') {
    return res.status(409).json({ message: `Application is already ${application.status}.` });
  }

  const status = decision === 'accepted' ? 'accepted' : 'rejected';
  const updated = await db.setApplicationStatus(id, status);

  console.log(`[decision] ${req.reviewer.sub} set ${id} -> ${status} at ${updated.decidedAt}`);

  // TODO: send applicant notification email here

  return res.json({ id: updated.id, status: updated.status, decidedAt: updated.decidedAt });
});

// ── Start server ──
app.listen(PORT, () => console.log(`Reviewer API listening on :${PORT}`));

module.exports=app;