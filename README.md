# LeetRecall

LeetRecall is a Chrome extension that helps you actually remember the LeetCode problems you solve. It tracks your submissions automatically and tells you when to review each problem again, so you stop re-solving problems you've already done from scratch.

It uses spaced repetition — the same technique used by top memory apps like Anki. Problems you struggle with come back sooner. Problems you know well are spaced out over weeks or months.

No manual input needed. Just solve problems like you normally would.


## Installation

1. Download this repo — click the green Code button above, then Download ZIP, and extract the folder
2. Open Chrome and go to chrome://extensions
3. Turn on Developer Mode using the toggle in the top right corner
4. Click Load unpacked and select the leetrecall folder you just extracted
5. The LeetRecall icon will appear in your Chrome toolbar

That's it. No setup, no account, no configuration needed.


## How to use it

1) Once installed, just use LeetCode normally. Go to any problem, write your solution, and click Submit.

2) LeetRecall silently tracks everything in the background, whether you got Accepted or Wrong Answer, how long you took, how many attempts you needed, and whether you looked at the Solutions or Editorial tab.

3) After each submission it calculates when you should review that problem again and saves it automatically.

4) **To see what's due for review today**, click the LeetRecall icon in your Chrome toolbar. The Due Today tab shows all problems scheduled for today. Click any problem title to go directly to it on LeetCode.

5) **To see all your tracked problems**, click View All Problems in the popup. This opens the full dashboard where you can see every problem you've solved, your next scheduled date for each, proficiency badges, acceptance rates, and average solve times.


## How the scheduling works

After each submission, LeetRecall gives it a score from 0 to 5 based on your performance.

A score of 5 means you solved it fast and clean on the first try. A score of 0 means you got a wrong answer, gave up, or viewed the solution. Everything in between depends on your time and number of attempts.

Higher score = longer gap before the next review. Lower score = comes back tomorrow.

If you view the Solutions or Editorial tab on a problem, it's automatically treated as a failed attempt regardless of whether you submitted correctly after. The idea is — if you needed to look at the answer, you don't really know it yet.


## Proficiency levels

As you successfully review a problem multiple times, its proficiency badge updates.

1) Novice means you've never reviewed it. Learning means you're still getting familiar with it. 
2) Familiar and Proficient mean you're reviewing it consistently well.
3) Mastered means you've reviewed it many times with strong performance — it'll only come back every few months.


## Daily reminders

At 9am every day, if you have problems due for review, you'll get a browser notification. Click it to open the dashboard directly.


## Troubleshooting

If the extension doesn't seem to be tracking a submission, try reloading it. Go to chrome://extensions, find LeetRecall, and click the reload icon. Then close and reopen the LeetCode tab.

To clear all your saved data and start fresh, open DevTools on any LeetCode page (press F12, go to Console) and run:

chrome.storage.local.clear(() => console.log("cleared"))


## Built with

Plain JavaScript, Chrome Extension Manifest V3, and the SM-2 spaced repetition algorithm. No external dependencies.
