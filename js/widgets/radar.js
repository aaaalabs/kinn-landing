/**
 * KINN Radar Calendar Widget
 * GitHub-style heatmap showing KI events across Tirol
 * Self-contained module - auto-initializes when loaded
 */

(function() {
  'use strict';

  let userRadarCalendarData = null;
  let userRadarView = 'calendar';
  let userRadarTooltip = null;

  // ==================== MAIN FUNCTIONS ====================

  async function loadRadarEventsWidget() {
    const widgetEl = document.getElementById('radar-calendar-widget');
    if (!widgetEl) return;

    widgetEl.style.display = 'block';
    setUserRadarView('calendar');
  }

  function setUserRadarView(view) {
    userRadarView = view;

    const calendarBtn = document.getElementById('user-radar-view-calendar');
    const listBtn = document.getElementById('user-radar-view-list');
    const calendarView = document.getElementById('user-radar-calendar-view');
    const listView = document.getElementById('user-radar-list-view');

    if (!calendarBtn || !listBtn) return;

    if (view === 'calendar') {
      calendarBtn.style.background = '#5ED9A6';
      calendarBtn.style.color = 'white';
      listBtn.style.background = 'white';
      listBtn.style.color = '#1F2937';
      calendarView.style.display = 'block';
      listView.style.display = 'none';
      loadUserRadarCalendar(2026);
    } else {
      listBtn.style.background = '#5ED9A6';
      listBtn.style.color = 'white';
      calendarBtn.style.background = 'white';
      calendarBtn.style.color = '#1F2937';
      calendarView.style.display = 'none';
      listView.style.display = 'block';
      loadUserRadarListView();
    }
  }

  // ==================== CALENDAR VIEW ====================

  async function loadUserRadarCalendar(year) {
    const gridEl = document.getElementById('user-radar-calendar-grid');
    const monthLabelsEl = document.getElementById('user-radar-month-labels');

    if (!gridEl) return;

    gridEl.innerHTML = '<div style="padding: 15px; color: #9CA3AF; font-size: 0.8rem;">Lade...</div>';

    try {
      const res = await fetch(`/api/radar/calendar?year=${year}`);
      if (!res.ok) throw new Error('Failed to load');

      userRadarCalendarData = await res.json();
      renderUserRadarCalendar(userRadarCalendarData);
    } catch (error) {
      console.error('Error loading radar calendar:', error);
      gridEl.innerHTML = '<div style="padding: 15px; color: #ef4444; font-size: 0.8rem;">Fehler</div>';
    }
  }

  function renderUserRadarCalendar(data) {
    const gridEl = document.getElementById('user-radar-calendar-grid');
    const monthLabelsEl = document.getElementById('user-radar-month-labels');
    const legendEl = document.getElementById('user-radar-calendar-legend');
    const detailEl = document.getElementById('user-radar-day-detail');

    if (!gridEl || !monthLabelsEl) return;

    const dayLookup = {};
    data.days.forEach(day => { dayLookup[day.date] = day.events; });

    // Month labels
    const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    let lastShownMonth = -1;
    let monthHtml = '';

    data.weeks.forEach((week) => {
      const inYearDay = week.days.find(d => d.isInYear);
      if (!inYearDay) {
        monthHtml += `<span style="width: 18px; min-width: 18px; flex-shrink: 0;"></span>`;
        return;
      }

      const weekMonth = new Date(inYearDay.date).getMonth();

      if (weekMonth !== lastShownMonth) {
        monthHtml += `<span style="width: 18px; min-width: 18px; flex-shrink: 0; font-size: 9px; overflow: visible;">${monthNames[weekMonth]}</span>`;
        lastShownMonth = weekMonth;
      } else {
        monthHtml += `<span style="width: 18px; min-width: 18px; flex-shrink: 0;"></span>`;
      }
    });
    monthLabelsEl.innerHTML = monthHtml;

    // Grid
    let gridHtml = '';
    data.weeks.forEach(week => {
      let weekHtml = '<div style="display: flex; flex-direction: column; gap: 3px;">';
      week.days.forEach(day => {
        const events = dayLookup[day.date] || [];
        const hasEvents = events.length > 0;
        let bg = day.isInYear ? '#E5E7EB' : '#F3F4F6';
        if (hasEvents) bg = events[0].sourceColor || '#5ED9A6';

        const tooltipData = hasEvents ? JSON.stringify({ date: day.date, events: events.map(e => ({ title: e.title, source: e.source, sourceColor: e.sourceColor, time: e.time, location: e.location, detailUrl: e.detailUrl })) }).replace(/"/g, '&quot;') : '';

        weekHtml += `<div style="width: 18px; height: 18px; border-radius: 3px; background: ${bg}; cursor: ${hasEvents ? 'pointer' : 'default'};" data-date="${day.date}" data-events="${tooltipData}" ${hasEvents ? `onclick="showUserRadarDayDetail(this)"` : ''} onmouseenter="showUserRadarTooltip(event, this)" onmouseleave="hideUserRadarTooltip()"></div>`;
      });
      weekHtml += '</div>';
      gridHtml += weekHtml;
    });
    gridEl.innerHTML = gridHtml;

    // Legend
    let legendHtml = '';
    Object.entries(data.bySource).forEach(([source, count]) => {
      if (count > 0) {
        const color = data.sourceColors[source] || '#9CA3AF';
        legendHtml += `<span style="display: flex; align-items: center; gap: 3px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></span>${source} (${count})</span>`;
      }
    });
    legendEl.innerHTML = legendHtml || `<span style="color: #9CA3AF;">Keine Events</span>`;
    if (detailEl) detailEl.style.display = 'none';
  }

  // ==================== LIST VIEW ====================

  async function loadUserRadarListView() {
    const contentEl = document.getElementById('user-radar-list-content');
    if (!contentEl) return;

    contentEl.innerHTML = '<div style="padding: 15px; color: #9CA3AF; text-align: center; font-size: 0.8rem;">Lade...</div>';

    try {
      const [res1, res2] = await Promise.all([
        fetch('/api/radar/calendar?year=' + new Date().getFullYear()),
        fetch('/api/radar/calendar?year=' + (new Date().getFullYear() + 1))
      ]);
      const data1 = await res1.json();
      const data2 = await res2.json();

      const allEvents = [];
      const today = new Date().toISOString().split('T')[0];

      [...(data1.days || []), ...(data2.days || [])].forEach(day => {
        if (day.date >= today) {
          day.events.forEach(event => allEvents.push({ ...event, date: day.date }));
        }
      });

      allEvents.sort((a, b) => a.date !== b.date ? a.date.localeCompare(b.date) : (a.time || '').localeCompare(b.time || ''));
      renderUserRadarListView(allEvents);
    } catch (error) {
      contentEl.innerHTML = '<div style="padding: 15px; color: #ef4444; text-align: center; font-size: 0.8rem;">Fehler</div>';
    }
  }

  function renderUserRadarListView(events) {
    const contentEl = document.getElementById('user-radar-list-content');
    if (events.length === 0) {
      contentEl.innerHTML = '<div style="padding: 30px; color: #9CA3AF; text-align: center; font-size: 0.8rem;">Keine kommenden Events</div>';
      return;
    }

    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    let currentMonth = '';
    let html = '';

    events.forEach((event, idx) => {
      const date = new Date(event.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

      if (monthKey !== currentMonth) {
        currentMonth = monthKey;
        html += `<div style="font-size: 0.7rem; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; padding: 10px 0 5px; ${idx > 0 ? 'border-top: 1px solid #e5e7eb; margin-top: 6px;' : ''}">${monthNames[date.getMonth()]} ${date.getFullYear()}</div>`;
      }

      const dayLabel = `${dayNames[date.getDay()]}, ${date.getDate()}.`;
      const isToday = event.date === new Date().toISOString().split('T')[0];

      html += `<div style="display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f3f4f6; ${isToday ? 'background: #f0fdf4; margin: 0 -6px; padding-left: 6px; padding-right: 6px; border-radius: 4px;' : ''}">
        <div style="width: 45px; flex-shrink: 0; text-align: right;">
          <div style="font-size: 0.75rem; font-weight: 500; color: ${isToday ? '#16a34a' : '#1F2937'};">${isToday ? 'Heute' : dayLabel}</div>
          <div style="font-size: 0.65rem; color: #9CA3AF;">${event.time || ''}</div>
        </div>
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${event.sourceColor}; margin-top: 4px; flex-shrink: 0;"></div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 500; color: #1F2937; font-size: 0.8rem; line-height: 1.3;">${event.title}</div>
          <div style="font-size: 0.7rem; color: #6B7280; margin-top: 1px;">${event.location} <span style="color: #9CA3AF;">${event.source}</span></div>
        </div>
        ${event.detailUrl ? `<a href="${event.detailUrl}" target="_blank" style="color: #5ED9A6; text-decoration: none; font-size: 1rem; flex-shrink: 0;">→</a>` : ''}
      </div>`;
    });

    html += `<div style="padding: 10px 0; text-align: center; font-size: 0.7rem; color: #9CA3AF;">${events.length} kommende Events</div>`;
    contentEl.innerHTML = html;
  }

  // ==================== TOOLTIP & DAY DETAIL ====================

  function showUserRadarTooltip(event, cell) {
    const tooltipData = cell.getAttribute('data-events');
    if (!tooltipData) return;

    let data;
    try {
      data = JSON.parse(tooltipData.replace(/&quot;/g, '"'));
    } catch (e) {
      return;
    }

    const date = new Date(data.date);
    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

    if (!userRadarTooltip) {
      userRadarTooltip = document.createElement('div');
      userRadarTooltip.style.cssText = 'position: fixed; background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-size: 11px; z-index: 1000; pointer-events: none; max-width: 180px;';
      document.body.appendChild(userRadarTooltip);
    }

    const dots = data.events.map(e => `<span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${e.sourceColor};"></span>`).join(' ');
    userRadarTooltip.innerHTML = `<div style="font-weight: 500; margin-bottom: 3px;">${dayNames[date.getDay()]}, ${date.getDate()}. ${monthNames[date.getMonth()]}</div><div style="display: flex; gap: 3px; margin-bottom: 2px;">${dots}</div><div style="color: #6B7280;">${data.events.length} Event${data.events.length > 1 ? 's' : ''}</div>`;

    const rect = cell.getBoundingClientRect();
    userRadarTooltip.style.left = `${rect.left + rect.width / 2 - 50}px`;
    userRadarTooltip.style.top = `${rect.top - 60}px`;
    userRadarTooltip.style.display = 'block';
  }

  function hideUserRadarTooltip() {
    if (userRadarTooltip) userRadarTooltip.style.display = 'none';
  }

  function showUserRadarDayDetail(element) {
    const eventsData = element.getAttribute('data-events');
    if (!eventsData) return;

    let data;
    try {
      data = JSON.parse(eventsData.replace(/&quot;/g, '"'));
    } catch (e) {
      console.error('Failed to parse events data:', e);
      return;
    }

    const detailEl = document.getElementById('user-radar-day-detail');
    if (!detailEl) return;

    const date = new Date(data.date);
    const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

    let eventsHtml = data.events.map(e => `<div style="display: flex; align-items: flex-start; gap: 8px; padding: 6px 0; border-bottom: 1px solid #e5e7eb;">
      <span style="width: 8px; height: 8px; border-radius: 50%; background: ${e.sourceColor}; margin-top: 4px; flex-shrink: 0;"></span>
      <div style="flex: 1;"><div style="font-weight: 500; color: #1F2937; font-size: 0.8rem;">${e.title}</div><div style="font-size: 0.75rem; color: #6B7280;">${e.time} · ${e.location} <span style="color: #9CA3AF;">${e.source}</span></div></div>
      ${e.detailUrl ? `<a href="${e.detailUrl}" target="_blank" style="color: #5ED9A6; text-decoration: none;">→</a>` : ''}
    </div>`).join('');

    detailEl.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;"><h4 style="margin: 0; font-size: 0.8rem; font-weight: 600;">${dayNames[date.getDay()]}, ${date.getDate()}. ${monthNames[date.getMonth()]}</h4><button onclick="document.getElementById('user-radar-day-detail').style.display='none'" style="background: none; border: none; cursor: pointer; color: #9CA3AF; font-size: 1rem;">&times;</button></div>${eventsHtml}`;
    detailEl.style.display = 'block';
  }

  // ==================== CALENDAR SUBSCRIBE ====================

  /**
   * Subscribe to RADAR calendar (ALL approved KI Events in Tirol)
   * Smart Calendar Subscription with Visual Feedback
   * Priority-based device detection:
   * - Chrome (any OS) → Google Calendar add URL
   * - Safari (iOS/Mac) → webcal:// protocol
   * - Other → .ics download with instructions
   */
  function subscribeToRadarCalendar(event) {
    const button = event?.target?.closest('button') || event?.currentTarget;
    const refreshId = Date.now();
    const icsUrl = `https://kinn.at/api/radar/calendar.ics#${refreshId}`;
    const userAgent = navigator.userAgent.toLowerCase();

    const isChrome = /chrome|chromium|crios/.test(userAgent) && !/edg/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !isChrome;
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isMac = /macintosh|mac os x/.test(userAgent);

    console.log('[RADAR-CALENDAR] Subscribing to radar feed with refresh ID:', refreshId);

    if (button) {
      button.disabled = true;
      button.style.opacity = '0.5';
    }

    const resetButton = () => {
      if (button) {
        button.disabled = false;
        button.style.opacity = '1';
      }
    };

    // Priority 1: Chrome → Google Calendar
    if (isChrome) {
      const webcalUrl = icsUrl.replace('https://', 'webcal://');
      const googleCalUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`;
      console.log('[RADAR-CALENDAR] Opening Google Calendar with cache-busting URL');

      const newWindow = window.open(googleCalUrl, '_blank');

      setTimeout(() => {
        resetButton();
        if (!newWindow || newWindow.closed) {
          alert('Popup wurde blockiert! Bitte erlaube Popups für diese Seite.');
        }
      }, 2000);
      return;
    }

    // Priority 2: Safari on iOS/macOS → webcal://
    if (isSafari && (isIOS || isMac)) {
      console.log('[RADAR-CALENDAR] Opening webcal:// for Safari');
      window.location.href = icsUrl.replace('https://', 'webcal://');
      setTimeout(resetButton, 3000);
      return;
    }

    // Priority 3: Download .ics
    console.log('[RADAR-CALENDAR] Downloading .ics file');
    const link = document.createElement('a');
    link.href = icsUrl;
    link.download = 'kinn-radar-events.ics';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(resetButton, 1500);
  }

  // ==================== EXPOSE TO GLOBAL SCOPE ====================

  window.loadRadarEventsWidget = loadRadarEventsWidget;
  window.setUserRadarView = setUserRadarView;
  window.showUserRadarTooltip = showUserRadarTooltip;
  window.hideUserRadarTooltip = hideUserRadarTooltip;
  window.showUserRadarDayDetail = showUserRadarDayDetail;
  window.subscribeToRadarCalendar = subscribeToRadarCalendar;

})();
