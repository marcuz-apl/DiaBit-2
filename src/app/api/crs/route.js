import db from '@/lib/database';

/**
 * GET /api/crs
 * Returns all active CRS entries, optionally filtered by ?q=search
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    let rows;
    if (q.trim()) {
      rows = db.prepare(`
        SELECT * FROM crs_registry
        WHERE name LIKE ? OR CAST(epsg_code AS TEXT) LIKE ? OR area LIKE ?
        ORDER BY active DESC, epsg_code ASC
        LIMIT 100
      `).all(`%${q}%`, `%${q}%`, `%${q}%`);
    } else {
      rows = db.prepare(`
        SELECT * FROM crs_registry WHERE active = 1 ORDER BY epsg_code ASC LIMIT 100
      `).all();
    }

    return new Response(JSON.stringify(rows), {
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

/**
 * POST /api/crs
 * Admin: Add a custom CRS entry
 * Body: { epsg_code, name, proj4, area, accuracy }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      epsg_code, name, proj4, area = '', accuracy = null
    } = body;

    if (!name || !proj4) {
      return new Response(JSON.stringify({ error: 'name and proj4 string are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const stmt = db.prepare(`
      INSERT INTO crs_registry
        (epsg_code, name, proj4, area, accuracy, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);

    const result = stmt.run(
      epsg_code || null, name, proj4, area, accuracy
    );

    const created = db.prepare('SELECT * FROM crs_registry WHERE id = ?').get(result.lastInsertRowid);
    return new Response(JSON.stringify(created), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
