/**
 * calendar.js
 * Fetches the ForexFactory economic calendar RSS feed and identifies
 * upcoming high-impact news events that could affect open trades.
 *
 * Uses the public faireconomy.media mirror of the FF calendar XML
 * (same data, no auth required, no CORS issues in React Native).
 */

const CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml';

// Which currencies are in each pair
const PAIR_CURRENCIES = {
  EURUSD: ['EUR', 'USD'],
  GBPUSD: ['GBP', 'USD'],
  USDJPY: ['USD', 'JPY'],
  USDCHF: ['USD', 'CHF'],
  AUDUSD: ['AUD', 'USD'],
  USDCAD: ['USD', 'CAD'],
  NZDUSD: ['NZD', 'USD'],
  GBPJPY: ['GBP', 'JPY'],
  EURJPY: ['EUR', 'JPY'],
  XAUUSD: ['XAU', 'USD'],
};

// ── Simple XML parser (no DOMParser in React Native) ────────────────────────

function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const matches = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    matches.push(m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim());
  }
  return matches;
}

function parseEvents(xml) {
  // Split by <event> blocks
  const blocks = xml.split(/<event>|<\/event>/).filter((_, i) => i % 2 === 1);

  return blocks.map(block => {
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
    };

    return {
      title:    get('title'),
      country:  get('country').toUpperCase(),
      date:     get('date'),
      time:     get('time'),
      impact:   get('impact'),
      forecast: get('forecast'),
      previous: get('previous'),
      actual:   get('actual'),
    };
  }).filter(e => e.title && e.country);
}

// Parse "Jul 19, 2026" and "8:30am" into a Date object (UTC assumed)
function parseEventTime(dateStr, timeStr) {
  try {
    if (!timeStr || timeStr.toLowerCase() === 'all day' || timeStr.toLowerCase() === 'tentative') {
      return new Date(dateStr + ' 00:00');
    }
    return new Date(`${dateStr} ${timeStr}`);
  } catch {
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch and parse the FF calendar.
 * Returns array of { title, country, date, time, impact, eventTime }
 */
export async function fetchCalendar() {
  const now = Date.now();
  if (_cache && now - _cacheTime < CACHE_TTL) return _cache;

  try {
    const res = await fetch(CALENDAR_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/xml, text/xml' },
    });
    if (!res.ok) throw new Error(`Calendar fetch failed: ${res.status}`);
    const xml = await res.text();
    const events = parseEvents(xml).map(e => ({
      ...e,
      eventTime: parseEventTime(e.date, e.time),
    }));
    _cache = events;
    _cacheTime = now;
    return events;
  } catch (err) {
    console.warn('Calendar fetch error:', err.message);
    return _cache ?? [];
  }
}

/**
 * Returns high-impact news events in the next `windowMinutes` minutes
 * that affect the given pair's currencies.
 *
 * @param {string} pair - e.g. 'EURUSD'
 * @param {number} windowMinutes - look-ahead window (default 60)
 */
export async function getNewsRisk(pair, windowMinutes = 60) {
  const currencies = PAIR_CURRENCIES[pair] ?? [];
  const events = await fetchCalendar();
  const now  = new Date();
  const soon = new Date(now.getTime() + windowMinutes * 60 * 1000);

  return events.filter(e => {
    if (!e.eventTime) return false;
    const t = e.eventTime;
    const isUpcoming = t >= now && t <= soon;
    const isRelevant = currencies.includes(e.country);
    const isHigh     = ['High', 'Medium'].includes(e.impact);
    return isUpcoming && isRelevant && isHigh;
  });
}

/**
 * Returns a human-readable news risk summary for a pair.
 * Empty string = no upcoming news risk.
 */
export async function newsRiskSummary(pair) {
  try {
    const events = await getNewsRisk(pair, 90);
    if (!events.length) return '';
    return events
      .map(e => `${e.country} ${e.title} @ ${e.time} (${e.impact} impact)`)
      .join('; ');
  } catch {
    return '';
  }
}

/**
 * Returns quick flags for all pairs — used by scanner to show badges.
 * { EURUSD: true, GBPUSD: false, ... }
 */
export async function getAllNewsFlags(pairs, windowMinutes = 60) {
  const events = await fetchCalendar();
  const now  = new Date();
  const soon = new Date(now.getTime() + windowMinutes * 60 * 1000);

  const highEvents = events.filter(e => {
    if (!e.eventTime) return false;
    return e.eventTime >= now && e.eventTime <= soon &&
      ['High', 'Medium'].includes(e.impact);
  });

  const activeCountries = new Set(highEvents.map(e => e.country));

  return Object.fromEntries(
    pairs.map(pair => {
      const currencies = PAIR_CURRENCIES[pair] ?? [];
      const hasNews = currencies.some(c => activeCountries.has(c));
      return [pair, hasNews];
    })
  );
}

/**
 * Returns today's full event list, sorted by time.
 */
export async function getTodaysEvents() {
  const events = await fetchCalendar();
  const today  = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return events
    .filter(e => e.date.startsWith(today.split(',')[0]) || (e.eventTime && e.eventTime.toDateString() === new Date().toDateString()))
    .sort((a, b) => (a.eventTime ?? 0) - (b.eventTime ?? 0));
}
