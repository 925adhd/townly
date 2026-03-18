export const config = { runtime: 'edge' };

const BOT_UA = /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot|iMessageBot|Applebot|Google-InspectionTool|Googlebot/i;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') || '';
  const ua = request.headers.get('user-agent') || '';

  // Only intercept for bots — everyone else gets the normal SPA
  if (!BOT_UA.test(ua)) {
    const spaUrl = new URL('/ask/index.html', url.origin);
    const spaResp = await fetch(spaUrl.toString());
    return new Response(spaResp.body, {
      status: spaResp.status,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Fetch question data from Supabase
  let title = 'Ask the Community';
  let description = 'Ask your neighbors for recommendations on local services, businesses, and more in Grayson County.';
  let ogUrl = `https://www.townly.us/ask`;

  if (slug && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const apiUrl = `${SUPABASE_URL}/rest/v1/recommendation_requests?slug=eq.${encodeURIComponent(slug)}&tenant_id=eq.grayson&select=service_needed,description,town,status,response_count&limit=1`;
      const resp = await fetch(apiUrl, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      if (resp.ok) {
        const rows = await resp.json();
        if (rows.length > 0) {
          const q = rows[0];
          title = q.service_needed;
          description = q.description?.slice(0, 200) || `Looking for ${q.service_needed} in ${q.town}`;
          ogUrl = `https://www.townly.us/ask/${slug}`;
        }
      }
    } catch {
      // Fall through to defaults
    }
  }

  const ogTitle = `${title} — Ask the Community | Grayson County Townly`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Townly" />
<meta property="og:title" content="${esc(ogTitle)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="https://www.townly.us/background.png" />
<meta property="og:image:width" content="1536" />
<meta property="og:image:height" content="1024" />
<meta property="og:url" content="${esc(ogUrl)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(ogTitle)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="https://www.townly.us/background.png" />
<title>${esc(ogTitle)}</title>
</head>
<body></body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
