import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Hash function helper using Node.js crypto
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function initDb(db) {
  console.log("Initializing database tables...");

  // 1. Create Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Create Nodes table (Tree Hierarchy)
  db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      metadata TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES nodes (id) ON DELETE CASCADE
    );
  `);

  // 3. Create Survey Points table
  db.exec(`
    CREATE TABLE IF NOT EXISTS survey_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id INTEGER NOT NULL,
      sequence_no INTEGER NOT NULL,
      station_name TEXT DEFAULT '',
      md REAL NOT NULL,
      inclination REAL NOT NULL,
      azimuth REAL NOT NULL,
      tvd REAL NOT NULL,
      north REAL NOT NULL,
      east REAL NOT NULL,
      dls REAL NOT NULL,
      vs REAL NOT NULL,
      FOREIGN KEY (node_id) REFERENCES nodes (id) ON DELETE CASCADE
    );
  `);

  // Migrate: add station_name column if it doesn't exist yet (for existing databases)
  try {
    db.exec(`ALTER TABLE survey_points ADD COLUMN station_name TEXT DEFAULT '';`);
  } catch (_) {
    // Column already exists, ignore
  }

  // 4. Create Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const settingCount = db.prepare("SELECT count(*) as count FROM settings WHERE key = 'auto_save_interval'").get().count;
  if (settingCount === 0) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('auto_save_interval', '3')").run();
  }

  // 5. Create Messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 6. Create Field Models table
  db.exec(`
    CREATE TABLE IF NOT EXISTS field_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_type TEXT NOT NULL,
      name TEXT UNIQUE NOT NULL,
      year INTEGER NOT NULL,
      provider TEXT,
      description TEXT,
      default_strength REAL,
      default_dip REAL
    );
  `);

  const modelCount = db.prepare("SELECT count(*) as count FROM field_models").get().count;
  if (modelCount === 0) {
    console.log("Seeding field models from local datasets...");
    const insertModel = db.prepare(`
      INSERT OR IGNORE INTO field_models (model_type, name, year, provider, description, default_strength, default_dip)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      const gPath = path.join(process.cwd(), 'data', 'g-m-fields', 'gravity_models.json');
      const mPath = path.join(process.cwd(), 'data', 'g-m-fields', 'magnetic_models.json');

      if (fs.existsSync(gPath)) {
        const gravityModels = JSON.parse(fs.readFileSync(gPath, 'utf8'));
        gravityModels.forEach(m => {
          insertModel.run('gravity', m.name, m.year, m.provider, m.description, m.default_strength, null);
        });
      }

      if (fs.existsSync(mPath)) {
        const magneticModels = JSON.parse(fs.readFileSync(mPath, 'utf8'));
        magneticModels.forEach(m => {
          insertModel.run('magnetic', m.name, m.year, m.provider, m.description, m.default_strength, m.default_dip);
        });
      }
      console.log("Field models seeded successfully.");
    } catch (err) {
      console.error("Failed to seed field models", err);
    }
  }

  console.log("Tables verified.");

  // Check if users table is empty, and seed if so
  const userCount = db.prepare("SELECT count(*) as count FROM users").get().count;
  if (userCount === 0) {
    console.log("Seeding default users...");
    const insertUser = db.prepare(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `);

    insertUser.run('admin', 'admin@alfazen.com', hashPassword('admin123'), 'admin');
    insertUser.run('engineer', 'engineer@alfazen.com', hashPassword('driller123'), 'user');
    console.log("Default users seeded.");
  }

  // Check if nodes table is empty, and seed if so
  const nodeCount = db.prepare("SELECT count(*) as count FROM nodes").get().count;
  if (nodeCount === 0) {
    console.log("Seeding default tree hierarchy...");

    // Helper to insert a node
    const insertNode = db.prepare(`
      INSERT INTO nodes (parent_id, name, type, metadata)
      VALUES (?, ?, ?, ?)
    `);

    // USA
    const usaId = insertNode.run(null, 'USA', 'country', JSON.stringify({})).lastInsertRowid;
    // Texas
    const texasId = insertNode.run(usaId, 'Texas', 'state', JSON.stringify({})).lastInsertRowid;
    // Permian Basin
    const permianId = insertNode.run(texasId, 'Permian Basin', 'basin', JSON.stringify({})).lastInsertRowid;
    // Midland Field
    const midlandId = insertNode.run(permianId, 'Mid Midland', 'field', JSON.stringify({})).lastInsertRowid;
    // Well-101H
    const wellId = insertNode.run(midlandId, 'Well-101H', 'well', JSON.stringify({
      latitude: 31.997,
      longitude: -102.078,
      easting: 450000,
      northing: 3540000,
      elevation: 2850, // ft
      vs_direction: 45.0, // degrees
      units: 'metric', // default units
      crs: "UTM Zone 14N",
      grid_convergence: 1.25,
      scale_factor: 0.9996,
      survey_method: "Minimum Curvature / Lubinski",
      datum: "KB",
      ref_elevation: 2850,
      gl_elevation: 2825,
      declination: 6.5,
      gravity_field: 980.665,
      gravity_model: "WGS84 / Somigliana",
      magnetic_field: 48500,
      magnetic_dip: 60.5,
      declination_date: "2026-06-26",
      magnetic_model: "HDGM 2025",
      north_reference: "grid",
      grid_convergence_used: true
    })).lastInsertRowid;
    // Slot-A1
    const slotId = insertNode.run(wellId, 'Slot-A1', 'slot', JSON.stringify({ offset_x: 0, offset_y: 0 })).lastInsertRowid;

    // Trajectory Plan 1
    const planId = insertNode.run(slotId, 'Midland Plan A', 'trajectory', JSON.stringify({
      is_planned: true,
      tie_in: { md: 0, inc: 0, az: 0, tvd: 0, north: 0, east: 0 }
    })).lastInsertRowid;

    // Deviation Survey 1
    const surveyId = insertNode.run(slotId, 'Midland Survey Actual', 'survey', JSON.stringify({
      is_planned: false,
      tie_in: { md: 0, inc: 0, az: 0, tvd: 0, north: 0, east: 0 }
    })).lastInsertRowid;

    // Seed points for Midland Plan A
    const planPoints = [
      { seq: 0, md: 0, inc: 0, az: 0, tvd: 0, north: 0, east: 0, dls: 0, vs: 0 },
      { seq: 1, md: 500, inc: 0, az: 0, tvd: 500, north: 0, east: 0, dls: 0, vs: 0 },
      { seq: 2, md: 1000, inc: 5, az: 45, tvd: 999.37, north: 15.42, east: 15.42, dls: 0.3, vs: 21.8 },
      { seq: 3, md: 2000, inc: 15, az: 45, tvd: 1980.12, north: 138.2, east: 138.2, dls: 0.3, vs: 195.4 },
      { seq: 4, md: 3000, inc: 45, az: 60, tvd: 2824.5, north: 501.1, east: 588.6, dls: 0.9, vs: 770.2 }
    ];

    const insertPoint = db.prepare(`
      INSERT INTO survey_points (node_id, sequence_no, station_name, md, inclination, azimuth, tvd, north, east, dls, vs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const pt of planPoints) {
      insertPoint.run(planId, pt.seq, pt.name || '', pt.md, pt.inc, pt.az, pt.tvd, pt.north, pt.east, pt.dls, pt.vs);
    }

    // Seed points for Midland Survey Actual
    const surveyPoints = [
      { seq: 0, name: 'TIE-IN', md: 0, inc: 0, az: 0, tvd: 0, north: 0, east: 0, dls: 0, vs: 0 },
      { seq: 1, name: '',      md: 500, inc: 0.2, az: 10, tvd: 500, north: 0.86, east: 0.15, dls: 0.012, vs: 0.72 },
      { seq: 2, name: 'KOP',   md: 1000, inc: 4.8, az: 42, tvd: 999.5, north: 16.2, east: 14.8, dls: 0.276, vs: 21.9 },
      { seq: 3, name: '',      md: 1500, inc: 9.6, az: 44, tvd: 1495.2, north: 61.4, east: 58.7, dls: 0.288, vs: 84.9 }
    ];

    for (const pt of surveyPoints) {
      insertPoint.run(surveyId, pt.seq, pt.name || '', pt.md, pt.inc, pt.az, pt.tvd, pt.north, pt.east, pt.dls, pt.vs);
    }

    console.log("Default tree hierarchy seeded successfully.");
  }
}
