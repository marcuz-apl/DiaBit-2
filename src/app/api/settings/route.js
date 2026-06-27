import db from '@/lib/database';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'auto_save_interval'").get();
    const interval = row ? parseInt(row.value, 10) : 3;

    const rowFmt = db.prepare("SELECT value FROM settings WHERE key = 'lat_lon_format'").get();
    const format = rowFmt ? rowFmt.value : 'decimal';

    return new Response(JSON.stringify({ 
      auto_save_interval: interval,
      lat_lon_format: format
    }), {
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
    const { auto_save_interval, lat_lon_format } = body;
    
    let interval = 3;
    if (auto_save_interval !== undefined) {
      interval = parseInt(auto_save_interval, 10);
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
    }

    let format = 'decimal';
    if (lat_lon_format) {
      format = lat_lon_format === 'dms' ? 'dms' : 'decimal';
      db.prepare(`
        INSERT INTO settings (key, value)
        VALUES ('lat_lon_format', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(format);
    }

    return new Response(JSON.stringify({ 
      auto_save_interval: interval,
      lat_lon_format: format
    }), {
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
