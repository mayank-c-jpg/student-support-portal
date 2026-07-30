/**
 * public/js/chat.js
 * -----------------------------------------------------------------------
 * Drives the dashboard's AI Assistant chat panel: starts a Watson
 * Assistant session, sends messages, renders the conversation with
 * a typing indicator, and keeps chat history visible for the
 * duration of the browser session.
 * -----------------------------------------------------------------------
 */
(function () {
  const chatWindow = document.getElementById('chatWindow');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const chatStatusBadge = document.getElementById('chatStatusBadge');

  if (!chatForm) return; // Not on a page with the chat panel

  let sessionReady = false;

  async function initSession() {
    try {
      await apiFetch('/api/chat/session', { method: 'POST' });
      sessionReady = true;
      setStatus(true);
    } catch (err) {
      setStatus(false);
      showToast('Could not connect to the AI assistant. Please refresh the page.', 'danger');
    }
  }

  function setStatus(online) {
    if (!chatStatusBadge) return;
    chatStatusBadge.className = online
      ? 'badge bg-success-subtle text-success'
      : 'badge bg-danger-subtle text-danger';
    chatStatusBadge.innerHTML = `<i class="bi bi-circle-fill me-1"></i>${online ? 'Online' : 'Offline'}`;
  }

  function appendBubble(text, sender) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.textContent = text;
    chatWindow.appendChild(bubble);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return bubble;
  }

  function appendTypingIndicator() {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble typing';
    bubble.id = 'typingIndicator';
    bubble.textContent = 'Assistant is typing...';
    chatWindow.appendChild(bubble);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function removeTypingIndicator() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
  }

  async function sendMessage(message) {
    appendBubble(message, 'user');
    chatInput.value = '';
    chatSendBtn.disabled = true;
    appendTypingIndicator();

    try {
      if (!sessionReady) await initSession();

      const res = await apiFetch('/api/chat/message', {
        method: 'POST',
        body: JSON.stringify({ message }),
      });

      removeTypingIndicator();
      appendBubble(res.data.reply, 'bot');
    } catch (err) {
      removeTypingIndicator();
      appendBubble("Sorry, I couldn't process that right now. Please try again.", 'bot');
      showToast(err.message || 'Failed to reach the AI assistant.', 'danger');
    } finally {
      chatSendBtn.disabled = false;
      chatInput.focus();
    }
  }

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;
    sendMessage(message);
  });

  document.querySelectorAll('.quick-topic-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const topic = btn.textContent.trim();
      sendMessage(`Tell me about ${topic}`);
    });
  });

  initSession();
})();
