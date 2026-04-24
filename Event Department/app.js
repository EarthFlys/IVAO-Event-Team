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
    ["🎫 Token Event", "100 เหรียญ"],
    ["✅ ใช้แล้ว", "77 เหรียญ (23.5%)"],
    ["📌 จองไว้", "6 เหรียญ (15%)"],
    ["💰 คงเหลือ", "17 เหรียญ (61.5%)"],
    ["🏆 อีเวนท์ที่ผ่านมา", "115 ครั้ง"],
];

const state = {
    tasks: loadTasks(),
    monthCursor: new Date(),
    editingTaskId: null, // เก็บ ID ของงานที่กำลังแก้ไข
};

const els = {
    taskTableBody: document.getElementById("taskTableBody"),
    emptyTaskMessage: document.getElementById("emptyTaskMessage"),
    overallProgressLabel: document.getElementById("overallProgressLabel"),
    lastUpdated: document.getElementById("lastUpdated"),
    calendarGrid: document.getElementById("calendarGrid"),
    calendarTitle: document.getElementById("calendarTitle"),
    upcomingList: document.getElementById("upcomingList"),
    teamSplit: document.getElementById("teamSplit"),
    pipelineList: document.getElementById("pipelineList"),
    taskDialog: document.getElementById("taskDialog"),
    taskForm: document.getElementById("taskForm"),
    dialogTitle: document.getElementById("dialogTitle"),
    taskId: document.getElementById("taskId"),
    taskTitle: document.getElementById("taskTitle"),
    taskOwner: document.getElementById("taskOwner"),
    taskDueDate: document.getElementById("taskDueDate"),
    taskProgress: document.getElementById("taskProgress"),
    taskStatus: document.getElementById("taskStatus"),
    cancelDialogBtn: document.getElementById("cancelDialogBtn"),
    addTaskBtn: document.getElementById("addTaskBtn"),
    prevMonthBtn: document.getElementById("prevMonthBtn"),
    nextMonthBtn: document.getElementById("nextMonthBtn"),
};

// ===== Event Listeners =====

// Add Task Button
els.addTaskBtn.addEventListener("click", () => {
    openAddDialog();
});

// Cancel Dialog Button
els.cancelDialogBtn.addEventListener("click", () => {
    els.taskDialog.close();
});

// Calendar Navigation
els.prevMonthBtn.addEventListener("click", () => {
    state.monthCursor = new Date(state.monthCursor.getFullYear(), state.monthCursor.getMonth() - 1, 1);
    renderCalendar();
});

els.nextMonthBtn.addEventListener("click", () => {
    state.monthCursor = new Date(state.monthCursor.getFullYear(), state.monthCursor.getMonth() + 1, 1);
    renderCalendar();
});

// Task Form Submit (Add/Edit)
els.taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(els.taskForm);
    const taskId = String(data.get("taskId") || "");

    if (taskId) {
        // Editing existing task
        const taskIndex = state.tasks.findIndex((t) => t.id === taskId);
        if (taskIndex !== -1) {
            state.tasks[taskIndex] = {
                ...state.tasks[taskIndex],
                title: String(data.get("title") || "").trim(),
                owner: String(data.get("owner") || "").trim(),
                dueDate: String(data.get("dueDate") || ""),
                progress: Number(data.get("progress") || 0),
                status: String(data.get("status") || "Planned"),
            };
        }
    } else {
        // Adding new task
        state.tasks.push({
            id: crypto.randomUUID(),
            title: String(data.get("title") || "").trim(),
            owner: String(data.get("owner") || "").trim(),
            dueDate: String(data.get("dueDate") || ""),
            progress: Number(data.get("progress") || 0),
            status: String(data.get("status") || "Planned"),
        });
    }

    saveTasks();
    resetDialog();
    els.taskDialog.close();
    renderAll();
});

// Navbar Navigation
document.querySelectorAll(".nav-link[data-section]").forEach((link) => {
    link.addEventListener("click", (e) => {
        e.preventDefault();

        // Remove active from all
        document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"));
        // Add active to clicked
        link.classList.add("active");

        const section = link.getAttribute("data-section");
        scrollToSection(section);
    });
});

// ===== Dialog Functions =====
function openAddDialog() {
    state.editingTaskId = null;
    els.dialogTitle.textContent = "➕ เพิ่มงานใหม่";
    els.taskId.value = "";
    els.taskForm.reset();
    els.taskProgress.value = 0;
    els.taskStatus.value = "Planned";
    els.taskDialog.showModal();
}

function openEditDialog(taskId) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    state.editingTaskId = taskId;
    els.dialogTitle.textContent = "✏️ แก้ไขงาน";
    els.taskId.value = task.id;
    els.taskTitle.value = task.title;
    els.taskOwner.value = task.owner;
    els.taskDueDate.value = task.dueDate;
    els.taskProgress.value = task.progress;
    els.taskStatus.value = task.status;
    els.taskDialog.showModal();
}

function resetDialog() {
    state.editingTaskId = null;
    els.taskId.value = "";
    els.taskForm.reset();
}

// ===== Scroll To Section =====
function scrollToSection(sectionName) {
    const sectionMap = {
        dashboard: null, // scroll to top
        tasks: "tasksSection",
        calendar: "calendarSection",
        team: "teamSection",
        pipeline: "pipelineSection",
    };

    const sectionId = sectionMap[sectionName];
    if (sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    } else {
        // Dashboard - scroll to top
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

// ===== Render Functions =====
function renderAll() {
    renderTaskTable();
    renderCalendar();
    renderTeamSplit();
    renderPipeline();
    renderHeaderStats();
}

function renderTaskTable() {
    if (state.tasks.length === 0) {
        els.taskTableBody.innerHTML = "";
        els.emptyTaskMessage.style.display = "block";
        return;
    }

    els.emptyTaskMessage.style.display = "none";

    const rows = state.tasks
        .slice()
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .map(
            (task) => `
            <tr>
                <td><strong>${escapeHtml(task.title)}</strong></td>
                <td>${escapeHtml(task.owner)}</td>
                <td>${formatThaiDate(task.dueDate)}</td>
                <td><span class="status-pill ${statusClass(task.status)}">${task.status}</span></td>
                <td>
                    <div class="progress-track" role="progressbar" aria-valuenow="${task.progress}" aria-valuemin="0" aria-valuemax="100">
                        <div class="progress-fill" style="width:${task.progress}%"></div>
                    </div>
                    <small>${task.progress}%</small>
                </td>
                <td>
                    <button class="btn btn--ghost btn--sm" data-edit="${task.id}" title="แก้ไข">✏️</button>
                    <button class="btn btn--ghost btn--sm" data-delete="${task.id}" title="ลบ" style="color:var(--danger);">🗑️</button>
                </td>
            </tr>`
        )
        .join("");

    els.taskTableBody.innerHTML = rows;

    // Edit buttons
    els.taskTableBody.querySelectorAll("[data-edit]").forEach((button) => {
        button.addEventListener("click", () => {
            const id = button.getAttribute("data-edit");
            openEditDialog(id);
        });
    });

    // Delete buttons
    els.taskTableBody.querySelectorAll("[data-delete]").forEach((button) => {
        button.addEventListener("click", () => {
            const id = button.getAttribute("data-delete");
            if (confirm("คุณแน่ใจที่จะลบงานนี้?")) {
                state.tasks = state.tasks.filter((task) => task.id !== id);
                saveTasks();
                renderAll();
            }
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
            <div>${taskCount ? `<span class='day-dot'></span>${taskCount} งาน` : ""}</div>
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
                `<li><strong>${escapeHtml(task.title)}</strong> · ${escapeHtml(task.owner)} · <span style="color:var(--accent);">${formatThaiDate(
                    task.dueDate
                )}</span></li>`
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

    els.teamSplit.innerHTML = html || "<p style='color:var(--text-sub); text-align:center; padding:1rem;'>ยังไม่มีการมอบหมายงาน</p>";
}

function renderPipeline() {
    const totalToken = 100;
    const usedToken = 77;
    const reservedToken = 6;
    const remainingToken = totalToken - usedToken - reservedToken;
    
    const usedPercent = (usedToken / totalToken) * 100;
    const reservedPercent = (reservedToken / totalToken) * 100;
    const remainingPercent = (remainingToken / totalToken) * 100;

    els.pipelineList.innerHTML = `
        <article class="pipeline-step">
            <strong>🎫 TH remaining tokens</strong>
            <span>${totalToken.toLocaleString()} Token</span>
        </article>
        
        <div class="token-progress-container">
            <div class="token-progress-bar">
                <div class="token-used" style="width:${usedPercent}%" title="ใช้แล้ว: ${usedToken} เหรียญ"></div>
                <div class="token-reserved" style="width:${reservedPercent}%" title="จองไว้: ${reservedToken} เหรียญ"></div>
                <div class="token-remaining" style="width:${remainingPercent}%" title="คงเหลือ: ${remainingToken} เหรียญ"></div>
            </div>
            <div class="token-legend">
                <span>🔴 ใช้แล้ว ${usedToken}</span>
                <span>🟡 จอง ${reservedToken}</span>
                <span>🟢 คงเหลือ ${remainingToken}</span>
            </div>
        </div>
        
        <article class="pipeline-step"> 
            <strong>📊 ESA Token</strong>
            <span>4/5 Token</span>
        </article>
        <article class="pipeline-step">
            <strong>📅 Past Event</strong>
            <span>Forever In Our Hearts</span>
        </article>
        <article class="pipeline-step">
            <strong>🎯 Next Event</strong>
            <span>Bangkok RFE 2026</span>
        </article>
    `;
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

// ===== Utility Functions =====
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
        saveDefaultTasks();
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

function saveDefaultTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultTasks));
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// ===== Initial Render =====
renderAll();

