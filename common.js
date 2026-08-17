/* ============================================================
   GOAL CUP - shared code for the overlay and the control panel
   ============================================================ */

const CFG = window.GOAL_CUP || {};
const ROOM = (CFG.room || 'default').replace(/[^a-zA-Z0-9-]/g, '');
const CONFIGURED = CFG.databaseURL && !/PASTE_YOUR/.test(CFG.databaseURL);

let db = null, refs = {};
if (CONFIGURED) {
  firebase.initializeApp({ apiKey: CFG.apiKey, databaseURL: CFG.databaseURL });
  db = firebase.database();
  refs = {
    state:    db.ref(ROOM + '/state'),      // overlay writes, panel reads
    setup:    db.ref(ROOM + '/setup'),      // panel writes the team list
    config:   db.ref(ROOM + '/config'),     // panel writes the settings
    commands: db.ref(ROOM + '/commands'),   // panel pushes, overlay consumes
    events:   db.ref(ROOM + '/events'),     // Stream to Earn pushes gifts here
    offset:   db.ref('.info/serverTimeOffset')
  };
}

/* ---------- helpers ---------- */

const slug = s => String(s == null ? '' : s).toLowerCase().trim()
  .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'x';
const norm = s => String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();
const esc  = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt  = n => n >= 10000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(Math.round(n));

/* ---------- gift prices ---------- */

let GIFT_PRICES = {};
function loadGiftPrices() {
  return fetch('gifts.json').then(r => r.json()).then(g => {
    GIFT_PRICES = {};
    for (const [name, coins] of Object.entries(g)) {
      const k = norm(name);
      if (GIFT_PRICES[k] == null || coins < GIFT_PRICES[k]) GIFT_PRICES[k] = coins;
    }
    GIFT_PRICES.__names = g;
    return g;
  }).catch(() => ({}));
}
function priceOf(name) {
  const n = norm(name);
  if (GIFT_PRICES[n] != null) return GIFT_PRICES[n];
  for (const k of Object.keys(GIFT_PRICES)) if (k.length > 3 && n.includes(k)) return GIFT_PRICES[k];
  return 1;
}

/* ---------- gift icons: uploaded art first, drawn fallback second ---------- */

const GIFT_EMOJI = {
  'rose':'\u{1F339}','white rose':'\u{1F90D}','rosa':'\u{1F339}','roses':'\u{1F490}','gg':'\u{1F3AE}',
  'super gg':'\u{1F3C5}','tiktok':'\u{1F3B5}','heart':'\u2764\uFE0F','heart me':'\u{1F49D}',
  'love you':'\u{1F495}','i love you':'\u{1F495}','hand heart':'\u{1FAF6}','finger heart':'\u{1FAF0}',
  'thumbs up':'\u{1F44D}','good job':'\u{1F44F}','clap clap':'\u{1F44F}','applause':'\u{1F44F}',
  'football':'\u26BD','soccer ball':'\u26BD','spinning soccer':'\u26BD','gooaal':'\u26BD','goool':'\u26BD',
  'goal':'\u{1F945}','goal strike':'\u26BD','goalkeeper save':'\u{1F9E4}','kicker challenge':'\u{1F945}',
  'league ball':'\u26BD','league trophy':'\u{1F3C6}','trophy':'\u{1F3C6}','gold medal':'\u{1F947}',
  'doughnut':'\u{1F369}','ice cream':'\u{1F366}','ice cream cone':'\u{1F366}','cake slice':'\u{1F370}',
  'birthday cake':'\u{1F382}','coffee':'\u2615','tea':'\u{1F375}','perfume':'\u{1F9F4}','bouquet':'\u{1F490}',
  'confetti':'\u{1F389}','congratulations':'\u{1F389}','balloons':'\u{1F388}','money gun':'\u{1F4B8}',
  'money bag':'\u{1F4B0}','game controller':'\u{1F3AE}','paper crane':'\u{1F54A}\uFE0F',
  'hat and mustache':'\u{1F452}','little crown':'\u{1F451}','the crown':'\u{1F451}','tiktok crown':'\u{1F451}',
  'diamond':'\u{1F48E}','galaxy':'\u{1F30C}','fireworks':'\u{1F386}','lion':'\u{1F981}','swan':'\u{1F9A2}',
  'butterfly':'\u{1F98B}','corgi':'\u{1F415}','cat':'\u{1F431}','unicorn':'\u{1F984}','phoenix':'\u{1F985}',
  'race car':'\u{1F3CE}\uFE0F','sports car':'\u{1F697}','private jet':'\u2708\uFE0F','yacht':'\u{1F6E5}\uFE0F',
  'stadium':'\u{1F3DF}\uFE0F','into the stadium':'\u{1F3DF}\uFE0F','zeus':'\u26A1','lightning bolt':'\u26A1',
  'star':'\u2B50','mini star':'\u2B50','music note':'\u{1F3B6}','guitar':'\u{1F3B8}','drums':'\u{1F941}',
  'whistle':'\u{1F3C1}','boxing gloves':'\u{1F94A}','tiktok universe':'\u{1F30C}'
};
function giftIconHTML(name, cls) {
  const s = slug(name);
  return `<img class="${cls || 'gicon'}" src="gifts/${s}.png" alt="" ` +
         `onerror="this.outerHTML='<span class=\\'${cls || 'gicon'} emo\\'>' + ` +
         `(GIFT_EMOJI['${norm(name).replace(/'/g, "")}'] || '\\u{1F381}') + '</span>'">`;
}
const FLAG_CDN = 'https://cdn.jsdelivr.net/gh/hampusborgos/country-flags@main/png100px/';

function flagImg(iso, cls) {
  const raw = 'https://raw.githubusercontent.com/hampusborgos/country-flags/main/png100px/' + iso + '.png';
  return [
    '<img class="', cls, ' flagimg" src="', FLAG_CDN, iso, '.png" alt=""',
    ' onerror="if(!this._f){this._f=1;this.src=\'', raw, '\'}"',
    ' style="border-radius:2px;object-fit:cover;display:block">'
  ].join('');
}

function teamMarkHTML(t, cls) {
  if (!t) return '';
  const c = cls || 'crest';
  if (t.iso) return flagImg(t.iso, c);
  if (t.logo) return '<img class="' + c + '" src="logos/' + slug(t.name) + '.png" alt="">';
  if (t.flag) return '<span class="' + c + ' flagmark">' + t.flag + '</span>';
  return '<span class="' + c + ' chip" style="background:' + t.c1 + ';color:' + pickInk(t.c1) + '">' + esc((t.abbr || t.name || '?').slice(0, 3)) + '</span>';
}
function pickInk(hex) {
  const h = String(hex || '#000').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? '#111' : '#fff';
}

/* ---------- defaults ---------- */

function defaultConfig() {
  return {
    title: 'מי הקבוצה החזקה?',
    duration: 90,            // seconds per match
    coinsPerGoal: 150,       // coins needed to push the ball from centre into the net
    autoNext: true,          // roll into the next match on its own
    goldenGoal: true,        // a draw goes to next-goal-wins
    sound: true,
    leftGifts:  ['Rose', 'Confetti', 'Paper Crane', 'Super GG'],
    rightGifts: ['GG', 'Clap Clap', 'Hat and Mustache', 'Game Controller']
  };
}

function defaultState() {
  return {
    phase: 'lobby',          // lobby | live | ended | champion
    rounds: [],              // [[{a,b,winner}, ...], ...]
    round: 0, match: 0,
    scoreA: 0, scoreB: 0, coinsA: 0, coinsB: 0,
    ball: 0,                 // -1 = in A's net, +1 = in B's net
    startedAt: 0, endsAt: 0, paused: false, pausedLeft: 0,
    lastGoal: null, champion: null
  };
}

/* ---------- bracket ---------- */

/* Pads the entry list up to a power of two with byes, then builds empty later rounds. */
function buildBracket(teams) {
  const list = teams.slice();
  let size = 2;
  while (size < list.length) size *= 2;
  while (list.length < size) list.push(null);      // null = bye

  // Seeded pairing - first against last, second against second-last.
  // This spreads the byes across the top seeds instead of letting two byes
  // meet each other, which would leave a match nobody can ever win.
  const rounds = [];
  const pairs = [];
  for (let i = 0; i < size / 2; i++) pairs.push({ a: list[i], b: list[size - 1 - i], winner: null });
  rounds.push(pairs);

  let n = pairs.length;
  while (n > 1) {
    n = n / 2;
    rounds.push(Array.from({ length: n }, () => ({ a: null, b: null, winner: null })));
  }
  autoAdvanceByes(rounds);
  return rounds;
}

/* A team paired against a bye walks into the next round.
   Byes only exist in round one - a half-empty slot later just means
   the feeding match has not been played yet. */
function autoAdvanceByes(rounds) {
  for (let r = 0; r < rounds.length; r++) {
    rounds[r].forEach((m, i) => {
      if (r === 0 && !m.winner && m.a && !m.b) m.winner = m.a;
      if (r === 0 && !m.winner && !m.a && m.b) m.winner = m.b;
      if (m.winner && rounds[r + 1]) {
        const slot = rounds[r + 1][Math.floor(i / 2)];
        if (i % 2 === 0) slot.a = m.winner; else slot.b = m.winner;
      }
    });
  }
}

/* First match that has both teams and no winner yet. */
function nextFixture(rounds) {
  for (let r = 0; r < rounds.length; r++)
    for (let i = 0; i < rounds[r].length; i++) {
      const m = rounds[r][i];
      if (m.a && m.b && !m.winner) return { round: r, match: i };
    }
  return null;
}

function roundName(rounds, r) {
  const left = rounds.length - r;
  if (left === 1) return 'THE FINAL';
  if (left === 2) return 'חצי גמר';
  if (left === 3) return 'רבע גמר';
  return 'סיבוב ' + (r + 1);
}
