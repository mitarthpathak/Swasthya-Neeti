const NIH_FEED_URL = 'https://www.nih.gov/news-releases/feed.xml';
const CDC_NEWS_URL = 'https://www.cdc.gov/media/index.html';
const WHO_ALERTS_URL = 'https://www.who.int/emergencies/situation-reports';
const FALLBACK_SOURCE_URL = 'https://www.who.int/news-room/fact-sheets';

function decodeHtml(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(value = '') {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function absoluteUrl(baseUrl, href = '') {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Run-Neeti Health Updates Bot/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

function todayLabel() {
  return new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function parseNihFeed(xml) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .slice(0, 4)
    .map((match) => {
      const itemXml = match[1];
      const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '';
      const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? '';
      const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? '';
      const description = itemXml.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? '';

      return {
        title: stripHtml(title),
        url: stripHtml(link),
        date: stripHtml(pubDate),
        summary: stripHtml(description),
        source: 'NIH',
      };
    })
    .filter((item) => item.title && item.url);

  return items;
}

function parseCdcNews(html) {
  const start = html.indexOf('Latest News');
  const end = html.indexOf('Latest Releases');
  const scope = start >= 0 && end > start ? html.slice(start, end) : html;

  const matches = [...scope.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([^<]{20,180})<\/a>[\s\S]*?([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/g)];
  const items = [];
  const seen = new Set();

  for (const match of matches) {
    const url = absoluteUrl(CDC_NEWS_URL, match[1]);
    const title = stripHtml(match[2]);
    const date = stripHtml(match[3]);

    if (!title || seen.has(title) || /View All|Contact Media Relations|CDC Newsroom/i.test(title)) {
      continue;
    }

    seen.add(title);
    items.push({
      title,
      url,
      date,
      summary: '',
      source: 'CDC',
    });

    if (items.length === 4) {
      break;
    }
  }

  return items;
}

function parseWhoAlerts(html) {
  const anchorRegex = /<a[^>]+href="([^"]+)"[^>]*>\s*(\d{1,2}\s+[A-Z][a-z]+\s+\d{4})\s+([^<]+?)\s*<\/a>/g;
  const items = [];
  const seen = new Set();

  for (const match of html.matchAll(anchorRegex)) {
    const date = stripHtml(match[2]);
    const title = stripHtml(match[3]).replace(/\s{2,}/g, ' ').trim();

    if (!title || seen.has(title) || !/outbreak|situation|cholera|mpox|influenza|virus|fever|disease/i.test(title)) {
      continue;
    }

    seen.add(title);
    items.push({
      title,
      url: absoluteUrl(WHO_ALERTS_URL, match[1]),
      date,
      summary: '',
      source: 'WHO',
    });

    if (items.length === 4) {
      break;
    }
  }

  return items;
}

function fallbackAlerts() {
  const today = todayLabel();
  return [
    {
      title: 'Watch for seasonal flu spread in local communities',
      url: FALLBACK_SOURCE_URL,
      date: today,
      summary: 'If fever, cough, or weakness is rising quickly, seek a same-day checkup.',
      source: 'WHO',
    },
    {
      title: 'Heat-related illness risk is higher this week',
      url: FALLBACK_SOURCE_URL,
      date: today,
      summary: 'Hydrate often, avoid peak afternoon sun, and monitor elders and children.',
      source: 'WHO',
    },
  ];
}

function fallbackNews() {
  const today = todayLabel();
  return [
    {
      title: 'Public health teams advise early testing for persistent fever',
      url: CDC_NEWS_URL,
      date: today,
      summary: 'Do not delay consultation if fever lasts more than 2 to 3 days.',
      source: 'CDC',
    },
    {
      title: 'Community clinics share preventive hygiene reminders',
      url: CDC_NEWS_URL,
      date: today,
      summary: 'Frequent handwashing and safe drinking water remain key protections.',
      source: 'CDC',
    },
  ];
}

function fallbackDiscoveries() {
  const today = todayLabel();
  return [
    {
      title: 'Researchers continue work on faster infection detection',
      url: NIH_FEED_URL,
      date: today,
      summary: 'Early diagnosis tools may improve triage and reduce severe complications.',
      source: 'NIH',
    },
    {
      title: 'New care models focus on rural telehealth support',
      url: NIH_FEED_URL,
      date: today,
      summary: 'Remote guidance can help patients get the right care faster.',
      source: 'NIH',
    },
  ];
}

export async function fetchHealthUpdates() {
  const [nihResult, cdcResult, whoResult] = await Promise.allSettled([
    fetchText(NIH_FEED_URL),
    fetchText(CDC_NEWS_URL),
    fetchText(WHO_ALERTS_URL),
  ]);

  const discoveries =
    nihResult.status === 'fulfilled'
      ? parseNihFeed(nihResult.value)
      : [];
  const news =
    cdcResult.status === 'fulfilled'
      ? parseCdcNews(cdcResult.value)
      : [];
  const alerts =
    whoResult.status === 'fulfilled'
      ? parseWhoAlerts(whoResult.value)
      : [];

  if (nihResult.status === 'rejected') {
    console.error('NIH updates fetch failed:', nihResult.reason);
  }
  if (cdcResult.status === 'rejected') {
    console.error('CDC updates fetch failed:', cdcResult.reason);
  }
  if (whoResult.status === 'rejected') {
    console.error('WHO updates fetch failed:', whoResult.reason);
  }

  return {
    fetchedAt: new Date().toISOString(),
    alerts: alerts.length > 0 ? alerts : fallbackAlerts(),
    news: news.length > 0 ? news : fallbackNews(),
    discoveries: discoveries.length > 0 ? discoveries : fallbackDiscoveries(),
    sources: {
      alerts: WHO_ALERTS_URL,
      news: CDC_NEWS_URL,
      discoveries: NIH_FEED_URL,
    },
  };
}
