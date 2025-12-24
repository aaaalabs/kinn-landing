/**
 * RAUS Widget - Use Case Submission for KI Praxis Report Tirol 2026
 *
 * Usage: Include this script, then call openRAUSModal()
 * Requires: userEmail global variable for submission tracking
 */

// Icons
const rausIcons = {
  mic: '<svg class="icon" style="width:24px;height:24px;stroke:currentColor;stroke-width:2;fill:none;" viewBox="0 0 24 24"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 2m0 3a3 3 0 0 1 3 -3h0a3 3 0 0 1 3 3v5a3 3 0 0 1 -3 3h0a3 3 0 0 1 -3 -3z"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M8 21l8 0"/><path d="M12 17l0 4"/></svg>',
  stop: '<svg class="icon" style="width:24px;height:24px;stroke:currentColor;stroke-width:2;fill:none;" viewBox="0 0 24 24"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 5m0 2a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z" fill="currentColor"/></svg>',
  sparkles: '<svg class="icon" style="width:24px;height:24px;stroke:currentColor;stroke-width:2;fill:none;" viewBox="0 0 24 24"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z"/></svg>',
  confetti: '<svg class="icon" style="width:64px;height:64px;stroke:currentColor;stroke-width:2;fill:none;" viewBox="0 0 24 24"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 5h2"/><path d="M5 4v2"/><path d="M11.5 4l-.5 2"/><path d="M18 5h2"/><path d="M19 4v2"/><path d="M15 9l-1 1"/><path d="M18 13l2 -.5"/><path d="M18 19h2"/><path d="M19 18v2"/><path d="M14 16.518l-6.518 -6.518l-4.39 9.58a1 1 0 0 0 1.329 1.329l9.579 -4.39z"/></svg>',
  alertTriangle: '<svg style="width:14px;height:14px;stroke:currentColor;stroke-width:2;fill:none;" viewBox="0 0 24 24"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 9v4"/><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z"/><path d="M12 16h.01"/></svg>'
};

const RAUS_AI_PROMPT = `Beschreib meinen KI Use Case für den "KI Praxis Report Tirol 2026":

1. Was war das Problem vorher?
2. Wie funktioniert meine KI-Lösung?
3. Was hat sich messbar verbessert?
4. Welche Tools nutze ich?

Antworte in 2-3 Sätzen pro Punkt.`;

// State
let rausState = {
  step: 'intro',
  inputMode: null,
  isRecording: false,
  recordingTime: 0,
  textInput: '',
  transcript: null,
  extracted: null,
  error: null,
  processingStep: 0,
  voiceConsent: false,
  privacyConsent: false
};

let rausMediaRecorder = null;
let rausAudioChunks = [];
let rausRecordingInterval = null;

// Modal Functions
function openRAUSModal() {
  rausState = {
    step: 'intro',
    inputMode: null,
    isRecording: false,
    recordingTime: 0,
    textInput: '',
    transcript: null,
    extracted: null,
    error: null,
    processingStep: 0,
    voiceConsent: false,
    privacyConsent: false
  };
  const modal = document.getElementById('rausModalOverlay');
  modal.style.display = 'flex';
  modal.classList.add('active');
  renderRAUS();
}

function closeRAUSModal() {
  const modal = document.getElementById('rausModalOverlay');
  modal.style.display = 'none';
  modal.classList.remove('active');
  stopRAUSRecording();
}

function setRAUSStep(step) {
  rausState.step = step;
  renderRAUS();
}

function selectRAUSInputMode(mode) {
  rausState.inputMode = mode;
  setRAUSStep(mode);
}

// Voice Recording
async function startRAUSRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    rausMediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    rausAudioChunks = [];

    rausMediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) rausAudioChunks.push(e.data);
    };

    rausMediaRecorder.onstop = () => {
      const audioBlob = new Blob(rausAudioChunks, { type: 'audio/webm' });
      processRAUSAudio(audioBlob);
    };

    rausMediaRecorder.start();
    rausState.isRecording = true;
    rausState.recordingTime = 0;
    rausRecordingInterval = setInterval(() => {
      rausState.recordingTime++;
      const timerEl = document.getElementById('rausRecordTimer');
      if (timerEl) timerEl.textContent = formatRAUSTime(rausState.recordingTime);
    }, 1000);
    renderRAUS();

  } catch (err) {
    rausState.error = 'Mikrofon-Zugriff verweigert: ' + err.message;
    renderRAUS();
  }
}

function stopRAUSRecording() {
  if (rausMediaRecorder && rausState.isRecording) {
    rausMediaRecorder.stop();
    rausMediaRecorder.stream.getTracks().forEach(t => t.stop());
    rausState.isRecording = false;
    clearInterval(rausRecordingInterval);
    rausRecordingInterval = null;
  }
}

function toggleRAUSRecordingWithConsent() {
  if (!rausState.voiceConsent && !rausState.isRecording) {
    const checkbox = document.getElementById('rausVoiceConsent');
    if (checkbox) {
      checkbox.parentElement.style.animation = 'shake 0.3s ease';
      setTimeout(() => checkbox.parentElement.style.animation = '', 300);
    }
    return;
  }
  if (rausState.isRecording) {
    stopRAUSRecording();
  } else {
    startRAUSRecording();
  }
}

// Processing
async function processRAUSAudio(audioBlob) {
  rausState.step = 'processing';
  rausState.processingStep = 1;
  rausState.error = null;
  renderRAUS();

  try {
    rausState.processingStep = 2;
    renderRAUS();

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    const response = await fetch('/api/raus/process-voice', { method: 'POST', body: formData });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Verarbeitung fehlgeschlagen');
    }
    const result = await response.json();
    rausState.transcript = result.transcript;
    rausState.extracted = result.extracted;

    rausState.processingStep = 3;
    renderRAUS();
    await new Promise(r => setTimeout(r, 300));
    setRAUSStep('review');

  } catch (err) {
    console.error(err);
    rausState.error = err.message;
    renderRAUS();
  }
}

async function processRAUSTextFromIntro() {
  rausState.inputMode = 'text';
  await processRAUSText();
}

async function processRAUSText() {
  const textarea = document.getElementById('rausTextInput');
  if (textarea) rausState.textInput = textarea.value;

  if (rausState.textInput.length < 20) {
    alert('Bitte mindestens 20 Zeichen eingeben.');
    return;
  }

  rausState.step = 'processing';
  rausState.processingStep = 1;
  rausState.transcript = rausState.textInput;
  rausState.error = null;
  renderRAUS();

  try {
    rausState.processingStep = 3;
    renderRAUS();

    const response = await fetch('/api/raus/process-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: rausState.textInput })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Extraktion fehlgeschlagen');
    }
    const result = await response.json();
    rausState.extracted = result.extracted;

    await new Promise(r => setTimeout(r, 300));
    setRAUSStep('review');

  } catch (err) {
    console.error(err);
    rausState.error = err.message;
    renderRAUS();
  }
}

// Helpers
function formatRAUSTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function copyRAUSPrompt() {
  try {
    await navigator.clipboard.writeText(RAUS_AI_PROMPT);
    const box = document.querySelector('.raus-prompt-box');
    const text = box.querySelector('.raus-prompt-text');
    box.classList.add('copied');
    text.textContent = 'Kopiert!';
    setTimeout(() => {
      box.classList.remove('copied');
      text.textContent = 'Prompt kopieren';
    }, 2000);
  } catch (err) {
    console.error('Copy failed:', err);
  }
}

function updateRAUSCharCount() {
  const len = rausState.textInput.length;
  const indicator = document.getElementById('rausCharIndicator');
  if (indicator) {
    indicator.className = 'raus-char-indicator ' + (len >= 20 ? 'good' : '');
    const rightText = len > 500 ? `~${Math.round(len / 4)} tokens` : `${len} Zeichen`;
    indicator.innerHTML = `<span>${len >= 20 ? 'Bereit' : 'Mind. 20 Zeichen'}</span><span>${rightText}</span>`;
  }
}

async function submitRAUSCase() {
  // Check privacy consent first
  if (!rausState.privacyConsent) {
    const checkbox = document.getElementById('rausPrivacyConsent');
    if (checkbox) {
      checkbox.parentElement.style.color = '#dc2626';
      checkbox.focus();
      setTimeout(() => { checkbox.parentElement.style.color = '#6B6B6B'; }, 2000);
    }
    return;
  }

  // Start with state data (already updated by makeRAUSEditable)
  const data = { ...rausState.extracted };

  // Override with any visible input values (for missing fields that user filled in)
  ['headline', 'problem', 'solution', 'result', 'tools'].forEach(key => {
    const input = document.getElementById(`raus-input-${key}`);
    // Only use input if it's a visible input (not hidden) and has value
    if (input && input.type !== 'hidden' && input.value?.trim()) {
      data[key] = key === 'tools' ? input.value.split(',').map(t => t.trim()) : input.value.trim();
    }
  });

  if (!data.solution || !data.result) {
    document.querySelectorAll('.raus-review-card.missing .raus-review-card-input').forEach(el => {
      if (!el.value?.trim()) {
        el.style.borderColor = '#ef4444';
        el.style.animation = 'shake 0.3s ease';
      }
    });
    return;
  }

  rausState.extracted = data;
  rausState.region = document.getElementById('raus-select-region')?.value || 'tirol';
  rausState.visibility = document.getElementById('raus-select-visibility')?.value || 'full';

  try {
    const response = await fetch('/api/raus/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        extracted: rausState.extracted,
        transcript: rausState.transcript,
        region: rausState.region,
        visibility: rausState.visibility,
        inputMode: rausState.inputMode,
        userEmail: typeof userEmail !== 'undefined' ? userEmail : null
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Einreichung fehlgeschlagen');
    }

    setRAUSStep('success');
  } catch (err) {
    console.error('Submit error:', err);
    rausState.error = err.message;
    renderRAUS();
  }
}

// Renderers
function renderRAUSIntro() {
  return `
    <div style="animation: fadeIn 0.3s ease-out;">
      <div style="font-size: 0.75rem; color: #999; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 0.5rem;">KI Praxis Report Tirol 2026</div>
      <h1 style="font-size: 1.125rem; font-weight: 600; color: #2C3E50; margin-bottom: 0.5rem;">Teile deinen Use Case</h1>
      <p style="font-size: 0.875rem; color: #6B6B6B; margin-bottom: 1.25rem;">Frag deine KI und kopier die Antwort hier rein.</p>

      <div class="raus-prompt-box" onclick="copyRAUSPrompt()" style="background: linear-gradient(135deg, rgba(94,217,166,0.08) 0%, rgba(94,217,166,0.02) 100%); border: 1px solid rgba(94,217,166,0.3); border-radius: 0.75rem; padding: 1rem; cursor: pointer; margin-bottom: 1rem; transition: all 0.2s;">
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
          <span style="color: #5ED9A6;">${rausIcons.sparkles}</span>
          <span class="raus-prompt-text" style="font-weight: 600; color: #2C3E50; font-size: 0.875rem;">Prompt kopieren</span>
        </div>
        <div style="font-size: 0.75rem; color: #6B6B6B;">Problem - Lösung - Ergebnis - Tools</div>
      </div>

      <div style="margin-bottom: 1rem;">
        <textarea id="rausTextInput" placeholder="Antwort hier einfügen..." oninput="rausState.textInput = this.value; updateRAUSCharCount();" onpaste="setTimeout(() => { rausState.textInput = this.value; updateRAUSCharCount(); }, 0)" style="width: 100%; min-height: 120px; padding: 0.875rem; border: 1px solid rgba(0,0,0,0.12); border-radius: 0.5rem; font-family: inherit; font-size: 0.875rem; resize: vertical; background: rgba(255,255,255,0.8);">${rausState.textInput}</textarea>
        <div id="rausCharIndicator" class="raus-char-indicator ${rausState.textInput.length >= 20 ? 'good' : ''}" style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #999; margin-top: 0.5rem;">
          <span>${rausState.textInput.length >= 20 ? 'Bereit' : 'Mind. 20 Zeichen'}</span>
          <span>${rausState.textInput.length} Zeichen</span>
        </div>
      </div>

      <div style="display: flex; gap: 0.75rem;">
        <button onclick="processRAUSTextFromIntro()" class="cta-button" style="flex: 1; padding: 0.75rem 1.25rem; font-size: 0.875rem;">Analysieren lassen</button>
        <button onclick="selectRAUSInputMode('voice')" style="background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 0.5rem; color: #6B6B6B; font-size: 0.875rem; cursor: pointer; padding: 0.75rem 1.25rem; font-family: inherit; white-space: nowrap; transition: all 0.15s ease;" onmouseenter="this.style.borderColor='rgba(0,0,0,0.15)'" onmouseleave="this.style.borderColor='rgba(0,0,0,0.08)'">Sprechen</button>
      </div>
    </div>
  `;
}

function renderRAUSVoice() {
  const consentGiven = rausState.voiceConsent;
  return `
    <div style="animation: fadeIn 0.3s ease-out;">
      <h1 style="font-size: 1.125rem; font-weight: 600; color: #2C3E50; margin-bottom: 0.5rem;">Sprich deinen Use Case ein</h1>
      <p style="font-size: 0.875rem; color: #6B6B6B; margin-bottom: 1.25rem;">Problem, Lösung, Ergebnis, Tools - 2 Minuten reichen.</p>

      <div style="text-align: center; padding: 2rem 0;">
        <button onclick="toggleRAUSRecordingWithConsent()" style="width: 80px; height: 80px; border-radius: 50%; border: none; background: ${rausState.isRecording ? '#ef4444' : consentGiven ? '#5ED9A6' : '#c8ece0'}; color: ${rausState.isRecording ? '#fff' : '#000'}; cursor: ${consentGiven || rausState.isRecording ? 'pointer' : 'not-allowed'}; display: flex; align-items: center; justify-content: center; margin: 0 auto; transition: all 0.2s;">
          ${rausState.isRecording ? rausIcons.stop : rausIcons.mic}
        </button>
        <div id="rausRecordTimer" style="font-size: 1.5rem; font-weight: 600; color: #2C3E50; margin-top: 1rem;">${formatRAUSTime(rausState.recordingTime)}</div>
        <div style="font-size: 0.75rem; color: #999; margin-top: 0.25rem;">${rausState.isRecording ? 'Klick zum Beenden' : 'Klick zum Starten'}</div>
      </div>

      <label style="display: flex; align-items: flex-start; gap: 0.625rem; font-size: 0.8125rem; color: #6B6B6B; margin: 1rem 0; cursor: pointer;">
        <span style="width: 18px; height: 18px; border: 1.5px solid ${consentGiven ? '#5ED9A6' : 'rgba(0,0,0,0.2)'}; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: ${consentGiven ? '#5ED9A6' : 'white'}; transition: all 0.15s ease; flex-shrink: 0; margin-top: 1px;">
          ${consentGiven ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
        </span>
        <input type="checkbox" id="rausVoiceConsent" onchange="rausState.voiceConsent = this.checked; renderRAUS();" ${consentGiven ? 'checked' : ''} style="display: none;">
        <span>Audio wird durch AssemblyAI (USA) transkribiert und innerhalb 24h gelöscht. <a href="/pages/privacy.html#3.4" target="_blank" style="color: #5ED9A6; text-decoration: none;">Details</a></span>
      </label>

      ${rausState.error ? `<div style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 1rem; border-radius: 0.5rem; margin-top: 1rem; font-size: 0.875rem;">${rausState.error}</div>` : ''}

      <button onclick="setRAUSStep('intro')" style="background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 0.5rem; color: #6B6B6B; font-size: 0.875rem; cursor: pointer; padding: 0.75rem 1.25rem; font-family: inherit; margin-top: 1rem; transition: all 0.15s ease;" onmouseenter="this.style.borderColor='rgba(0,0,0,0.15)'" onmouseleave="this.style.borderColor='rgba(0,0,0,0.08)'">Zurück zum Text</button>
    </div>
  `;
}

function renderRAUSProcessing() {
  const steps = [
    { label: rausState.inputMode === 'voice' ? 'Audio hochladen' : 'Text empfangen', done: rausState.processingStep >= 1 },
    { label: 'Transkribieren...', done: rausState.processingStep >= 2, active: rausState.processingStep === 2, skip: rausState.inputMode === 'text' },
    { label: 'KI extrahiert Struktur...', done: rausState.processingStep >= 3, active: rausState.processingStep === 3 }
  ].filter(s => !s.skip);

  return `
    <div style="animation: fadeIn 0.3s ease-out; text-align: center; padding: 2rem 0;">
      <div style="width: 48px; height: 48px; border: 3px solid rgba(94,217,166,0.3); border-top-color: #5ED9A6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1.5rem;"></div>
      <h1 style="font-size: 1.125rem; font-weight: 600; color: #2C3E50; margin-bottom: 1.5rem;">KI analysiert deinen Input...</h1>

      <div style="text-align: left; max-width: 280px; margin: 0 auto;">
        ${steps.map(s => `
          <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0; font-size: 0.875rem; color: ${s.done ? '#059669' : s.active ? '#2C3E50' : '#6B6B6B'}; ${s.active ? 'font-weight: 500;' : ''}">
            <span style="width: 20px; text-align: center;">${s.done ? 'OK' : s.active ? '...' : 'o'}</span>
            <span>${s.label}</span>
          </div>
        `).join('')}
      </div>

      ${rausState.error ? `<div style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 1rem; border-radius: 0.5rem; margin-top: 1rem; font-size: 0.875rem;">${rausState.error}</div>` : ''}
    </div>
    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
  `;
}

function renderRAUSReview() {
  const data = rausState.extracted || {};
  const hasMissing = !data.solution || !data.result;

  const renderCard = (key, label, placeholder, isTextarea = false) => {
    const value = data[key] || '';
    const isMissing = !value;

    // Missing: show input with warning border
    // Filled: show as text, clicking replaces with input
    if (isMissing) {
      return `
        <div class="raus-review-card missing" style="background: rgba(251,191,36,0.06); border: 1px solid rgba(251,191,36,0.25); border-radius: 0.375rem; padding: 0.5rem 0.625rem; margin-bottom: 0.5rem;">
          <div style="font-size: 0.625rem; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 0.25rem;">
            ${label} <span style="color: #d97706;">${rausIcons.alertTriangle}</span>
          </div>
          ${isTextarea
            ? `<textarea class="raus-review-card-input" placeholder="${placeholder}" id="raus-input-${key}" style="width: 100%; min-height: 40px; padding: 0.375rem 0.5rem; border: 1px solid rgba(251,191,36,0.4); border-radius: 0.25rem; font-family: inherit; font-size: 0.8125rem; resize: vertical; color: #2C3E50; line-height: 1.4;"></textarea>`
            : `<input type="text" class="raus-review-card-input" placeholder="${placeholder}" id="raus-input-${key}" style="width: 100%; padding: 0.375rem 0.5rem; border: 1px solid rgba(251,191,36,0.4); border-radius: 0.25rem; font-family: inherit; font-size: 0.8125rem; color: #2C3E50;">`}
        </div>
      `;
    }

    // Filled: show as editable text span (click to edit)
    return `
      <div class="raus-review-card" style="border-radius: 0.375rem; padding: 0.375rem 0.5rem; margin-bottom: 0.375rem;">
        <div style="display: flex; align-items: baseline; gap: 0.5rem;">
          <span style="font-size: 0.625rem; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.03em; white-space: nowrap;">${label}</span>
          <span class="raus-editable" data-key="${key}" data-textarea="${isTextarea}" onclick="makeRAUSEditable(this)" style="flex: 1; font-size: 0.8125rem; color: #2C3E50; cursor: text; padding: 0.125rem 0; border-bottom: 1px dashed transparent; ${key === 'headline' ? 'font-weight: 600;' : ''}" onmouseenter="this.style.borderColor='rgba(0,0,0,0.15)'" onmouseleave="this.style.borderColor='transparent'">${value}</span>
        </div>
        <input type="hidden" id="raus-input-${key}" value="${value.replace(/"/g, '&quot;')}">
      </div>
    `;
  };

  return `
    <div style="animation: fadeIn 0.3s ease-out;">
      <div style="margin-bottom: 0.75rem;">
        <div style="font-size: 0.6875rem; color: #999; text-transform: uppercase; letter-spacing: 0.03em;">Review</div>
        <div style="font-size: 0.9375rem; font-weight: 600; color: #2C3E50;">${hasMissing ? 'Details ergänzen' : 'Passt das?'}</div>
      </div>

      <div style="margin-bottom: 0.75rem;">
        ${renderCard('headline', 'Headline', 'Use Case in einem Satz...')}
        ${renderCard('problem', 'Problem', 'Was war das Problem vorher?', true)}
        ${renderCard('solution', 'Lösung', 'Wie funktioniert die KI-Lösung?', true)}
        ${renderCard('result', 'Ergebnis', 'Was hat sich messbar verbessert?', true)}

        <div class="raus-review-card ${!data.tools?.length ? 'missing' : ''}" style="background: ${!data.tools?.length ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.5)'}; border: 1px solid ${!data.tools?.length ? 'rgba(251,191,36,0.25)' : 'rgba(0,0,0,0.04)'}; border-radius: 0.375rem; padding: 0.5rem 0.625rem;">
          <div style="font-size: 0.625rem; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 0.25rem;">Tools ${!data.tools?.length ? '<span style="color: #d97706;">' + rausIcons.alertTriangle + '</span>' : ''}</div>
          ${data.tools?.length
            ? `<span class="raus-editable" data-key="tools" onclick="makeRAUSEditable(this)" style="font-size: 0.8125rem; color: #2C3E50; cursor: text; padding: 0.125rem 0; border-bottom: 1px dashed transparent;" onmouseenter="this.style.borderColor='rgba(0,0,0,0.15)'" onmouseleave="this.style.borderColor='transparent'">${data.tools.join(', ')}</span><input type="hidden" id="raus-input-tools" value="${data.tools.join(', ')}">`
            : `<input type="text" class="raus-review-card-input" placeholder="z.B. Claude, GPT-4..." id="raus-input-tools" style="width: 100%; padding: 0.375rem 0.5rem; border: 1px solid rgba(251,191,36,0.4); border-radius: 0.25rem; font-family: inherit; font-size: 0.8125rem;">`}
        </div>
      </div>

      <div style="display: flex; gap: 0.75rem; margin-bottom: 1rem;">
        <select id="raus-select-region" style="flex: 1; padding: 0.625rem 0.75rem; border: 1px solid rgba(0,0,0,0.08); border-radius: 0.5rem; font-family: inherit; font-size: 0.875rem; background: white; cursor: pointer; color: #2C3E50;">
          <option value="tirol" selected>Tirol</option>
          <option value="austria">Österreich</option>
          <option value="dach">DACH</option>
        </select>
        <select id="raus-select-visibility" style="flex: 1; padding: 0.625rem 0.75rem; border: 1px solid rgba(0,0,0,0.08); border-radius: 0.5rem; font-family: inherit; font-size: 0.875rem; background: white; cursor: pointer; color: #2C3E50;">
          <option value="full" selected>Öffentlich</option>
          <option value="anon">Anonymisiert</option>
          <option value="report">Nur Report</option>
        </select>
      </div>

      <label style="display: flex; align-items: center; gap: 0.625rem; font-size: 0.8125rem; color: #6B6B6B; cursor: pointer; margin-bottom: 1rem;">
        <span style="width: 18px; height: 18px; border: 1.5px solid ${rausState.privacyConsent ? '#5ED9A6' : 'rgba(0,0,0,0.2)'}; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: ${rausState.privacyConsent ? '#5ED9A6' : 'white'}; transition: all 0.15s ease; flex-shrink: 0;">
          ${rausState.privacyConsent ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
        </span>
        <input type="checkbox" id="rausPrivacyConsent" onchange="rausState.privacyConsent = this.checked; renderRAUS();" ${rausState.privacyConsent ? 'checked' : ''} style="display: none;">
        <span>Ich akzeptiere die <a href="/pages/privacy.html" target="_blank" style="color: #5ED9A6; text-decoration: none;">Datenschutzbestimmungen</a></span>
      </label>

      <div style="display: flex; gap: 0.75rem;">
        <button onclick="setRAUSStep('${rausState.inputMode || 'intro'}')" style="background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 0.5rem; color: #6B6B6B; font-size: 0.875rem; cursor: pointer; padding: 0.75rem 1.25rem; font-family: inherit; transition: all 0.15s ease;" onmouseenter="this.style.borderColor='rgba(0,0,0,0.15)'" onmouseleave="this.style.borderColor='rgba(0,0,0,0.08)'">Zurück</button>
        <button onclick="submitRAUSCase()" class="cta-button" style="flex: 1; padding: 0.75rem 1.25rem; font-size: 0.875rem; transition: all 0.15s ease; ${!rausState.privacyConsent ? 'background: #c8ece0; cursor: not-allowed;' : ''}">Einreichen</button>
      </div>
    </div>
    <style>@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }</style>
  `;
}

function renderRAUSSuccess() {
  return `
    <div style="animation: fadeIn 0.3s ease-out; text-align: center; padding: 2rem 0;">
      <div style="color: #5ED9A6; margin-bottom: 1.5rem;">${rausIcons.confetti}</div>
      <h1 style="font-size: 1.125rem; font-weight: 600; color: #2C3E50; margin-bottom: 0.5rem;">Use Case eingereicht!</h1>
      <p style="font-size: 0.875rem; color: #6B6B6B; margin: 1.25rem 0; line-height: 1.6;">
        Wir schauen uns deinen Case an und melden uns innerhalb von 1-2 Wochen.
      </p>
      <button onclick="closeRAUSModal()" class="cta-button" style="width: 100%; padding: 0.75rem 1.25rem; font-size: 0.875rem;">Fertig</button>
    </div>
  `;
}

function makeRAUSEditable(span) {
  const key = span.dataset.key;
  const isTextarea = span.dataset.textarea === 'true';
  const currentValue = span.textContent;

  // Replace span with input inline
  const input = isTextarea
    ? document.createElement('textarea')
    : document.createElement('input');

  input.value = currentValue;
  input.style.cssText = `
    width: 100%; padding: 0.25rem 0.375rem; border: 1px solid #5ED9A6;
    border-radius: 0.25rem; font-family: inherit; font-size: 0.8125rem;
    color: #2C3E50; outline: none; box-shadow: 0 0 0 2px rgba(94,217,166,0.15);
    ${isTextarea ? 'min-height: 50px; resize: vertical; line-height: 1.4;' : ''}
    ${key === 'headline' ? 'font-weight: 600;' : ''}
  `;

  span.replaceWith(input);
  input.focus();
  input.select();

  // On blur, update state and restore as text
  input.addEventListener('blur', () => {
    const newValue = input.value.trim();
    // Update state
    if (key === 'tools') {
      rausState.extracted[key] = newValue.split(',').map(t => t.trim()).filter(Boolean);
    } else {
      rausState.extracted[key] = newValue;
    }
    // Re-render the review to show updated text
    renderRAUS();
  });
}

function renderRAUS() {
  const content = document.getElementById('rausWizardContent');
  if (!content) return;

  const renderers = {
    intro: renderRAUSIntro,
    voice: renderRAUSVoice,
    processing: renderRAUSProcessing,
    review: renderRAUSReview,
    success: renderRAUSSuccess
  };

  content.innerHTML = (renderers[rausState.step] || renderRAUSIntro)();
}

// Escape key handler
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const rausModal = document.getElementById('rausModalOverlay');
    if (rausModal && rausModal.classList.contains('active')) {
      closeRAUSModal();
    }
  }
});

// Inject modal HTML and styles when DOM is ready
function injectRAUSModal() {
  // Only inject if not already present
  if (document.getElementById('rausModalOverlay')) return;

  // Modal HTML
  const modalDiv = document.createElement('div');
  modalDiv.id = 'rausModalOverlay';
  modalDiv.className = 'modal-overlay';
  modalDiv.onclick = function(e) { if (e.target === this) closeRAUSModal(); };
  modalDiv.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 1000; align-items: center; justify-content: center; padding: 1rem; display: none;';

  modalDiv.innerHTML = `
    <div style="background: #fff; border-radius: 1rem; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 48px rgba(0,0,0,0.15); animation: modalIn 0.3s ease-out; position: relative;">
      <button onclick="closeRAUSModal()" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.5rem; color: #999; cursor: pointer; z-index: 10; line-height: 1; padding: 0.25rem; border-radius: 0.25rem;">&times;</button>
      <div id="rausWizardContent" style="padding: 1.5rem;"></div>
    </div>
  `;

  document.body.appendChild(modalDiv);

  // Styles
  const style = document.createElement('style');
  style.textContent = `
    #rausModalOverlay.active { display: flex; }
    @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .raus-prompt-box:hover { border-color: #5ED9A6; }
    .raus-prompt-box.copied { background: rgba(94,217,166,0.15); }
    .raus-char-indicator.good span:first-child { color: #059669; }
    .raus-stealth-input { cursor: text; transition: all 0.15s ease; }
    .raus-stealth-input:hover { background: rgba(0,0,0,0.02) !important; border-color: rgba(0,0,0,0.1) !important; }
    .raus-stealth-input:focus { background: white !important; border-color: #5ED9A6 !important; outline: none; box-shadow: 0 0 0 2px rgba(94,217,166,0.15); }
  `;
  document.head.appendChild(style);
}

// Run injection when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectRAUSModal);
} else {
  injectRAUSModal();
}

// Expose functions to global scope for onclick handlers
window.openRAUSModal = openRAUSModal;
window.closeRAUSModal = closeRAUSModal;
window.setRAUSStep = setRAUSStep;
window.startRAUSRecording = startRAUSRecording;
window.processRAUSText = processRAUSText;
window.submitRAUSCase = submitRAUSCase;
window.copyRAUSPrompt = copyRAUSPrompt;
window.updateRAUSCharCount = updateRAUSCharCount;
window.makeRAUSEditable = makeRAUSEditable;
