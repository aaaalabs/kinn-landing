// KINN #6 Voting Widget - SLC Implementation
// Simple, Lovable, Complete

export function initVotingWidget(container, token) {
  // State
  let topics = [];
  let userVotes = new Set();
  let isLoading = false;

  // Fetch topics from API
  async function fetchTopics() {
    if (isLoading) return;
    isLoading = true;

    try {
      const response = await fetch('/api/voting/topics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const data = await response.json();
      topics = data.topics || [];
      userVotes = new Set(data.userVotes || []);
      render();

    } catch (error) {
      console.error('[VOTING] Fetch error:', error);
      // Don't show error on polling failures, just keep last state
    } finally {
      isLoading = false;
    }
  }

  // Toggle vote on a topic
  async function toggleVote(topicId) {
    // Find topic
    const topic = topics.find(t => t.id === topicId);
    if (!topic) return;

    // Optimistic update
    const wasVoted = userVotes.has(topicId);
    if (wasVoted) {
      userVotes.delete(topicId);
      topic.votes--;
    } else {
      userVotes.add(topicId);
      topic.votes++;
    }
    render();

    // Server sync
    try {
      const response = await fetch('/api/voting/toggle', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ topicId })
      });

      if (!response.ok) {
        throw new Error(`Failed to toggle: ${response.status}`);
      }

      const data = await response.json();
      topic.votes = data.voteCount;

      if (data.voted) {
        userVotes.add(topicId);
      } else {
        userVotes.delete(topicId);
      }

      render();

    } catch (error) {
      console.error('[VOTING] Toggle error:', error);
      // Revert optimistic update
      if (wasVoted) {
        userVotes.add(topicId);
        topic.votes++;
      } else {
        userVotes.delete(topicId);
        topic.votes--;
      }
      render();
      showToast('Vote konnte nicht gespeichert werden', 'error');
    }
  }

  // Add new topic
  async function addTopic(title) {
    const trimmed = title.trim();

    // Validate
    if (!trimmed) {
      showToast('Bitte Thema eingeben', 'error');
      return;
    }

    if (trimmed.length > 80) {
      showToast('Thema zu lang (max 80 Zeichen)', 'error');
      return;
    }

    try {
      const response = await fetch('/api/voting/topics', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: trimmed })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to add: ${response.status}`);
      }

      const data = await response.json();
      topics.unshift(data.topic);
      userVotes.add(data.topic.id);
      render();

      // Clear input
      const input = container.querySelector('.topic-input');
      if (input) input.value = '';

      // Scroll to top to see new topic
      const topicList = container.querySelector('.topics');
      if (topicList) topicList.scrollTop = 0;

      showToast('Thema hinzugefügt!', 'success');

    } catch (error) {
      console.error('[VOTING] Add topic error:', error);
      showToast(error.message || 'Thema konnte nicht hinzugefügt werden', 'error');
    }
  }

  // Show toast notification (reuse existing or create simple one)
  function showToast(message, type = 'info') {
    // Try to use existing toast system if available
    if (window.showToast && typeof window.showToast === 'function') {
      window.showToast(message, type);
      return;
    }

    // Simple fallback toast
    const toast = document.createElement('div');
    toast.className = `voting-toast voting-toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'error' ? '#ff4444' : '#5ED9A6'};
      color: white;
      border-radius: 8px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Render the widget
  function render() {
    // Sort topics by votes (highest first)
    const sorted = [...topics].sort((a, b) => b.votes - a.votes);
    const totalVotes = sorted.reduce((sum, t) => sum + t.votes, 0);

    // Update vote count in Dashboard if element exists
    const voteCountElement = document.getElementById('vote-count');
    if (voteCountElement) {
      voteCountElement.textContent = totalVotes > 0 ? `${totalVotes} ${totalVotes === 1 ? 'Stimme' : 'Stimmen'}` : '';
    }

    // HTML structure
    container.innerHTML = `
      <div class="voting-widget">
        <header class="voting-header">
          <h3>Themen für KINN #6</h3>
          <span class="vote-total">${totalVotes} ${totalVotes === 1 ? 'Vote' : 'Votes'}</span>
        </header>

        <div class="topics">
          ${sorted.length > 0 ? sorted.map(topic => `
            <div class="topic-card ${userVotes.has(topic.id) ? 'voted' : ''}"
                 data-topic-id="${topic.id}">
              <div class="topic-info">
                <div class="topic-title">${escapeHtml(topic.title)}</div>
              </div>
              <div class="topic-votes">${topic.votes}</div>
            </div>
          `).join('') : `
            <p class="empty-state">Noch keine Themen - sei der Erste!</p>
          `}
        </div>

        <form class="add-topic-form">
          <input
            type="text"
            class="topic-input"
            placeholder="Neues Thema vorschlagen..."
            maxlength="80"
          >
          <button type="submit" class="btn-add">+</button>
        </form>
      </div>

      <style>
        .voting-widget {
          max-width: 100%;
          font-family: 'Work Sans', system-ui, -apple-system, sans-serif;
          /* Removed card styling - no background, border-radius, or shadow */
        }

        .voting-header {
          display: none; /* Hide header - will be in Dashboard card */
        }

        .voting-header h3 {
          display: none;
        }

        .vote-total {
          display: none;
        }

        .topics {
          max-height: none; /* Remove height restriction */
          overflow-y: visible;
          padding: 0;
        }

        .topic-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          margin-bottom: 0.5rem;
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(0, 0, 0, 0.04);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
          position: relative;
        }

        .topic-card:hover {
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }

        .topic-card.voted {
          background: linear-gradient(90deg,
            rgba(94, 217, 166, 0.05) 0%,
            rgba(255, 255, 255, 0.6) 100%);
          border-left: 2px solid #5ED9A6;
          padding-left: calc(1rem - 1px); /* Compensate for border */
        }

        /* Subtle vote indicator dot */
        .topic-card.voted::before {
          content: '';
          position: absolute;
          left: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #5ED9A6;
        }

        .topic-info {
          flex: 1;
          min-width: 0;
        }

        .topic-title {
          font-size: 0.9375rem;
          font-weight: 500;
          color: #3A3A3A;
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          line-height: 1.4;
        }


        .topic-votes {
          font-size: 1rem;
          font-weight: 600;
          color: #6B6B6B;
          margin-left: 12px;
          min-width: 30px;
          text-align: center;
        }

        .topic-card.voted .topic-votes {
          color: #5ED9A6;
        }

        .empty-state {
          text-align: center;
          color: #999;
          font-size: 14px;
          padding: 40px 20px;
        }

        .add-topic-form {
          display: flex;
          margin-top: 1rem;
          gap: 8px;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .add-topic-form:hover,
        .add-topic-form:focus-within {
          opacity: 1;
        }

        .topic-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 6px;
          font-size: 0.875rem;
          font-family: inherit;
          background: rgba(255, 255, 255, 0.8);
          transition: all 0.2s ease;
        }

        .topic-input::placeholder {
          color: #999;
        }

        .topic-input:focus {
          outline: none;
          border-color: rgba(94, 217, 166, 0.4);
          background: white;
        }

        .btn-add {
          width: 36px;
          height: 36px;
          border: 1px solid rgba(94, 217, 166, 0.3);
          background: rgba(94, 217, 166, 0.1);
          color: #5ED9A6;
          border-radius: 6px;
          font-size: 20px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-add:hover {
          background: rgba(94, 217, 166, 0.2);
          border-color: rgba(94, 217, 166, 0.5);
        }

        .btn-add:active {
          transform: scale(0.95);
        }

        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }

        @media (max-width: 640px) {
          .voting-widget {
            max-width: 100%;
          }

          .topics {
            max-height: 280px;
          }
        }
      </style>
    `;

    // Attach event listeners
    attachEventListeners();
  }

  // Attach event listeners after render
  function attachEventListeners() {
    // Vote toggle on cards
    container.querySelectorAll('.topic-card').forEach(card => {
      card.addEventListener('click', () => {
        const topicId = card.dataset.topicId;
        if (topicId) toggleVote(topicId);
      });
    });

    // Form submit
    const form = container.querySelector('.add-topic-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = form.querySelector('.topic-input');
        if (input && input.value) {
          addTopic(input.value);
        }
      });
    }
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  // Initial load and start polling
  fetchTopics();
  const pollInterval = setInterval(fetchTopics, 5000);

  // Return cleanup function
  return () => {
    clearInterval(pollInterval);
  };
}