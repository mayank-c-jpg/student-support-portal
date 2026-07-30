/**
 * public/js/colleges.js
 * -----------------------------------------------------------------------
 * Drives the "Browse Colleges" page: client-side search/filter over
 * the server-rendered college cards, and selecting a college (which
 * persists to the student's profile via PUT /api/users/me/college).
 * -----------------------------------------------------------------------
 */
(function () {
  const searchInput = document.getElementById('collegeSearchInput');
  const cards = Array.from(document.querySelectorAll('.college-card'));
  const noResultsMessage = document.getElementById('noResultsMessage');

  if (!searchInput) return; // Not on the colleges page

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;

    cards.forEach((card) => {
      const matches =
        !query ||
        card.dataset.name.includes(query) ||
        card.dataset.location.includes(query);
      card.classList.toggle('d-none', !matches);
      if (matches) visibleCount += 1;
    });

    noResultsMessage.classList.toggle('d-none', visibleCount !== 0 || cards.length === 0);
  });

  document.querySelectorAll('.select-college-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const collegeId = btn.dataset.id;
      const collegeName = btn.dataset.name;

      btn.disabled = true;
      try {
        await apiFetch('/api/users/me/college', {
          method: 'PUT',
          body: JSON.stringify({ collegeId }),
        });
        showToast(`${collegeName} selected! Redirecting to your dashboard...`, 'success');
        setTimeout(() => (window.location.href = '/dashboard'), 1200);
      } catch (err) {
        btn.disabled = false;
        showToast(err.message || 'Failed to select college.', 'danger');
      }
    });
  });
})();
