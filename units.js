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
