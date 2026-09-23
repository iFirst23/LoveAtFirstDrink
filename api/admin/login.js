const { makeSessionCookie, checkPassword } = require('../../lib/adminAuth');

function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return {};
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method not allowed' }); return; }
  const body = readJsonBody(req);
  if (!checkPassword(body.password)) {
    res.status(401).json({ ok: false, error: 'wrong password' });
    return;
  }
  res.setHeader('Set-Cookie', makeSessionCookie());
  res.status(200).json({ ok: true });
};
