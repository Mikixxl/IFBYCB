// Scheduled function: runs every 5 days to keep Supabase free-tier project active.
// Supabase pauses projects after 7 days of inactivity – this prevents that.
// No environment variables needed – uses the public /health endpoint.

export const config = {
  schedule: '0 8 */5 * *', // every 5 days at 08:00 UTC
};

const SUPABASE_URL = 'https://temecxyqpuismczghfvb.supabase.co';

export default async () => {
  try {
    const res = await fetch(`${SUPABASE_URL}/health`);
    console.log(`keepalive: Supabase /health responded with ${res.status}`);
    return new Response(JSON.stringify({ ok: res.ok, status: res.status }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    console.error('keepalive: fetch failed', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
};
