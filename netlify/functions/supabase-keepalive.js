// Scheduled function: runs every 5 days to keep Supabase free-tier project active.
// Supabase pauses projects after 7 days of inactivity – this prevents that.

export const config = {
  schedule: '0 8 */5 * *', // every 5 days at 08:00 UTC
};

export default async () => {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('keepalive: missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    return new Response('missing env vars', { status: 500 });
  }

  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    console.log(`keepalive: Supabase responded with ${res.status}`);
    return new Response(JSON.stringify({ ok: res.ok, status: res.status }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    console.error('keepalive: fetch failed', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
};
