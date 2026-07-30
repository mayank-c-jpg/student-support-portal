/**
 * public/js/profile.js
 * -----------------------------------------------------------------------
 * Handles the "Edit Profile" form on the profile page via the
 * PUT /api/users/me endpoint.
 * -----------------------------------------------------------------------
 */
(function () {
  const form = document.getElementById('profileForm');
  if (!form) return;

  const spinner = document.getElementById('profileSpinner');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const payload = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      course: formData.get('course'),
    };

    spinner?.classList.remove('d-none');
    try {
      await apiFetch('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      showToast('Profile updated successfully.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update profile.', 'danger');
    } finally {
      spinner?.classList.add('d-none');
    }
  });
})();
