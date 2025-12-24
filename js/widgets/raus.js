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
  voiceConsent: false
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
    voiceConsent: false
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
  const data = { ...rausState.extracted };

  ['headline', 'problem', 'solution', 'result', 'tools'].forEach(key => {
    const input = document.getElementById(`raus-input-${key}`);
    if (input?.value?.trim()) {
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

      <button onclick="processRAUSTextFromIntro()" class="cta-button" style="width: 100%; margin-bottom: 1rem;">Analysieren lassen</button>

      <p style="font-size: 0.75rem; color: #999; text-align: center;">
        <button onclick="selectRAUSInputMode('voice')" style="background: none; border: none; color: #999; font-size: 0.75rem; cursor: pointer; font-family: inherit;">Lieber sprechen?</button>
      </p>
    </div>
  `;
}

function renderRAUSVoice() {
  return `
    <div style="animation: fadeIn 0.3s ease-out;">
      <h1 style="font-size: 1.125rem; font-weight: 600; color: #2C3E50; margin-bottom: 0.5rem;">Sprich deinen Use Case ein</h1>
      <p style="font-size: 0.875rem; color: #6B6B6B; margin-bottom: 1.25rem;">Problem, Lösung, Ergebnis, Tools - 2 Minuten reichen.</p>

      <div style="text-align: center; padding: 2rem 0;">
        <button onclick="toggleRAUSRecordingWithConsent()" style="width: 80px; height: 80px; border-radius: 50%; border: none; background: ${rausState.isRecording ? '#ef4444' : '#5ED9A6'}; color: ${rausState.isRecording ? '#fff' : '#000'}; cursor: pointer; display: flex; align-items: center; justify-content: center; margin: 0 auto; transition: all 0.2s; ${!rausState.voiceConsent && !rausState.isRecording ? 'opacity: 0.5;' : ''}">
          ${rausState.isRecording ? rausIcons.stop : rausIcons.mic}
        </button>
        <div id="rausRecordTimer" style="font-size: 1.5rem; font-weight: 600; color: #2C3E50; margin-top: 1rem;">${formatRAUSTime(rausState.recordingTime)}</div>
        <div style="font-size: 0.75rem; color: #999; margin-top: 0.25rem;">${rausState.isRecording ? 'Klick zum Beenden' : 'Klick zum Starten'}</div>
      </div>

      <label style="display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.75rem; color: #6B6B6B; margin: 1rem 0; cursor: pointer;">
        <input type="checkbox" id="rausVoiceConsent" onchange="rausState.voiceConsent = this.checked; renderRAUS();" ${rausState.voiceConsent ? 'checked' : ''} style="margin-top: 2px;">
        <span>Einverstanden mit Verarbeitung durch AssemblyAI (USA). <a href="/pages/privacy.html#3.4" target="_blank" style="color: #5ED9A6;">Details</a></span>
      </label>

      ${rausState.error ? `<div style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 1rem; border-radius: 0.5rem; margin-top: 1rem; font-size: 0.875rem;">${rausState.error}</div>` : ''}

      <button onclick="setRAUSStep('intro')" style="background: none; border: none; color: #6B6B6B; font-size: 0.875rem; cursor: pointer; padding: 0.5rem; font-family: inherit; margin-top: 1rem;">&larr; Zurück zum Text</button>
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
    const value = data[key];
    if (!value) {
      return `
        <div class="raus-review-card missing" style="background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.3); border-radius: 0.5rem; padding: 0.875rem 1rem; margin-bottom: 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.375rem;">
            <span style="font-size: 0.6875rem; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.04em;">${label} <span style="color: #d97706; margin-left: 0.5rem;">${rausIcons.alertTriangle} Bitte ergänzen</span></span>
          </div>
          ${isTextarea
            ? `<textarea class="raus-review-card-input" placeholder="${placeholder}" id="raus-input-${key}" style="width: 100%; min-height: 60px; padding: 0.625rem 0.75rem; border: 1px solid rgba(251,191,36,0.5); border-radius: 0.375rem; font-family: inherit; font-size: 0.875rem; resize: vertical;"></textarea>`
            : `<input type="text" class="raus-review-card-input" placeholder="${placeholder}" id="raus-input-${key}" style="width: 100%; padding: 0.625rem 0.75rem; border: 1px solid rgba(251,191,36,0.5); border-radius: 0.375rem; font-family: inherit; font-size: 0.875rem;">`}
        </div>
      `;
    }
    return `
      <div class="raus-review-card" style="background: rgba(255,255,255,0.6); border: 1px solid rgba(0,0,0,0.06); border-radius: 0.5rem; padding: 0.875rem 1rem; margin-bottom: 0.75rem;">
        <div style="font-size: 0.6875rem; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.375rem;">${label}</div>
        <div style="font-size: 0.9375rem; color: #2C3E50; line-height: 1.5; ${key === 'headline' ? 'font-weight: 600;' : ''}">${value}</div>
      </div>
    `;
  };

  return `
    <div style="animation: fadeIn 0.3s ease-out;">
      <div style="font-size: 0.75rem; color: #999; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 0.5rem;">Schritt 2 von 2 - Review</div>
      <h1 style="font-size: 1.125rem; font-weight: 600; color: #2C3E50; margin-bottom: 0.5rem;">${hasMissing ? 'Fast geschafft! Uns fehlen noch Details.' : 'Passt das so?'}</h1>
      <p style="font-size: 0.875rem; color: #6B6B6B; margin-bottom: 1.25rem;">${hasMissing ? 'Bitte ergänze die fehlenden Felder.' : 'Unsere KI hat folgende Informationen extrahiert:'}</p>

      <div style="margin-bottom: 1rem;">
        ${renderCard('headline', 'Headline', 'Use Case in einem Satz...')}
        ${renderCard('problem', 'Problem', 'Was war das Problem vorher?', true)}
        ${renderCard('solution', 'Lösung', 'Wie funktioniert die KI-Lösung?', true)}
        ${renderCard('result', 'Ergebnis', 'Was hat sich messbar verbessert?', true)}

        <div class="raus-review-card ${!data.tools?.length ? 'missing' : ''}" style="background: ${!data.tools?.length ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.6)'}; border: 1px solid ${!data.tools?.length ? 'rgba(251,191,36,0.3)' : 'rgba(0,0,0,0.06)'}; border-radius: 0.5rem; padding: 0.875rem 1rem; margin-bottom: 0.75rem;">
          <div style="font-size: 0.6875rem; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.375rem;">KI-Tools ${!data.tools?.length ? '<span style="color: #d97706; margin-left: 0.5rem;">' + rausIcons.alertTriangle + ' Bitte ergänzen</span>' : ''}</div>
          ${data.tools?.length
            ? `<div style="display: flex; flex-wrap: wrap; gap: 0.375rem;">${data.tools.map(t => `<span style="font-size: 0.75rem; background: rgba(94,217,166,0.15); color: #059669; padding: 0.25rem 0.625rem; border-radius: 1rem; font-weight: 500;">${t}</span>`).join('')}</div>`
            : `<input type="text" class="raus-review-card-input" placeholder="z.B. Claude, GPT-4, Custom ML..." id="raus-input-tools" style="width: 100%; padding: 0.625rem 0.75rem; border: 1px solid rgba(251,191,36,0.5); border-radius: 0.375rem; font-family: inherit; font-size: 0.875rem;">`}
        </div>

        <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: #6B6B6B; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(0,0,0,0.06);">
          <span>KI-Konfidenz:</span>
          <div style="flex: 1; height: 4px; background: rgba(0,0,0,0.08); border-radius: 2px; overflow: hidden;">
            <div style="height: 100%; width: ${(data.confidence || 0) * 100}%; background: #5ED9A6; border-radius: 2px;"></div>
          </div>
          <span>${Math.round((data.confidence || 0) * 100)}%</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.25rem;">
        <div>
          <label style="display: block; font-size: 0.75rem; font-weight: 600; color: #2C3E50; margin-bottom: 0.375rem;">Region</label>
          <select id="raus-select-region" style="width: 100%; padding: 0.625rem 0.75rem; border: 1px solid rgba(0,0,0,0.12); border-radius: 0.5rem; font-family: inherit; font-size: 0.875rem; background: rgba(255,255,255,0.8); cursor: pointer;">
            <option value="tirol" selected>Tirol</option>
            <option value="austria">Österreich</option>
            <option value="dach">DACH</option>
          </select>
        </div>
        <div>
          <label style="display: block; font-size: 0.75rem; font-weight: 600; color: #2C3E50; margin-bottom: 0.375rem;">Sichtbarkeit</label>
          <select id="raus-select-visibility" style="width: 100%; padding: 0.625rem 0.75rem; border: 1px solid rgba(0,0,0,0.12); border-radius: 0.5rem; font-family: inherit; font-size: 0.875rem; background: rgba(255,255,255,0.8); cursor: pointer;">
            <option value="full" selected>Öffentlich</option>
            <option value="anon">Anonymisiert</option>
            <option value="report">Nur Report</option>
          </select>
        </div>
      </div>

      <div style="display: flex; gap: 0.75rem;">
        <button onclick="setRAUSStep('${rausState.inputMode || 'intro'}')" style="background: none; border: none; color: #6B6B6B; font-size: 0.875rem; cursor: pointer; padding: 0.5rem; font-family: inherit;">&larr; Neu</button>
        <button onclick="submitRAUSCase()" class="cta-button" style="flex: 1;">Einreichen</button>
      </div>
    </div>
    <style>@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }</style>
  `;
}

function renderRAUSSuccess() {
  return `
    <div style="animation: fadeIn 0.3s ease-out; text-align: center; padding: 1rem 0;">
      <div style="color: #5ED9A6; margin-bottom: 1rem;">${rausIcons.confetti}</div>
      <h1 style="font-size: 1.125rem; font-weight: 600; color: #2C3E50; margin-bottom: 0.5rem;">Use Case eingereicht!</h1>
      <p style="font-size: 0.875rem; color: #6B6B6B; margin: 1rem 0; line-height: 1.6;">
        Wir schauen uns deinen Case an und melden uns innerhalb von 1-2 Wochen.
      </p>
      <button onclick="closeRAUSModal()" class="cta-button" style="width: 100%;">Fertig</button>
    </div>
  `;
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
  `;
  document.head.appendChild(style);
}

// Run injection when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectRAUSModal);
} else {
  injectRAUSModal();
}
