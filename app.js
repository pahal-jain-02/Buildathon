const STORAGE_KEY = "timeweaver.tasks";

/** @type {{id: string, name: string, duration: number}[]} */
let tasks = loadTasks();

const taskForm = document.getElementById("task-form");
const taskNameInput = document.getElementById("task-name");
const taskDurationSelect = document.getElementById("task-duration");
const taskListEl = document.getElementById("task-list");
const bankEmptyEl = document.getElementById("bank-empty");
const taskCountEl = document.getElementById("task-count");
const taskTotalEl = document.getElementById("task-total");

const startTimeInput = document.getElementById("start-time");
const bufferMinutesSelect = document.getElementById("buffer-minutes");
const generateBtn = document.getElementById("generate-btn");
const clearScheduleBtn = document.getElementById("clear-schedule-btn");
const scheduleListEl = document.getElementById("schedule-list");
const scheduleEmptyEl = document.getElementById("schedule-empty");
const scheduleSummaryEl = document.getElementById("schedule-summary");

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function renderTaskBank() {
  taskListEl.innerHTML = "";

  bankEmptyEl.classList.toggle("hidden", tasks.length > 0);

  for (const task of tasks) {
    const li = document.createElement("li");
    li.className = "task-item";
    li.innerHTML = `
      <span class="task-name"></span>
      <span class="task-meta">
        <span class="duration-badge">${task.duration} min</span>
        <button class="remove-btn" title="Remove task" data-id="${task.id}">&times;</button>
      </span>
    `;
    li.querySelector(".task-name").textContent = task.name;
    taskListEl.appendChild(li);
  }

  taskCountEl.textContent = `${tasks.length} task${tasks.length === 1 ? "" : "s"}`;
  const total = tasks.reduce((sum, t) => sum + t.duration, 0);
  taskTotalEl.textContent = `${total} min total`;
}

taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = taskNameInput.value.trim();
  const duration = Number(taskDurationSelect.value);
  if (!name) return;

  tasks.push({ id: makeId(), name, duration });
  saveTasks();
  renderTaskBank();

  taskNameInput.value = "";
  taskNameInput.focus();
});

taskListEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".remove-btn");
  if (!btn) return;
  tasks = tasks.filter((t) => t.id !== btn.dataset.id);
  saveTasks();
  renderTaskBank();
});

function formatTime(minutesSinceMidnight) {
  const h = Math.floor(minutesSinceMidnight / 60) % 24;
  const m = minutesSinceMidnight % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}:${String(m).padStart(2, "0")} ${period}`;
}

function parseStartTime(value) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function generateSchedule() {
  scheduleListEl.innerHTML = "";

  if (tasks.length === 0) {
    scheduleEmptyEl.classList.remove("hidden");
    scheduleSummaryEl.textContent = "";
    return;
  }
  scheduleEmptyEl.classList.add("hidden");

  const buffer = Number(bufferMinutesSelect.value);
  let cursor = parseStartTime(startTimeInput.value || "09:00");
  const scheduleStart = cursor;

  tasks.forEach((task, index) => {
    const start = cursor;
    const end = cursor + task.duration;

    const li = document.createElement("li");
    li.className = "schedule-item";
    li.innerHTML = `
      <span class="time-range">${formatTime(start)} &ndash; ${formatTime(end)}</span>
      <span class="task-name"></span>
      <span class="duration-badge">${task.duration} min</span>
    `;
    li.querySelector(".task-name").textContent = task.name;
    scheduleListEl.appendChild(li);

    cursor = end + (index < tasks.length - 1 ? buffer : 0);
  });

  const totalSpan = cursor - scheduleStart;
  const hours = Math.floor(totalSpan / 60);
  const mins = totalSpan % 60;
  const spanText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  scheduleSummaryEl.innerHTML = `
    <span>${tasks.length} task${tasks.length === 1 ? "" : "s"} scheduled</span>
    <span>Finishes ${formatTime(cursor)} &middot; spans ${spanText}</span>
  `;
}

generateBtn.addEventListener("click", generateSchedule);

clearScheduleBtn.addEventListener("click", () => {
  scheduleListEl.innerHTML = "";
  scheduleSummaryEl.textContent = "";
  scheduleEmptyEl.classList.remove("hidden");
});

renderTaskBank();
