import db, { transaction } from '@/lib/database';
import { calculateSurvey } from '@/lib/mcm';

// Helper to climb the tree and get the well node and slot node
function getWellSettings(nodeId) {
  try {
    const trajectoryNode = db.prepare("SELECT * FROM nodes WHERE id = ?").get(nodeId);
    if (!trajectoryNode) return null;

    const slotNode = db.prepare("SELECT * FROM nodes WHERE id = ?").get(trajectoryNode.parent_id);
    if (!slotNode) return null;

    const wellNode = db.prepare("SELECT * FROM nodes WHERE id = ?").get(slotNode.parent_id);
    if (!wellNode) return null;

    const wellMetadata = wellNode.metadata ? JSON.parse(wellNode.metadata) : {};
    const trajMetadata = trajectoryNode.metadata ? JSON.parse(trajectoryNode.metadata) : {};

    return {
      units: wellMetadata.units || 'metric',
      vs_direction: wellMetadata.vs_direction || 0,
      latitude: wellMetadata.latitude || 0,
      longitude: wellMetadata.longitude || 0,
      easting: wellMetadata.easting || 0,
      northing: wellMetadata.northing || 0,
      elevation: wellMetadata.elevation || 0,
      crs: wellMetadata.crs || '',
      grid_convergence: wellMetadata.grid_convergence || 0,
      scale_factor: wellMetadata.scale_factor || 1.0,
      survey_method: wellMetadata.survey_method || 'Minimum Curvature / Lubinski',
      datum: wellMetadata.datum || 'KB',
      ref_elevation: wellMetadata.ref_elevation || 0,
      gl_elevation: wellMetadata.gl_elevation || 0,
      declination: wellMetadata.declination || 0,
      gravity_field: wellMetadata.gravity_field || 980.665,
      gravity_model: wellMetadata.gravity_model || 'WGS84',
      magnetic_field: wellMetadata.magnetic_field || 50000,
      magnetic_dip: wellMetadata.magnetic_dip || 60,
      declination_date: wellMetadata.declination_date || '',
      magnetic_model: wellMetadata.magnetic_model || 'HDGM 2025',
      north_reference: wellMetadata.north_reference || 'grid',
      grid_convergence_used: wellMetadata.grid_convergence_used !== undefined
        ? (wellMetadata.grid_convergence_used === true || wellMetadata.grid_convergence_used === 'true' || wellMetadata.grid_convergence_used === 'yes')
        : true,
      tie_in: trajMetadata.tie_in || { md: 0, inc: 0, az: 0, tvd: 0, north: 0, east: 0 }
    };
  } catch (e) {
    console.error("Error fetching well settings", e);
    return null;
  }
}

export async function GET(request, { params }) {
  try {
    const { nodeId } = await params;
    if (!nodeId) {
      return new Response(JSON.stringify({ error: "Missing node ID" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const points = db.prepare(`
      SELECT * FROM survey_points
      WHERE node_id = ?
      ORDER BY sequence_no ASC
    `).all(nodeId);

    return new Response(JSON.stringify(points), {
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

export async function POST(request, { params }) {
  try {
    const { nodeId } = await params;
    if (!nodeId) {
      return new Response(JSON.stringify({ error: "Missing node ID" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const rawPoints = await request.json(); // Array of { station_name, md, inclination, azimuth }
    if (!Array.isArray(rawPoints)) {
      return new Response(JSON.stringify({ error: "Data must be an array of points" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Climb the tree to find Well-level and Trajectory-level calculation settings
    const settings = getWellSettings(nodeId) || {
      units: 'metric',
      vs_direction: 0,
      tie_in: { md: 0, inc: 0, az: 0, tvd: 0, north: 0, east: 0 }
    };

    const trajectoryNode = db.prepare("SELECT * FROM nodes WHERE id = ?").get(nodeId);
    const isSurvey = trajectoryNode ? trajectoryNode.type === 'survey' : false;

    let totalCorrection = 0;
    if (isSurvey) {
      const declination = parseFloat(settings.declination) || 0;
      const gridConvergence = parseFloat(settings.grid_convergence) || 0;
      const northRef = settings.north_reference || 'grid';
      const gridConvUsed = settings.grid_convergence_used;
      
      if (northRef === 'grid' && gridConvUsed) {
        totalCorrection = declination - gridConvergence;
      } else {
        totalCorrection = declination;
      }
    }

    // Calculate full trajectories using Minimum Curvature Method (with corrected azimuth for surveys)
    const calculatedPoints = calculateSurvey(
      rawPoints.map(p => {
        const rawAz = parseFloat(p.azimuth || p.az || 0);
        let corrAz = rawAz;
        if (isSurvey) {
          corrAz = (rawAz + totalCorrection) % 360;
          if (corrAz < 0) corrAz += 360;
        }
        return {
          md: parseFloat(p.md),
          inc: parseFloat(p.inclination || p.inc || 0),
          az: corrAz
        };
      }),
      settings.tie_in,
      settings.vs_direction,
      settings.units === 'imperial' ? 'imperial' : 'metric'
    );

    // Save points to database inside a transaction
    transaction(() => {
      // Clear existing points for this node
      db.prepare("DELETE FROM survey_points WHERE node_id = ?").run(nodeId);

      // Insert new calculated points
      const insertStmt = db.prepare(`
        INSERT INTO survey_points (node_id, sequence_no, station_name, md, inclination, azimuth, tvd, north, east, dls, vs)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      calculatedPoints.forEach((pt, idx) => {
        const rawPt = rawPoints[idx] || {};
        const rawAz = parseFloat(rawPt.azimuth || rawPt.az || 0);
        const stationName = rawPt.station_name !== undefined ? String(rawPt.station_name) : '';
        insertStmt.run(
          nodeId,
          idx,
          stationName,
          pt.md,
          pt.inc,
          rawAz, // Raw azimuth stored in DB
          pt.tvd,
          pt.north,
          pt.east,
          pt.dls,
          pt.vs
        );
      });
    })();

    // Read saved points back to return the primary-key-associated rows
    const savedPoints = db.prepare(`
      SELECT * FROM survey_points
      WHERE node_id = ?
      ORDER BY sequence_no ASC
    `).all(nodeId);

    return new Response(JSON.stringify(savedPoints), {
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
