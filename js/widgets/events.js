/**
 * KINN Events Widget
 * Displays upcoming KINN events as horizontal scrollable cards
 * Self-contained module - exposes loadKinnEventsWidget to global scope
 */

(function() {
  'use strict';

  // Thumbnail mapping for Luma event covers
  const KINN_THUMBNAILS = {
    'pxedsia6': 'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,background=white,quality=75,width=400,height=400/event-covers/h2/d7eab25e-698d-4f52-a180-574957824881.png',
    'g09qnnud': 'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,background=white,quality=75,width=400,height=400/event-covers/it/d147a818-b73e-48d4-a101-1f3dbdd3bc1b.jpg'
  };

  function getKinnThumbnail(detailUrl) {
    if (!detailUrl) return null;
    const match = detailUrl.match(/lu\.?ma\.?(?:com)?\/([a-z0-9]+)/i);
    if (match && KINN_THUMBNAILS[match[1]]) {
      return KINN_THUMBNAILS[match[1]];
    }
    return null;
  }

  async function loadKinnEventsWidget() {
    const container = document.getElementById('kinn-events-container');
    if (!container) return;

    container.innerHTML = '<div style="color: #9CA3AF; font-size: 0.875rem;">Lade Events...</div>';

    try {
      // Fetch both current year and next year to catch events around year boundary
      const currentYear = new Date().getFullYear();
      const [res1, res2] = await Promise.all([
        fetch(`/api/radar/calendar?year=${currentYear}`),
        fetch(`/api/radar/calendar?year=${currentYear + 1}`)
      ]);
      const [data1, data2] = await Promise.all([res1.json(), res2.json()]);

      // Combine days from both years
      const allDays = [...(data1.days || []), ...(data2.days || [])];

      // Filter only KINN events from today onwards
      const kinnEvents = [];
      const today = new Date().toISOString().split('T')[0];

      allDays.forEach(day => {
        if (day.date >= today) {
          day.events.forEach(event => {
            if (event.source === 'KINN') {
              kinnEvents.push({ ...event, date: day.date });
            }
          });
        }
      });

      kinnEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

      if (kinnEvents.length === 0) {
        container.innerHTML = '<div style="color: #9CA3AF; font-size: 0.875rem;">Keine kommenden KINN Events</div>';
        return;
      }

      // Render event cards
      container.innerHTML = `
        <div style="display: flex; gap: 1.25rem; overflow-x: auto; padding: 4px; margin: -4px; -webkit-overflow-scrolling: touch;">
          ${kinnEvents.map(event => {
            const eventDate = new Date(event.date);
            const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
            const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
            const dateStr = `${dayNames[eventDate.getDay()]} ${eventDate.getDate()}. ${monthNames[eventDate.getMonth()]}`;

            const thumbnailUrl = event.thumbnail || getKinnThumbnail(event.detailUrl);
            const bgStyle = thumbnailUrl
              ? `background-image: url('${thumbnailUrl}'); background-size: cover; background-position: center;`
              : `background: linear-gradient(135deg, #5ED9A6 0%, #3EB885 100%);`;

            const titleSize = event.title.length <= 12 ? '1.25rem' : event.title.length <= 20 ? '1rem' : '0.9375rem';

            return `
              <a href="${event.detailUrl || '#'}" target="_blank" rel="noopener" style="text-decoration: none; display: block; flex-shrink: 0;">
                <div style="width: 200px; position: relative; cursor: pointer; transition: transform 0.2s ease;" onmouseenter="this.style.transform='translateY(-4px)'" onmouseleave="this.style.transform='translateY(0)'">
                  <div style="width: 200px; height: 200px; border-radius: 16px; ${bgStyle} position: relative; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                    <div style="position: absolute; top: 0; right: 0; width: 80px; height: 80px; background: radial-gradient(circle at top right, rgba(0,0,0,0.55) 0%, transparent 70%);"></div>
                    <div style="position: absolute; top: 12px; right: 12px; color: white; opacity: 0.95;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M15 5l0 2" /><path d="M15 11l0 2" /><path d="M15 17l0 2" />
                        <path d="M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-3a2 2 0 0 0 0 -4v-3a2 2 0 0 1 2 -2" />
                      </svg>
                    </div>
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 14px; background: linear-gradient(transparent, rgba(0,0,0,0.8));">
                      <div style="color: white; font-size: ${titleSize}; font-weight: 600; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${event.title}</div>
                    </div>
                  </div>
                  <div style="text-align: center; margin-top: 10px; font-size: 0.8125rem; color: #6B7280;">
                    ${dateStr} · ${event.time}
                  </div>
                </div>
              </a>
            `;
          }).join('')}
        </div>
      `;

    } catch (error) {
      console.error('Error loading KINN events:', error);
      container.innerHTML = '<div style="color: #EF4444; font-size: 0.875rem;">Fehler beim Laden</div>';
    }
  }

  // Expose to global scope
  window.loadKinnEventsWidget = loadKinnEventsWidget;

})();
