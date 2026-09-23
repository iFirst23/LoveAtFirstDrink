const { isValidSession } = require('../../lib/adminAuth');
const { sb } = require('../../lib/supabaseAdmin');

module.exports = async (req, res) => {
  if (!isValidSession(req)) { res.status(401).json({ ok: false, error: 'unauthorized' }); return; }
  if (req.method !== 'GET') { res.status(405).json({ ok: false, error: 'method not allowed' }); return; }
  try {
    const rows = await sb('social_posts?select=*&order=created_at.desc&limit=500');
    res.status(200).json({ ok: true, posts: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: String((e && e.message) || e) });
  }
};
