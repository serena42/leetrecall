// ============================================================
// content.js — LeetCode Page Tracker
// ============================================================
console.log("LeetRecall: content.js loaded");

let startTime      = Date.now();
let attempts       = 0;
let viewedSolution = false;
let observerActive = false;
let submitHooked   = false;

const TERMINAL_STATES = [
  "accepted",
  "wrong answer",
  "runtime error",
  "time limit exceeded",
  "memory limit exceeded",
  "compile error",
  "output limit exceeded"
];

// ── Get problem metadata ─────────────────────────────────────
function getProblemData() {
  const slugMatch = window.location.pathname.match(/\/problems\/([^/]+)/);
  const slug      = slugMatch ? slugMatch[1] : null;
  const cleanId   = slug ? `/problems/${slug}` : window.location.pathname;

  const titleFromSlug = slug
    ? slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    : "Unknown Problem";

  const titleEl =
    document.querySelector('[data-cy="question-title"]')            ||
    document.querySelector('[class*="title__"][class*="question"]') ||
    document.querySelector('.mr-2.text-label-1')                    ||
    document.querySelector('div[class*="question-title"]');

  let title = titleEl ? titleEl.innerText.trim().replace(/^\d+\.\s*/, "") : "";
  if (!title || title.length < 2) title = titleFromSlug;

  return {
    id:    cleanId,
    title: title,
    url:   `https://leetcode.com${cleanId}/`
  };
}

// ── Send performance data to scheduler ───────────────────────
function sendToScheduler(performance) {
  let retries = 0;
  const check = setInterval(() => {
    retries++;
    if (window.leetRecallScheduler?.reviewProblem) {
      try {
        window.leetRecallScheduler.reviewProblem(getProblemData(), performance);
      } catch (e) {
        console.log("LeetRecall: scheduler error →", e.message);
      }
      clearInterval(check);
    }
    if (retries > 50) clearInterval(check);
  }, 100);
}

// ── Find result element — works for Accepted AND Wrong Answer ─
function findResultElement() {
  const byLocator = document.querySelector('[data-e2e-locator="submission-result"]');
  if (byLocator) {
    const text = byLocator.innerText.trim().toLowerCase();
    if (TERMINAL_STATES.some(s => text.includes(s))) return byLocator;
  }

  const h3Match = Array.from(document.querySelectorAll("h3")).find(el => {
    const text = el.innerText.trim().toLowerCase();
    return TERMINAL_STATES.some(s => text.includes(s));
  });
  if (h3Match) return h3Match;

  const anyMatch = Array.from(document.querySelectorAll("span, div, p")).find(el => {
    if (el.children.length > 0) return false;
    const text = el.innerText.trim().toLowerCase();
    return TERMINAL_STATES.some(s => text === s);
  });

  return anyMatch || null;
}

// ── Watch DOM for submission result ──────────────────────────
function watchForResultText(callback) {
  let fired = false;

  function checkResult() {
    if (fired) return;
    const el = findResultElement();
    if (!el) return;
    const text    = el.innerText.trim().toLowerCase();
    const matched = TERMINAL_STATES.find(s => text.includes(s));
    if (!matched) return;
    fired = true;
    observer.disconnect();
    observerActive = false;
    const solved = matched === "accepted";
    console.log("LeetRecall: result →", solved ? "✅ Accepted" : "❌ " + matched);
    callback(solved);
  }

  const observer = new MutationObserver(checkResult);
  observer.observe(document.body, { childList: true, subtree: true });
  checkResult();

  setTimeout(() => {
    if (!fired) {
      observer.disconnect();
      observerActive = false;
      console.log("LeetRecall: timed out waiting for result");
    }
  }, 60000);
}

// ── Wait for /submissions/NUMBER/ URL then watch result ──────
function waitForSubmissionResult(callback) {
  if (observerActive) return;
  observerActive = true;

  console.log("LeetRecall: waiting for submission URL...");

  const pollInterval = setInterval(() => {
    const url = window.location.href;
    if (/\/problems\/[^/]+\/submissions\/\d+/.test(url)) {
      clearInterval(pollInterval);
      console.log("LeetRecall: submission URL confirmed →", url);
      setTimeout(() => watchForResultText(callback), 300);
    }
  }, 300);

  setTimeout(() => {
    clearInterval(pollInterval);
    if (observerActive) {
      observerActive = false;
      console.log("LeetRecall: timed out waiting for URL");
    }
  }, 60000);
}

// ── Called after each submission result detected ─────────────
function onSubmitResult(solved) {
  attempts += 1;
  const timeTaken = Math.max(1, Math.round((Date.now() - startTime) / 60000));

  const performance = {
    solved,
    time:           timeTaken,
    attempts,
    viewedSolution
  };

  console.log("LeetRecall: recording →", performance);
  sendToScheduler(performance);
}

// ── Hook Submit button ────────────────────────────────────────
function initSubmitHook() {
  if (submitHooked) return;

  const allBtns   = Array.from(document.querySelectorAll("button"));
  const submitBtn =
    document.querySelector('[data-e2e-locator="console-submit-button"]') ||
    allBtns.find(btn => btn.textContent.trim().toLowerCase() === "submit");

  if (!submitBtn) { setTimeout(initSubmitHook, 1000); return; }
  if (submitBtn.textContent.trim().toLowerCase().includes("run")) {
    setTimeout(initSubmitHook, 1000); return;
  }
  if (submitBtn.dataset.leetRecallHooked === "true") {
    submitHooked = true; return;
  }

  submitHooked = true;
  submitBtn.dataset.leetRecallHooked = "true";

  submitBtn.addEventListener("click", () => {
    console.log("LeetRecall: submit clicked");
    waitForSubmissionResult(onSubmitResult);
  });

  console.log("LeetRecall: submit button hooked");
}

// ── Detect solution/editorial viewing via URL change ─────────
// This is the most reliable approach — instead of trying to hook
// a click on the tab, we just watch the URL.
// When URL changes to /solutions/ or /editorial — user viewed solution.
// Also watch the DOM for editorial content appearing on the page.
function initViewSolutionHook() {
  let lastPath = window.location.pathname;

  function checkIfViewingSolution(path) {
    if (viewedSolution) return;

    // ONLY trigger on URL — most reliable signal
    if (path.includes("/solutions") || path.includes("/editorial")) {
      viewedSolution = true;
      console.log("LeetRecall: solution URL detected — marking as viewed");
    }
  }

  // Watch URL changes only
  const observer = new MutationObserver(() => {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      lastPath = currentPath;
      checkIfViewingSolution(currentPath);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Check on page load
  checkIfViewingSolution(window.location.pathname);
}

// ── Reset tracking for new problem ───────────────────────────
function resetTracking() {
  startTime      = Date.now();
  attempts       = 0;
  viewedSolution = false;
  observerActive = false;
  submitHooked   = false;
  console.log("LeetRecall: tracking reset for new problem");
}

// ── Watch for React SPA navigation ───────────────────────────
function watchForNavigation() {
  function getBasePath(path) {
    return path
      .replace(/\/submissions\/.*/, "")
      .replace(/\/solutions.*/, "")
      .replace(/\/editorial.*/, "")
      .replace(/\/description.*/, "")
      .replace(/\/$/, "");
  }

  let lastBase = getBasePath(window.location.pathname);

  const navObserver = new MutationObserver(() => {
    const currentBase = getBasePath(window.location.pathname);
    if (currentBase === lastBase) return;
    if (!currentBase.includes("/problems/")) {
      lastBase = currentBase;
      return;
    }
    console.log("LeetRecall: navigated to new problem →", currentBase);
    lastBase = currentBase;
    resetTracking();
    setTimeout(() => {
      initSubmitHook();
    }, 1500);
  });

  navObserver.observe(document.body, { childList: true, subtree: true });
}

// ── Init ──────────────────────────────────────────────────────
initSubmitHook();
initViewSolutionHook();
watchForNavigation();