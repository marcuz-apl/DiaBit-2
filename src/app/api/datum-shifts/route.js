import db from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const epsg = searchParams.get('epsg');

    if (!epsg) {
      return new Response(JSON.stringify({ error: 'epsg query parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const shift = db.prepare('SELECT dx, dy, dz, region_name FROM datum_shifts WHERE epsg_code = ?').get(parseInt(epsg, 10));

    if (!shift) {
      return new Response(JSON.stringify({ found: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ found: true, ...shift }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error("Datum shifts API error:", err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
