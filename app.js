// ============================================================
//  PLANETARIUM — app.js
//  Astronomical algorithms based on Paul Schlyter / J. Meeus
// ============================================================

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

// ===== ORBITAL ELEMENTS at J2000.0 [value, rate/Julian-century] =====
// Source: Meeus "Astronomical Algorithms" Table 33.a
const ELEMENTS = {
  Mercury: {
    a:     [0.38709843, 0.0],
    e:     [0.20563661, 0.00002123],
    I:     [7.00559432, -0.00590158],
    L:     [252.25166724, 149472.67486623],
    wbar:  [77.45771895, 0.15940013],
    Omega: [48.33961819, -0.12214182]
  },
  Venus: {
    a:     [0.72332102, -0.00000026],
    e:     [0.00676399, -0.00005107],
    I:     [3.39777545, 0.00043494],
    L:     [181.97970850, 58517.81560260],
    wbar:  [131.76755713, 0.05679648],
    Omega: [76.67261496, -0.27274174]
  },
  Earth: {
    a:     [1.00000018, -0.00000003],
    e:     [0.01673163, -0.00003661],
    I:     [-0.00054346, -0.01337178],
    L:     [100.46457166, 35999.37244981],
    wbar:  [102.93768193, 0.32327364],
    Omega: [0.0, 0.0]
  },
  Mars: {
    a:     [1.52371243, 0.00000097],
    e:     [0.09336511, 0.00009149],
    I:     [1.85181869, -0.00724757],
    L:     [-4.56813164, 19140.29934243],
    wbar:  [-23.91744784, 0.45223625],
    Omega: [49.71320984, -0.26852431]
  },
  Jupiter: {
    a:     [5.20248019, -0.00002864],
    e:     [0.04853590, 0.00018026],
    I:     [1.29861416, -0.00322699],
    L:     [34.33479152, 3034.90371757],
    wbar:  [14.27495244, 0.18199196],
    Omega: [100.29282654, 0.13024619]
  },
  Saturn: {
    a:     [9.54149883, -0.00003065],
    e:     [0.05550825, -0.00032044],
    I:     [2.49424102, 0.00451969],
    L:     [50.07571329, 1222.11494724],
    wbar:  [92.86136063, 0.54179478],
    Omega: [113.63998702, -0.25015002]
  },
  Uranus: {
    a:     [19.18797948, -0.00020455],
    e:     [0.04685740, -0.00001550],
    I:     [0.77298127, -0.00180155],
    L:     [314.20276625, 428.49512595],
    wbar:  [172.43404441, 0.09266985],
    Omega: [73.96250215, 0.05739699]
  },
  Neptune: {
    a:     [30.06952752, 0.00006447],
    e:     [0.00895439, 0.00000818],
    I:     [1.77005520, 0.00022400],
    L:     [304.22289287, 218.46515314],
    wbar:  [46.68158724, 0.01009938],
    Omega: [131.78635853, -0.00606302]
  }
};

// ===== PLANET DISPLAY DATA =====
const PLANET_DATA = {
  Sun: {
    color: '#FDB813', glow: '#FF8C00', radius: 12,
    emoji: '☀️', type: 'Stern',
    nameDe: 'Sonne',
    desc: 'Die Sonne ist der Stern im Zentrum unseres Sonnensystems. Sie liefert die Energie für nahezu alles Leben auf der Erde und hält durch ihre Gravitation alle Planeten auf ihren Bahnen.',
    facts: {
      'Durchmesser': '1.392.700 km',
      'Masse': '1,989 × 10³⁰ kg',
      'Oberflächentemp.': '5.778 K',
      'Kerntemp.': '15 × 10⁶ K',
      'Alter': '4,6 Mrd. Jahre',
      'Spektralklasse': 'G2V'
    }
  },
  Mercury: {
    color: '#b5b5b5', glow: '#d0d0d0', radius: 2,
    emoji: '🪨', type: 'Gesteinsplanet',
    nameDe: 'Merkur',
    desc: 'Merkur ist der sonnennächste Planet und zugleich der kleinste im Sonnensystem. Seine dünne Exosphäre bietet kaum Schutz vor Temperaturschwankungen von –180 °C bis +430 °C.',
    facts: {
      'Durchmesser': '4.879 km',
      'Umlaufzeit': '87,97 Tage',
      'Tageslänge': '58,65 Erdtage',
      'Monde': '0',
      'Entfernung Sonne': '0,387 AE',
      'Gravitation': '3,7 m/s²'
    }
  },
  Venus: {
    color: '#e8c373', glow: '#f5d080', radius: 4,
    emoji: '🌟', type: 'Gesteinsplanet',
    nameDe: 'Venus',
    desc: 'Die Venus ist der hellste Planet am Erdenhimmel und dreht sich retrograd. Trotz größerer Sonnenentfernung als Merkur ist sie wärmer – ihr dichter CO₂-Treibhauseffekt heizt die Oberfläche auf 465 °C auf.',
    facts: {
      'Durchmesser': '12.104 km',
      'Umlaufzeit': '224,70 Tage',
      'Tageslänge': '243 Erdtage',
      'Monde': '0',
      'Entfernung Sonne': '0,723 AE',
      'Oberflächentemp.': '465 °C'
    }
  },
  Earth: {
    color: '#4fa3e8', glow: '#7ec8f0', radius: 4,
    emoji: '🌍', type: 'Gesteinsplanet',
    nameDe: 'Erde',
    desc: 'Die Erde ist der größte Gesteinsplanet und der einzige bekannte Ort im Universum, an dem Leben existiert. Flüssiges Wasser, eine schützende Atmosphäre und ein starkes Magnetfeld machen sie einzigartig.',
    facts: {
      'Durchmesser': '12.756 km',
      'Umlaufzeit': '365,25 Tage',
      'Tageslänge': '24 Stunden',
      'Monde': '1 (Mond)',
      'Entfernung Sonne': '1,000 AE',
      'Gravitation': '9,81 m/s²'
    }
  },
  Moon: {
    color: '#c8c8c8', glow: '#e0e0e0', radius: 2,
    emoji: '🌕', type: 'Mond',
    nameDe: 'Mond',
    desc: 'Der Mond ist der einzige natürliche Satellit der Erde. Er ist das fünftgrößte Objekt im Sonnensystem und beeinflusst maßgeblich die Gezeiten auf der Erde. Der Mensch hat ihn als einzigen anderen Himmelskörper betreten.',
    facts: {
      'Durchmesser': '3.475 km',
      'Umlaufzeit': '27,32 Tage',
      'Entfernung Erde': '384.400 km',
      'Synod. Monat': '29,53 Tage',
      'Albedo': '0,12',
      'Gravitation': '1,62 m/s²'
    }
  },
  Mars: {
    color: '#c1440e', glow: '#e05a20', radius: 3,
    emoji: '🔴', type: 'Gesteinsplanet',
    nameDe: 'Mars',
    desc: 'Der rote Planet besitzt die höchsten bekannten Vulkane des Sonnensystems (Olympus Mons) sowie einen riesigen Canyon (Valles Marineris). Er ist ein Hauptziel zukünftiger bemannter Raumfahrt.',
    facts: {
      'Durchmesser': '6.779 km',
      'Umlaufzeit': '686,97 Tage',
      'Tageslänge': '24 h 37 min',
      'Monde': '2 (Phobos, Deimos)',
      'Entfernung Sonne': '1,524 AE',
      'Oberflächentemp.': '−60 °C (Ø)'
    }
  },
  Jupiter: {
    color: '#c88b3a', glow: '#e0a050', radius: 11,
    emoji: '🪐', type: 'Gasriese',
    nameDe: 'Jupiter',
    desc: 'Jupiter ist der größte Planet des Sonnensystems – er enthält mehr Masse als alle anderen Planeten zusammen. Der Große Rote Fleck ist ein Sturmsystem, das seit mindestens 350 Jahren wütet.',
    facts: {
      'Durchmesser': '142.984 km',
      'Umlaufzeit': '11,86 Jahre',
      'Tageslänge': '9 h 56 min',
      'Monde': '95 bekannte',
      'Entfernung Sonne': '5,203 AE',
      'Ringe': 'Ja (dünn)'
    }
  },
  Saturn: {
    color: '#e4d191', glow: '#f0e0a0', radius: 8,
    emoji: '💍', type: 'Gasriese',
    nameDe: 'Saturn',
    desc: 'Saturn ist berühmt für sein prächtiges Ringsystem aus Eis und Gestein. Er ist der am wenigsten dichte Planet – er würde auf Wasser schwimmen. Sein Mond Titan hat eine dichte Stickstoffatmosphäre.',
    facts: {
      'Durchmesser': '120.536 km',
      'Umlaufzeit': '29,46 Jahre',
      'Tageslänge': '10 h 42 min',
      'Monde': '146 bekannte',
      'Entfernung Sonne': '9,537 AE',
      'Ringe': 'Ja (spektakulär)'
    }
  },
  Uranus: {
    color: '#7de8e8', glow: '#a0f0f0', radius: 7,
    emoji: '🧊', type: 'Eisriese',
    nameDe: 'Uranus',
    desc: 'Uranus rotiert auf seiner Seite – seine Achse ist um 98° geneigt, vermutlich durch eine frühe Kollision. Er besitzt ein schwaches Ringsystem und wurde erst 1781 von Wilhelm Herschel entdeckt.',
    facts: {
      'Durchmesser': '51.118 km',
      'Umlaufzeit': '84,01 Jahre',
      'Tageslänge': '17 h 14 min',
      'Monde': '28 bekannte',
      'Entfernung Sonne': '19,189 AE',
      'Achsenneigung': '97,77°'
    }
  },
  Neptune: {
    color: '#3f54ba', glow: '#5070d0', radius: 7,
    emoji: '🌊', type: 'Eisriese',
    nameDe: 'Neptun',
    desc: 'Neptun ist der äußerste Planet und wurde 1846 durch mathematische Berechnungen entdeckt – bevor man ihn sah. Er besitzt die stärksten Winde im Sonnensystem mit bis zu 2.100 km/h.',
    facts: {
      'Durchmesser': '49.528 km',
      'Umlaufzeit': '164,8 Jahre',
      'Tageslänge': '16 h 6 min',
      'Monde': '16 bekannte',
      'Entfernung Sonne': '30,070 AE',
      'Windgeschw.': 'bis 2.100 km/h'
    }
  }
};

const BODY_ORDER = ['Sun','Mercury','Venus','Earth','Moon','Mars','Jupiter','Saturn','Uranus','Neptune'];

// ===== ASTRONOMICAL MATH =====

function julianDate(date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400;
  let Y = y, M = m;
  if (M <= 2) { Y -= 1; M += 12; }
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + d + B - 1524.5;
}

function norm360(x) { return ((x % 360) + 360) % 360; }
function norm2pi(x) { return ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); }

function solveKepler(M_rad, e, tol = 1e-6) {
  let E = M_rad + e * Math.sin(M_rad) * (1 + e * Math.cos(M_rad));
  for (let i = 0; i < 100; i++) {
    const dE = (M_rad - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < tol) break;
  }
  return E;
}

// Returns heliocentric ecliptic rectangular coordinates (AU)
function helioEcliptic(name, T) {
  const el = ELEMENTS[name];
  const a    = el.a[0]     + el.a[1]     * T;
  const e    = el.e[0]     + el.e[1]     * T;
  const I    = (el.I[0]    + el.I[1]     * T) * DEG;
  const L    = norm360(el.L[0]    + el.L[1]     * T) * DEG;
  const wbar = norm360(el.wbar[0] + el.wbar[1]  * T) * DEG;
  const Omega= norm360(el.Omega[0]+ el.Omega[1] * T) * DEG;

  const omega = wbar - Omega;       // argument of perihelion
  const M = norm2pi(L - wbar);     // mean anomaly

  const E = solveKepler(M, e);

  // True anomaly
  const v = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );

  const r = a * (1 - e * Math.cos(E));   // heliocentric distance (AU)
  const u = v + omega;                    // argument of latitude

  const x = r * (Math.cos(Omega) * Math.cos(u) - Math.sin(Omega) * Math.sin(u) * Math.cos(I));
  const y = r * (Math.sin(Omega) * Math.cos(u) + Math.cos(Omega) * Math.sin(u) * Math.cos(I));
  const z = r * Math.sin(u) * Math.sin(I);

  return { x, y, z, r };
}

// Obliquity of ecliptic
function obliquity(T) {
  return (23.439291 - 0.013004 * T) * DEG;
}

// Convert ecliptic to equatorial coords (rectangular)
function eclToEq(x, y, z, eps) {
  return {
    x: x,
    y: y * Math.cos(eps) - z * Math.sin(eps),
    z: y * Math.sin(eps) + z * Math.cos(eps)
  };
}

// Greenwich Mean Sidereal Time (radians)
function GMST(jd) {
  const T = (jd - 2451545.0) / 36525;
  let theta = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
    + 0.000387933 * T * T - T * T * T / 38710000;
  return norm360(theta) * DEG;
}

// Compute position of all bodies at given JD
function computePositions(jd) {
  const T = (jd - 2451545.0) / 36525;
  const eps = obliquity(T);

  const positions = {};

  // Earth helio position (for Sun geocentric)
  const earthHel = helioEcliptic('Earth', T);

  // Sun geocentric ecliptic = -Earth helio
  const sunEcl = { x: -earthHel.x, y: -earthHel.y, z: -earthHel.z };
  const sunEq = eclToEq(sunEcl.x, sunEcl.y, sunEcl.z, eps);
  const sunDist = earthHel.r;
  const sunRA = Math.atan2(sunEq.y, sunEq.x);
  const sunDec = Math.asin(sunEq.z / sunDist);
  positions['Sun'] = {
    hx: 0, hy: 0,           // helio: at origin
    gx: sunEcl.x, gy: sunEcl.y,  // geo ecliptic
    ra: sunRA, dec: sunDec,
    dist: sunDist, distUnit: 'AE'
  };

  // Planets
  for (const name of Object.keys(ELEMENTS)) {
    if (name === 'Earth') {
      // Earth: helio position only; geocentric is 0,0
      positions['Earth'] = {
        hx: earthHel.x, hy: earthHel.y,
        gx: 0, gy: 0,
        ra: 0, dec: 0,
        dist: 0, distUnit: 'AE'
      };
      continue;
    }
    const hel = helioEcliptic(name, T);
    // Geocentric ecliptic = helio planet - helio earth
    const gx = hel.x - earthHel.x;
    const gy = hel.y - earthHel.y;
    const gz = hel.z - earthHel.z;
    const dist = Math.sqrt(gx*gx + gy*gy + gz*gz);
    const eq = eclToEq(gx, gy, gz, eps);
    const ra = Math.atan2(eq.y, eq.x);
    const dec = Math.asin(eq.z / dist);
    positions[name] = {
      hx: hel.x, hy: hel.y,
      gx, gy,
      ra, dec,
      dist, distUnit: 'AE'
    };
  }

  // Moon (simplified lunar theory from Paul Schlyter)
  {
    const d = jd - 2451545.0; // days since J2000
    const N = norm360(125.1228 - 0.0529538083 * d) * DEG;
    const i_m = 5.1454 * DEG;
    const w_m = norm360(318.0634 + 0.1643573223 * d) * DEG;
    const a_m = 60.2666; // Earth radii
    const e_m = 0.054900;
    const M_m = norm2pi(norm360(115.3654 + 13.0649929509 * d) * DEG);
    const E_m = solveKepler(M_m, e_m);
    const v_m = 2 * Math.atan2(
      Math.sqrt(1+e_m)*Math.sin(E_m/2),
      Math.sqrt(1-e_m)*Math.cos(E_m/2)
    );
    const r_m = a_m * (1 - e_m * Math.cos(E_m));
    const u_m = v_m + w_m;
    // Ecliptic coords in Earth radii
    const mx_ecl = r_m * (Math.cos(N)*Math.cos(u_m) - Math.sin(N)*Math.sin(u_m)*Math.cos(i_m));
    const my_ecl = r_m * (Math.sin(N)*Math.cos(u_m) + Math.cos(N)*Math.sin(u_m)*Math.cos(i_m));
    const mz_ecl = r_m * Math.sin(u_m)*Math.sin(i_m);
    const ER_to_AU = 6371 / 149597870.7;
    const mxAU = mx_ecl * ER_to_AU + earthHel.x;
    const myAU = my_ecl * ER_to_AU + earthHel.y;
    const distAU = Math.sqrt(mx_ecl*mx_ecl + my_ecl*my_ecl + mz_ecl*mz_ecl) * ER_to_AU;
    const moonEq = eclToEq(mx_ecl * ER_to_AU, my_ecl * ER_to_AU, mz_ecl * ER_to_AU, eps);
    const moonDist = distAU;
    const moonRA = Math.atan2(moonEq.y, moonEq.x);
    const moonDec = Math.asin(Math.min(1, moonEq.z / moonDist));
    positions['Moon'] = {
      hx: mxAU, hy: myAU,
      gx: mx_ecl * ER_to_AU, gy: my_ecl * ER_to_AU,
      ra: moonRA, dec: moonDec,
      dist: distAU * 149597870.7, distUnit: 'km',
      distKm: distAU * 149597870.7
    };
  }

  return positions;
}

// Altitude + Azimuth from RA/Dec, observer lat/lon, JD
function toHorizontal(ra, dec, jd, latDeg, lonDeg) {
  const gmst = GMST(jd);
  const lst = gmst + lonDeg * DEG;
  const ha = lst - ra; // hour angle
  const lat = latDeg * DEG;
  const sinAlt = Math.sin(dec)*Math.sin(lat) + Math.cos(dec)*Math.cos(lat)*Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const cosAz = (Math.sin(dec) - Math.sin(alt)*Math.sin(lat)) / (Math.cos(alt)*Math.cos(lat));
  const sinAz = -Math.cos(dec)*Math.sin(ha) / Math.cos(alt);
  let az = Math.atan2(sinAz, cosAz);
  az = norm2pi(az);
  return { alt: alt * RAD, az: az * RAD };
}

function formatAngle(deg) {
  const sign = deg < 0 ? '−' : '+';
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  return `${sign}${String(d).padStart(2,'0')}° ${String(m).padStart(2,'0')}'`;
}

function formatRA(rad) {
  const h_total = ((rad * RAD / 15) + 24) % 24;
  const h = Math.floor(h_total);
  const m = Math.floor((h_total - h) * 60);
  const s = Math.floor(((h_total - h) * 60 - m) * 60);
  return `${h}h ${m}m ${s}s`;
}

// ===== STATE =====
const state = {
  date: new Date(),
  lat: 48.137,
  lon: 11.576,
  view: 'solar',
  zoom: 1,
  panX: 0,
  panY: 0,
  dragging: false,
  dragStart: null,
  panStart: null,
  selectedBody: null,
  positions: null,
  animFrame: null
};

// ===== STAR FIELD =====
// Stored as fractions (0-1) so they work for any canvas size
let stars = [];
function generateStars(n = 300) {
  stars = [];
  for (let i = 0; i < n; i++) {
    stars.push({
      fx: Math.random(),
      fy: Math.random(),
      r: Math.random() * 1.2 + 0.2,
      a: Math.random() * 0.6 + 0.3
    });
  }
}

// ===== SOLAR SYSTEM RENDERER =====
function renderSolar(canvas, positions) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = '#07071a';
  ctx.fillRect(0, 0, W, H);

  // Stars
  for (const s of stars) {
    ctx.globalAlpha = s.a;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s.fx * W, s.fy * H, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const cx = W / 2 + state.panX;
  const cy = H / 2 + state.panY;

  // Scale: power-law r^0.4 gives good separation of inner AND outer planets
  const BASE_SCALE = Math.min(W, H) * 0.45 * state.zoom;
  const SCALE_EXP = 0.4;
  const SCALE_MAX = Math.pow(32, SCALE_EXP); // normalize so Neptune≈edge

  function auToPixels(au) {
    return BASE_SCALE * Math.pow(Math.max(au, 0.001), SCALE_EXP) / SCALE_MAX;
  }

  // Fixed semi-major axes (AU) for orbit circles
  const ORBIT_AU = {
    Mercury: 0.387, Venus: 0.723, Earth: 1.000,
    Mars: 1.524, Jupiter: 5.203, Saturn: 9.537,
    Uranus: 19.191, Neptune: 30.069
  };

  // Draw orbit circles using fixed semi-major axes
  for (const [name, a] of Object.entries(ORBIT_AU)) {
    const orbitR = auToPixels(a);
    ctx.beginPath();
    ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
    ctx.strokeStyle = name === 'Earth'
      ? 'rgba(79,163,232,0.30)'
      : 'rgba(100,100,160,0.18)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Draw bodies
  const bodyPixels = {};

  for (const name of BODY_ORDER) {
    if (name === 'Moon') continue; // draw after Earth
    const data = PLANET_DATA[name];
    const pos = positions[name];
    if (!pos) continue;

    let px, py;
    if (name === 'Sun') {
      px = cx; py = cy;
    } else {
      const r_h = Math.sqrt(pos.hx*pos.hx + pos.hy*pos.hy);
      if (r_h < 1e-6) { px = cx; py = cy; }
      else {
        const r_px = auToPixels(r_h);
        px = cx + (r_px / r_h) * pos.hx;
        py = cy - (r_px / r_h) * pos.hy;
      }
    }

    bodyPixels[name] = { px, py };
    const r = data.radius * Math.max(0.5, Math.min(1.5, state.zoom));

    // Glow for Sun (kept tight so it doesn't overwhelm inner planets)
    if (name === 'Sun') {
      const glowR = r * 2.2;
      const grad = ctx.createRadialGradient(px, py, r * 0.5, px, py, glowR);
      grad.addColorStop(0, 'rgba(253,200,60,0.7)');
      grad.addColorStop(0.6, 'rgba(255,140,0,0.25)');
      grad.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.beginPath();
      ctx.arc(px, py, glowR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Saturn ring
    if (name === 'Saturn') {
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(1, 0.35);
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.1, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200,190,120,0.6)';
      ctx.lineWidth = r * 0.7;
      ctx.stroke();
      ctx.restore();
    }

    // Planet
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = data.color;
    if (state.selectedBody === name) {
      ctx.shadowColor = data.glow;
      ctx.shadowBlur = 12;
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    // Label
    if (state.zoom > 0.4) {
      ctx.font = `${Math.max(9, 11 * state.zoom)}px sans-serif`;
      ctx.fillStyle = state.selectedBody === name ? '#fff' : 'rgba(200,210,240,0.8)';
      ctx.textAlign = 'center';
      ctx.fillText(data.nameDe, px, py - r - 4);
    }
  }

  // Moon: offset from Earth
  const earthPx = bodyPixels['Earth'];
  const moonPos = positions['Moon'];
  if (earthPx && moonPos) {
    const moonOffsetScale = Math.max(14, 18 * state.zoom); // fixed pixel offset (Moon orbit not to scale)
    const r_geo = Math.sqrt(moonPos.gx*moonPos.gx + moonPos.gy*moonPos.gy);
    let mpx, mpy;
    if (r_geo < 1e-8) { mpx = earthPx.px + 15; mpy = earthPx.py; }
    else {
      mpx = earthPx.px + (moonOffsetScale / r_geo) * moonPos.gx;
      mpy = earthPx.py - (moonOffsetScale / r_geo) * moonPos.gy;
    }
    bodyPixels['Moon'] = { px: mpx, py: mpy };

    // Moon orbit around Earth
    ctx.beginPath();
    ctx.arc(earthPx.px, earthPx.py, moonOffsetScale, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(150,150,200,0.15)';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    const moonData = PLANET_DATA['Moon'];
    const mr = moonData.radius * Math.max(0.6, state.zoom * 0.7);
    ctx.beginPath();
    ctx.arc(mpx, mpy, mr, 0, Math.PI * 2);
    ctx.fillStyle = moonData.color;
    if (state.selectedBody === 'Moon') {
      ctx.shadowColor = moonData.glow;
      ctx.shadowBlur = 10;
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    if (state.zoom > 0.4) {
      ctx.font = `${Math.max(9, 10 * state.zoom)}px sans-serif`;
      ctx.fillStyle = state.selectedBody === 'Moon' ? '#fff' : 'rgba(200,210,240,0.7)';
      ctx.textAlign = 'center';
      ctx.fillText('Mond', mpx, mpy - mr - 3);
    }
  }

  // Store pixel positions for click detection
  state._bodyPixels = bodyPixels;
}

// ===== SKY VIEW RENDERER =====
function renderSky(canvas, positions, jd) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Sky gradient
  const skyGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.min(W,H)*0.48);
  skyGrad.addColorStop(0, '#0a0a30');
  skyGrad.addColorStop(0.7, '#060618');
  skyGrad.addColorStop(1, '#030310');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  const R = Math.min(W, H) * 0.44;
  const cx = W / 2, cy = H / 2;

  // Stars
  for (const s of stars) {
    const sx = s.fx * W, sy = s.fy * H;
    ctx.globalAlpha = s.a * 0.7;
    ctx.fillStyle = '#fff';
    const dist = Math.sqrt((sx-cx)*(sx-cx)+(sy-cy)*(sy-cy));
    if (dist < R) {
      ctx.beginPath();
      ctx.arc(sx, sy, s.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Clip to circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // Altitude grid lines
  for (const alt of [30, 60]) {
    const gr = R * (1 - alt / 90);
    ctx.beginPath();
    ctx.arc(cx, cy, gr, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100,120,180,0.2)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = 'rgba(100,120,180,0.4)';
    ctx.font = '10px sans-serif';
    ctx.fillText(`${alt}°`, cx + gr + 2, cy);
  }

  // Azimuth lines (N-S, E-W)
  ctx.strokeStyle = 'rgba(100,120,180,0.2)';
  ctx.lineWidth = 0.8;
  for (let a = 0; a < 360; a += 45) {
    const rad = a * DEG;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.sin(rad), cy - R * Math.cos(rad));
    ctx.stroke();
  }

  ctx.restore();

  // Horizon circle
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(100,180,100,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Cardinal directions
  const dirs = [['N',0],['O',90],['S',180],['W',270]];
  ctx.font = 'bold 12px sans-serif';
  for (const [label, az] of dirs) {
    const rad = az * DEG;
    const dx = (R + 14) * Math.sin(rad);
    const dy = -(R + 14) * Math.cos(rad);
    ctx.fillStyle = label === 'N' ? '#ff6060' : 'rgba(180,200,255,0.8)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx + dx, cy + dy);
  }

  // Zenith
  ctx.fillStyle = 'rgba(150,150,200,0.5)';
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fill();

  // Plot bodies
  const skyPixels = {};
  for (const name of BODY_ORDER) {
    const pos = positions[name];
    const data = PLANET_DATA[name];
    if (!pos) continue;

    const horiz = toHorizontal(pos.ra, pos.dec, jd, state.lat, state.lon);
    const alt = horiz.alt;
    const az = horiz.az;

    // Stereographic projection: alt=90 => center, alt=0 => edge
    const rho = R * (90 - alt) / 90;
    if (alt < -10) continue; // below horizon

    const px = cx + rho * Math.sin(az * DEG);
    const py = cy - rho * Math.cos(az * DEG);

    skyPixels[name] = { px, py, alt, az };

    // Below horizon fade
    const alpha = alt < 0 ? Math.max(0, 1 + alt / 10) : 1;
    ctx.globalAlpha = alpha;

    const r = data.radius * 0.9;

    if (name === 'Sun') {
      const g = ctx.createRadialGradient(px, py, 0, px, py, r * 3);
      g.addColorStop(0, 'rgba(255,200,80,0.9)');
      g.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.beginPath();
      ctx.arc(px, py, r * 3, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = data.color;
    if (state.selectedBody === name) {
      ctx.shadowColor = data.glow;
      ctx.shadowBlur = 12;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    ctx.font = '10px sans-serif';
    ctx.fillStyle = alpha > 0.5 ? 'rgba(200,210,240,0.85)' : 'rgba(200,210,240,0.4)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(data.nameDe, px, py + r + 2);
  }

  state._skyPixels = skyPixels;
}

// ===== INFO PANEL =====
function showInfo(name) {
  state.selectedBody = name;
  const data = PLANET_DATA[name];
  const pos = state.positions[name];
  if (!data || !pos) return;

  const panel = document.getElementById('info-panel');
  const content = document.getElementById('info-content');
  panel.classList.remove('hidden');

  const jd = julianDate(state.date);
  let horizStr = '';
  let visTag = '';
  if (pos.ra !== undefined) {
    const h = toHorizontal(pos.ra, pos.dec, jd, state.lat, state.lon);
    const altStr = h.alt.toFixed(1) + '°';
    const azStr = h.az.toFixed(1) + '°';
    horizStr = `
      <div class="pos-row"><span>Höhe (Altitude)</span><span>${altStr}</span></div>
      <div class="pos-row"><span>Azimut</span><span>${azStr}</span></div>`;
    visTag = h.alt > 0
      ? '<span class="visibility-tag vis-above">&#9650; Über dem Horizont</span>'
      : '<span class="visibility-tag vis-below">&#9660; Unter dem Horizont</span>';
  }

  const distStr = name === 'Moon'
    ? `${Math.round(pos.dist).toLocaleString('de')} km`
    : name === 'Sun'
    ? `${pos.dist.toFixed(4)} AE`
    : `${pos.dist.toFixed(4)} AE`;

  const factsRows = Object.entries(data.facts)
    .map(([k,v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
    .join('');

  content.innerHTML = `
    <div class="info-header">
      <div class="info-icon" style="background:${data.color}22;border:2px solid ${data.color}44">
        <span>${data.emoji}</span>
      </div>
      <div>
        <div class="info-name">${data.nameDe}</div>
        <div class="info-type">${data.type}</div>
      </div>
    </div>
    <div class="info-desc">${data.desc}</div>
    ${visTag}

    <div class="info-section-title">Aktuelle Position</div>
    <div class="position-live">
      <div class="pos-row"><span>Rektaszension</span><span>${formatRA(pos.ra)}</span></div>
      <div class="pos-row"><span>Deklination</span><span>${formatAngle(pos.dec * RAD)}</span></div>
      <div class="pos-row"><span>Entfernung</span><span>${distStr}</span></div>
      ${horizStr}
    </div>

    <div class="info-section-title">Steckbrief</div>
    <table class="info-table">${factsRows}</table>
  `;
}

function hideInfo() {
  document.getElementById('info-panel').classList.add('hidden');
  state.selectedBody = null;
}

// ===== LEGEND =====
function buildLegend() {
  const container = document.getElementById('legend-items');
  container.innerHTML = '';
  for (const name of BODY_ORDER) {
    const data = PLANET_DATA[name];
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<div class="legend-dot" style="background:${data.color}"></div>${data.nameDe}`;
    item.addEventListener('click', () => showInfo(name));
    container.appendChild(item);
  }
}

// ===== RESIZE & ANIMATION =====
function resizeCanvases() {
  // Use view-container dimensions as reference (always visible)
  const container = document.querySelector('.view-container').getBoundingClientRect();
  for (const id of ['solar-canvas', 'sky-canvas']) {
    const canvas = document.getElementById(id);
    const rect = canvas.parentElement.getBoundingClientRect();
    // If parent is hidden (display:none), rect is 0 — use container fallback
    canvas.width  = rect.width  > 0 ? rect.width  : container.width;
    canvas.height = rect.height > 0 ? rect.height : container.height;
  }
  generateStars();
}

function updateDatetime() {
  const input = document.getElementById('datetime');
  // Format: YYYY-MM-DDTHH:MM
  const d = state.date;
  const pad = n => String(n).padStart(2,'0');
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  input.value = local.toISOString().slice(0, 16);
}

function render() {
  const jd = julianDate(state.date);
  state.positions = computePositions(jd);

  if (state.view === 'solar') {
    renderSolar(document.getElementById('solar-canvas'), state.positions);
  } else {
    renderSky(document.getElementById('sky-canvas'), state.positions, jd);
  }

  if (state.selectedBody && state.positions[state.selectedBody]) {
    showInfo(state.selectedBody);
  }
}

// ===== HIT TEST =====
function hitTest(px, py, pixels, threshold = 14) {
  let best = null, bestDist = threshold;
  for (const [name, p] of Object.entries(pixels || {})) {
    const d = Math.hypot(px - p.px, py - p.py);
    if (d < bestDist) { bestDist = d; best = name; }
  }
  return best;
}

// ===== UI SETUP =====
function initUI() {
  updateDatetime();

  document.getElementById('btn-now').addEventListener('click', () => {
    state.date = new Date();
    updateDatetime();
    render();
  });

  document.getElementById('datetime').addEventListener('change', e => {
    state.date = new Date(e.target.value);
    render();
  });

  document.getElementById('lat').addEventListener('change', e => {
    state.lat = parseFloat(e.target.value) || 0;
    render();
  });

  document.getElementById('lon').addEventListener('change', e => {
    state.lon = parseFloat(e.target.value) || 0;
    render();
  });

  document.getElementById('btn-location').addEventListener('click', () => {
    if (!navigator.geolocation) return alert('Geolocation nicht verfügbar.');
    navigator.geolocation.getCurrentPosition(pos => {
      state.lat = pos.coords.latitude;
      state.lon = pos.coords.longitude;
      document.getElementById('lat').value = state.lat.toFixed(4);
      document.getElementById('lon').value = state.lon.toFixed(4);
      render();
    }, () => alert('Standort konnte nicht ermittelt werden.'));
  });

  document.getElementById('info-close').addEventListener('click', hideInfo);

  // Tab switching
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      state.view = btn.dataset.view;
      document.getElementById(`view-${state.view}`).classList.add('active');
      resizeCanvases();
      render();
    });
  });

  // Zoom buttons
  document.getElementById('zoom-in').addEventListener('click', () => { state.zoom = Math.min(state.zoom * 1.4, 8); render(); });
  document.getElementById('zoom-out').addEventListener('click', () => { state.zoom = Math.max(state.zoom / 1.4, 0.15); render(); });
  document.getElementById('zoom-reset').addEventListener('click', () => { state.zoom = 1; state.panX = 0; state.panY = 0; render(); });

  // Solar canvas mouse events
  const solarCanvas = document.getElementById('solar-canvas');

  solarCanvas.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    state.zoom = Math.max(0.15, Math.min(8, state.zoom * factor));
    render();
  }, { passive: false });

  solarCanvas.addEventListener('mousedown', e => {
    state.dragging = true;
    state.dragStart = { x: e.clientX, y: e.clientY };
    state.panStart = { x: state.panX, y: state.panY };
    solarCanvas.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', e => {
    if (!state.dragging) return;
    state.panX = state.panStart.x + (e.clientX - state.dragStart.x);
    state.panY = state.panStart.y + (e.clientY - state.dragStart.y);
    render();
  });

  window.addEventListener('mouseup', e => {
    if (!state.dragging) return;
    const dx = Math.abs(e.clientX - state.dragStart.x);
    const dy = Math.abs(e.clientY - state.dragStart.y);
    state.dragging = false;
    solarCanvas.style.cursor = 'crosshair';
    if (dx < 4 && dy < 4) {
      // click
      const rect = solarCanvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = hitTest(mx, my, state._bodyPixels);
      if (hit) showInfo(hit); else hideInfo();
    }
  });

  solarCanvas.style.cursor = 'crosshair';

  // Sky canvas click
  const skyCanvas = document.getElementById('sky-canvas');
  skyCanvas.addEventListener('click', e => {
    const rect = skyCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const hit = hitTest(mx, my, state._skyPixels, 18);
    if (hit) showInfo(hit); else hideInfo();
  });

  // Touch support for solar canvas
  let lastTouchDist = null;
  solarCanvas.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      state.dragging = true;
      state.dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      state.panStart = { x: state.panX, y: state.panY };
    } else if (e.touches.length === 2) {
      lastTouchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
    e.preventDefault();
  }, { passive: false });

  solarCanvas.addEventListener('touchmove', e => {
    if (e.touches.length === 1 && state.dragging) {
      state.panX = state.panStart.x + (e.touches[0].clientX - state.dragStart.x);
      state.panY = state.panStart.y + (e.touches[0].clientY - state.dragStart.y);
      render();
    } else if (e.touches.length === 2 && lastTouchDist) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      state.zoom = Math.max(0.15, Math.min(8, state.zoom * (d / lastTouchDist)));
      lastTouchDist = d;
      render();
    }
    e.preventDefault();
  }, { passive: false });

  solarCanvas.addEventListener('touchend', e => {
    state.dragging = false;
    lastTouchDist = null;
  });

  window.addEventListener('resize', () => {
    resizeCanvases();
    render();
  });
}

// ===== BOOT =====
window.addEventListener('load', () => {
  resizeCanvases();
  buildLegend();
  initUI();
  render();
});
