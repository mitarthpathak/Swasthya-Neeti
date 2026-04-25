/**
 * Health updates fetcher for serverless API routes.
 */
const NIH_FEED_URL = 'https://www.nih.gov/news-releases/feed.xml';
const CDC_NEWS_URL = 'https://www.cdc.gov/media/index.html';
const WHO_ALERTS_URL = 'https://www.who.int/emergencies/situation-reports';
const FALLBACK_SOURCE_URL = 'https://www.who.int/news-room/fact-sheets';

function decodeHtml(v = '') {
  return v.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ');
}
function stripHtml(v = '') {
  return decodeHtml(v.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim());
}
function absoluteUrl(base, href = '') {
  try { return new URL(href, base).toString(); } catch { return href; }
}
async function fetchText(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Swasthya-Neeti/1.0' } });
  if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status}`);
  return r.text();
}
function todayLabel() {
  return new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}
function parseNihFeed(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0,4).map(m => {
    const x = m[1];
    return {
      title: stripHtml(x.match(/<title>([\s\S]*?)<\/title>/)?.[1]??''),
      url: stripHtml(x.match(/<link>([\s\S]*?)<\/link>/)?.[1]??''),
      date: stripHtml(x.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]??''),
      summary: stripHtml(x.match(/<description>([\s\S]*?)<\/description>/)?.[1]??''),
      source: 'NIH',
    };
  }).filter(i => i.title && i.url);
}
function parseCdcNews(html) {
  const s = html.indexOf('Latest News'), e = html.indexOf('Latest Releases');
  const scope = s>=0 && e>s ? html.slice(s,e) : html;
  const items = [], seen = new Set();
  for (const m of scope.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([^<]{20,180})<\/a>[\s\S]*?([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/g)) {
    const url = absoluteUrl(CDC_NEWS_URL, m[1]), title = stripHtml(m[2]), date = stripHtml(m[3]);
    if (!title || seen.has(title) || /View All|Contact Media|CDC Newsroom/i.test(title)) continue;
    seen.add(title); items.push({ title, url, date, summary:'', source:'CDC' });
    if (items.length===4) break;
  }
  return items;
}
function parseWhoAlerts(html) {
  const items = [], seen = new Set();
  for (const m of html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>\s*(\d{1,2}\s+[A-Z][a-z]+\s+\d{4})\s+([^<]+?)\s*<\/a>/g)) {
    const date = stripHtml(m[2]), title = stripHtml(m[3]).replace(/\s{2,}/g,' ').trim();
    if (!title || seen.has(title) || !/outbreak|situation|cholera|mpox|influenza|virus|fever|disease/i.test(title)) continue;
    seen.add(title); items.push({ title, url: absoluteUrl(WHO_ALERTS_URL, m[1]), date, summary:'', source:'WHO' });
    if (items.length===4) break;
  }
  return items;
}
function fallbackAlerts() {
  const t = todayLabel();
  return [
    { title:'Watch for seasonal flu spread in local communities', url:FALLBACK_SOURCE_URL, date:t, summary:'If fever, cough, or weakness is rising quickly, seek a same-day checkup.', source:'WHO' },
    { title:'Heat-related illness risk is higher this week', url:FALLBACK_SOURCE_URL, date:t, summary:'Hydrate often, avoid peak afternoon sun, and monitor elders and children.', source:'WHO' },
  ];
}
function fallbackNews() {
  const t = todayLabel();
  return [
    { title:'Public health teams advise early testing for persistent fever', url:CDC_NEWS_URL, date:t, summary:'Do not delay consultation if fever lasts more than 2 to 3 days.', source:'CDC' },
    { title:'Community clinics share preventive hygiene reminders', url:CDC_NEWS_URL, date:t, summary:'Frequent handwashing and safe drinking water remain key protections.', source:'CDC' },
  ];
}
function fallbackDiscoveries() {
  const t = todayLabel();
  return [
    { title:'Researchers continue work on faster infection detection', url:NIH_FEED_URL, date:t, summary:'Early diagnosis tools may improve triage and reduce severe complications.', source:'NIH' },
    { title:'New care models focus on rural telehealth support', url:NIH_FEED_URL, date:t, summary:'Remote guidance can help patients get the right care faster.', source:'NIH' },
  ];
}
export async function fetchHealthUpdates() {
  const [nih, cdc, who] = await Promise.allSettled([fetchText(NIH_FEED_URL), fetchText(CDC_NEWS_URL), fetchText(WHO_ALERTS_URL)]);
  const discoveries = nih.status==='fulfilled' ? parseNihFeed(nih.value) : [];
  const news = cdc.status==='fulfilled' ? parseCdcNews(cdc.value) : [];
  const alerts = who.status==='fulfilled' ? parseWhoAlerts(who.value) : [];
  if (nih.status==='rejected') console.error('NIH fetch failed:', nih.reason);
  if (cdc.status==='rejected') console.error('CDC fetch failed:', cdc.reason);
  if (who.status==='rejected') console.error('WHO fetch failed:', who.reason);
  return {
    fetchedAt: new Date().toISOString(),
    alerts: alerts.length>0 ? alerts : fallbackAlerts(),
    news: news.length>0 ? news : fallbackNews(),
    discoveries: discoveries.length>0 ? discoveries : fallbackDiscoveries(),
    sources: { alerts: WHO_ALERTS_URL, news: CDC_NEWS_URL, discoveries: NIH_FEED_URL },
  };
}
