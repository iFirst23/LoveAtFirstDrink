const { isValidSession } = require('../../lib/adminAuth');
const { sb } = require('../../lib/supabaseAdmin');

const PATCHES = {
  approve: { status: 'approved', approved_at: new Date().toISOString() },
  reject: { status: 'rejected' },
  pin: { is_pinned: true },
  unpin: { is_pinned: false },
  unpublish: { status: 'pending', is_pinned: false }
};

function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return {};
}

module.exports = async (req, res) => {
  if (!isValidSession(req)) { res.status(401).json({ ok: false, error: 'unauthorized' }); return; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method not allowed' }); return; }

  const body = readJsonBody(req);
  const id = body.id;
  const action = body.action;
  const patch = PATCHES[action];
  if (!id || !patch) { res.status(400).json({ ok: false, error: 'bad id/action' }); return; }

  // approve: only stamp approved_at the first time (keeps the original approval time on re-approve)
  const finalPatch = Object.assign({}, patch);

  try {
    const rows = await sb(`social_posts?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(finalPatch)
    });
    res.status(200).json({ ok: true, post: rows && rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: String((e && e.message) || e) });
  }
};
