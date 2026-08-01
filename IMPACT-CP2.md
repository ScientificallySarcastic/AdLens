# AdLens — Impact & Results (CP2)

**What AdLens does:** you open a campaign, and instead of digging through Ads
Manager for half an hour, you get a written explanation of what's wrong and what
to do about it — with every number traceable back to Meta.

This document answers two questions: *how much time does that save?* and *did we
close the gaps raised at CP1?*

---

## 1. The main number: time to a usable answer

We measure one thing above all else — **how long it takes to go from opening a
campaign to having a written, evidence-backed diagnosis you'd act on.**

| | Time | How we measured it |
| --- | --- | --- |
| Doing it by hand | `__` min (median) | Stopwatch, `__` runs, `__` analysts |
| With AdLens | `__` min (median) | Same campaigns, same method |
| **Saved per campaign** | **`__` min** | Difference between the two |

> **To fill this in:** CP1 said our manual baseline was too small a sample. Get
> to at least 10 runs — 5 campaigns × 2 people is about 90 minutes of work.
> Report the middle value (median), and list every individual timing in an
> appendix. Showing the raw numbers is what makes a small sample believable.
> If someone gave up without reaching a conclusion, write that down too — a
> failed manual run is a real result, not a gap in the data.

**What that adds up to.** If `S` is the minutes saved per campaign:

| Campaigns reviewed per week | Hours saved per week | Hours saved per month |
| --- | --- | --- |
| 10 | 10 × S ÷ 60 | × 4.33 |
| 25 | 25 × S ÷ 60 | × 4.33 |
| 50 | 50 × S ÷ 60 | × 4.33 |

Multiply by an hourly rate to get a money figure — use a rate you can point to a
source for.

---

## 2. How often it runs without anyone asking

CP1's criticism was fair: we claimed a schedule but had no real runs behind it.

| | |
| --- | --- |
| Schedule | Every night, 02:00 UTC, for every connected account |
| Nights it has actually run | `__` (read from the `sync_log` table) |
| Campaigns covered per night | 2 live + 55 in the test portfolio |
| Things refreshed per night | 2 campaigns · 2 ad sets · 4 ads |
| Analyses nobody had to trigger | `__` nights × 2 campaigns = `__` |

> **To fill this in:** run `SELECT source, last_synced, detail FROM sync_log;`
> for the history. Let the scheduler run every remaining night before you
> submit and report the true count — **three real nights beats a claimed
> cadence.**

**Why this matters more than the raw count:** a person reviews the campaigns
they have time for. The scheduler reviews *all* of them, every night, and that
doesn't get worse as you add accounts. The ad sets quietly losing money are
exactly the ones nobody gets around to opening.

---

## 3. CP1 feedback — what's fixed

| What CP1 said was missing | Status | Proof |
| --- | --- | --- |
| Not connected to a real ad platform | **Done** | Live: Puzzles Club Business (`act_1036948902205514`), INR, Asia/Kolkata |
| Database written but never deployed | **Done** | Neon Postgres running — 26 campaign, 26 ad set, 37 ad daily rows |
| No tests behind the "every figure is verified" claim | **Done** | 76 automated tests (13 citation, 35 intent, 28 date-range) via `npm test` |
| Couldn't catch a number credited to the wrong ad set | **Done** | Two-pass checker; a real number attached to the wrong ad set is rejected outright |
| Never said how big the problem actually is | **Done** | See below |
| Run-locally steps missing from the doc | **To do** | Copy the README section across |
| Video pacing never checked | **To do** | One cold watch by someone who hasn't seen it |

**The problem, in one sentence:** a campaign manager looking after 8–12 client
accounts with 5–15 campaigns each is responsible for 40–180 campaigns — and can
only manually review the ones there's time for, which means the ad sets quietly
wasting money are the ones nobody opens.

*(Swap in your own account-count figure if you have a sourced one.)*

---

## 4. Does it find the right problems?

| | Value | How we know |
| --- | --- | --- |
| Kinds of problem it detects | 8 | creative fatigue, audience saturation, scale opportunity, budget leak, delivery concentration, insufficient data, efficiency spread, format performance |
| Found the planted fault | 87% | 55 test campaigns with known faults built in |
| Breakdown by problem type | `__` | **Report this** — one overall number can hide a category that never fires |
| False alarms | `__`% | Detections on healthy campaigns ÷ all detections |
| Made-up numbers shown to a user | **0** | 76 tests, zero tolerance for unverifiable or misattributed figures |
| Recommendations acted on | 75% (3 of 4) | From the outcome ledger |

### One result worth demonstrating live

On a Traffic campaign, AdLens reports **3,720 landing page views at ₹0.82 each** —
matching Ads Manager exactly — instead of 2 purchases at ₹1,525.

That's the point: a Traffic campaign gets judged on traffic, not on purchases it
was never set up to produce. Currency and timezone come from the ad account
itself, not from a config file someone had to set.

---

## 5. What we're not claiming

Being straight about the limits:

- **Detection accuracy comes from test data, not live data.** The live account
  has 2 campaigns over 19 days — too small to prove detection rates against.
- **The recommendation success rate is from test data too.** The live account
  hasn't been running long enough to have a recommendation history.
- **We don't report audience saturation as a percentage.** Meta's API doesn't
  give a total audience size to divide by, so we show peak single-day reach
  instead of inventing a share.
- **Connecting a client's account still needs Meta's partner access** — the
  normal agency route. One-click self-serve connection is built, but Meta App
  Review has to approve it before outside users can use it.

---

## 6. How to fill in the blanks

Everything marked `__` needs a real measurement. In priority order:

1. **Manual baseline timings** — the headline number depends entirely on this.
   Two people, five campaigns, a stopwatch. ~90 minutes.
2. **Nightly run count** — free; just let the scheduler run and read `sync_log`
   the morning you submit.
3. **Detection breakdown by category** — from the test portfolio results.
4. **False-positive rate** — run detection over the fault-free test campaigns
   and count what fires.

Do not estimate these. A blank you explain is more credible than a number you
can't defend — and if a reviewer asks where a figure came from, "we measured it,
here are the raw runs" is the only answer that holds up.
