// Shared by the /api/admin/* serverless functions only — never shipped to the
// browser. NOT itself an API route (lives outside /api on purpose).
const crypto = require('crypto');

const COOKIE_NAME = 'jf_admin_session';
const SESSION_TTL_MS = 18 * 60 * 60 * 1000; // 18h: setup time + the whole wedding night

function getSecret() {
  const s = process.env.ADMIN_PASSWORD;
  if (!s) throw new Error('ADMIN_PASSWORD env var is not set');
  return s;
}

function sign(expiry) {
  return crypto.createHmac('sha256', getSecret()).update(String(expiry)).digest('hex');
}

function makeSessionCookie() {
  const expiry = Date.now() + SESSION_TTL_MS;
  const sig = sign(expiry);
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${COOKIE_NAME}=${expiry}.${sig}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i === -1) return;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function isValidSession(req) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const raw = cookies[COOKIE_NAME];
    if (!raw) return false;
    const dot = raw.indexOf('.');
    if (dot === -1) return false;
    const expiryStr = raw.slice(0, dot);
    const sig = raw.slice(dot + 1);
    const expiry = Number(expiryStr);
    if (!expiry || !sig || Date.now() > expiry) return false;
    const expected = sign(expiry);
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
}

function checkPassword(candidate) {
  const secret = getSecret();
  const a = Buffer.from(String(candidate || ''));
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { COOKIE_NAME, makeSessionCookie, clearSessionCookie, isValidSession, checkPassword };
