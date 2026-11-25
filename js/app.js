(() => {
  'use strict';

  const STORAGE_KEY = 'focuslist.tasks.v1';
  const state = { tasks: loadTasks(), filter: 'all', query: '' };
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const elements = {
    list: $('#taskList'), empty: $('#emptyState'), emptyTitle: $('#emptyTitle'), emptyCopy: $('#emptyCopy'),
    dialog: $('#taskDialog'), form: $('#taskForm'), id: $('#taskId'), title: $('#taskTitle'),
    description: $('#taskDescription'), dueDate: $('#taskDueDate'), search: $('#searchInput'),
    total: $('#totalCount'), active: $('#activeCount'), completed: $('#completedCount'),
    allFilterCount: $('#allFilterCount'), clear: $('#clearCompleted'), toast: $('#toast')
  };

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        const seeded = createSeedTasks();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        return seeded;
      }
      const stored = JSON.parse(raw);
      return Array.isArray(stored) ? stored : [];
    } catch { return []; }
  }

  function createSeedTasks() {
    const now = new Date();
    const dateFromToday = days => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const createdAt = daysAgo => new Date(now.getTime() - daysAgo * 86400000).toISOString();
    const task = (id, title, description, priority, dueInDays, completed, daysAgo) => ({
      id: `sample-${id}`,
      title,
      description,
      priority,
      dueDate: dueInDays === null ? '' : dateFromToday(dueInDays),
      completed,
      createdAt: createdAt(daysAgo)
    });

    return [
      task(1, 'Review project requirements', 'Confirm acceptance criteria and flag open questions for the product team.', 'high', -3, false, 10),
      task(2, 'Prepare sprint demo', 'Create a short walkthrough of the completed stories and known limitations.', 'high', 0, false, 7),
      task(3, 'Fix authentication bug', 'Reproduce the expired-session redirect issue and add a regression test.', 'high', 2, false, 6),
      task(4, 'Update API documentation', '', 'medium', 5, false, 5),
      task(5, 'Review pull request', 'Check error handling, test coverage, and backward compatibility.', 'medium', 1, false, 4),
      task(6, 'Prepare weekly status report', '', 'low', 3, false, 3),
      task(7, 'Deploy staging build', 'Run the smoke-test checklist after deployment.', 'high', -1, false, 8),
      task(8, 'Test mobile layout', '', 'medium', 7, false, 2),
      task(9, 'Update database backup procedure', 'Document the restore verification steps and escalation contacts.', 'medium', -5, true, 12),
      task(10, 'Schedule stakeholder meeting', '', 'low', null, true, 9),
      task(11, 'Archive completed sprint notes', '', 'low', null, true, 11)
    ];
  }

  function saveTasks() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks)); }
    catch { showToast('Tasks could not be saved in this browser.'); }
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  function localDate(dateString) {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function isOverdue(task) {
    if (!task.dueDate || task.completed) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return localDate(task.dueDate) < today;
  }

  function formatDueDate(value) {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: localDate(value).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined }).format(localDate(value));
  }

  function visibleTasks() {
    const query = state.query.trim().toLowerCase();
    return state.tasks.filter(task => {
      const matchesFilter = state.filter === 'all' || (state.filter === 'completed' ? task.completed : !task.completed);
      const matchesSearch = !query || task.title.toLowerCase().includes(query) || task.description.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    }).sort((a, b) => Number(a.completed) - Number(b.completed) || new Date(b.createdAt) - new Date(a.createdAt));
  }

  function taskTemplate(task) {
    const overdue = isOverdue(task);
    const due = task.dueDate ? `<div class="task-meta ${overdue ? 'overdue' : ''}"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 2v3M18 2v3M3.5 9h17M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/></svg><span>${overdue ? 'Was due' : 'Due'} ${formatDueDate(task.dueDate)}</span>${overdue ? '<span class="overdue-label">Overdue</span>' : ''}</div>` : '';
    return `<article class="task-card priority-${task.priority} ${task.completed ? 'completed' : ''}" data-id="${task.id}">
      <label class="check-wrap" aria-label="Mark ${escapeHtml(task.title)} ${task.completed ? 'incomplete' : 'complete'}">
        <input type="checkbox" data-action="toggle" ${task.completed ? 'checked' : ''}><span class="custom-check"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 12 4 4 8-9"/></svg></span>
      </label>
      <div class="task-main"><div class="task-title-row"><h3 class="task-title">${escapeHtml(task.title)}</h3><span class="priority-badge badge-${task.priority}">${task.priority}</span></div>${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}${due}</div>
      <div class="task-actions"><button class="icon-button" type="button" data-action="edit" aria-label="Edit ${escapeHtml(task.title)}"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m14 5 5 5M4 20l4.5-1 10-10a2 2 0 0 0-3-3l-10 10L4 20Z"/></svg></button><button class="icon-button delete-button" type="button" data-action="delete" aria-label="Delete ${escapeHtml(task.title)}"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/></svg></button></div>
    </article>`;
  }

  function render() {
    const tasks = visibleTasks();
    elements.list.innerHTML = tasks.map(taskTemplate).join('');
    elements.empty.hidden = tasks.length > 0;
    elements.list.hidden = tasks.length === 0;
    const active = state.tasks.filter(task => !task.completed).length;
    const complete = state.tasks.length - active;
    elements.total.textContent = state.tasks.length;
    elements.active.textContent = active;
    elements.completed.textContent = complete;
    elements.allFilterCount.textContent = state.tasks.length;
    elements.clear.disabled = complete === 0;
    setEmptyMessage();
  }

  function setEmptyMessage() {
    if (state.query) {
      elements.emptyTitle.textContent = 'No matching tasks';
      elements.emptyCopy.textContent = 'Try a different search or clear your filters.';
    } else if (state.filter === 'completed') {
      elements.emptyTitle.textContent = 'Nothing completed yet';
      elements.emptyCopy.textContent = 'Finished tasks will show up here.';
    } else if (state.filter === 'active' && state.tasks.length) {
      elements.emptyTitle.textContent = 'You’re all caught up';
      elements.emptyCopy.textContent = 'Every task is complete. Nicely done.';
    } else {
      elements.emptyTitle.textContent = 'A clear slate';
      elements.emptyCopy.textContent = 'Your next great day starts with one small task.';
    }
  }

  function openForm(task = null) {
    elements.form.reset();
    elements.id.value = task?.id || '';
    elements.title.value = task?.title || '';
    elements.description.value = task?.description || '';
    elements.dueDate.value = task?.dueDate || '';
    $(`input[name="priority"][value="${task?.priority || 'medium'}"]`).checked = true;
    $('#dialogTitle').textContent = task ? 'Edit your task' : 'Add a new task';
    $('#submitLabel').textContent = task ? 'Save changes' : 'Add task';
    $('#titleError').textContent = '';
    elements.title.classList.remove('invalid');
    elements.dialog.showModal();
    requestAnimationFrame(() => elements.title.focus());
  }

  function closeForm() { elements.dialog.close(); }

  function handleSubmit(event) {
    event.preventDefault();
    const title = elements.title.value.trim();
    if (!title) {
      elements.title.classList.add('invalid');
      $('#titleError').textContent = 'Please give your task a title.';
      elements.title.focus(); return;
    }
    const id = elements.id.value;
    const values = { title, description: elements.description.value.trim(), priority: $('input[name="priority"]:checked').value, dueDate: elements.dueDate.value };
    if (id) {
      const task = state.tasks.find(item => item.id === id);
      if (task) Object.assign(task, values, { updatedAt: new Date().toISOString() });
      showToast('Task updated');
    } else {
      state.tasks.unshift({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, ...values, completed: false, createdAt: new Date().toISOString() });
      showToast('Task added');
    }
    saveTasks(); closeForm(); render();
  }

  function handleListAction(event) {
    const control = event.target.closest('[data-action]');
    const card = event.target.closest('[data-id]');
    if (!control || !card) return;
    const task = state.tasks.find(item => item.id === card.dataset.id);
    if (!task) return;
    if (control.dataset.action === 'toggle') {
      task.completed = control.checked; task.updatedAt = new Date().toISOString();
      saveTasks(); render(); showToast(task.completed ? 'Task completed — nice work!' : 'Task moved back to active');
    } else if (control.dataset.action === 'edit') openForm(task);
    else if (control.dataset.action === 'delete') {
      state.tasks = state.tasks.filter(item => item.id !== task.id);
      saveTasks(); render(); showToast('Task deleted');
    }
  }

  let toastTimer;
  function showToast(message) {
    clearTimeout(toastTimer); elements.toast.textContent = message; elements.toast.classList.add('show');
    toastTimer = setTimeout(() => elements.toast.classList.remove('show'), 2300);
  }

  $$('[data-open-form]').forEach(button => button.addEventListener('click', () => openForm()));
  $$('[data-close-form]').forEach(button => button.addEventListener('click', closeForm));
  elements.form.addEventListener('submit', handleSubmit);
  elements.title.addEventListener('input', () => { elements.title.classList.remove('invalid'); $('#titleError').textContent = ''; });
  elements.list.addEventListener('click', handleListAction);
  elements.list.addEventListener('change', handleListAction);
  elements.search.addEventListener('input', event => { state.query = event.target.value; render(); });
  $$('.filter-button').forEach(button => button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    $$('.filter-button').forEach(item => { const selected = item === button; item.classList.toggle('active', selected); item.setAttribute('aria-pressed', selected); });
    render();
  }));
  elements.clear.addEventListener('click', () => {
    state.tasks = state.tasks.filter(task => !task.completed); saveTasks(); render(); showToast('Completed tasks cleared');
  });
  elements.dialog.addEventListener('click', event => {
    const rect = elements.dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeForm();
  });
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !elements.dialog.open && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); elements.search.focus(); }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && elements.dialog.open) elements.form.requestSubmit();
  });

  $('#todayLabel').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());
  render();
})();
