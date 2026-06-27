import geomagnetism from 'geomagnetism';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const model = geomagnetism.model(new Date('2025-01-01'));
    const rows = [];
    let id = 1;
    
    for (let n = 1; n <= model.n_max; n++) {
      for (let m = 0; m <= n; m++) {
        const index = (n * (n + 1)) / 2 + m;
        rows.push({
          id: id++,
          epoch: model.epoch,
          n: n,
          m: m,
          g: model.main_field_coeff_g[index],
          h: model.main_field_coeff_h[index],
          g_dot: model.secular_var_coeff_g[index],
          h_dot: model.secular_var_coeff_h[index]
        });
      }
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
