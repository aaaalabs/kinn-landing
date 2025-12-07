import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.RADAR_GROQ_API_KEY,
});

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter required' });
    }

    console.log(`[DEBUG] Fetching: ${url}`);

    // Fetch with proper headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'de-AT,de;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      return res.status(200).json({
        error: `HTTP ${response.status}`,
        statusText: response.statusText
      });
    }

    const html = await response.text();
    console.log(`[DEBUG] HTML length: ${html.length}`);

    // Check for JavaScript rendering hints
    const isReactApp = html.includes('__REACT') || html.includes('_app') || html.includes('__NEXT');
    const isVueApp = html.includes('__VUE') || html.includes('vue-app');
    const hasJsonLD = html.includes('application/ld+json');
    const hasEventSchema = html.includes('@type":"Event') || html.includes('"@type":"Event"');

    // Look for specific event patterns
    const eventPatterns = [
      /<article[^>]*class="[^"]*event/gi,
      /<div[^>]*class="[^"]*event/gi,
      /<div[^>]*class="[^"]*veranstaltung/gi,
      /<a[^>]*href="[^"]*event/gi,
      /class="event-item"/gi,
      /class="event-card"/gi,
      /class="veranstaltung"/gi,
      /data-event-id/gi,
      /<h[1-6][^>]*>.*?\d{1,2}\.\s*(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)/gi
    ];

    const patternMatches = {};
    eventPatterns.forEach((pattern, index) => {
      const matches = html.match(pattern);
      if (matches) {
        patternMatches[`Pattern ${index}`] = matches.length;
      }
    });

    // Extract visible text content for analysis
    let textContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Look for date patterns in text
    const datePatterns = [
      /\d{1,2}\.\s*(Jan|Feb|Mär|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Dez)/gi,
      /\d{1,2}\.\d{1,2}\.\d{4}/g,
      /\d{4}-\d{2}-\d{2}/g
    ];

    const dates = {};
    datePatterns.forEach((pattern, index) => {
      const matches = textContent.match(pattern);
      if (matches) {
        dates[`Date pattern ${index}`] = matches.slice(0, 5); // First 5 matches
      }
    });

    // Try specialized extraction for WKO
    let wkoEvents = [];
    if (url.includes('wko.at')) {
      // WKO specific patterns
      const wkoPattern = /<div[^>]*class="[^"]*searchResultItem[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
      const wkoMatches = html.match(wkoPattern);
      if (wkoMatches) {
        wkoEvents = wkoMatches.slice(0, 3).map(match => {
          const titleMatch = match.match(/<h[1-6][^>]*>(.*?)<\/h/i);
          const dateMatch = match.match(/\d{1,2}\.\d{1,2}\.\d{4}/);
          return {
            title: titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Unknown',
            date: dateMatch ? dateMatch[0] : 'No date'
          };
        });
      }
    }

    // Try specialized extraction for InnCubator
    let inncubatorEvents = [];
    if (url.includes('inncubator.at')) {
      // InnCubator specific patterns
      const incPattern = /<a[^>]*href="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
      const incMatches = html.match(incPattern);
      if (incMatches) {
        inncubatorEvents = incMatches.slice(0, 3).map(match => {
          const titleMatch = match.match(/>([^<]+)</);
          return {
            html_snippet: match.substring(0, 200),
            possible_title: titleMatch ? titleMatch[1].trim() : 'Unknown'
          };
        });
      }
    }

    // Check for common CMS/frameworks
    const cms = {
      wordpress: html.includes('wp-content') || html.includes('wp-json'),
      drupal: html.includes('drupal') || html.includes('/node/'),
      typo3: html.includes('typo3') || html.includes('t3://'),
      nextjs: html.includes('_next') || html.includes('__NEXT'),
      gatsby: html.includes('gatsby'),
      angular: html.includes('ng-version'),
      react: isReactApp,
      vue: isVueApp
    };

    // Sample of actual HTML around event-like keywords
    const eventKeywords = ['veranstaltung', 'event', 'termin', 'workshop', 'seminar'];
    const samples = {};

    eventKeywords.forEach(keyword => {
      const regex = new RegExp(`.{0,100}${keyword}.{0,100}`, 'gi');
      const matches = html.match(regex);
      if (matches && matches.length > 0) {
        samples[keyword] = matches[0];
      }
    });

    // Try AI extraction with debug info
    let aiExtraction = { events: [], error: null };
    try {
      const prompt = `
Debug extraction for ${url}

HTML excerpt (first 8000 chars):
${html.substring(0, 8000)}

Task: Find ANY events, workshops, seminars, or meetings. Include:
- Title
- Date (any format)
- Location
- Whether it's free or has a cost

Return as JSON: {"events": [...], "debug_info": "what you found"}`;

      const response = await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      aiExtraction = JSON.parse(response.choices[0]?.message?.content || '{"events":[],"debug_info":"No response"}');
    } catch (error) {
      aiExtraction.error = error.message;
    }

    return res.status(200).json({
      url,
      debug: {
        html_length: html.length,
        is_spa: isReactApp || isVueApp,
        has_json_ld: hasJsonLD,
        has_event_schema: hasEventSchema,
        cms_detected: cms,
        pattern_matches: patternMatches,
        date_occurrences: dates,
        event_keyword_samples: samples,
        wko_specific: wkoEvents,
        inncubator_specific: inncubatorEvents,
        first_500_chars: html.substring(0, 500),
        ai_extraction: aiExtraction
      }
    });

  } catch (error) {
    console.error('[DEBUG] Error:', error);
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}