'use strict';

(() => {
  const STORAGE_KEY = 'studyflow.tasks.v1';
  const VALID_STATUSES = ['pending', 'in-progress', 'completed'];
  const VALID_PRIORITIES = ['low', 'medium', 'high'];
  const PRIORITY_ORDER = { low: 1, medium: 2, high: 3 };
  const STATUS_LABELS = { pending: 'Pending', 'in-progress': 'In progress', completed: 'Completed' };
  const PRIORITY_LABELS = { low: 'Low priority', medium: 'Medium priority', high: 'High priority' };

  const elements = {
    addButton: document.querySelector('#add-task-button'),
    emptyAddButton: document.querySelector('#empty-add-button'),
    dialog: document.querySelector('#task-dialog'),
    form: document.querySelector('#task-form'),
    dialogTitle: document.querySelector('#dialog-title'),
    taskId: document.querySelector('#task-id'),
    title: document.querySelector('#task-title'),
    description: document.querySelector('#task-description'),
    subject: document.querySelector('#task-subject'),
    dueDate: document.querySelector('#task-due-date'),
    priority: document.querySelector('#task-priority'),
    status: document.querySelector('#task-status'),
    saveButton: document.querySelector('#save-task-button'),
    formError: document.querySelector('#form-error'),
    message: document.querySelector('#message'),
    list: document.querySelector('#task-list'),
    emptyState: document.querySelector('#empty-state'),
    emptyTitle: document.querySelector('#empty-title'),
    emptyCopy: document.querySelector('#empty-copy'),
    visibleCount: document.querySelector('#visible-count'),
    search: document.querySelector('#search-input'),
    statusFilter: document.querySelector('#status-filter'),
    subjectFilter: document.querySelector('#subject-filter'),
    sort: document.querySelector('#sort-select'),
    todayLabel: document.querySelector('#today-label'),
    titleError: document.querySelector('#title-error'),
    subjectError: document.querySelector('#subject-error'),
    dueDateError: document.querySelector('#due-date-error')
  };

  let tasks = loadTasks();
  let messageTimeout;
  const today = localDateString(new Date());
  elements.todayLabel.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: 'long', month: 'long', day: 'numeric'
  }).format(new Date()).toUpperCase();

  function localDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function isValidTask(task) {
    return task && typeof task === 'object' &&
      typeof task.id === 'string' && task.id.length > 0 &&
      typeof task.title === 'string' && task.title.trim().length > 0 &&
      typeof task.description === 'string' &&
      typeof task.subject === 'string' && task.subject.trim().length > 0 &&
      typeof task.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) &&
      VALID_PRIORITIES.includes(task.priority) && VALID_STATUSES.includes(task.status) &&
      typeof task.createdAt === 'string';
  }

  function loadTasks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === null) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) throw new Error('Saved task data is not a list.');
      const validTasks = parsed.filter(isValidTask);
      if (validTasks.length !== parsed.length) {
        showMessage('Some saved task data was invalid and could not be displayed.', 'error');
      }
      return validTasks;
    } catch (error) {
      console.error('Unable to load saved tasks:', error);
      queueMicrotask(() => showMessage('Saved tasks could not be loaded. Your browser storage may be unavailable or corrupted.', 'error'));
      return [];
    }
  }

  function saveTasks(nextTasks) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTasks));
      tasks = nextTasks;
      render();
      return true;
    } catch (error) {
      console.error('Unable to save tasks:', error);
      showMessage('Could not save your changes. Check that browser storage is available and not full.', 'error');
      return false;
    }
  }

  function showMessage(text, type = 'success') {
    clearTimeout(messageTimeout);
    elements.message.textContent = text;
    elements.message.className = `message ${type}`;
    elements.message.hidden = false;
    messageTimeout = setTimeout(() => { elements.message.hidden = true; }, 4500);
  }

  function isOverdue(task) {
    return task.status !== 'completed' && task.dueDate < today;
  }

  function updateStats() {
    const counts = {
      total: tasks.length,
      pending: tasks.filter(task => task.status === 'pending').length,
      progress: tasks.filter(task => task.status === 'in-progress').length,
      completed: tasks.filter(task => task.status === 'completed').length,
      overdue: tasks.filter(isOverdue).length
    };
    Object.entries(counts).forEach(([key, value]) => {
      document.querySelector(`#stat-${key}`).textContent = String(value);
    });
  }

  function updateSubjectFilter() {
    const selected = elements.subjectFilter.value;
    const subjects = [...new Set(tasks.map(task => task.subject.trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    elements.subjectFilter.replaceChildren(new Option('All subjects', 'all'));
    subjects.forEach(subject => elements.subjectFilter.add(new Option(subject, subject)));
    elements.subjectFilter.value = subjects.includes(selected) ? selected : 'all';
  }

  function formatDueDate(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      .format(new Date(year, month - 1, day));
  }

  function createBadge(text, className) {
    const badge = document.createElement('span');
    badge.className = className;
    badge.textContent = text;
    return badge;
  }

  function makeTaskCard(task) {
    const overdue = isOverdue(task);
    const card = document.createElement('article');
    card.className = `task-card${overdue ? ' is-overdue' : ''}`;
    card.dataset.taskId = task.id;

    const main = document.createElement('div');
    main.className = 'task-main';
    const titleRow = document.createElement('div');
    titleRow.className = 'task-title-row';
    const title = document.createElement('h3');
    title.className = 'task-title';
    title.textContent = task.title;
    titleRow.append(title, createBadge(task.subject, 'subject-chip'));
    main.append(titleRow);

    if (task.description) {
      const description = document.createElement('p');
      description.className = 'task-description';
      description.textContent = task.description;
      main.append(description);
    }

    const meta = document.createElement('div');
    meta.className = 'task-meta';
    const due = document.createElement('span');
    due.className = `due-date${overdue ? ' overdue-text' : ''}`;
    due.textContent = `${overdue ? 'Overdue · ' : 'Due · '}${formatDueDate(task.dueDate)}`;
    meta.append(
      due,
      createBadge(PRIORITY_LABELS[task.priority], `priority-tag priority-${task.priority}`),
      createBadge(STATUS_LABELS[task.status], `status-tag status-${task.status}`)
    );
    main.append(meta);

    const actions = document.createElement('div');
    actions.className = 'task-actions';
    const statusSelect = document.createElement('select');
    statusSelect.setAttribute('aria-label', `Change status for ${task.title}`);
    VALID_STATUSES.forEach(status => {
      const option = new Option(STATUS_LABELS[status], status);
      option.selected = task.status === status;
      statusSelect.add(option);
    });
    statusSelect.addEventListener('change', () => changeStatus(task.id, statusSelect.value));

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'icon-button';
    editButton.setAttribute('aria-label', `Edit ${task.title}`);
    editButton.title = 'Edit task';
    editButton.textContent = '✎';
    editButton.addEventListener('click', () => openDialog(task));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'icon-button delete-button';
    deleteButton.setAttribute('aria-label', `Delete ${task.title}`);
    deleteButton.title = 'Delete task';
    deleteButton.textContent = '⌫';
    deleteButton.addEventListener('click', () => deleteTask(task.id));
    actions.append(statusSelect, editButton, deleteButton);
    card.append(main, actions);
    return card;
  }

  function getVisibleTasks() {
    const query = elements.search.value.trim().toLocaleLowerCase();
    const status = elements.statusFilter.value;
    const subject = elements.subjectFilter.value;
    const visible = tasks.filter(task => {
      const searchable = `${task.title} ${task.description} ${task.subject}`.toLocaleLowerCase();
      return (!query || searchable.includes(query)) &&
        (status === 'all' || task.status === status) &&
        (subject === 'all' || task.subject === subject);
    });

    const sort = elements.sort.value;
    visible.sort((a, b) => {
      if (sort === 'due-desc') return b.dueDate.localeCompare(a.dueDate) || a.title.localeCompare(b.title);
      if (sort === 'priority-desc') return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority] || a.dueDate.localeCompare(b.dueDate);
      if (sort === 'title-asc') return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      if (sort === 'created-desc') return b.createdAt.localeCompare(a.createdAt);
      return a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title);
    });
    return visible;
  }

  function render() {
    updateStats();
    updateSubjectFilter();
    const visible = getVisibleTasks();
    elements.visibleCount.textContent = String(visible.length);
    elements.list.replaceChildren(...visible.map(makeTaskCard));
    elements.emptyState.hidden = visible.length > 0;
    if (tasks.length > 0 && visible.length === 0) {
      elements.emptyTitle.textContent = 'No matching tasks';
      elements.emptyCopy.textContent = 'Try changing your search or filters.';
      elements.emptyAddButton.hidden = true;
    } else {
      elements.emptyTitle.textContent = 'A fresh page';
      elements.emptyCopy.textContent = 'Add your first task and start building momentum.';
      elements.emptyAddButton.hidden = false;
    }
  }

  function openDialog(task = null) {
    elements.form.reset();
    clearValidation();
    elements.taskId.value = task ? task.id : '';
    elements.dialogTitle.textContent = task ? 'Edit task' : 'Add a task';
    elements.saveButton.textContent = task ? 'Save changes' : 'Save task';
    if (task) {
      elements.title.value = task.title;
      elements.description.value = task.description;
      elements.subject.value = task.subject;
      elements.dueDate.value = task.dueDate;
      elements.priority.value = task.priority;
      elements.status.value = task.status;
    } else {
      elements.priority.value = 'medium';
      elements.status.value = 'pending';
    }
    elements.dialog.showModal();
    elements.title.focus();
  }

  function clearValidation() {
    [elements.title, elements.subject, elements.dueDate].forEach(input => input.removeAttribute('aria-invalid'));
    elements.titleError.textContent = '';
    elements.subjectError.textContent = '';
    elements.dueDateError.textContent = '';
    elements.formError.hidden = true;
    elements.formError.textContent = '';
  }

  function validateForm() {
    clearValidation();
    let valid = true;
    if (!elements.title.value.trim()) {
      elements.title.setAttribute('aria-invalid', 'true');
      elements.titleError.textContent = 'Enter a task title.';
      valid = false;
    }
    if (!elements.subject.value.trim()) {
      elements.subject.setAttribute('aria-invalid', 'true');
      elements.subjectError.textContent = 'Enter a subject.';
      valid = false;
    }
    if (!elements.dueDate.value || !/^\d{4}-\d{2}-\d{2}$/.test(elements.dueDate.value)) {
      elements.dueDate.setAttribute('aria-invalid', 'true');
      elements.dueDateError.textContent = 'Choose a valid due date.';
      valid = false;
    }
    if (!VALID_PRIORITIES.includes(elements.priority.value) || !VALID_STATUSES.includes(elements.status.value)) {
      elements.formError.textContent = 'Choose a valid priority and status.';
      elements.formError.hidden = false;
      valid = false;
    }
    if (!valid) {
      const firstInvalid = elements.form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
    }
    return valid;
  }

  function createId() {
    return globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function submitTask(event) {
    event.preventDefault();
    if (!validateForm()) return;
    const existingId = elements.taskId.value;
    const existing = tasks.find(task => task.id === existingId);
    const task = {
      id: existingId || createId(),
      title: elements.title.value.trim(),
      description: elements.description.value.trim(),
      subject: elements.subject.value.trim(),
      dueDate: elements.dueDate.value,
      priority: elements.priority.value,
      status: elements.status.value,
      createdAt: existing ? existing.createdAt : new Date().toISOString()
    };
    const nextTasks = existing
      ? tasks.map(item => item.id === existingId ? task : item)
      : [...tasks, task];
    if (saveTasks(nextTasks)) {
      elements.dialog.close();
      showMessage(existing ? 'Task updated.' : 'Task added.');
    }
  }

  function changeStatus(id, status) {
    if (!VALID_STATUSES.includes(status)) {
      showMessage('That status is not valid.', 'error');
      render();
      return;
    }
    const nextTasks = tasks.map(task => task.id === id ? { ...task, status } : task);
    if (saveTasks(nextTasks)) showMessage('Task status updated.');
  }

  function deleteTask(id) {
    const task = tasks.find(item => item.id === id);
    if (!task) return;
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    if (saveTasks(tasks.filter(item => item.id !== id))) showMessage('Task deleted.');
  }

  elements.addButton.addEventListener('click', () => openDialog());
  elements.emptyAddButton.addEventListener('click', () => openDialog());
  document.querySelectorAll('.close-dialog').forEach(button => {
    button.addEventListener('click', () => elements.dialog.close());
  });
  elements.form.addEventListener('submit', submitTask);
  elements.search.addEventListener('input', render);
  elements.statusFilter.addEventListener('change', render);
  elements.subjectFilter.addEventListener('change', render);
  elements.sort.addEventListener('change', render);
  elements.dialog.addEventListener('click', event => {
    if (event.target === elements.dialog) elements.dialog.close();
  });

  render();
})();
