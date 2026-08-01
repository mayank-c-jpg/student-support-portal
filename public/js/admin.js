/**
 * public/js/admin.js
 * -----------------------------------------------------------------------
 * Drives all interactive parts of the admin dashboard:
 *   - Toggling user active/disabled status
 *   - Loading & moderating (flag/delete) chat history
 *   - Creating/editing/deleting FAQ entries
 *   - Creating/editing/deleting colleges + their per-course fee structures
 * -----------------------------------------------------------------------
 */
(function () {
  const usersTable = document.querySelector('[data-user-id]')?.closest('table');
  const chatListEl = document.getElementById('adminChatList');
  const faqForm = document.getElementById('faqForm');
  const faqListEl = document.getElementById('faqList');

  if (!document.getElementById('adminTabs')) return; // Not on admin page

  // ---------------- Users ----------------
  document.querySelectorAll('.toggle-user-status').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('tr');
      const userId = row.dataset.userId;
      const currentlyActive = btn.dataset.active === 'true';

      try {
        await apiFetch(`/api/admin/users/${userId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ isActive: !currentlyActive }),
        });
        showToast('User status updated.', 'success');
        window.location.reload();
      } catch (err) {
        showToast(err.message || 'Failed to update user status.', 'danger');
      }
    });
  });

  // ---------------- Chat history moderation ----------------
  async function loadChats(flaggedOnly = false) {
    if (!chatListEl) return;
    chatListEl.innerHTML = '<p class="text-muted">Loading chat history...</p>';
    try {
      const res = await apiFetch(`/api/admin/chats?limit=50${flaggedOnly ? '&flagged=true' : ''}`);
      const chats = res.data.chats;

      if (chats.length === 0) {
        chatListEl.innerHTML = '<p class="text-muted mb-0">No chat entries found.</p>';
        return;
      }

      chatListEl.innerHTML = '';
      chats.forEach((chat) => {
        const item = document.createElement('div');
        item.className = 'list-group-item';
        item.innerHTML = `
          <div class="d-flex justify-content-between align-items-start">
            <div class="flex-grow-1">
              <div class="small text-muted">
                ${escapeHtml(chat.user ? chat.user.name || chat.user.email : 'Unknown user')}
                ${chat.college ? `&middot; <span class="text-primary">${escapeHtml(chat.college.name)}</span>` : ''}
                &middot; ${new Date(chat.createdAt).toLocaleString()}
                ${chat.flagged ? '<span class="badge bg-danger-subtle text-danger ms-1">Flagged</span>' : ''}
              </div>
              <div class="fw-semibold"><i class="bi bi-person-fill me-1"></i>${escapeHtml(chat.userMessage)}</div>
              <div class="text-primary"><i class="bi bi-robot me-1"></i>${escapeHtml(chat.botReply)}</div>
            </div>
            <div class="d-flex flex-column gap-1 ms-3">
              <button class="btn btn-sm btn-outline-warning flag-chat-btn" data-id="${chat._id}" data-flagged="${chat.flagged}">
                ${chat.flagged ? 'Unflag' : 'Flag'}
              </button>
              <button class="btn btn-sm btn-outline-danger delete-chat-btn" data-id="${chat._id}">Delete</button>
            </div>
          </div>`;
        chatListEl.appendChild(item);
      });

      chatListEl.querySelectorAll('.flag-chat-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const flagged = btn.dataset.flagged === 'true';
          try {
            await apiFetch(`/api/admin/chats/${id}/flag`, {
              method: 'PATCH',
              body: JSON.stringify({ flagged: !flagged }),
            });
            showToast('Chat entry updated.', 'success');
            loadChats(flaggedOnly);
          } catch (err) {
            showToast(err.message || 'Failed to update chat entry.', 'danger');
          }
        });
      });

      chatListEl.querySelectorAll('.delete-chat-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this conversation? This cannot be undone.')) return;
          const id = btn.dataset.id;
          try {
            await apiFetch(`/api/admin/chats/${id}`, { method: 'DELETE' });
            showToast('Chat entry deleted.', 'success');
            loadChats(flaggedOnly);
          } catch (err) {
            showToast(err.message || 'Failed to delete chat entry.', 'danger');
          }
        });
      });
    } catch (err) {
      chatListEl.innerHTML = '<p class="text-danger mb-0">Failed to load chat history.</p>';
    }
  }

  document.querySelector('[data-bs-target="#tab-chats"]')?.addEventListener('click', () => {
    loadChats(false);
  });

  // ---------------- FAQ management ----------------
  async function loadFaqs() {
    if (!faqListEl) return;
    faqListEl.innerHTML = '<p class="text-muted">Loading FAQs...</p>';
    try {
      const res = await apiFetch('/api/admin/faqs');
      const faqs = res.data.faqs;

      if (faqs.length === 0) {
        faqListEl.innerHTML = '<p class="text-muted mb-0">No FAQs yet. Add one above.</p>';
        return;
      }

      faqListEl.innerHTML = '';
      faqs.forEach((faq) => {
        const col = document.createElement('div');
        col.className = 'col-md-6';
        col.innerHTML = `
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <span class="badge bg-secondary-subtle text-secondary mb-2">${escapeHtml(faq.category)}</span>
              <h6 class="fw-bold">${escapeHtml(faq.question)}</h6>
              <p class="text-muted small mb-2">${escapeHtml(faq.answer)}</p>
              <div class="d-flex justify-content-between">
                <span class="badge ${faq.isPublished ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}">
                  ${faq.isPublished ? 'Published' : 'Hidden'}
                </span>
                <div>
                  <button class="btn btn-sm btn-outline-secondary toggle-faq-btn" data-id="${faq._id}" data-published="${faq.isPublished}">
                    ${faq.isPublished ? 'Hide' : 'Publish'}
                  </button>
                  <button class="btn btn-sm btn-outline-danger delete-faq-btn" data-id="${faq._id}">Delete</button>
                </div>
              </div>
            </div>
          </div>`;
        faqListEl.appendChild(col);
      });

      faqListEl.querySelectorAll('.toggle-faq-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const published = btn.dataset.published === 'true';
          try {
            await apiFetch(`/api/admin/faqs/${id}`, {
              method: 'PUT',
              body: JSON.stringify({ isPublished: !published }),
            });
            showToast('FAQ updated.', 'success');
            loadFaqs();
          } catch (err) {
            showToast(err.message || 'Failed to update FAQ.', 'danger');
          }
        });
      });

      faqListEl.querySelectorAll('.delete-faq-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this FAQ entry?')) return;
          const id = btn.dataset.id;
          try {
            await apiFetch(`/api/admin/faqs/${id}`, { method: 'DELETE' });
            showToast('FAQ deleted.', 'success');
            loadFaqs();
          } catch (err) {
            showToast(err.message || 'Failed to delete FAQ.', 'danger');
          }
        });
      });
    } catch (err) {
      faqListEl.innerHTML = '<p class="text-danger mb-0">Failed to load FAQs.</p>';
    }
  }

  if (faqForm) {
    faqForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(faqForm);
      const payload = {
        category: formData.get('category'),
        question: formData.get('question'),
        answer: formData.get('answer'),
      };
      try {
        await apiFetch('/api/admin/faqs', { method: 'POST', body: JSON.stringify(payload) });
        showToast('FAQ added.', 'success');
        faqForm.reset();
        loadFaqs();
      } catch (err) {
        showToast(err.message || 'Failed to add FAQ.', 'danger');
      }
    });
  }

  document.querySelector('[data-bs-target="#tab-faqs"]')?.addEventListener('click', loadFaqs);

  // ---------------- College directory management ----------------
  const collegeForm = document.getElementById('collegeForm');
  const collegeListEl = document.getElementById('collegeList');
  const courseRowsEl = document.getElementById('courseRows');
  const courseRowTemplate = document.getElementById('courseRowTemplate');
  const addCourseRowBtn = document.getElementById('addCourseRowBtn');
  const collegeFormTitle = document.getElementById('collegeFormTitle');
  const collegeSubmitBtn = document.getElementById('collegeSubmitBtn');
  const cancelEditCollegeBtn = document.getElementById('cancelEditCollegeBtn');
  const collegeSearchInput = document.getElementById('collegeSearchInput');
  const clearCollegeSearchBtn = document.getElementById('clearCollegeSearchBtn');

  function addCourseRow(course) {
    if (!courseRowTemplate || !courseRowsEl) return;
    const fragment = courseRowTemplate.content.cloneNode(true);
    const row = fragment.querySelector('.course-row');

    if (course) {
      row.querySelector('.course-name').value = course.name || '';
      row.querySelector('.course-tuition').value = course.tuitionFeePerYear ?? '';
      row.querySelector('.course-hostel').value = course.hostelFeePerYear ?? 0;
      row.querySelector('.course-exam').value = course.examFeePerSemester ?? 0;
    }

    row.querySelector('.remove-course-row-btn').addEventListener('click', () => row.remove());
    courseRowsEl.appendChild(fragment);
  }

  addCourseRowBtn?.addEventListener('click', () => addCourseRow());

  function collectCoursesFromForm() {
    const rows = courseRowsEl ? courseRowsEl.querySelectorAll('.course-row') : [];
    const courses = [];
    rows.forEach((row) => {
      const name = row.querySelector('.course-name').value.trim();
      const tuitionFeePerYear = parseFloat(row.querySelector('.course-tuition').value);
      if (!name || Number.isNaN(tuitionFeePerYear)) return; // skip incomplete rows
      courses.push({
        name,
        tuitionFeePerYear,
        hostelFeePerYear: parseFloat(row.querySelector('.course-hostel').value) || 0,
        examFeePerSemester: parseFloat(row.querySelector('.course-exam').value) || 0,
      });
    });
    return courses;
  }

  function resetCollegeForm() {
    collegeForm.reset();
    collegeForm.elements.collegeId.value = '';
    courseRowsEl.innerHTML = '';
    collegeFormTitle.textContent = 'Add New College';
    collegeSubmitBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i>Add College';
    cancelEditCollegeBtn.classList.add('d-none');
  }

  cancelEditCollegeBtn?.addEventListener('click', resetCollegeForm);

  async function loadColleges(search = '') {
    if (!collegeListEl) return;
    collegeListEl.innerHTML = '<p class="text-muted">Loading colleges...</p>';
    try {
      const query = search ? `&search=${encodeURIComponent(search)}` : '';
      const res = await apiFetch(`/api/admin/colleges?limit=100${query}`);
      const colleges = res.data.colleges;

      if (colleges.length === 0) {
        collegeListEl.innerHTML = search
          ? '<p class="text-muted mb-0">No colleges match your search.</p>'
          : '<p class="text-muted mb-0">No colleges added yet. Use the form above to add one.</p>';
        return;
      }

      collegeListEl.innerHTML = '';
      colleges.forEach((college) => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        const courseCount = (college.courses || []).length;
        col.innerHTML = `
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start mb-1">
                <h6 class="fw-bold mb-0">${escapeHtml(college.name)}</h6>
                <span class="badge ${college.isPublished ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}">
                  ${college.isPublished ? 'Published' : 'Hidden'}
                </span>
              </div>
              <p class="text-muted small mb-2"><i class="bi bi-geo-alt me-1"></i>${escapeHtml(college.location || 'Location not set')}</p>
              <p class="text-muted small mb-2">${escapeHtml((college.description || '').slice(0, 100))}${(college.description || '').length > 100 ? '…' : ''}</p>
              <p class="small mb-3"><i class="bi bi-mortarboard me-1"></i>${courseCount} course${courseCount === 1 ? '' : 's'} listed</p>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-primary edit-college-btn" data-id="${college._id}">
                  <i class="bi bi-pencil me-1"></i>Edit
                </button>
                <button class="btn btn-sm btn-outline-danger delete-college-btn" data-id="${college._id}">
                  <i class="bi bi-trash me-1"></i>Delete
                </button>
              </div>
            </div>
          </div>`;
        collegeListEl.appendChild(col);
      });

      collegeListEl.querySelectorAll('.edit-college-btn').forEach((btn) => {
        btn.addEventListener('click', () => loadCollegeIntoForm(btn.dataset.id));
      });

      collegeListEl.querySelectorAll('.delete-college-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this college? This cannot be undone.')) return;
          try {
            await apiFetch(`/api/admin/colleges/${btn.dataset.id}`, { method: 'DELETE' });
            showToast('College deleted.', 'success');
            loadColleges();
            loadCollegeUsage();
          } catch (err) {
            showToast(err.message || 'Failed to delete college.', 'danger');
          }
        });
      });
    } catch (err) {
      collegeListEl.innerHTML = '<p class="text-danger mb-0">Failed to load colleges.</p>';
    }
  }

  async function loadCollegeIntoForm(id) {
    try {
      const res = await apiFetch(`/api/admin/colleges/${id}`);
      const college = res.data.college;

      collegeForm.elements.collegeId.value = college._id;
      collegeForm.elements.name.value = college.name || '';
      collegeForm.elements.location.value = college.location || '';
      collegeForm.elements.contactEmail.value = college.contactEmail || '';
      collegeForm.elements.contactPhone.value = college.contactPhone || '';
      collegeForm.elements.description.value = college.description || '';
      collegeForm.elements.admissionProcess.value = college.admissionProcess || '';
      collegeForm.elements.placementInfo.value = college.placementInfo || '';
      collegeForm.elements.internshipInfo.value = college.internshipInfo || '';
      collegeForm.elements.examInfo.value = college.examInfo || '';
      collegeForm.elements.scholarshipInfo.value = college.scholarshipInfo || '';
      collegeForm.elements.libraryInfo.value = college.libraryInfo || '';
      collegeForm.elements.campusFacilities.value = college.campusFacilities || '';
      collegeForm.elements.isPublished.checked = Boolean(college.isPublished);

      courseRowsEl.innerHTML = '';
      (college.courses || []).forEach((course) => addCourseRow(course));

      collegeFormTitle.textContent = `Editing: ${college.name}`;
      collegeSubmitBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Save Changes';
      cancelEditCollegeBtn.classList.remove('d-none');
      collegeForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      showToast(err.message || 'Failed to load college for editing.', 'danger');
    }
  }

  if (collegeForm) {
    collegeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(collegeForm);
      const collegeId = formData.get('collegeId');

      const payload = {
        name: formData.get('name'),
        location: formData.get('location'),
        contactEmail: formData.get('contactEmail'),
        contactPhone: formData.get('contactPhone'),
        description: formData.get('description'),
        admissionProcess: formData.get('admissionProcess'),
        placementInfo: formData.get('placementInfo'),
        internshipInfo: formData.get('internshipInfo'),
        examInfo: formData.get('examInfo'),
        scholarshipInfo: formData.get('scholarshipInfo'),
        libraryInfo: formData.get('libraryInfo'),
        campusFacilities: formData.get('campusFacilities'),
        isPublished: collegeForm.elements.isPublished.checked,
        courses: collectCoursesFromForm(),
      };

      try {
        if (collegeId) {
          await apiFetch(`/api/admin/colleges/${collegeId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
          showToast('College updated.', 'success');
        } else {
          await apiFetch('/api/admin/colleges', { method: 'POST', body: JSON.stringify(payload) });
          showToast('College added.', 'success');
        }
        resetCollegeForm();
        loadColleges();
        loadCollegeUsage();
      } catch (err) {
        showToast(err.message || 'Failed to save college.', 'danger');
      }
    });
  }

  /** Loads the "College Usage" summary table (students selected + chat count per college). */
  async function loadCollegeUsage() {
    const tbody = document.getElementById('collegeUsageBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" class="text-muted">Loading...</td></tr>';
    try {
      const res = await apiFetch('/api/admin/stats');
      const breakdown = res.data.collegeBreakdown || [];

      if (breakdown.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-muted">No published colleges yet.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      breakdown.forEach((row) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(row.name)}</td>
          <td>${row.studentsSelected}</td>
          <td>${row.chatCount}</td>`;
        tbody.appendChild(tr);
      });
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-danger">Failed to load usage data.</td></tr>';
    }
  }

  document.querySelector('[data-bs-target="#tab-colleges"]')?.addEventListener('click', () => {
    loadColleges();
    loadCollegeUsage();
  });

  // ---------------- College search (Manage Colleges tab) ----------------
  let collegeSearchDebounceTimer = null;
  collegeSearchInput?.addEventListener('input', () => {
    const value = collegeSearchInput.value.trim();
    clearCollegeSearchBtn?.classList.toggle('d-none', !value);

    clearTimeout(collegeSearchDebounceTimer);
    collegeSearchDebounceTimer = setTimeout(() => {
      loadColleges(value);
    }, 350);
  });

  clearCollegeSearchBtn?.addEventListener('click', () => {
    collegeSearchInput.value = '';
    clearCollegeSearchBtn.classList.add('d-none');
    loadColleges();
  });

  // ---------------- Bulk College Import ----------------
  const downloadSampleBtn = document.getElementById('downloadSampleBtn');
  const importFileInput = document.getElementById('importFileInput');
  const importSubmitBtn = document.getElementById('importSubmitBtn');
  const importSpinner = document.getElementById('importSpinner');
  const importSubmitIcon = document.getElementById('importSubmitIcon');
  const importProgressWrap = document.getElementById('importProgressWrap');
  const importProgressBar = document.getElementById('importProgressBar');
  const importAlertArea = document.getElementById('importAlertArea');
  const importCollegesModalEl = document.getElementById('importCollegesModal');

  downloadSampleBtn?.addEventListener('click', () => {
    // Plain navigation (not apiFetch) so the browser handles the
    // file download via the Content-Disposition header; GET requests
    // aren't subject to CSRF checks in this app.
    const link = document.createElement('a');
    link.href = '/api/admin/sample-college-file';
    link.download = 'college-import-sample.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
  });

  function resetImportModalState() {
    importProgressWrap?.classList.add('d-none');
    if (importProgressBar) {
      importProgressBar.style.width = '0%';
      importProgressBar.textContent = '0%';
    }
    if (importAlertArea) importAlertArea.innerHTML = '';
    if (importFileInput) importFileInput.value = '';
    setImportBusy(false);
  }

  function setImportBusy(busy) {
    if (importSubmitBtn) importSubmitBtn.disabled = busy;
    importSpinner?.classList.toggle('d-none', !busy);
    importSubmitIcon?.classList.toggle('d-none', busy);
  }

  function renderImportResult(data) {
    if (!importAlertArea) return;
    const hasFailures = data.failed > 0;
    importAlertArea.innerHTML = `
      <div class="alert ${hasFailures ? 'alert-warning' : 'alert-success'} mb-0">
        <strong>Import complete.</strong><br />
        Imported: ${data.imported} colleges<br />
        Skipped (duplicates): ${data.skipped}<br />
        Failed (invalid rows): ${data.failed}
        ${data.emptyRowsSkipped ? `<br />Empty rows ignored: ${data.emptyRowsSkipped}` : ''}
        ${
          data.failedDetails && data.failedDetails.length > 0
            ? `<hr class="my-2" /><div class="small">First ${data.failedDetails.length} issues:<ul class="mb-0">${data.failedDetails
                .map((f) => `<li>Row ${f.row}: ${escapeHtml(f.reason)}</li>`)
                .join('')}</ul></div>`
            : ''
        }
      </div>`;
  }

  importCollegesModalEl?.addEventListener('hidden.bs.modal', resetImportModalState);

  importSubmitBtn?.addEventListener('click', () => {
    const file = importFileInput?.files?.[0];
    if (!file) {
      showToast('Please choose a .xlsx or .csv file first.', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setImportBusy(true);
    importAlertArea.innerHTML = '';
    importProgressWrap?.classList.remove('d-none');
    if (importProgressBar) {
      importProgressBar.style.width = '0%';
      importProgressBar.textContent = '0%';
    }

    // XMLHttpRequest (not fetch) is used here specifically because it
    // supports upload progress events, needed for the progress bar
    // with potentially large (up to 100MB) files.
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/import-colleges');
    xhr.setRequestHeader('x-csrf-token', getCsrfToken());

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable || !importProgressBar) return;
      const pct = Math.round((event.loaded / event.total) * 100);
      importProgressBar.style.width = `${pct}%`;
      importProgressBar.textContent = `${pct}%`;
    });

    xhr.onload = () => {
      setImportBusy(false);
      let payload = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        payload = null;
      }

      if (xhr.status >= 200 && xhr.status < 300 && payload?.data) {
        renderImportResult(payload.data);
        showToast('Import finished.', 'success');
        loadColleges();
        loadCollegeUsage();
      } else {
        const message = payload?.message || `Import failed (status ${xhr.status}).`;
        importAlertArea.innerHTML = `<div class="alert alert-danger mb-0">${escapeHtml(message)}</div>`;
        showToast(message, 'danger');
      }
    };

    xhr.onerror = () => {
      setImportBusy(false);
      importAlertArea.innerHTML =
        '<div class="alert alert-danger mb-0">Network error during upload. Please try again.</div>';
      showToast('Network error during upload.', 'danger');
    };

    xhr.send(formData);
  });
})();
