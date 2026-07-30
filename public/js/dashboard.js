/**
 * public/js/dashboard.js
 * -----------------------------------------------------------------------
 * Small dashboard-only enhancements beyond the chat panel itself
 * (currently: welcome toast on first load after login).
 * -----------------------------------------------------------------------
 */
(function () {
  const params = new URLSearchParams(window.location.search);
  if (params.get('welcome') === '1') {
    showToast('Welcome back! Your AI assistant is ready to help.', 'success');
  }
})();
