/**
 * public/js/main.js
 * -----------------------------------------------------------------------
 * Global front-end helpers shared across all pages:
 *   - apiFetch(): fetch() wrapper that auto-attaches the CSRF token
 *     and JSON headers, and normalizes error handling.
 *   - showToast(): Bootstrap toast notification helper.
 * -----------------------------------------------------------------------
 */

/** Reads the CSRF token that the server embedded in a <meta> tag. */
function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute('content') : '';
}

/**
 * Wrapper around fetch() for calling our own JSON REST API.
 * Automatically sends credentials (session cookie) + CSRF header,
 * and throws a descriptive Error on non-2xx responses.
 */
async function apiFetch(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = Object.assign(
    { 'Content-Type': 'application/json' },
    options.headers || {}
  );

  if (method !== 'GET' && method !== 'HEAD') {
    headers['x-csrf-token'] = getCsrfToken();
  }

  const response = await fetch(url, {
    ...options,
    method,
    headers,
    credentials: 'same-origin',
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (response.status === 401) {
    showToast('Your session has expired. Redirecting to login...', 'warning');
    setTimeout(() => (window.location.href = '/login?expired=1'), 1500);
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const message = (payload && payload.message) || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

/** Shows a Bootstrap toast notification. type: success | danger | warning | info */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center text-white border-0 bg-${type === 'info' ? 'primary' : type}`;
  toastEl.setAttribute('role', 'alert');
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${escapeHtml(message)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  container.appendChild(toastEl);

  const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
  toast.show();
  toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

/** Minimal HTML-escaping to prevent DOM-based XSS when injecting text. */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
