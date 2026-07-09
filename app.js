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
const availableMinutesInput = document.getElementById("available-minutes");
const generateBtn = document.getElementById("generate-btn");
const clearScheduleBtn = document.getElementById("clear-schedule-btn");
const scheduleListEl = document.getElementById("schedule-list");
const scheduleEmptyEl = document.getElementById("schedule-empty");
const scheduleSummaryEl = document.getElementById("schedule-summary");

const BREAK_MINUTES = 5;
const DEFAULT_EMPTY_TEXT = scheduleEmptyEl.textContent;

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

/**
 * Picks the subset of tasks whose combined duration (plus a break between
 * each pair) best fills the given budget without exceeding it. A schedule
 * of k tasks costs sum(durations) + BREAK_MINUTES * (k - 1), so weighting
 * each task as duration + BREAK_MINUTES turns this into a standard 0/1
 * knapsack: maximize total duration subject to sum(weights) <= budget +
 * BREAK_MINUTES.
 */
function selectTasksForBudget(taskPool, budgetMinutes) {
  const n = taskPool.length;
  if (n === 0 || budgetMinutes <= 0) return { selected: [], totalDuration: 0 };

  const capacity = budgetMinutes + BREAK_MINUTES;
  const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const weight = taskPool[i - 1].duration + BREAK_MINUTES;
    const duration = taskPool[i - 1].duration;
    for (let c = 0; c <= capacity; c++) {
      dp[i][c] = dp[i - 1][c];
      if (weight <= c) {
        const candidate = dp[i - 1][c - weight] + duration;
        if (candidate > dp[i][c]) dp[i][c] = candidate;
      }
    }
  }

  const selected = [];
  let c = capacity;
  for (let i = n; i >= 1; i--) {
    if (dp[i][c] !== dp[i - 1][c]) {
      const task = taskPool[i - 1];
      selected.push(task);
      c -= task.duration + BREAK_MINUTES;
    }
  }
  selected.reverse();

  const totalDuration = selected.reduce((sum, t) => sum + t.duration, 0);
  return { selected, totalDuration };
}

function generateSchedule() {
  scheduleListEl.innerHTML = "";

  if (tasks.length === 0) {
    scheduleEmptyEl.textContent = DEFAULT_EMPTY_TEXT;
    scheduleEmptyEl.classList.remove("hidden");
    scheduleSummaryEl.textContent = "";
    return;
  }

  const budget = Math.max(0, Math.round(Number(availableMinutesInput.value) || 0));
  const { selected, totalDuration } = selectTasksForBudget(tasks, budget);

  if (selected.length === 0) {
    scheduleEmptyEl.textContent = `No task fits in ${budget} min. Try more time or a shorter task.`;
    scheduleEmptyEl.classList.remove("hidden");
    scheduleSummaryEl.textContent = "";
    return;
  }
  scheduleEmptyEl.classList.add("hidden");

  let cursor = parseStartTime(startTimeInput.value || "09:00");

  selected.forEach((task, index) => {
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

    cursor = end + (index < selected.length - 1 ? BREAK_MINUTES : 0);
  });

  const totalUsed = totalDuration + BREAK_MINUTES * (selected.length - 1);
  const leftover = budget - totalUsed;

  scheduleSummaryEl.innerHTML = `
    <span>${selected.length} of ${tasks.length} task${tasks.length === 1 ? "" : "s"} &middot; ${totalDuration} min of work</span>
    <span>${totalUsed} of ${budget} min used (${leftover} left over) &middot; finishes ${formatTime(cursor)}</span>
  `;
}

generateBtn.addEventListener("click", generateSchedule);

clearScheduleBtn.addEventListener("click", () => {
  scheduleListEl.innerHTML = "";
  scheduleSummaryEl.textContent = "";
  scheduleEmptyEl.textContent = DEFAULT_EMPTY_TEXT;
  scheduleEmptyEl.classList.remove("hidden");
});

renderTaskBank();
