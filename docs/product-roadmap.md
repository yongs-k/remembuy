# REMEMBUY — Product Roadmap: Toward a Personalized Consumption AI

## Vision

REMEMBUY's end goal is a personalized consumption AI: an assistant that
learns each household's actual buying habits and eventually proposes
restocks before the user has to think about it. Every feature shipped
before that AI exists should be read through this lens — is it useful on
its own, and does it also produce data the AI will need later?

## Phase 1 — Now (this prototype): make data collection enjoyable

Recording items, ranking/recommendation, notifications, the share feed,
and the gamification layer (profile, points, quests, titles) are not just
UX polish — they are the mechanism that gets users to voluntarily and
repeatedly log real purchase behavior. A user who enjoys stamping
"추천/비추천" on their skincare and chasing a "욕실마스터" title is,
incidentally, generating exactly the labeled data Phase 2 needs. Every
Phase 1 feature should be designed so the fun and the data collection are
the same action, not two competing goals.

The current data model already doubles as this AI's first-generation
training material:
- `Item.recommendation` ('recommend' | 'notRecommend') — an explicit
  preference signal per product (this field replaced the earlier
  `Item.rating` star score during the Group A migration; same role,
  binary instead of 1-5).
- `Item.place` — where the user actually buys a given item (channel
  preference).
- `Item.restockCycle` — the user's own stated repurchase cadence.
- `Item.note` — free-text signal (brand loyalty, specific complaints,
  substitution notes) not yet structured but not thrown away either.

No schema change is required to start Phase 2 — the fields already exist
because Group A's UI work needed them anyway.

## Phase 2 — Analyze accumulated records

Once enough Phase 1 usage history exists per household, mine it for:
- Purchase cadence per item/category (actual gaps between records vs. the
  user's stated `restockCycle`, to catch drift).
- Preference patterns (which categories/locations get consistently
  `recommend`d vs. `notRecommend`d, which get logged and then never
  bought again).

This phase is analysis over existing recorded data — no new user-facing
surface is required yet, though its outputs (e.g., "이 항목은 평균 42일마다
재구매됨") may start surfacing inside Phase 1 screens as they become
available.

## Phase 3 — Proactive and conversational recommendation

The payoff surface: the app starts initiating instead of waiting to be
asked — "슬슬 세제 떨어질 때예요, 다시 담을까요?" — driven by Phase 2's
cadence/preference model, escalating toward conversational recommendation
(the user can ask "우리집 요즘 뭐 자주 떨어져?" and get an answer grounded
in their own recorded history, not a generic catalog).

## Recommended build order

Do not jump straight to a trained model. Build up in stages, each shippable
and each a stepping stone to the next:

1. **Rule-based first.** Phase 3's "슬슬 떨어질 때예요" nudge starts as a
   plain rule: `today - lastRecordedDate(item) >= item.restockCycle`. This
   requires nothing but data already in `Item` and ships value immediately.
2. **Statistical refinement.** Once real usage history accumulates, replace
   the user's stated `restockCycle` with an observed average/median gap
   between records for that item, recomputed as new data comes in.
3. **Learned/model-based, last.** Only once rule-based and statistical
   approaches are validated (and there's enough data to justify it) does
   it make sense to introduce an actual model — for ranking multiple
   candidate nudges, personalizing timing/wording, or supporting free-form
   conversational queries. This is the most expensive and slowest-to-
   validate step, so it comes last, not first.

Each stage should be individually useful even if the next stage never
gets built — a hallmark of the rule-based nudge is that it already
delivers the core Phase 3 experience without any AI/ML dependency.

## Relationship to current work

- The Group A UI/UX plan (`docs/superpowers/plans/2026-09-11-remembuy-group-a.md`)
  and the home-screen gamification mockup
  (`docs/superpowers/specs/2026-09-15-home-gamification-mockup-design.md`)
  are both Phase 1 work: visual/UX only, no analysis or recommendation
  logic. This is intentional — Phase 1 has to exist and be used before
  Phase 2's analysis has anything to analyze.
- Phase 2 and Phase 3 are not scheduled yet. They are recorded here so
  future feature decisions ("should this screen show X") can be checked
  against whether X also serves the data-collection goal, and so the
  eventual Phase 2/3 work starts from an explicit, agreed data model
  instead of guessing what the AI will need.
