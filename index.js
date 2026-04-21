// ============================================================
// ui/index.js — Dashboard Logic
// Reads from chrome.storage and renders the full problem table
// ============================================================

let allProblems  = [];
let activeFilter = "all";
let searchQuery  = "";

// ── Proficiency level based on SM-2 repetition + easeFactor 
function getProficiency(p) {
  const rep = p.repetition || 0;
  const ef  = p.easeFactor || 2.5;
  if (rep === 0)                  return { label: "Novice",     cls: "badge-novice" };
  if (rep <= 3 || ef < 1.8)      return { label: "Learning",   cls: "badge-learning" };
  if (rep <= 5 && ef < 2.3)      return { label: "Familiar",   cls: "badge-familiar" };
  if (rep <= 5 && ef >= 2.3)     return { label: "Proficient", cls: "badge-proficient" };
  if (rep >= 6 && ef >= 2.3)     return { label: "Mastered",   cls: "badge-mastered" };
  return                                 { label: "Familiar",   cls: "badge-familiar" };
}
// ── Acceptance rate from history ─────────────────────────────
function getAcceptanceRate(p) {
  const history = p.history || [];
  if (!history.length) {
    const solved = p.lastPerformance?.solved ? 1 : 0;
    return { rate: solved * 100, label: `${solved * 100}% (${solved}/1)` };
  }
  const total    = history.length;
  const accepted = history.filter(h => h.solved).length;
  const rate     = Math.round((accepted / total) * 100);
  return { rate, label: `${rate}% (${accepted}/${total})` };
}

// ── Average solve time from history ──────────────────────────
function getAvgTime(p) {
  const history = p.history || [];
  if (!history.length) return p.lastPerformance?.time ? `${p.lastPerformance.time}m` : "—";
  const times = history.map(h => h.time).filter(Boolean);
  if (!times.length) return "—";
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  return `${avg}m`;
}

// ── Format date ───────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric"
  });
}

// ── Render table ─────────────────────────────────────────────
function render() {
  const today   = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter
  let list = [...allProblems];
  if (activeFilter === "due") {
    list = list.filter(p => new Date(p.nextReview) <= today);
  } else if (activeFilter === "mastered") {
    list = list.filter(p => getProficiency(p).label === "Mastered");
  }

  // Search
  if (searchQuery) {
    list = list.filter(p =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Sort: due first, then by nextReview
  list.sort((a, b) => {
    const aDue = new Date(a.nextReview) <= today;
    const bDue = new Date(b.nextReview) <= today;
    if (aDue && !bDue) return -1;
    if (!aDue && bDue) return 1;
    return new Date(a.nextReview) - new Date(b.nextReview);
  });

  const tbody = document.getElementById("problem-table");

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row">
      ${searchQuery ? "No problems match your search." : "No problems here yet!"}
    </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((p, idx) => {
    const isDue       = new Date(p.nextReview) <= today;
    const nextDate    = formatDate(p.nextReview);
    const lastDate    = p.lastPerformance ? formatDate(p.history?.[p.history.length - 1]?.date || p.nextReview) : "—";
    const proficiency = getProficiency(p);
    const acceptance  = getAcceptanceRate(p);
    const avgTime     = getAvgTime(p);

    // Acceptance rate color
    const rateClass = acceptance.rate >= 70 ? "rate-high"
                    : acceptance.rate >= 40 ? "rate-medium"
                    : "rate-low";

    // Status
    let statusHtml;
    if (isDue) {
      statusHtml = `<span class="status-due">● Due Now</span>`;
    } else if (proficiency.label === "Mastered") {
      statusHtml = `<span class="status-mastered">Mastered</span>`;
    } else {
      statusHtml = `<span class="status-upcoming">Upcoming</span>`;
    }

    return `
      <tr>
        <td>${idx + 1}</td>
        <td>
          <a class="prob-link" href="${p.url}" target="_blank">${p.title}</a>
        </td>
        <td class="date-cell ${isDue ? "date-due" : ""}">${nextDate}</td>
        <td class="date-cell">${lastDate}</td>
        <td class="${rateClass}">${acceptance.label}</td>
        <td class="date-cell">${avgTime}</td>
        <td><span class="badge ${proficiency.cls}">${proficiency.label}</span></td>
        <td>${statusHtml}</td>
      </tr>
    `;
  }).join("");
}

// ── Update stats bar ──────────────────────────────────────────
function updateStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due      = allProblems.filter(p => new Date(p.nextReview) <= today).length;
  const mastered = allProblems.filter(p => getProficiency(p).label === "Mastered").length;

  document.getElementById("total").textContent    = allProblems.length;
  document.getElementById("due-today").textContent = due;
  document.getElementById("mastered").textContent  = mastered;

  // Simple streak: count consecutive days with at least 1 submission
  const dates = allProblems
    .flatMap(p => (p.history || []).map(h => h.date?.slice(0, 10)))
    .filter(Boolean);
  const uniqueDays = [...new Set(dates)].sort().reverse();
  let streak = 0;
  let checkDate = new Date();
  for (const day of uniqueDays) {
    const d = new Date(day);
    d.setHours(0, 0, 0, 0);
    checkDate.setHours(0, 0, 0, 0);
    const diff = Math.round((checkDate - d) / 86400000);
    if (diff === 0 || diff === 1) { streak++; checkDate = d; }
    else break;
  }
  document.getElementById("streak").textContent = streak;
}

// ── Load from storage ─────────────────────────────────────────
function load() {
  chrome.storage.local.get({ problems: [] }, ({ problems }) => {
    allProblems = problems || [];
    updateStats();
    render();
  });
}

// ── Tab clicks ────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    activeFilter = tab.dataset.filter;
    render();
  });
});

// ── Search ────────────────────────────────────────────────────
document.getElementById("search").addEventListener("input", e => {
  searchQuery = e.target.value;
  render();
});

// ── Init ──────────────────────────────────────────────────────
load();