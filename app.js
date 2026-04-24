const STORAGE_KEY = "ivao-th-taskboard-v1";

const defaultTasks = [
  {
    id: crypto.randomUUID(),
    title: "เชื่อมต่อ Whazzup Collector (30s)",
    owner: "Backend Team",
    dueDate: dateOffset(1),
    status: "In Progress",
    progress: 65,
  },
  {
    id: crypto.randomUUID(),
    title: "ออกแบบ Supabase schema + index",
    owner: "Data Team",
    dueDate: dateOffset(3),
    status: "Planned",
    progress: 20,
  },
  {
    id: crypto.randomUUID(),
    title: "Deploy dashboard บน Vercel",
    owner: "Frontend Team",
    dueDate: dateOffset(5),
    status: "In Progress",
    progress: 45,
  },
  {
    id: crypto.randomUUID(),
    title: "ทดสอบ smooth UX + mobile",
    owner: "QA Team",
    dueDate: dateOffset(7),
    status: "Planned",
    progress: 0,
  },
];

const pipelineData = [
  ["Collector", "Node.js poll IVAO Whazzup API ทุก 30 วินาที"],
  ["Database", "Supabase PostgreSQL เก็บ flight/session + snapshots"],
  ["API / Edge", "ดึงข้อมูล aggregate ไปหน้า dashboard"],
  ["Frontend", "HTML/CSS/app.js แสดงสถานะงานและ timeline"],
  ["Deployment", "Vercel auto-deploy จาก Git push"],
];

const state = {
  tasks: loadTasks(),
  monthCursor: new Date(),
};

const els = {
  taskTableBody: document.getElementById("taskTableBody"),
  overallProgressLabel: document.getElementById("overallProgressLabel"),
  lastUpdated: document.getElementById("lastUpdated"),
  calendarGrid: document.getElementById("calendarGrid"),
  calendarTitle: document.getElementById("calendarTitle"),
  upcomingList: document.getElementById("upcomingList"),
  teamSplit: document.getElementById("teamSplit"),
  pipelineList: document.getElementById("pipelineList"),
  taskDialog: document.getElementById("taskDialog"),
  taskForm: document.getElementById("taskForm"),
};

document.getElementById("addTaskBtn").addEventListener("click", () => {
  els.taskDialog.showModal();
});

document.getElementById("cancelDialogBtn").addEventListener("click", () => {
  els.taskDialog.close();
});

document.getElementById("prevMonthBtn").addEventListener("click", () => {
  state.monthCursor = new Date(state.monthCursor.getFullYear(), state.monthCursor.getMonth() - 1, 1);
  renderCalendar();
});

document.getElementById("nextMonthBtn").addEventListener("click", () => {
  state.monthCursor = new Date(state.monthCursor.getFullYear(), state.monthCursor.getMonth() + 1, 1);
  renderCalendar();
});

els.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(els.taskForm);

  state.tasks.push({
    id: crypto.randomUUID(),
    title: String(data.get("title") || "").trim(),
    owner: String(data.get("owner") || "").trim(),
    dueDate: String(data.get("dueDate") || ""),
    progress: Number(data.get("progress") || 0),
    status: String(data.get("status") || "Planned"),
  });

  saveTasks();
  els.taskForm.reset();
  els.taskDialog.close();
  renderAll();
});

function renderAll() {
  renderTaskTable();
  renderCalendar();
  renderTeamSplit();
  renderPipeline();
  renderHeaderStats();
}

function renderTaskTable() {
  const rows = state.tasks
    .slice()
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .map(
      (task) => `
      <tr>
        <td>${escapeHtml(task.title)}</td>
        <td>${escapeHtml(task.owner)}</td>
        <td>${formatThaiDate(task.dueDate)}</td>
        <td><span class="status-pill ${statusClass(task.status)}">${task.status}</span></td>
        <td>
          <div class="progress-track" role="progressbar" aria-valuenow="${task.progress}" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-fill" style="width:${task.progress}%"></div>
          </div>
          <small>${task.progress}%</small>
        </td>
        <td><button class="btn btn--ghost" data-delete="${task.id}">ลบ</button></td>
      </tr>`
    )
    .join("");

  els.taskTableBody.innerHTML = rows;

  els.taskTableBody.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-delete");
      state.tasks = state.tasks.filter((task) => task.id !== id);
      saveTasks();
      renderAll();
    });
  });
}

function renderCalendar() {
  const month = state.monthCursor.getMonth();
  const year = state.monthCursor.getFullYear();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  els.calendarTitle.textContent = firstDay.toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  });

  const heads = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]
    .map((d) => `<div class="day-cell day-cell--head">${d}</div>`)
    .join("");

  let cells = "";
  for (let i = 0; i < startWeekday; i += 1) {
    const day = daysInPrev - startWeekday + i + 1;
    cells += `<div class="day-cell day-cell--muted">${day}</div>`;
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const current = new Date(year, month, day);
    const iso = toIso(current);
    const taskCount = state.tasks.filter((t) => t.dueDate === iso).length;
    const isToday = toIso(new Date()) === iso;

    cells += `<div class="day-cell ${isToday ? "day-cell--today" : ""}">
      <div>${day}</div>
      <div>${taskCount ? `<span class='day-dot'></span>${taskCount}` : ""}</div>
    </div>`;
  }

  const totalCells = startWeekday + daysInMonth;
  const rem = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= rem; i += 1) {
    cells += `<div class="day-cell day-cell--muted">${i}</div>`;
  }

  els.calendarGrid.innerHTML = heads + cells;

  const upcoming = state.tasks
    .slice()
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5)
    .map(
      (task) =>
        `<li><strong>${escapeHtml(task.title)}</strong> · ${escapeHtml(task.owner)} · ${formatThaiDate(
          task.dueDate
        )}</li>`
    )
    .join("");

  els.upcomingList.innerHTML = upcoming || "<li>ยังไม่มีงานที่กำหนดไว้</li>";
}

function renderTeamSplit() {
  const map = new Map();

  state.tasks.forEach((task) => {
    const entry = map.get(task.owner) || { total: 0, progress: 0 };
    entry.total += 1;
    entry.progress += task.progress;
    map.set(task.owner, entry);
  });

  const html = [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([owner, stat]) => {
      const avg = Math.round(stat.progress / stat.total) || 0;
      return `<article class="person-card">
        <div class="person-header"><strong>${escapeHtml(owner)}</strong><span>${stat.total} งาน</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${avg}%"></div></div>
        <small>Avg progress ${avg}%</small>
      </article>`;
    })
    .join("");

  els.teamSplit.innerHTML = html || "<p>ยังไม่มีการมอบหมายงาน</p>";
}

function renderPipeline() {
  els.pipelineList.innerHTML = pipelineData
    .map(
      ([name, detail]) => `<article class="pipeline-step">
      <strong>${name}</strong>
      <span>${detail}</span>
    </article>`
    )
    .join("");
}

function renderHeaderStats() {
  const total = state.tasks.length;
  const progress = total ? Math.round(state.tasks.reduce((sum, t) => sum + t.progress, 0) / total) : 0;

  els.overallProgressLabel.textContent = `${progress}%`;
  els.lastUpdated.textContent = new Date().toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusClass(status) {
  return `status-${status.toLowerCase().replaceAll(" ", "-")}`;
}

function dateOffset(offset) {
  const now = new Date();
  now.setDate(now.getDate() + offset);
  return toIso(now);
}

function formatThaiDate(input) {
  const date = new Date(input);
  return date.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
}

function toIso(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return defaultTasks;
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((task) => typeof task === "object" && task)) {
      return parsed;
    }
    return defaultTasks;
  } catch {
    return defaultTasks;
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

renderAll();
