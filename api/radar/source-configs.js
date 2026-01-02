// Source-specific extraction configurations
// Each source needs custom logic!

export const SOURCE_CONFIGS = {
  // ================== SPECIAL SOURCES ==================

  'Weitere': {
    url: null,  // No fixed URL - admin pastes any URL
    active: true,
    extraction: {
      method: 'manual-url',
      instructions: `
        Manual URL submissions from admin dashboard.
        One-off event URLs that don't fit regular sources.

        Common origins:
        - LinkedIn event posts
        - Meetup.com events
        - Unknown event platforms
        - Forwarded announcements
      `,
      autoApprove: false,  // Always requires review
      maxChars: 15000
    },
    color: '#9333EA',  // Purple - distinct from regular sources
    label: 'Weitere'
  },

  // ================== KINN OWNED ==================

  'KINN': {
    url: 'https://lu.ma/kinns?k=c',
    active: true,
    extraction: {
      method: 'luma',
      instructions: `
        KINN - KI Netzwerk Tirol official Luma calendar.
        This is our own event source - all events should be included.

        Luma page structure:
        - Events listed with title, date, time, location
        - All KINN events are FREE community events
        - Categories: TechTalk, Networking, Workshop, Stammtisch

        IMPORTANT: These are KINN's own events - always include them!
        Set category based on event title:
        - "TechTalk" in title → category: "AI"
        - "KINN#" numbered events → category: "Networking"
        - Default → category: "AI" (KINN focus)
      `,
      requiresJS: true,
      extractNotes: 'KINN official Luma calendar. All events are free and should be auto-approved.',
      autoApprove: true,
      maxChars: 30000
    }
  },

  // ================== HIGH PRIORITY ==================

  'InnCubator': {
    url: 'https://www.inncubator.at/events',
    active: true,
    extraction: {
      method: 'dynamic-spa',
      instructions: `
        InnCubator is an ANGULAR SPA - events load dynamically!

        VERIFIED PATTERNS from actual HTML:
        - Event container: article.event-item
        - Date structure:
          - Weekday: span.event-weekday (e.g., "Freitag")
          - Day: span.event-day (e.g., "31.10")
          - Year: span.event-year (e.g., "2025")
        - Title: h2.event-title
        - Event details in table rows:
          - Time: th contains "Uhrzeit", td has time (e.g., "09:00-12:45 Uhr")
          - Location: th contains "Ort", td has venue (e.g., "InnCubator" or "Online")
          - Format: th contains "Format", td has category
          - Price: th contains "Preis", td has "kostenlos" for free events
        - Link: a.event-link contains href to event details

        IMPORTANT: Only include events where Preis = "kostenlos" (free)
        Skip events with "siehe Website" or other price indicators

        Categories found: ews, innc-programm, offenes-event, partnerformat, iotlab
      `,
      requiresJS: true,
      contentSelector: 'app-event-item',
      htmlPattern: 'article.event-item',
      dateFormat: 'Weekday DD.MM in separate spans',
      extractNotes: 'Angular SPA - needs JS. Events in article.event-item. Date split across 3 spans. Only "kostenlos" events!',
      maxChars: 50000
    }
  },

  'Startup.Tirol': {
    url: 'https://www.startup.tirol/events/',
    active: true,
    extraction: {
      method: 'wordpress-api',
      apiUrl: 'https://www.startup.tirol/wp-json/tribe/events/v1/events',
      fallbackInstructions: `
        Startup.Tirol uses The Events Calendar plugin.
        Look for:
        - .tribe-events-list items
        - Dates with class .tribe-event-date-start
        - Most events are FREE startup events
        - Locations vary across Tirol
        - Include: Pitches, Workshops, Networking, Stammtisch
      `,
      maxChars: 25000
    }
  },

  'WKO Tirol': {
    url: 'https://www.wko.at/veranstaltungen/start?bundesland=T',
    active: true,
    extraction: {
      method: 'custom',
      searchUrl: 'https://www.wko.at/veranstaltungen/start?bundesland=T',
      instructions: `
        WKO Tirol extraction (needs authentication):

        IMPORTANT: Site requires login/cookies to show Tirol-specific events!
        Without auth, it shows general Austria events only.

        HTML STRUCTURE (when authenticated):
        - Event containers: li.col-md-6.col-lg-4 with div.card.card-eventbox
        - Date: Three <dd> elements containing day, month abbreviation, year
        - Title: h4 element within card
        - Location: Text after bi-geo-alt-fill icon
        - Link: a.stretched-link href attribute
        - Price: Look for "kostenlos", "gratis", or absence of price

        EXTRACTION STRATEGY:
        1. Look for any event cards on the page
        2. If found, extract normally
        3. If no events or wrong region, note authentication needed

        Categories: Business, Workshop, Seminar, Webinar, Networking
      `,
      htmlPattern: 'li.col-md-6.col-lg-4 div.card.card-eventbox',
      dateFormat: 'DD Month (e.g., 10 Dez)',
      extractNotes: 'Requires authentication for Tirol events. Without login shows Austria-wide events.',
      requiresAuth: true,
      maxChars: 30000
    }
  },

  'AI Austria': {
    url: 'https://aiaustria.com/event-calendar',
    active: true,
    extraction: {
      method: 'custom',
      instructions: `
        AI Austria calendar page.
        Look for:
        - Event list items or calendar entries
        - Most AI/ML events are community-driven and FREE
        - Include online events (often via Zoom/Teams)
        - Categories: AI, Machine Learning, Data Science
        - Dates might be in English format
        - Location: Often Vienna but include online for Tirol access
      `,
      maxChars: 20000
    }
  },

  'Standortagentur Tirol': {
    url: 'https://www.standort-tirol.at/veranstaltungen',
    active: true,
    extraction: {
      method: 'custom',
      instructions: `
        Standortagentur lists innovation and business events.
        Look for:
        - Event teasers or list items
        - German date format "15.01.2025"
        - Many FREE info events and workshops
        - Focus on: Innovation, Digitalization, Funding
        - Location: Various in Tirol
        - Include if no price or "Anmeldung erforderlich"
      `,
      maxChars: 20000
    }
  },

  'Impact Hub Tirol': {
    url: 'https://tirol.impacthub.net/en/collection/?_sf_tag=upcoming-events',
    active: true,
    extraction: {
      method: 'dynamic',
      instructions: `
        Impact Hub Tirol - Community innovation space

        CURRENT STATUS: Often has periods with no events listed online.
        When events are present, look for:

        HTML STRUCTURE:
        - Event cards in grid layout
        - Filter tag: ?_sf_tag=upcoming-events
        - Dynamic content loaded via JavaScript

        EVENT TYPES:
        - Community events (usually FREE)
        - Open House events (FREE)
        - Workshops (mix of free/paid)
        - Networking events
        - Social innovation meetups

        EXTRACTION:
        - Location: Always "Impact Hub Tirol, Innsbruck"
        - Language: English interface
        - Date format: "January 15, 2025" or similar
        - Only extract explicitly FREE events

        NOTE: If no events found, this is normal - they don't always have upcoming events listed.
      `,
      requiresJS: true,
      extractNotes: 'Dynamic JS site. Often has no events online. Check periodically.',
      maxChars: 20000
    }
  },

  // ================== COMMUNITY PLATFORMS ==================

  'Meetup Innsbruck': {
    url: 'https://www.meetup.com/find/at--innsbruck/',
    active: false,
    extraction: {
      method: 'api',
      apiUrl: 'https://www.meetup.com/api/recommended/events',
      instructions: `
        Meetup requires login/API access.
        Alternative: Look for public event listings.
        Most tech meetups are FREE.
        Categories: Tech, AI, Startup, Programming
        Location: Various bars/cafes in Innsbruck
      `,
      requiresAuth: true,
      maxChars: 25000
    }
  },

  'Engineering Kiosk Alps': {
    url: 'https://engineeringkiosk.dev/meetup/alps/',
    active: true,
    extraction: {
      method: 'custom',
      instructions: `
        Engineering Kiosk Alps - Tech community meetups!

        Pattern on page:
        - "Next Meetup @ ???" or venue name
        - Date: e.g. "January 15, 2026"
        - Time: "open doors at 18:30"
        - Location: Sometimes "???" if not yet determined
        - All events are FREE tech meetups

        NOTE: This page shows only ONE upcoming event at a time.
        Extract the next scheduled meetup.
      `,
      singleEventOnly: true,
      maxChars: 15000
    }
  },

  // ================== ACADEMIC ==================

  'Uni Innsbruck': {
    url: 'https://www.uibk.ac.at/events/',
    active: true,
    extraction: {
      method: 'custom',
      instructions: `
        University events page.
        Look for:
        - .event-item or article elements
        - Most uni events are FREE and public
        - Include: Lectures, Workshops, Conferences
        - Date format: "15.01.2025" or "15. Jänner"
        - Location: Various university buildings
        - Categories: Academic, Research, Science
      `,
      maxChars: 20000
    }
  },

  'MCI': {
    url: 'https://www.mci4me.at/de/events',
    active: true,
    extraction: {
      method: 'custom',
      instructions: `
        MCI Management Center Innsbruck events.
        Look for:
        - Event listings or calendar
        - Many FREE public lectures
        - Categories: Business, Technology, Entrepreneurship
        - Location: "MCI, Universitätsstraße 15"
        - Include info sessions and open events
      `,
      maxChars: 20000
    }
  },

  'FH Kufstein': {
    url: 'https://www.fh-kufstein.ac.at/service/events',
    active: true,
    extraction: {
      method: 'custom',
      instructions: `
        FH Kufstein - University events with clear HTML structure:

        HTML PATTERN (verified):
        - Container: div.cards__item
        - Date structure in div.card__head > h5:
          - Single date: <span>DD</span> <span>Month</span>
          - Date range: <span>DD</span> <span>Month</span> - <span>DD</span> <span>Month</span>
        - Title: div.card__body h5 (first h5)
        - Location: li.custom-info > p (e.g., "FH Kufstein Tirol", "Online", "Festsaal")
        - Link: a.text-decoration-none href attribute
        - Detail URL pattern: /Service/Aktuelles/Events/[event-name]

        EVENTS TO EXTRACT:
        - Open House (FREE info events)
        - Master Lounge (FREE info sessions)
        - Girls! TECH UP (FREE tech events)
        - Management Forum (public lectures)
        - Study info sessions (online)
        - 7€ Cash events (student events)

        NOTE: Most academic events are FREE and open to public
        Focus on: Tech, Business, Innovation, Education categories
      `,
      htmlPattern: 'div.cards__item',
      dateFormat: 'DD Month or DD Month - DD Month (e.g., 31 Jan or 31 Jan - 18 Apr)',
      extractNotes: 'Clear card structure. Events in div.cards__item. Date spans in h5. Many FREE academic events.',
      maxChars: 30000
    }
  },

  'LSZ': {
    url: 'https://lsz.at/',
    active: true,
    extraction: {
      method: 'custom',
      instructions: `
        Life Science Center Innsbruck.
        Look for:
        - Events section or news with event dates
        - Biotech and life science events
        - Many FREE seminars and talks
        - Location: "LSZ, Mitterweg 24"
        - Categories: Life Sciences, Biotech, Research
      `,
      maxChars: 15000
    }
  },

  // ================== CULTURAL VENUES ==================

  // 'Werkstätte Wattens': {
  //   url: 'NO EVENTS PAGE - REMOVED',
  //   active: false,
  //   extraction: {
  //     method: 'custom',
  //     instructions: 'Source removed - no events page exists',
  //     maxChars: 0
  //   }
  // },

  // 'Coworking Tirol': {
  //   url: 'DOMAIN DOES NOT EXIST - REMOVED',
  //   active: false,
  //   extraction: {
  //     method: 'custom',
  //     instructions: 'Source removed - domain does not exist',
  //     maxChars: 0
  //   }
  // },

  'Das Wundervoll': {
    url: 'https://www.daswundervoll.at/en/about-wundervoll/events',
    active: true,
    extraction: {
      method: 'custom',
      instructions: `
        Das Wundervoll cultural venue.
        Look for:
        - Event program listings
        - Mix of FREE and ticketed events
        - Include: Talks, workshops, community events
        - Location: "Das Wundervoll, Innsbruck"
        - English page version
      `,
      maxChars: 20000
    }
  },

  'Die Bäckerei': {
    url: 'https://diebaeckerei.at/programm',
    active: true,
    extraction: {
      method: 'custom',
      instructions: `
        Die Bäckerei Kulturbackstube.
        Look for:
        - Program/calendar entries
        - Many FREE cultural events
        - Categories: Culture, Art, Community, Tech
        - Location: "Die Bäckerei, Dreiheiligenstraße 21a"
        - Include: Talks, workshops, meetups
      `,
      maxChars: 20000
    }
  },

  'WeLocally Innsbruck': {
    url: 'https://innsbruck.welocally.at/region/treffen',
    active: false,
    extraction: {
      method: 'custom',
      instructions: `
        WeLocally community platform - SURFACE EXTRACTION ONLY!

        What's available on main page:
        - Event title
        - Date only (no time)
        - IMPORTANT: Capture the detail page URL for each event!

        Strategy:
        1. Extract date and title from main list
        2. ALWAYS include detailUrl to event page
        3. Set time to "00:00" if unknown
        4. Users can click through for full details

        Most are FREE community events
        German content
      `,
      surfaceOnly: true,  // Don't deep crawl - just get URLs
      maxChars: 20000
    }
  },

  'DIH West': {
    url: 'https://www.dih-west.at/events',
    active: true,
    extraction: {
      method: 'custom',
      instructions: `
        Digital Innovation Hub West.
        Look for:
        - Digital transformation events
        - FREE workshops and info sessions
        - Categories: Digital, Innovation, Industry 4.0
        - Location: Various in West Austria
        - Include online events
      `,
      maxChars: 20000
    }
  },

  // ================== LOW PRIORITY ==================

  'Innsbruck.info': {
    url: 'https://www.innsbruck.info/brauchtum-und-events/veranstaltungskalender.html',
    active: true,
    extraction: {
      method: 'custom',
      instructions: `
        Tourism website event calendar.
        Very broad - need filtering:
        - ONLY include if clearly FREE
        - Skip: Concerts, sports, paid culture
        - Include: Free festivals, public events, openings
        - Location: Innsbruck area
        - Many irrelevant events - be selective
      `,
      maxChars: 25000
    }
  },

  'Congress Messe Innsbruck': {
    url: 'https://www.cmi.at/de/veranstaltungskalender',
    active: true,
    extraction: {
      method: 'custom',
      instructions: `
        Congress and trade fair center.
        Look for:
        - Public days of trade fairs (often FREE entry)
        - Open house events
        - Most are commercial/paid - be selective
        - Location: "Messe Innsbruck"
        - Categories: Trade fair, Congress, Exhibition
      `,
      maxChars: 20000
    }
  }
};

// Helper function to get extraction config for a source
export function getSourceConfig(sourceName) {
  return SOURCE_CONFIGS[sourceName] || null;
}

// Get all active sources
export function getActiveSources() {
  return Object.entries(SOURCE_CONFIGS)
    .filter(([_, config]) => config.active)
    .map(([name, config]) => ({ name, ...config }));
}

// Get sources by extraction method
export function getSourcesByMethod(method) {
  return Object.entries(SOURCE_CONFIGS)
    .filter(([_, config]) => config.extraction.method === method)
    .map(([name, config]) => ({ name, ...config }));
}