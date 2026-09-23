/* v2 */
/*
  Social Wall — shared data helpers (used by social.js and live.js).
  Talks directly to Supabase's REST endpoint (PostgREST) with the public
  anon key. Row-Level-Security on the `social_posts` table means this key
  can only ever (a) read rows where status = 'approved' and (b) insert a
  new row as status = 'pending' — it can never approve/reject/pin/delete
  anything. Those actions require the service_role key, which only ever
  lives server-side in the /api/admin/* functions. See supabase/schema.sql.
*/
(function () {
  var C = window.SOCIAL_CONFIG || {};

  function configured() {
    return !!(C.supabaseUrl && C.supabaseAnonKey);
  }

  function rest(path, opts) {
    opts = opts || {};
    var headers = Object.assign(
      {
        apikey: C.supabaseAnonKey,
        Authorization: 'Bearer ' + C.supabaseAnonKey,
        'Content-Type': 'application/json'
      },
      opts.headers || {}
    );
    return fetch(C.supabaseUrl + '/rest/v1/' + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body
    }).then(function (res) {
      return res.text().then(function (t) {
        if (!res.ok) {
          throw new Error('Supabase ' + res.status + ': ' + t);
        }
        // Prefer: return=minimal responses come back 201/204 with an empty
        // body — only try to parse JSON when there's actually a body.
        return t ? JSON.parse(t) : null;
      });
    });
  }

  var SELECT_FIELDS =
    'id,platform,original_url,username,caption,media_type,thumbnail_url,media_url,is_pinned,created_at';

  // Fetch approved posts for the public wall / live mode.
  // opts: { platform: 'instagram'|'tiktok'|'facebook'|'other'|null, limit, offset }
  function fetchApproved(opts) {
    opts = opts || {};
    var q =
      'social_posts?select=' +
      SELECT_FIELDS +
      '&status=eq.approved&order=is_pinned.desc,created_at.desc' +
      '&limit=' + (opts.limit || 60) +
      (opts.offset ? '&offset=' + opts.offset : '');
    if (opts.platform) q += '&platform=eq.' + encodeURIComponent(opts.platform);
    return rest(q);
  }

  // Manual link submission. `data`: { platform, original_url, username, caption, thumbnail_url }
  function submitPost(data) {
    var row = {
      platform: data.platform,
      original_url: data.original_url,
      username: data.username || null,
      caption: data.caption || null,
      thumbnail_url: data.thumbnail_url || null,
      media_type: data.thumbnail_url ? 'image' : 'embed',
      source: 'manual_submission',
      status: 'pending',
      is_pinned: false
    };
    return rest('social_posts', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(row)
    });
  }

  window.SocialData = {
    configured: configured,
    fetchApproved: fetchApproved,
    submitPost: submitPost
  };
})();
