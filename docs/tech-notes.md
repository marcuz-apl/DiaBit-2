# Technical Notes - DiaBit Trajectory Calculations

This document details the engineering specifications, mathematical algorithms, and architecture of **DiaBit**, a directional drilling survey calculation tool mirroring suites like COMPASS and SysDril.

---

## 1. Mathematical Model: Minimum Curvature Method (MCM)

The Minimum Curvature Method is the industry-standard method to calculate 3D wellbore trajectories. Unlike the simplified Average Angle Method, MCM computes a smooth circular arc between two survey stations to represent the physical borehole path.

### Survey Inputs
For station $i$ and station $i+1$, we require:
- **Measured Depth ($MD_i, MD_{i+1}$)**: The physical cable or pipe length down the hole.
- **Inclination ($I_i, I_{i+1}$)**: The angle (in degrees) of deviation from vertical ($0^\circ$ is straight down).
- **Azimuth ($A_i, A_{i+1}$)**: The compass direction (in degrees) relative to North ($0^\circ$ is North, $90^\circ$ is East).

### Mathematical Equations

#### 1. Dogleg Angle ($\beta$)
The change in angle between the two stations is calculated in radians:
$$\cos \beta = \cos I_i \cos I_{i+1} + \sin I_i \sin I_{i+1} \cos(A_{i+1} - A_i)$$

To avoid floating-point exceptions:
$$\beta = \arccos\left(\max\left(-1, \min\left(1, \cos \beta\right)\right)\right)$$

#### 2. Ratio Factor ($F$)
To account for the arc curve rather than a chord change:
- If $\beta < 10^{-6}$ radians:
  $$F = 1.0$$
- Otherwise:
  $$F = \frac{2}{\beta} \tan\left(\frac{\beta}{2}\right)$$

#### 3. Coordinate Offsets
The incremental changes in vertical depth (TVD) and horizontal displacement (North, East) are:
$$\Delta \text{TVD} = \frac{MD_{i+1} - MD_i}{2} \left(\cos I_i + \cos I_{i+1}\right) \cdot F$$
$$\Delta \text{North} = \frac{MD_{i+1} - MD_i}{2} \left(\sin I_i \cos A_i + \sin I_{i+1} \cos A_{i+1}\right) \cdot F$$
$$\Delta \text{East} = \frac{MD_{i+1} - MD_i}{2} \left(\sin I_i \sin A_i + \sin I_{i+1} \sin A_{i+1}\right) \cdot F$$

Cumulative coordinates relative to the wellhead are:
$$\text{TVD}_{i+1} = \text{TVD}_i + \Delta \text{TVD}$$
$$\text{North}_{i+1} = \text{North}_i + \Delta \text{North}$$
$$\text{East}_{i+1} = \text{East}_i + \Delta \text{East}$$

#### 4. Dogleg Severity (DLS)
Dogleg Severity represents the angular change rate per unit interval:
- **Metric ($^\circ$/30m)**:
  $$DLS = \beta_{\text{degrees}} \times \frac{30}{MD_{i+1} - MD_i}$$
- **Imperial ($^\circ$/100ft)**:
  $$DLS = \beta_{\text{degrees}} \times \frac{100}{MD_{i+1} - MD_i}$$

#### 5. Vertical Section (VS)
The Vertical Section is the projection of the horizontal coordinates onto a target direction azimuth ($\theta_{VS}$):
$$VS_{i+1} = \text{East}_{i+1} \sin \theta_{VS} + \text{North}_{i+1} \cos \theta_{VS}$$

#### 6. Closure Distance & Azimuth
$$\text{Closure Distance} = \sqrt{\text{East}^2 + \text{North}^2}$$
$$\text{Closure Direction} = \text{atan2}(\text{East}, \text{North}) \pmod{360}$$

---

## 2. Database Design (SQLite)

We use SQLite for local caching, imports, and multi-user profile storage. The schema consists of three primary tables:

```
                  +------------------+
                  |      users       |
                  +------------------+
                  | id (PK)          |
                  | username (Unique)|
                  | email (Unique)   |
                  | password_hash    |
                  | role             |
                  +------------------+
                           
                  +------------------+
                  |      nodes       |
                  +------------------+
                  | id (PK)          |
                  | parent_id (FK)   | <---+ (Self-referencing tree)
                  | name             |     |
                  | type             | ----+
                  | metadata (JSON)  |
                  +------------------+
                           |
                           | 1
                           |
                           | N
                  +------------------+
                  |  survey_points   |
                  +------------------+
                  | id (PK)          |
                  | node_id (FK)     |
                  | sequence_no      |
                  | md               |
                  | inclination      |
                  | azimuth          |
                  | tvd, north, east |
                  | dls, vs          |
                  +------------------+
```

### Cascade Deletes
We explicitly enabled SQLite foreign key constraints:
```sql
PRAGMA foreign_keys = ON;
```
If a parent Well or Slot node is deleted, all child Trajectories, Deviation Surveys, and their respective `survey_points` are cleaned up automatically via `ON DELETE CASCADE`.

---

## 3. Dynamic Plotly Engineering Charts
To bypass Server-Side Rendering (SSR) limits in Next.js, the `TrajectoryCharts` component is loaded dynamically on the client.
- **3D Trajectory**: Plots $X$ (Easting), $Y$ (Northing), and $Z$ (TVD, inverted) in 3D.
- **Plan View**: $X$ vs $Y$ with a locked 1:1 aspect ratio to ensure no path distortion.
- **Vertical Section View**: Horizontal displacement along VS vs TVD (inverted).
- **Overlay Plots**: Sibling node data is fetched dynamically. If a user loads a Survey path, it retrieves its twin Trajectory Plan to plot both side-by-side for plan-vs-actual comparison.

## 4. Universal Coordinate System Engine (Proj4 & EPSG)

To support arbitrary local projections (e.g., ED50 UTM34N) beyond standard WGS84 datums, the application employs a universal projection engine architecture:

### 1. Full EPSG Catalog Integration
Instead of hardcoding standard UTM zones, the system utilizes the `epsg-index` NPM package. This provides a machine-readable JSON registry of over 8,000 Coordinate Reference Systems globally. These records are seeded into the local SQLite `crs_registry` table, allowing offline, zero-latency autocomplete searches across thousands of international standards.

### 2. Proj4 Mathematical Projections
For spatial coordinate transformation (e.g., Easting/Northing → Lat/Lon), the backend relies on the `proj4` engine rather than closed-form WGS84 equations (like Karney's series). 
- When an API request (`/api/geo?type=utm`) is triggered, the system retrieves the `proj4` string definition from the `crs_registry` (e.g., `+proj=utm +zone=34 +ellps=intl...`).
- It passes the input Cartesian coordinates through `proj4` against a WGS84 baseline to compute the exact Latitude and Longitude.

### 3. Grid Convergence and Point Scale Factor
Because `proj4` outputs spatial coordinates but does not natively expose mapping factors (Convergence and Scale Factor) to the Javascript wrapper, these are computed dynamically via finite differences:
- A secondary point $1000m$ purely Grid North from the target is projected.
- The differences in Geodetic coordinates ($d\lambda, d\phi$) are used to compute the angle from True North to Grid North (Convergence $\gamma$) and the proportional distortion (Scale Factor $k$).
