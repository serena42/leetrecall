// scheduler.js — Hybrid SM-2 Engine
console.log("LeetRecall: scheduler.js loaded");

/**
 * Compute quality score (0–5) from performance
 */

function computeQuality(performance) {
  // Viewed solution = automatic 0, no matter what else happened
  if (performance.viewedSolution) return 0;

  // Never got accepted
  if (!performance.solved) return 0;

  const { time, attempts } = performance;
  if (time < 15 && attempts === 1) return 5;
  if (time <= 30 && attempts === 1) return 4;
  if (attempts <= 2)               return 3;
  if (attempts <= 4)               return 2;
  return 1;
}
/**
 * Apply SM-2 formula
 */
function sm2(card, quality) {
  card.easeFactor = Math.max(
    1.3,
    card.easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

if (quality < 3) {
    card.repetition = 0;
    card.interval   = 0;
  } else {
    card.repetition += 1;
    if (card.repetition === 1)      card.interval = 1;
    else if (card.repetition === 2) card.interval = 6;
    else card.interval = Math.round(card.interval * card.easeFactor);
  }

  const next = new Date();
  next.setDate(next.getDate() + card.interval);
  next.setHours(0, 0, 0, 0);
  card.nextReview = next.toISOString();

  return card;
}

/**
 * Main entry — called after every submission
 */
function reviewProblem(problemData, performance) {
  chrome.storage.local.get({ problems: [] }, ({ problems }) => {
    const quality = computeQuality(performance);
    let problems_copy = [...problems];

    // Find existing card index
    const existingIdx = problems_copy.findIndex(p => p.id === problemData.id);

    let card;

    if (existingIdx === -1) {
      // Brand new problem — create card
      card = {
        id:          problemData.id,
        title:       problemData.title,
        url:         problemData.url,
        interval:    0,
        repetition:  0,
        easeFactor:  2.5,
        nextReview:  new Date().toISOString(),
        history:     []
      };
      problems_copy.push(card);
    } else {
      // Existing card — use it directly
      card = { ...problems_copy[existingIdx] };
      card.history = card.history || [];
    }

    // Always log this attempt to history
    card.history.push({
      date:           new Date().toISOString(),
      quality,
      solved:         performance.solved,
      time:           performance.time,
      attempts:       performance.attempts,
      viewedSolution: performance.viewedSolution
    });

    // Apply SM-2
    card = sm2(card, quality);

    // Save last performance
    card.lastPerformance = {
      solved:         performance.solved,
      time:           performance.time,
      attempts:       performance.attempts,
      viewedSolution: performance.viewedSolution,
      date:           new Date().toISOString()
    };

    // Update the array
    if (existingIdx === -1) {
      problems_copy[problems_copy.length - 1] = card;
    } else {
      problems_copy[existingIdx] = card;
    }

    // Save to storage
    chrome.storage.local.set({ problems: problems_copy }, () => {
      console.log("LeetRecall: card saved →", {
        title:      card.title,
        quality,
        solved:     performance.solved,
        attempts:   performance.attempts,
        interval:   card.interval,
        repetition: card.repetition,
        easeFactor: card.easeFactor.toFixed(2),
        nextReview: card.nextReview,
        viewedSolution: performance.viewedSolution
      });
    });
  });
}

// Expose to content.js
window.leetRecallScheduler = { reviewProblem };