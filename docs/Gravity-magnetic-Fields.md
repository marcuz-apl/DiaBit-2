# Geomagnetic & Gravity Field Reference for Directional Surveying

This document outlines the geodetic reference models, mathematical coordinate corrections, and Quality Control (QC) procedures applied in **DiaBit** to correct and validate downhole survey measurements.

---

## 1. Geomagnetic Reference Fields

Measurement While Drilling (MWD) tools use three-axis magnetometers to measure the Earth's local magnetic field vector $\mathbf{B} = (B_x, B_y, B_z)$ in the sensor's coordinate system. Since these measurements are relative to Magnetic North, reference datasets and geomagnetic models are required to compute true or grid coordinates.

### Geomagnetic Models
- **World Magnetic Model (WMM) / International Geomagnetic Reference Field (IGRF):** Standard spherical harmonic models representing the Earth's main magnetic field. They calculate reference parameters globally based on latitude, longitude, altitude, and date.
- **High Definition Geomagnetic Model (HDGM 2025):** A high-resolution model that incorporates crustal magnetic anomalies and solar-wind perturbations. It provides the highest accuracy for precision wellbore placement.

### Reference Parameters
1. **Magnetic Declination ($D$):** The angle between True North and Magnetic North in the horizontal plane (expressed in degrees, East positive).
2. **Magnetic Dip Angle ($Dip_{\text{ref}}$):** The angle that the magnetic field lines make with the horizontal plane (0° at the geomagnetic equator, $\pm90^\circ$ at the magnetic poles).
3. **Total Magnetic Intensity ($B_{\text{ref}}$):** The magnitude of the Earth's local magnetic field (typically ranging from 25,000 to 65,000 nT).

---

## 2. Gravity Reference Fields

Accelerometers measure the local gravity vector $\mathbf{G} = (G_x, G_y, G_z)$. Since the magnitude of Earth's gravity varies due to the oblate shape of the planet and local geodetic altitude, reference values are computed using theoretical models.

### Gravity Models
- **WGS84 / Somigliana Equation:** Computes theoretical gravity as a function of latitude ($\phi$):
  $$g(\phi) = 9.780327 \left(1 + 0.0053024 \sin^2\phi - 0.0000058 \sin^2 2\phi\right) \text{ m/s}^2$$
- **GRS80 / Normal Gravity Formula:** An alternative reference ellipsoid that computes theoretical gravity as a function of latitude. Provides slightly different coefficients from WGS84 but converges to the same standard value of $980.665 \text{ mGal}$ at standard conditions.

---

## 3. Azimuth Correction to Grid North

MWD sensors output a raw **Measured Azimuth** ($Az_{\text{meas}}$) aligned to Magnetic North. To project coordinates onto the map Coordinate Reference System (CRS), we compute a **Total Correction** ($TC$):

### Total Correction ($TC$) Formulation
- **Grid North Reference (with Grid Convergence $\gamma$):**
  $$TC = D - \gamma$$
  $$Az_{\text{grid}} = (Az_{\text{meas}} + TC) \pmod{360}$$
- **True North Reference:**
  $$TC = D$$
  $$Az_{\text{true}} = (Az_{\text{meas}} + TC) \pmod{360}$$

*Note: In the database, the raw measured azimuth is preserved in the `azimuth` column of the `survey_points` table to prevent double-correction errors. The 3D coordinates ($North$, $East$, $TVD$, $VS$) are computed using the corrected azimuth $Az_{\text{grid}}$ or $Az_{\text{true}}$.*

---

## 4. Short Collar Correction (SCC)

During drilling, the MWD tool is housed inside the bottom hole assembly (BHA). The steel drill string components (such as drill collars, mud motors, or stabilizers) generate local magnetic fields that corrupt the magnetometer readings. 

Because the BHA components are axial, the interference is primarily concentrated along the $z$-axis of the tool (along the drill string). The transverse magnetometers ($B_x, B_y$) remain uncorrupted.

### Mathematical Derivation of $B_{z,\text{corr}}$
Under the assumption that the accelerometer measurements are correct, we can reconstruct the correct axial magnetic vector $B_{z,\text{corr}}$ by projecting the reference magnetic vector onto the gravity vector.

In Earth coordinates:
$$\mathbf{B} \cdot \mathbf{G} = B_{\text{ref}} G_{\text{ref}} \sin(Dip_{\text{ref}})$$

In normalized tool-sensor coordinates (where $G_{\text{total}} = 1.0\text{ g}$):
$$B_x G_x + B_y G_y + B_z G_z = B_{\text{ref}} \sin(Dip_{\text{ref}})$$

Solving for the axial magnetic field component $B_z$ yields the **Short Collar Correction** formula:
$$B_{z,\text{corr}} = \frac{B_{\text{ref}} \sin(Dip_{\text{ref}}) - (B_x G_x + B_y G_y)}{G_z}$$

By replacing the distorted raw measurement $B_z$ with the corrected value $B_{z,\text{corr}}$, the tool software calculates a corrected magnetic azimuth that is free of BHA-induced magnetic interference.

---

## 5. Survey Quality Control (QC)

To validate downhole measurements, MWD surveys must satisfy rigorous Quality Control boundaries before coordinates are approved:

| Metric | QC Tolerance Limit | Description |
| :--- | :--- | :--- |
| **Gravity Magnitude** | $|G_{\text{meas}} - G_{\text{ref}}| \le \pm 0.003 \text{ g}$ | Checks for accelerometer calibration and physical shock. |
| **Magnetic Magnitude** | $|B_{\text{meas}} - B_{\text{ref}}| \le \pm 300 \text{ nT}$ | Identifies severe BHA interference or hot spots. |
| **Dip Angle Difference** | $|Dip_{\text{meas}} - Dip_{\text{ref}}| \le \pm 0.5^\circ$ | Validates that the measured magnetic flux angle matches the global model. |
