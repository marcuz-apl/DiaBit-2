import db from '@/lib/database';

export async function GET(request) {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'auto_save_interval'").get();
    const interval = row ? parseInt(row.value, 10) : 3;
    return new Response(JSON.stringify({ auto_save_interval: interval }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { auto_save_interval } = body;
    const interval = parseInt(auto_save_interval, 10);
    if (isNaN(interval) || interval < 1 || interval > 15) {
      return new Response(JSON.stringify({ error: "Interval must be between 1 and 15 minutes" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    db.prepare(`
      INSERT INTO settings (key, value)
      VALUES ('auto_save_interval', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(interval.toString());

    return new Response(JSON.stringify({ auto_save_interval: interval }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
