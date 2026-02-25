// units.js — Exhaustive unit definitions for all 28 categories
// Multiplicative units: value_in_base = value * factor
// Affine units (temperature): use toBase(v) / fromBase(v) functions
// Base units are SI unless noted in comments.

const CATEGORIES = [
  // ─────────────────────────────────────────────────────────────────────
  // 1. LENGTH
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'length',
    name: 'Length',
    group: 'Mechanics',
    base: 'm',
    units: [
      { id: 'm',   label: 'Metre (m)',           factor: 1 },
      { id: 'km',  label: 'Kilometre (km)',       factor: 1e3 },
      { id: 'cm',  label: 'Centimetre (cm)',      factor: 1e-2 },
      { id: 'mm',  label: 'Millimetre (mm)',      factor: 1e-3 },
      { id: 'µm',  label: 'Micrometre (µm)',      factor: 1e-6 },
      { id: 'nm',  label: 'Nanometre (nm)',       factor: 1e-9 },
      { id: 'in',  label: 'Inch (in)',            factor: 0.0254 },
      { id: 'ft',  label: 'Foot (ft)',            factor: 0.3048 },
      { id: 'yd',  label: 'Yard (yd)',            factor: 0.9144 },
      { id: 'mi',  label: 'Mile (mi)',            factor: 1609.344 },
      { id: 'nmi', label: 'Nautical mile (nmi)',  factor: 1852 },
      { id: 'ly',  label: 'Light-year (ly)',      factor: 9.4607304725808e15 },
      { id: 'au',  label: 'Astronomical unit (AU)', factor: 1.495978707e11 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 2. AREA
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'area',
    name: 'Area',
    group: 'Mechanics',
    base: 'm²',
    units: [
      { id: 'm2',   label: 'Square metre (m²)',      factor: 1 },
      { id: 'km2',  label: 'Square kilometre (km²)', factor: 1e6 },
      { id: 'cm2',  label: 'Square centimetre (cm²)',factor: 1e-4 },
      { id: 'mm2',  label: 'Square millimetre (mm²)',factor: 1e-6 },
      { id: 'ha',   label: 'Hectare (ha)',            factor: 1e4 },
      { id: 'ft2',  label: 'Square foot (ft²)',       factor: 0.09290304 },
      { id: 'in2',  label: 'Square inch (in²)',       factor: 6.4516e-4 },
      { id: 'yd2',  label: 'Square yard (yd²)',       factor: 0.83612736 },
      { id: 'mi2',  label: 'Square mile (mi²)',       factor: 2589988.110336 },
      { id: 'acre', label: 'Acre',                    factor: 4046.8564224 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 3. VOLUME
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'volume',
    name: 'Volume',
    group: 'Mechanics',
    base: 'm³',
    units: [
      { id: 'm3',    label: 'Cubic metre (m³)',      factor: 1 },
      { id: 'L',     label: 'Litre (L)',             factor: 1e-3 },
      { id: 'mL',    label: 'Millilitre (mL)',       factor: 1e-6 },
      { id: 'cm3',   label: 'Cubic centimetre (cm³)',factor: 1e-6 },
      { id: 'ft3',   label: 'Cubic foot (ft³)',      factor: 0.028316846592 },
      { id: 'in3',   label: 'Cubic inch (in³)',      factor: 1.6387064e-5 },
      { id: 'yd3',   label: 'Cubic yard (yd³)',      factor: 0.764554857984 },
      { id: 'galUS', label: 'Gallon US (gal)',        factor: 3.785411784e-3 },
      { id: 'galUK', label: 'Gallon UK (gal)',        factor: 4.54609e-3 },
      { id: 'qtUS',  label: 'Quart US (qt)',          factor: 9.46352946e-4 },
      { id: 'ptUS',  label: 'Pint US (pt)',           factor: 4.73176473e-4 },
      { id: 'flozUS',label: 'Fluid ounce US (fl oz)',factor: 2.95735296e-5 },
      { id: 'bbl',   label: 'Oil barrel (bbl)',       factor: 0.158987294928 },
      { id: 'tsp',   label: 'Teaspoon US (tsp)',      factor: 4.92892159e-6 },
      { id: 'tbsp',  label: 'Tablespoon US (tbsp)',   factor: 1.47867648e-5 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 4. TIME
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'time',
    name: 'Time',
    group: 'Mechanics',
    base: 's',
    units: [
      { id: 'ns',   label: 'Nanosecond (ns)',   factor: 1e-9 },
      { id: 'µs',   label: 'Microsecond (µs)',  factor: 1e-6 },
      { id: 'ms',   label: 'Millisecond (ms)',  factor: 1e-3 },
      { id: 's',    label: 'Second (s)',         factor: 1 },
      { id: 'min',  label: 'Minute (min)',       factor: 60 },
      { id: 'h',    label: 'Hour (h)',           factor: 3600 },
      { id: 'day',  label: 'Day',               factor: 86400 },
      { id: 'week', label: 'Week',              factor: 604800 },
      { id: 'month',label: 'Month (30 d)',       factor: 2592000 },
      { id: 'year', label: 'Year (365.25 d)',    factor: 31557600 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 5. FREQUENCY
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'frequency',
    name: 'Frequency',
    group: 'Mechanics',
    base: 'Hz',
    units: [
      { id: 'Hz',  label: 'Hertz (Hz)',       factor: 1 },
      { id: 'kHz', label: 'Kilohertz (kHz)',  factor: 1e3 },
      { id: 'MHz', label: 'Megahertz (MHz)',  factor: 1e6 },
      { id: 'GHz', label: 'Gigahertz (GHz)', factor: 1e9 },
      { id: 'THz', label: 'Terahertz (THz)', factor: 1e12 },
      { id: 'rpm', label: 'RPM',             factor: 1 / 60 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 6. MASS
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'mass',
    name: 'Mass',
    group: 'Mechanics',
    base: 'kg',
    units: [
      { id: 'kg',    label: 'Kilogram (kg)',        factor: 1 },
      { id: 'g',     label: 'Gram (g)',             factor: 1e-3 },
      { id: 'mg',    label: 'Milligram (mg)',       factor: 1e-6 },
      { id: 'µg',    label: 'Microgram (µg)',       factor: 1e-9 },
      { id: 't',     label: 'Tonne / metric ton (t)',factor: 1e3 },
      { id: 'oz',    label: 'Ounce (oz)',           factor: 0.028349523125 },
      { id: 'lb',    label: 'Pound (lb)',           factor: 0.45359237 },
      { id: 'stone', label: 'Stone (st)',           factor: 6.35029318 },
      { id: 'stUS',  label: 'Short ton US (st)',    factor: 907.18474 },
      { id: 'ltUK',  label: 'Long ton UK (lt)',     factor: 1016.0469088 },
      { id: 'grain', label: 'Grain (gr)',           factor: 6.479891e-5 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 7. AMOUNT OF SUBSTANCE
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'substance',
    name: 'Amount of substance',
    group: 'Thermodynamics',
    base: 'mol',
    units: [
      { id: 'mol',   label: 'Mole (mol)',       factor: 1 },
      { id: 'mmol',  label: 'Millimole (mmol)', factor: 1e-3 },
      { id: 'µmol',  label: 'Micromole (µmol)', factor: 1e-6 },
      { id: 'kmol',  label: 'Kilomole (kmol)',  factor: 1e3 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 8. TEMPERATURE  (affine — uses toBase / fromBase)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'temperature',
    name: 'Temperature',
    group: 'Thermodynamics',
    base: 'K',
    affine: true,
    units: [
      {
        id: 'K',  label: 'Kelvin (K)',
        toBase: v => v,
        fromBase: v => v
      },
      {
        id: 'C',  label: 'Celsius (°C)',
        toBase: v => v + 273.15,
        fromBase: v => v - 273.15
      },
      {
        id: 'F',  label: 'Fahrenheit (°F)',
        toBase: v => (v + 459.67) * 5 / 9,
        fromBase: v => v * 9 / 5 - 459.67
      },
      {
        id: 'R',  label: 'Rankine (°R)',
        toBase: v => v * 5 / 9,
        fromBase: v => v * 9 / 5
      },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 9. SPEED / VELOCITY
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'speed',
    name: 'Speed / Velocity',
    group: 'Mechanics',
    base: 'm/s',
    units: [
      { id: 'm/s',   label: 'Metre per second (m/s)',    factor: 1 },
      { id: 'km/h',  label: 'Kilometre per hour (km/h)', factor: 1 / 3.6 },
      { id: 'mph',   label: 'Mile per hour (mph)',        factor: 0.44704 },
      { id: 'kn',    label: 'Knot (kn)',                  factor: 0.514444 },
      { id: 'ft/s',  label: 'Foot per second (ft/s)',     factor: 0.3048 },
      { id: 'mach',  label: 'Mach (≈ 340.29 m/s)',        factor: 340.29 },
      { id: 'c',     label: 'Speed of light (c)',         factor: 299792458 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 10. ACCELERATION
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'acceleration',
    name: 'Acceleration',
    group: 'Mechanics',
    base: 'm/s²',
    units: [
      { id: 'm/s2',  label: 'Metre per second² (m/s²)', factor: 1 },
      { id: 'ft/s2', label: 'Foot per second² (ft/s²)', factor: 0.3048 },
      { id: 'g',     label: 'Standard gravity (g)',      factor: 9.80665 },
      { id: 'gal',   label: 'Gal (cm/s²)',              factor: 0.01 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 11. FORCE
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'force',
    name: 'Force',
    group: 'Mechanics',
    base: 'N',
    units: [
      { id: 'N',    label: 'Newton (N)',           factor: 1 },
      { id: 'kN',   label: 'Kilonewton (kN)',      factor: 1e3 },
      { id: 'MN',   label: 'Meganewton (MN)',      factor: 1e6 },
      { id: 'lbf',  label: 'Pound-force (lbf)',    factor: 4.4482216152605 },
      { id: 'kgf',  label: 'Kilogram-force (kgf)', factor: 9.80665 },
      { id: 'dyn',  label: 'Dyne (dyn)',           factor: 1e-5 },
      { id: 'kip',  label: 'Kip (kip)',            factor: 4448.2216152605 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 12. PRESSURE / STRESS
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'pressure',
    name: 'Pressure / Stress',
    group: 'Mechanics',
    base: 'Pa',
    units: [
      { id: 'Pa',   label: 'Pascal (Pa)',         factor: 1 },
      { id: 'kPa',  label: 'Kilopascal (kPa)',    factor: 1e3 },
      { id: 'MPa',  label: 'Megapascal (MPa)',    factor: 1e6 },
      { id: 'GPa',  label: 'Gigapascal (GPa)',    factor: 1e9 },
      { id: 'bar',  label: 'Bar (bar)',           factor: 1e5 },
      { id: 'mbar', label: 'Millibar (mbar)',      factor: 1e2 },
      { id: 'atm',  label: 'Atmosphere (atm)',    factor: 101325 },
      { id: 'psi',  label: 'Pound per in² (psi)', factor: 6894.757293168 },
      { id: 'ksi',  label: 'Kip per in² (ksi)',   factor: 6894757.293168 },
      { id: 'torr', label: 'Torr (torr)',          factor: 133.322368421 },
      { id: 'mmHg', label: 'mmHg',                factor: 133.322387415 },
      { id: 'inHg', label: 'Inch of mercury (inHg)', factor: 3386.389 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 13. ENERGY / POWER / COMMODITIES  (base unit: Joule)
  // Notes on commodity reference values (fixed averages):
  //   Crude oil: 6.117 GJ/bbl  (IEA, ~34.2 GJ/m³)
  //   Natural gas: 37.78 MJ/m³ (gross CV at 15 °C, 101.325 kPa)
  //   Hard coal: 29.3 GJ/t     (IEA net calorific value average)
  //   Diesel: 35.86 MJ/L (LHV)
  //   Petrol / gasoline: 32.18 MJ/L (LHV)
  //   LPG (propane/butane mix): 25.3 MJ/L (LHV, liquid)
  //   LNG: 21.1 MJ/L (liquid, LHV basis)
  //   Hydrogen: 120.1 MJ/kg (LHV)
  // Power units share the same category for coherence.
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'energy',
    name: 'Energy / Power / Commodities',
    group: 'Energy',
    base: 'J',
    units: [
      // ── pure energy ──────────────────────────────────────────────
      { id: 'J',      label: 'Joule (J)',            factor: 1 },
      { id: 'kJ',     label: 'Kilojoule (kJ)',       factor: 1e3 },
      { id: 'MJ',     label: 'Megajoule (MJ)',       factor: 1e6 },
      { id: 'GJ',     label: 'Gigajoule (GJ)',       factor: 1e9 },
      { id: 'TJ',     label: 'Terajoule (TJ)',       factor: 1e12 },
      { id: 'cal',    label: 'Calorie (cal)',         factor: 4.184 },
      { id: 'kcal',   label: 'Kilocalorie (kcal)',   factor: 4184 },
      { id: 'BTU',    label: 'BTU (IT)',              factor: 1055.05585262 },
      { id: 'MMBtu',  label: 'MMBtu',                factor: 1055055852.62 },
      { id: 'therm',  label: 'Therm (US)',            factor: 105480400 },
      { id: 'Wh',     label: 'Watt-hour (Wh)',        factor: 3600 },
      { id: 'kWh',    label: 'Kilowatt-hour (kWh)',  factor: 3.6e6 },
      { id: 'MWh',    label: 'Megawatt-hour (MWh)',  factor: 3.6e9 },
      { id: 'GWh',    label: 'Gigawatt-hour (GWh)',  factor: 3.6e12 },
      { id: 'TWh',    label: 'Terawatt-hour (TWh)',  factor: 3.6e15 },
      { id: 'eV',     label: 'Electronvolt (eV)',    factor: 1.602176634e-19 },
      { id: 'ftlbf',  label: 'Foot-pound (ft·lbf)',  factor: 1.3558179483314 },
      // ── power (energy per second) ─────────────────────────────────
      // Note: power × time = energy. To convert a power value enter it
      // multiplied by 1 second; display label clarifies "per second".
      // These are listed here as W = J/s equivalents.
      { id: 'W',      label: 'Watt (W)  [=J/s]',    factor: 1 },        // 1 W·s = 1 J
      { id: 'kW',     label: 'Kilowatt (kW) [=J/s]',factor: 1e3 },
      { id: 'MW',     label: 'Megawatt (MW) [=J/s]',factor: 1e6 },
      { id: 'GW',     label: 'Gigawatt (GW) [=J/s]',factor: 1e9 },
      { id: 'hpMech', label: 'HP mechanical [=J/s]', factor: 745.69987158227022 },
      { id: 'hpMet',  label: 'HP metric [=J/s]',     factor: 735.49875 },
      { id: 'BTU/h',  label: 'BTU/h [=J/s]',         factor: 1055.05585262 / 3600 },
      { id: 'ton_ref',label: 'Ton of refrigeration [=J/s]', factor: 3516.8528420667 },
      // ── oil & liquids (energy equiv, ref: IEA crude) ─────────────
      { id: 'bbl_oe', label: 'Barrel of oil equiv (boe)', factor: 6.117e9 },
      { id: 'toe',    label: 'Tonne of oil equiv (toe)',   factor: 41.868e9 },
      { id: 'Mtoe',   label: 'Mtoe',                       factor: 41.868e15 },
      // ── natural gas (37.78 MJ/m³ gross CV) ───────────────────────
      { id: 'Nm3_gas',label: 'Nm³ natural gas',            factor: 37.78e6 },
      { id: 'Mcf',    label: 'Mcf natural gas',            factor: 37.78e6 * 28.316846592 },
      { id: 'MMscf',  label: 'MMscf natural gas',          factor: 37.78e6 * 28316.846592 },
      // ── coal (29.3 GJ/t hard coal) ───────────────────────────────
      { id: 't_coal', label: 'Tonne hard coal (29.3 GJ/t)',factor: 29.3e9 },
      { id: 'tce',    label: 'Tonne of coal equiv (tce)',  factor: 29.3076e9 },
      // ── refined / alt fuels per litre ────────────────────────────
      { id: 'L_diesel',   label: 'Litre diesel (LHV)',      factor: 35.86e6 },
      { id: 'L_petrol',   label: 'Litre petrol/gasoline (LHV)', factor: 32.18e6 },
      { id: 'L_lpg',      label: 'Litre LPG (LHV, liquid)', factor: 25.3e6 },
      { id: 'L_lng',      label: 'Litre LNG (LHV, liquid)', factor: 21.1e6 },
      { id: 'kg_h2',      label: 'kg Hydrogen (LHV)',        factor: 120.1e6 },
      { id: 'kg_lng',     label: 'kg LNG (LHV)',             factor: 48.6e6 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 14. TORQUE
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'torque',
    name: 'Torque',
    group: 'Mechanics',
    base: 'N·m',
    units: [
      { id: 'Nm',    label: 'Newton-metre (N·m)',      factor: 1 },
      { id: 'kNm',   label: 'Kilonewton-metre (kN·m)', factor: 1e3 },
      { id: 'Ncm',   label: 'Newton-centimetre (N·cm)',factor: 0.01 },
      { id: 'lbft',  label: 'Pound-foot (lb·ft)',      factor: 1.3558179483314 },
      { id: 'lbin',  label: 'Pound-inch (lb·in)',      factor: 0.1129848290276167 },
      { id: 'kgfm',  label: 'kgf·metre (kgf·m)',       factor: 9.80665 },
      { id: 'ozin',  label: 'Ounce-inch (oz·in)',      factor: 0.007061552 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 15. DENSITY
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'density',
    name: 'Density',
    group: 'Thermodynamics',
    base: 'kg/m³',
    units: [
      { id: 'kg/m3',  label: 'kg/m³',            factor: 1 },
      { id: 'g/cm3',  label: 'g/cm³ (= g/mL)',   factor: 1000 },
      { id: 'g/L',    label: 'g/L (= kg/m³)',     factor: 1 },
      { id: 'mg/mL',  label: 'mg/mL',             factor: 1 },
      { id: 'lb/ft3', label: 'lb/ft³',            factor: 16.018463374 },
      { id: 'lb/in3', label: 'lb/in³',            factor: 27679.904710 },
      { id: 'lb/galUS',label: 'lb/gal (US)',      factor: 119.826427 },
      { id: 't/m3',   label: 't/m³',              factor: 1000 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 16. VOLUMETRIC FLOW RATE
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'flowVol',
    name: 'Volumetric Flow Rate',
    group: 'Fluid',
    base: 'm³/s',
    units: [
      { id: 'm3/s',    label: 'm³/s',          factor: 1 },
      { id: 'm3/h',    label: 'm³/h',          factor: 1 / 3600 },
      { id: 'm3/d',    label: 'm³/day',        factor: 1 / 86400 },
      { id: 'L/s',     label: 'L/s',           factor: 1e-3 },
      { id: 'L/min',   label: 'L/min',         factor: 1e-3 / 60 },
      { id: 'L/h',     label: 'L/h',           factor: 1e-3 / 3600 },
      { id: 'mL/min',  label: 'mL/min',        factor: 1e-6 / 60 },
      { id: 'ft3/s',   label: 'ft³/s (cfs)',   factor: 0.028316846592 },
      { id: 'ft3/min', label: 'ft³/min (cfm)', factor: 0.028316846592 / 60 },
      { id: 'gal/min', label: 'gal/min (GPM)', factor: 3.785411784e-3 / 60 },
      { id: 'gal/h',   label: 'gal/h',         factor: 3.785411784e-3 / 3600 },
      { id: 'bbl/d',   label: 'bbl/day',       factor: 0.158987294928 / 86400 },
      { id: 'bbl/h',   label: 'bbl/h',         factor: 0.158987294928 / 3600 },
      { id: 'MMSCFD',  label: 'MMscfd (gas)',  factor: 28316.846592 / 86400 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 17. VISCOSITY (dynamic)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'viscosity',
    name: 'Dynamic Viscosity',
    group: 'Fluid',
    base: 'Pa·s',
    units: [
      { id: 'Pa·s',  label: 'Pascal-second (Pa·s)',   factor: 1 },
      { id: 'mPa·s', label: 'Millipascal-second (mPa·s)', factor: 1e-3 },
      { id: 'cP',    label: 'Centipoise (cP)',         factor: 1e-3 },
      { id: 'P',     label: 'Poise (P)',               factor: 0.1 },
      { id: 'lb/(ft·s)', label: 'lb/(ft·s)',           factor: 1.4881639 },
      { id: 'lb/(ft·h)', label: 'lb/(ft·h)',           factor: 1.4881639 / 3600 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 18. ELECTRICAL CHARGE
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'charge',
    name: 'Electrical Charge',
    group: 'Electrical',
    base: 'C',
    units: [
      { id: 'C',   label: 'Coulomb (C)',      factor: 1 },
      { id: 'mC',  label: 'Millicoulomb (mC)',factor: 1e-3 },
      { id: 'µC',  label: 'Microcoulomb (µC)',factor: 1e-6 },
      { id: 'nC',  label: 'Nanocoulomb (nC)', factor: 1e-9 },
      { id: 'pC',  label: 'Picocoulomb (pC)', factor: 1e-12 },
      { id: 'mAh', label: 'Milliamp-hour (mAh)', factor: 3.6 },
      { id: 'Ah',  label: 'Amp-hour (Ah)',    factor: 3600 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 19. ELECTRICAL CURRENT
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'current',
    name: 'Electrical Current',
    group: 'Electrical',
    base: 'A',
    units: [
      { id: 'A',  label: 'Ampere (A)',       factor: 1 },
      { id: 'mA', label: 'Milliampere (mA)', factor: 1e-3 },
      { id: 'µA', label: 'Microampere (µA)', factor: 1e-6 },
      { id: 'kA', label: 'Kiloampere (kA)', factor: 1e3 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 20. VOLTAGE
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'voltage',
    name: 'Voltage',
    group: 'Electrical',
    base: 'V',
    units: [
      { id: 'V',  label: 'Volt (V)',       factor: 1 },
      { id: 'mV', label: 'Millivolt (mV)', factor: 1e-3 },
      { id: 'µV', label: 'Microvolt (µV)', factor: 1e-6 },
      { id: 'kV', label: 'Kilovolt (kV)', factor: 1e3 },
      { id: 'MV', label: 'Megavolt (MV)', factor: 1e6 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 21. RESISTANCE
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'resistance',
    name: 'Resistance',
    group: 'Electrical',
    base: 'Ω',
    units: [
      { id: 'Ω',  label: 'Ohm (Ω)',       factor: 1 },
      { id: 'mΩ', label: 'Milliohm (mΩ)', factor: 1e-3 },
      { id: 'µΩ', label: 'Microohm (µΩ)', factor: 1e-6 },
      { id: 'kΩ', label: 'Kilohm (kΩ)',  factor: 1e3 },
      { id: 'MΩ', label: 'Megohm (MΩ)',  factor: 1e6 },
      { id: 'GΩ', label: 'Gigohm (GΩ)',  factor: 1e9 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 22. CAPACITANCE
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'capacitance',
    name: 'Capacitance',
    group: 'Electrical',
    base: 'F',
    units: [
      { id: 'F',  label: 'Farad (F)',       factor: 1 },
      { id: 'mF', label: 'Millifarad (mF)', factor: 1e-3 },
      { id: 'µF', label: 'Microfarad (µF)', factor: 1e-6 },
      { id: 'nF', label: 'Nanofarad (nF)',  factor: 1e-9 },
      { id: 'pF', label: 'Picofarad (pF)',  factor: 1e-12 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 23. INDUCTANCE
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'inductance',
    name: 'Inductance',
    group: 'Electrical',
    base: 'H',
    units: [
      { id: 'H',  label: 'Henry (H)',       factor: 1 },
      { id: 'mH', label: 'Millihenry (mH)', factor: 1e-3 },
      { id: 'µH', label: 'Microhenry (µH)', factor: 1e-6 },
      { id: 'nH', label: 'Nanohenry (nH)',  factor: 1e-9 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 24. LUMINOUS QUANTITIES
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'luminous',
    name: 'Luminous Quantities',
    group: 'Photometry',
    base: 'cd',
    units: [
      { id: 'cd',     label: 'Candela (cd)',      factor: 1 },
      { id: 'lm',     label: 'Lumen (lm) [=cd·sr]', factor: 1 },    // sr=1 for point source
      { id: 'lx',     label: 'Lux (lx) [lm/m²]', factor: 1 },
      { id: 'fc',     label: 'Foot-candle (fc)',   factor: 10.763910417 },
      { id: 'nt',     label: 'Nit (nt) [cd/m²]',  factor: 1 },
      { id: 'stilb',  label: 'Stilb (sb) [cd/cm²]',factor: 1e4 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 25. IONISING RADIATION DOSE
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'radiation',
    name: 'Ionising Radiation Dose',
    group: 'Radiation',
    base: 'Gy',
    units: [
      { id: 'Gy',  label: 'Gray (Gy) [absorbed]',      factor: 1 },
      { id: 'mGy', label: 'Milligray (mGy)',            factor: 1e-3 },
      { id: 'µGy', label: 'Microgray (µGy)',            factor: 1e-6 },
      { id: 'rad', label: 'Rad',                        factor: 0.01 },
      { id: 'Sv',  label: 'Sievert (Sv) [effective, Q=1]', factor: 1 },
      { id: 'mSv', label: 'Millisievert (mSv)',         factor: 1e-3 },
      { id: 'µSv', label: 'Microsievert (µSv)',         factor: 1e-6 },
      { id: 'rem', label: 'Rem [effective, Q=1]',       factor: 0.01 },
      { id: 'mrem',label: 'Millirem',                   factor: 1e-5 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 26. DATA SIZE
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'dataSize',
    name: 'Data Size',
    group: 'Computing',
    base: 'bit',
    units: [
      // SI decimal
      { id: 'bit',  label: 'Bit (bit)',          factor: 1 },
      { id: 'B',    label: 'Byte (B)',           factor: 8 },
      { id: 'KB',   label: 'Kilobyte (KB)',      factor: 8e3 },
      { id: 'MB',   label: 'Megabyte (MB)',      factor: 8e6 },
      { id: 'GB',   label: 'Gigabyte (GB)',      factor: 8e9 },
      { id: 'TB',   label: 'Terabyte (TB)',      factor: 8e12 },
      { id: 'PB',   label: 'Petabyte (PB)',      factor: 8e15 },
      // IEC binary
      { id: 'KiB',  label: 'Kibibyte (KiB)',     factor: 8 * 1024 },
      { id: 'MiB',  label: 'Mebibyte (MiB)',     factor: 8 * 1048576 },
      { id: 'GiB',  label: 'Gibibyte (GiB)',     factor: 8 * 1073741824 },
      { id: 'TiB',  label: 'Tebibyte (TiB)',     factor: 8 * 1099511627776 },
      { id: 'PiB',  label: 'Pebibyte (PiB)',     factor: 8 * 1125899906842624 },
      // nibble / word for completeness
      { id: 'nibble',label: 'Nibble',            factor: 4 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 27. DATA RATE
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'dataRate',
    name: 'Data Rate',
    group: 'Computing',
    base: 'bit/s',
    units: [
      { id: 'bps',   label: 'bit/s (bps)',      factor: 1 },
      { id: 'kbps',  label: 'kbit/s (kbps)',    factor: 1e3 },
      { id: 'Mbps',  label: 'Mbit/s (Mbps)',    factor: 1e6 },
      { id: 'Gbps',  label: 'Gbit/s (Gbps)',    factor: 1e9 },
      { id: 'Tbps',  label: 'Tbit/s (Tbps)',    factor: 1e12 },
      { id: 'B/s',   label: 'Byte/s (B/s)',     factor: 8 },
      { id: 'KB/s',  label: 'Kilobyte/s (KB/s)',factor: 8e3 },
      { id: 'MB/s',  label: 'Megabyte/s (MB/s)',factor: 8e6 },
      { id: 'GB/s',  label: 'Gigabyte/s (GB/s)',factor: 8e9 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 28. CONCENTRATION
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'concentration',
    name: 'Concentration',
    group: 'Chemistry',
    base: 'mol/m³',
    units: [
      { id: 'mol/m3', label: 'mol/m³',         factor: 1 },
      { id: 'mol/L',  label: 'mol/L (M)',       factor: 1000 },
      { id: 'mmol/L', label: 'mmol/L (mM)',     factor: 1 },
      { id: 'µmol/L', label: 'µmol/L (µM)',     factor: 1e-3 },
      { id: 'nmol/L', label: 'nmol/L (nM)',     factor: 1e-6 },
      // mass-based (requires molar mass — expressed as g/L here)
      { id: 'g/L',    label: 'g/L  [mass/vol]', factor: null, note: 'mass/vol — molar mass needed for mol conversion' },
      { id: 'mg/L',   label: 'mg/L (≈ ppm w/v in water)', factor: null, note: 'mass/vol' },
      { id: 'µg/L',   label: 'µg/L (≈ ppb w/v in water)', factor: null, note: 'mass/vol' },
      // dimensionless
      { id: 'ppm',    label: 'ppm  (mg/kg or µL/L)', factor: null, note: 'dimensionless ratio' },
      { id: 'ppb',    label: 'ppb  (µg/kg or nL/L)', factor: null, note: 'dimensionless ratio' },
      { id: 'ppt',    label: 'ppt  (ng/kg)',          factor: null, note: 'dimensionless ratio' },
      { id: 'mass%',  label: 'Mass percent (%)',       factor: null, note: 'dimensionless ratio' },
      { id: 'vol%',   label: 'Volume percent (% v/v)', factor: null, note: 'dimensionless ratio' },
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PHYSICS & CHEMISTRY EXTENSION  (categories 29 – 50+)
  // ═══════════════════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────────────
  // 29. ANGLE  (base: radian)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'angle',
    name: 'Angle',
    group: 'Rotational Mechanics',
    base: 'rad',
    units: [
      { id: 'rad',   label: 'Radian (rad)',          factor: 1 },
      { id: 'mrad',  label: 'Milliradian (mrad)',    factor: 1e-3 },
      { id: 'µrad',  label: 'Microradian (µrad)',    factor: 1e-6 },
      { id: 'deg',   label: 'Degree (°)',            factor: Math.PI / 180 },
      { id: 'arcmin',label: 'Arcminute (′)',         factor: Math.PI / 10800 },
      { id: 'arcsec',label: 'Arcsecond (″)',         factor: Math.PI / 648000 },
      { id: 'grad',  label: 'Gradian / gon (grad)', factor: Math.PI / 200 },
      { id: 'turn',  label: 'Turn / revolution',    factor: 2 * Math.PI },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 30. ANGULAR VELOCITY  (base: rad/s)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'angularVelocity',
    name: 'Angular Velocity',
    group: 'Rotational Mechanics',
    base: 'rad/s',
    units: [
      { id: 'rad/s',    label: 'Radian/second (rad/s)',  factor: 1 },
      { id: 'mrad/s',   label: 'Milliradian/second (mrad/s)', factor: 1e-3 },
      { id: 'deg/s',    label: 'Degree/second (°/s)',    factor: Math.PI / 180 },
      { id: 'rpm_av',   label: 'RPM',                    factor: Math.PI / 30 },
      { id: 'rps',      label: 'Rev/second (rps)',        factor: 2 * Math.PI },
      { id: 'rad/min',  label: 'Radian/minute (rad/min)',factor: 1 / 60 },
      { id: 'rad/h',    label: 'Radian/hour (rad/h)',    factor: 1 / 3600 },
      { id: 'deg/min',  label: 'Degree/minute (°/min)',  factor: Math.PI / 10800 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 31. ANGULAR ACCELERATION  (base: rad/s²)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'angularAccel',
    name: 'Angular Acceleration',
    group: 'Rotational Mechanics',
    base: 'rad/s²',
    units: [
      { id: 'rad/s2',   label: 'Radian/second² (rad/s²)', factor: 1 },
      { id: 'deg/s2',   label: 'Degree/second² (°/s²)',   factor: Math.PI / 180 },
      { id: 'rpm/s',    label: 'RPM/second',               factor: Math.PI / 30 },
      { id: 'rpm/min',  label: 'RPM/minute',               factor: Math.PI / 1800 },
      { id: 'rps/s',    label: 'Rev/second²',              factor: 2 * Math.PI },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 32. LINEAR MOMENTUM / IMPULSE  (base: kg·m/s = N·s)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'momentum',
    name: 'Momentum / Impulse',
    group: 'Mechanics',
    base: 'kg·m/s',
    units: [
      { id: 'kg·m/s',    label: 'kg·m/s (= N·s)',       factor: 1 },
      { id: 'N·s',       label: 'Newton-second (N·s)',   factor: 1 },
      { id: 'kN·s',      label: 'Kilonewton-second (kN·s)', factor: 1e3 },
      { id: 'g·cm/s',    label: 'g·cm/s',               factor: 1e-5 },
      { id: 'lb·ft/s',   label: 'lb·ft/s (lbm)',        factor: 0.138254954376 },
      { id: 'slug·ft/s', label: 'slug·ft/s (= lbf·s)',  factor: 4.44822161526 },
      { id: 'lbf·s',     label: 'lbf·s',                factor: 4.44822161526 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 33. ANGULAR MOMENTUM  (base: kg·m²/s)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'angularMomentum',
    name: 'Angular Momentum',
    group: 'Rotational Mechanics',
    base: 'kg·m²/s',
    units: [
      { id: 'kg·m2/s',   label: 'kg·m²/s (= N·m·s)',    factor: 1 },
      { id: 'N·m·s',     label: 'Newton-metre-second',   factor: 1 },
      { id: 'g·cm2/s',   label: 'g·cm²/s',              factor: 1e-7 },
      { id: 'lb·ft2/s',  label: 'lb·ft²/s (lbm)',       factor: 0.04214011 },
      { id: 'slug·ft2/s',label: 'slug·ft²/s',            factor: 1.35581795 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 34. MOMENT OF INERTIA  (base: kg·m²)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'momentOfInertia',
    name: 'Moment of Inertia',
    group: 'Rotational Mechanics',
    base: 'kg·m²',
    units: [
      { id: 'kg·m2',    label: 'kg·m²',               factor: 1 },
      { id: 'kg·cm2',   label: 'kg·cm²',              factor: 1e-4 },
      { id: 'g·cm2',    label: 'g·cm²',               factor: 1e-7 },
      { id: 'lb·ft2',   label: 'lb·ft² (lbm)',        factor: 0.04214011 },
      { id: 'lb·in2',   label: 'lb·in² (lbm)',        factor: 2.926397e-4 },
      { id: 'slug·ft2', label: 'slug·ft²',             factor: 1.35581795 },
      { id: 'oz·in2',   label: 'oz·in²',              factor: 1.82900e-5 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 35. SURFACE TENSION  (base: N/m = J/m²)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'surfaceTension',
    name: 'Surface Tension',
    group: 'Materials',
    base: 'N/m',
    units: [
      { id: 'N/m',    label: 'Newton/metre (N/m = J/m²)', factor: 1 },
      { id: 'mN/m',   label: 'Millinewton/metre (mN/m)',  factor: 1e-3 },
      { id: 'µN/m',   label: 'Micronewton/metre (µN/m)', factor: 1e-6 },
      { id: 'N/mm',   label: 'Newton/millimetre (N/mm)', factor: 1e3 },
      { id: 'dyn/cm', label: 'Dyne/centimetre (dyn/cm)', factor: 1e-3 },
      { id: 'erg/cm2',label: 'Erg/cm² (= dyn/cm)',       factor: 1e-3 },
      { id: 'lbf/ft', label: 'lbf/ft',                   factor: 14.5939 },
      { id: 'lbf/in', label: 'lbf/in',                   factor: 175.127 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 36. ELASTIC MODULUS / MATERIAL STIFFNESS  (base: Pa)
  //     Distinct category from pressure for materials context.
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'elasticModulus',
    name: 'Elastic Modulus',
    group: 'Materials',
    base: 'Pa',
    units: [
      { id: 'Pa_E',   label: 'Pascal (Pa)',          factor: 1 },
      { id: 'kPa_E',  label: 'Kilopascal (kPa)',     factor: 1e3 },
      { id: 'MPa_E',  label: 'Megapascal (MPa)',     factor: 1e6 },
      { id: 'GPa_E',  label: 'Gigapascal (GPa)',     factor: 1e9 },
      { id: 'TPa_E',  label: 'Terapascal (TPa)',     factor: 1e12 },
      { id: 'bar_E',  label: 'Bar (bar)',            factor: 1e5 },
      { id: 'psi_E',  label: 'psi',                  factor: 6894.757293168 },
      { id: 'ksi_E',  label: 'ksi (kip/in²)',        factor: 6894757.293168 },
      { id: 'Msi_E',  label: 'Msi (10⁶ psi)',       factor: 6894757293.168 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 37. FRACTURE TOUGHNESS  (base: MPa·√m = MN·m⁻³/²)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'fractureToughness',
    name: 'Fracture Toughness',
    group: 'Materials',
    base: 'MPa·√m',
    units: [
      { id: 'MPa·√m',   label: 'MPa·√m (= MN·m⁻³/²)',  factor: 1 },
      { id: 'Pa·√m',    label: 'Pa·√m',                  factor: 1e-6 },
      { id: 'kPa·√m',   label: 'kPa·√m',                 factor: 1e-3 },
      { id: 'GPa·√m',   label: 'GPa·√m',                 factor: 1e3 },
      { id: 'ksi·√in',  label: 'ksi·√in',                factor: 1.09884 },
      { id: 'psi·√in',  label: 'psi·√in',                factor: 1.09884e-3 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 38. KINEMATIC VISCOSITY  (base: m²/s)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'kinematicViscosity',
    name: 'Kinematic Viscosity',
    group: 'Fluid',
    base: 'm²/s',
    units: [
      { id: 'm2/s_kv',   label: 'm²/s',                     factor: 1 },
      { id: 'St',        label: 'Stokes (St) = cm²/s',       factor: 1e-4 },
      { id: 'cSt',       label: 'Centistokes (cSt) = mm²/s', factor: 1e-6 },
      { id: 'ft2/s_kv',  label: 'ft²/s',                     factor: 0.09290304 },
      { id: 'ft2/h_kv',  label: 'ft²/h',                     factor: 2.58064e-5 },
      { id: 'in2/s_kv',  label: 'in²/s',                     factor: 6.4516e-4 },
      { id: 'm2/h_kv',   label: 'm²/h',                      factor: 1 / 3600 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 39. DIFFUSION COEFFICIENT  (base: m²/s)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'diffusion',
    name: 'Diffusion Coefficient',
    group: 'Fluid',
    base: 'm²/s',
    units: [
      { id: 'm2/s_d',  label: 'm²/s',    factor: 1 },
      { id: 'cm2/s_d', label: 'cm²/s',   factor: 1e-4 },
      { id: 'mm2/s_d', label: 'mm²/s',   factor: 1e-6 },
      { id: 'ft2/s_d', label: 'ft²/s',   factor: 0.09290304 },
      { id: 'ft2/h_d', label: 'ft²/h',   factor: 2.58064e-5 },
      { id: 'm2/h_d',  label: 'm²/h',    factor: 1 / 3600 },
      { id: 'cm2/h_d', label: 'cm²/h',   factor: 1e-4 / 3600 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 40. INTRINSIC PERMEABILITY (porous media)  (base: m²)
  //     1 darcy = 9.869233×10⁻¹³ m²
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'permeabilityFluid',
    name: 'Intrinsic Permeability',
    group: 'Fluid',
    base: 'm²',
    units: [
      { id: 'm2_perm',  label: 'm²',                     factor: 1 },
      { id: 'µm2_perm', label: 'µm² (≈ 1.01 darcy)',     factor: 1e-12 },
      { id: 'D',        label: 'Darcy (D)',               factor: 9.869233e-13 },
      { id: 'mD',       label: 'Millidarcy (mD)',         factor: 9.869233e-16 },
      { id: 'µD',       label: 'Microdarcy (µD)',         factor: 9.869233e-19 },
      { id: 'cm2_perm', label: 'cm²',                    factor: 1e-4 },
      { id: 'ft2_perm', label: 'ft²',                    factor: 0.09290304 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 41. MAGNETIC PERMEABILITY  (base: H/m)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'permeabilityMag',
    name: 'Magnetic Permeability',
    group: 'Electromagnetism',
    base: 'H/m',
    units: [
      { id: 'H/m',   label: 'Henry/metre (H/m)',        factor: 1 },
      { id: 'mH/m',  label: 'Millihenry/metre (mH/m)', factor: 1e-3 },
      { id: 'µH/m',  label: 'Microhenry/metre (µH/m)', factor: 1e-6 },
      { id: 'nH/m',  label: 'Nanohenry/metre (nH/m)',  factor: 1e-9 },
      { id: 'pH/m',  label: 'Picohenry/metre (pH/m)',  factor: 1e-12 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 42. ENTROPY  (base: J/K)
  //     Molar entropy J/(mol·K) needs n — listed with note.
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'entropy',
    name: 'Entropy',
    group: 'Thermodynamics',
    base: 'J/K',
    units: [
      { id: 'J/K',    label: 'J/K',                     factor: 1 },
      { id: 'kJ/K',   label: 'kJ/K',                    factor: 1e3 },
      { id: 'MJ/K',   label: 'MJ/K',                    factor: 1e6 },
      { id: 'cal/K',  label: 'cal/K',                   factor: 4.184 },
      { id: 'kcal/K', label: 'kcal/K',                  factor: 4184 },
      // 1 BTU/°R = 1055.056 J / (5/9 K) = 1899.1 J/K
      { id: 'BTU/°R', label: 'BTU/°R',                  factor: 1899.100965 },
      // Molar entropy — requires number of moles
      { id: 'J/mol·K',  label: 'J/(mol·K) [molar]',   factor: null,
        note: 'Molar entropy — needs amount of substance to convert to J/K' },
      { id: 'kJ/mol·K', label: 'kJ/(mol·K) [molar]',  factor: null,
        note: 'Molar entropy — needs amount of substance to convert to J/K' },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 43. SPECIFIC HEAT CAPACITY  (base: J/(kg·K))
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'specificHeat',
    name: 'Specific Heat Capacity',
    group: 'Thermodynamics',
    base: 'J/(kg·K)',
    units: [
      { id: 'J/kg·K',      label: 'J/(kg·K)',             factor: 1 },
      { id: 'kJ/kg·K',     label: 'kJ/(kg·K)',            factor: 1e3 },
      { id: 'cal/g·K',     label: 'cal/(g·K) = cal/(g·°C)',factor: 4184 },
      { id: 'kcal/kg·K',   label: 'kcal/(kg·K)',          factor: 4184 },
      // 1 BTU/(lb·°F) = 1055.056/(0.45359237 × 5/9) = 4186.8 J/(kg·K)
      { id: 'BTU/lb·°F',   label: 'BTU/(lb·°F)',          factor: 4186.8 },
      { id: 'J/mol·K_cp',  label: 'J/(mol·K) [molar cp]', factor: null,
        note: 'Molar heat capacity — needs molar mass to convert to J/(kg·K)' },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 44. THERMAL CONDUCTIVITY  (base: W/(m·K))
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'thermalConductivity',
    name: 'Thermal Conductivity',
    group: 'Thermodynamics',
    base: 'W/(m·K)',
    units: [
      { id: 'W/m·K',        label: 'W/(m·K)',                    factor: 1 },
      { id: 'mW/m·K',       label: 'mW/(m·K)',                   factor: 1e-3 },
      { id: 'kW/m·K',       label: 'kW/(m·K)',                   factor: 1e3 },
      { id: 'W/cm·K',       label: 'W/(cm·K)',                   factor: 1e2 },
      // 1 BTU/(h·ft·°F) = 1055.056/(3600×0.3048×5/9) ≈ 1.7307 W/(m·K)
      { id: 'BTU/h·ft·°F',  label: 'BTU/(h·ft·°F)',             factor: 1.73073466 },
      // 1 BTU·in/(h·ft²·°F) = 1055.056×0.0254/(3600×0.09290304×5/9) ≈ 0.14423 W/(m·K)
      { id: 'BTU·in/h·ft²·°F', label: 'BTU·in/(h·ft²·°F)',      factor: 0.14422919 },
      // 1 cal/(s·cm·°C) = 4.184/(0.01) = 418.4 W/(m·K)
      { id: 'cal/s·cm·°C',  label: 'cal/(s·cm·°C)',             factor: 418.4 },
      // 1 kcal/(h·m·°C) = 4184/3600 = 1.1622 W/(m·K)
      { id: 'kcal/h·m·°C',  label: 'kcal/(h·m·°C)',             factor: 1.16222 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 45. THERMAL DIFFUSIVITY  (base: m²/s)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'thermalDiffusivity',
    name: 'Thermal Diffusivity',
    group: 'Thermodynamics',
    base: 'm²/s',
    units: [
      { id: 'm2/s_td',   label: 'm²/s',    factor: 1 },
      { id: 'cm2/s_td',  label: 'cm²/s',   factor: 1e-4 },
      { id: 'mm2/s_td',  label: 'mm²/s',   factor: 1e-6 },
      { id: 'm2/h_td',   label: 'm²/h',    factor: 1 / 3600 },
      { id: 'ft2/s_td',  label: 'ft²/s',   factor: 0.09290304 },
      { id: 'ft2/h_td',  label: 'ft²/h',   factor: 2.58064e-5 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 46. MOLAR THERMODYNAMIC QUANTITIES  (base: J/mol)
  //     Covers molar enthalpy ΔH, Gibbs energy ΔG, bond energies, etc.
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'molarEnergy',
    name: 'Molar Energy (Enthalpy, Gibbs…)',
    group: 'Chemistry',
    base: 'J/mol',
    units: [
      { id: 'J/mol',      label: 'J/mol',            factor: 1 },
      { id: 'kJ/mol',     label: 'kJ/mol',           factor: 1e3 },
      { id: 'MJ/mol',     label: 'MJ/mol',           factor: 1e6 },
      { id: 'cal/mol',    label: 'cal/mol',          factor: 4.184 },
      { id: 'kcal/mol',   label: 'kcal/mol',         factor: 4184 },
      // 1 eV/molecule × Nₐ = 96 485.332 J/mol
      { id: 'eV/molec',   label: 'eV/molecule',      factor: 96485.332 },
      { id: 'meV/molec',  label: 'meV/molecule',     factor: 96.485332 },
      // 1 BTU/lb-mol: 1 lb-mol = 453.592 mol → 1055.056/453.592 = 2.326 J/mol
      { id: 'BTU/lbmol',  label: 'BTU/lb-mol',       factor: 2.32600 },
      // J/(mol·K): molar entropy/heat capacity — kept separate in category 42/43
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 47. ELECTRIC FIELD STRENGTH  (base: V/m)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'eField',
    name: 'Electric Field Strength',
    group: 'Electromagnetism',
    base: 'V/m',
    units: [
      { id: 'V/m',     label: 'Volt/metre (V/m)',        factor: 1 },
      { id: 'mV/m',    label: 'Millivolt/metre (mV/m)',  factor: 1e-3 },
      { id: 'µV/m',    label: 'Microvolt/metre (µV/m)', factor: 1e-6 },
      { id: 'kV/m',    label: 'Kilovolt/metre (kV/m)',  factor: 1e3 },
      { id: 'MV/m',    label: 'Megavolt/metre (MV/m)',  factor: 1e6 },
      { id: 'V/cm',    label: 'V/cm',                   factor: 1e2 },
      { id: 'kV/cm',   label: 'kV/cm',                  factor: 1e5 },
      { id: 'V/mm',    label: 'V/mm',                   factor: 1e3 },
      // 1 statV/cm = 299.792 V × 100/m = 29979.2 V/m
      { id: 'statV/cm',label: 'statV/cm (CGS)',          factor: 29979.2458 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 48. MAGNETIC FIELD STRENGTH H  (base: A/m)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'hField',
    name: 'Magnetic Field Strength (H)',
    group: 'Electromagnetism',
    base: 'A/m',
    units: [
      { id: 'A/m',   label: 'Ampere/metre (A/m)',    factor: 1 },
      { id: 'mA/m',  label: 'Milliampere/metre (mA/m)', factor: 1e-3 },
      { id: 'A/cm',  label: 'A/cm',                  factor: 1e2 },
      { id: 'kA/m',  label: 'Kiloampere/metre (kA/m)',  factor: 1e3 },
      // 1 Oe = 1000/(4π) A/m ≈ 79.5775 A/m
      { id: 'Oe',    label: 'Oersted (Oe)',           factor: 79.5774715459 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 49. MAGNETIC FLUX  (base: Weber, Wb)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'magFlux',
    name: 'Magnetic Flux',
    group: 'Electromagnetism',
    base: 'Wb',
    units: [
      { id: 'Wb',   label: 'Weber (Wb = V·s)',    factor: 1 },
      { id: 'mWb',  label: 'Milliweber (mWb)',    factor: 1e-3 },
      { id: 'µWb',  label: 'Microweber (µWb)',    factor: 1e-6 },
      { id: 'nWb',  label: 'Nanoweber (nWb)',     factor: 1e-9 },
      { id: 'kWb',  label: 'Kiloweber (kWb)',     factor: 1e3 },
      // 1 Maxwell = 1e-8 Wb
      { id: 'Mx',   label: 'Maxwell (Mx)',         factor: 1e-8 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 50. MAGNETIC FLUX DENSITY B  (base: Tesla, T)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'bField',
    name: 'Magnetic Flux Density (B)',
    group: 'Electromagnetism',
    base: 'T',
    units: [
      { id: 'T',   label: 'Tesla (T)',            factor: 1 },
      { id: 'mT',  label: 'Millitesla (mT)',      factor: 1e-3 },
      { id: 'µT',  label: 'Microtesla (µT)',      factor: 1e-6 },
      { id: 'nT',  label: 'Nanotesla (nT = γ)',  factor: 1e-9 },
      // 1 Gauss = 1e-4 T
      { id: 'G',   label: 'Gauss (G)',            factor: 1e-4 },
      { id: 'mG',  label: 'Milligauss (mG)',      factor: 1e-7 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 51. ELECTRIC FLUX DENSITY (D field)  (base: C/m²)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'dField',
    name: 'Electric Flux Density (D)',
    group: 'Electromagnetism',
    base: 'C/m²',
    units: [
      { id: 'C/m2',   label: 'C/m²',           factor: 1 },
      { id: 'mC/m2',  label: 'mC/m²',          factor: 1e-3 },
      { id: 'µC/m2',  label: 'µC/m²',          factor: 1e-6 },
      { id: 'nC/m2',  label: 'nC/m²',          factor: 1e-9 },
      { id: 'pC/m2',  label: 'pC/m²',          factor: 1e-12 },
      { id: 'C/cm2',  label: 'C/cm²',          factor: 1e4 },
      { id: 'µC/cm2', label: 'µC/cm²',         factor: 1e-2 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 52. CROSS SECTION (nuclear / particle physics)  (base: m²)
  //     1 barn = 10⁻²⁸ m²
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'crossSection',
    name: 'Cross Section',
    group: 'Nuclear',
    base: 'm²',
    units: [
      { id: 'm2_cs',  label: 'm²',               factor: 1 },
      { id: 'cm2_cs', label: 'cm²',              factor: 1e-4 },
      { id: 'fm2_cs', label: 'fm² (femtometre²)',factor: 1e-30 },
      { id: 'b',      label: 'Barn (b)',          factor: 1e-28 },
      { id: 'mb_cs',  label: 'Millibarn (mb)',    factor: 1e-31 },
      { id: 'µb',     label: 'Microbarn (µb)',    factor: 1e-34 },
      { id: 'nb_cs',  label: 'Nanobarn (nb)',     factor: 1e-37 },
      { id: 'pb_cs',  label: 'Picobarn (pb)',     factor: 1e-40 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 53. IRRADIANCE  (base: W/m²)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'irradiance',
    name: 'Irradiance',
    group: 'Radiometry',
    base: 'W/m²',
    units: [
      { id: 'W/m2_ir',   label: 'W/m²',            factor: 1 },
      { id: 'mW/m2_ir',  label: 'mW/m²',           factor: 1e-3 },
      { id: 'µW/m2_ir',  label: 'µW/m²',           factor: 1e-6 },
      { id: 'kW/m2_ir',  label: 'kW/m²',           factor: 1e3 },
      { id: 'MW/m2_ir',  label: 'MW/m²',           factor: 1e6 },
      { id: 'W/cm2_ir',  label: 'W/cm²',           factor: 1e4 },
      { id: 'µW/cm2_ir', label: 'µW/cm²',          factor: 1e-2 },
      // 1 BTU/(h·ft²) = 0.29307/0.09290304 = 3.1546 W/m²
      { id: 'BTU/h·ft2', label: 'BTU/(h·ft²)',      factor: 3.15459 },
      // 1 sun ≈ 1361 W/m² (solar constant at top of atmosphere)
      { id: 'sun',       label: 'Sun (solar const.)',factor: 1361 },
      // 1 langley/min = 41840 J/m² / 60 s = 697.33 W/m²
      { id: 'ly/min',    label: 'Langley/min',       factor: 697.333 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 54. RADIANCE  (base: W/(m²·sr))
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'radiance',
    name: 'Radiance',
    group: 'Radiometry',
    base: 'W/(m²·sr)',
    units: [
      { id: 'W/m2sr',    label: 'W/(m²·sr)',       factor: 1 },
      { id: 'mW/m2sr',   label: 'mW/(m²·sr)',      factor: 1e-3 },
      { id: 'µW/m2sr',   label: 'µW/(m²·sr)',      factor: 1e-6 },
      { id: 'kW/m2sr',   label: 'kW/(m²·sr)',      factor: 1e3 },
      { id: 'W/cm2sr',   label: 'W/(cm²·sr)',      factor: 1e4 },
      { id: 'µW/cm2sr',  label: 'µW/(cm²·sr)',     factor: 1e-2 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 55. RADIANT INTENSITY  (base: W/sr)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'radiantIntensity',
    name: 'Radiant Intensity',
    group: 'Radiometry',
    base: 'W/sr',
    units: [
      { id: 'W/sr',   label: 'Watt/steradian (W/sr)',  factor: 1 },
      { id: 'mW/sr',  label: 'mW/sr',                  factor: 1e-3 },
      { id: 'µW/sr',  label: 'µW/sr',                  factor: 1e-6 },
      { id: 'kW/sr',  label: 'kW/sr',                  factor: 1e3 },
      { id: 'MW/sr',  label: 'MW/sr',                  factor: 1e6 },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 56. SOUND INTENSITY  (base: W/m²)
  //     Includes logarithmic dB IL scale (I₀ = 10⁻¹² W/m²).
  //     Marked affine: true so each unit uses toBase / fromBase.
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'soundIntensity',
    name: 'Sound Intensity',
    group: 'Acoustics',
    base: 'W/m²',
    affine: true,
    units: [
      { id: 'W/m2_si',  label: 'W/m²',     toBase: v => v,           fromBase: v => v },
      { id: 'mW/m2_si', label: 'mW/m²',    toBase: v => v * 1e-3,    fromBase: v => v * 1e3 },
      { id: 'µW/m2_si', label: 'µW/m²',    toBase: v => v * 1e-6,    fromBase: v => v * 1e6 },
      { id: 'pW/m2_si', label: 'pW/m²',    toBase: v => v * 1e-12,   fromBase: v => v * 1e12 },
      { id: 'nW/m2_si', label: 'nW/m²',    toBase: v => v * 1e-9,    fromBase: v => v * 1e9 },
      {
        id: 'dB_IL',
        label: 'dB IL (re 10⁻¹² W/m²)',
        toBase:   v => 1e-12 * Math.pow(10, v / 10),
        fromBase: v => v > 0 ? 10 * Math.log10(v / 1e-12) : -Infinity
      },
    ]
  },

  // ─────────────────────────────────────────────────────────────────────
  // 57. CRYSTALLOGRAPHY LENGTH UNITS  (base: metre)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'crystalLength',
    name: 'Crystallography Lengths',
    group: 'Crystallography',
    base: 'm',
    units: [
      { id: 'm_cl',   label: 'Metre (m)',              factor: 1 },
      { id: 'nm_cl',  label: 'Nanometre (nm)',         factor: 1e-9 },
      { id: 'pm_cl',  label: 'Picometre (pm)',         factor: 1e-12 },
      { id: 'fm_cl',  label: 'Femtometre (fm)',        factor: 1e-15 },
      // 1 Å = 10⁻¹⁰ m = 0.1 nm = 100 pm
      { id: 'Å',      label: 'Ångström (Å)',           factor: 1e-10 },
      // Bohr radius a₀ = 5.29177210903×10⁻¹¹ m
      { id: 'a0',     label: 'Bohr radius (a₀)',       factor: 5.29177210903e-11 },
      // X-unit (Siegbahn) ≈ 1.002e-13 m (rarely used but present in old literature)
      { id: 'xu',     label: 'X-unit (Siegbahn, XU)', factor: 1.0021e-13 },
    ]
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Conversion engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a value from one unit to another within the same category.
 * Returns { result, note } where note is a string or null.
 */
function convert(categoryId, fromId, toId, value) {
  const cat = CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return { result: NaN, note: 'Unknown category' };

  const from = cat.units.find(u => u.id === fromId);
  const to   = cat.units.find(u => u.id === toId);
  if (!from || !to) return { result: NaN, note: 'Unknown unit' };

  // Same unit
  if (fromId === toId) return { result: value, note: null };

  // Concentration: some pairs have null factor (incompatible without extra info)
  if (from.factor === null || to.factor === null) {
    const bothDimensionless = ['ppm','ppb','ppt','mass%','vol%'];
    const fromDL = bothDimensionless.includes(fromId);
    const toDL   = bothDimensionless.includes(toId);

    // ppm ↔ ppb ↔ ppt ↔ % simple ratios
    const dlFactors = { ppm: 1e-6, ppb: 1e-9, ppt: 1e-12, 'mass%': 1e-2, 'vol%': 1e-2 };
    if (fromDL && toDL) {
      const result = value * dlFactors[fromId] / dlFactors[toId];
      return { result, note: null };
    }

    // g/L ↔ mg/L ↔ µg/L
    const massVol = { 'g/L': 1, 'mg/L': 1e-3, 'µg/L': 1e-6 };
    if (massVol[fromId] !== undefined && massVol[toId] !== undefined) {
      const result = value * massVol[fromId] / massVol[toId];
      return { result, note: null };
    }

    return {
      result: NaN,
      note: `Cannot directly convert ${from.label} → ${to.label} without molar mass or density.`
    };
  }

  // Affine (temperature)
  if (cat.affine) {
    const base   = from.toBase(value);
    const result = to.fromBase(base);
    return { result, note: null };
  }

  // Multiplicative
  const result = value * from.factor / to.factor;
  return { result, note: null };
}

// Export for app.js
if (typeof module !== 'undefined') {
  module.exports = { CATEGORIES, convert };
}
