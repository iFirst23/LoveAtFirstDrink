// Server-side only Supabase REST (PostgREST) helper using the service_role
// key. Bypasses RLS — this file must NEVER be imported by anything shipped
// to the browser, only by /api/admin/*.js serverless functions.

async function sb(path, opts) {
  opts = opts || {};
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars are not set');

  const res = await fetch(`${url}/rest/v1/${path}`, {
    method: opts.method || 'GET',
    headers: Object.assign(
      {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: opts.prefer || 'return=representation'
      },
      opts.headers || {}
    ),
    body: opts.body
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

module.exports = { sb };
