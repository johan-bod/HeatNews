# HeatNews Value Proposition Audit

## Executive Summary

HeatNews (branded "HeatStory") occupies a genuinely uncontested space: **consumer-grade geographic news visualization with source quality weighting**. No competitor combines these. However, the product currently fails to communicate why this matters, serves too many audiences at once, and has critical gaps that undermine its core promise. The globe is a visual hook, not yet a utility. The dataset is too small to be a daily news source. The messaging is generic. This audit identifies what to fix and in what order.

---

## 1. SWOT Analysis

### Strengths

**S1. Unique technical foundation.** A 3D globe with heat-based news clustering exists nowhere else at the consumer level. World Monitor is closest but targets OSINT analysts, not news readers. This is genuine differentiation, not incremental improvement.

**S2. Multi-scale coverage architecture.** The local → regional → national → international scale system is architecturally sound. No competitor lets you zoom from a French department story to a global trend in the same interface. Ground News groups by bias; HeatNews groups by geography. These are fundamentally different lenses.

**S3. Source credibility system.** The 6-tier credibility model with editorial overrides is more transparent and editorially honest than anything competitors offer. Ground News shows bias; HeatNews shows trustworthiness. Neither Google News nor Apple News expose source quality at all. This is a real differentiator — but currently invisible to users.

**S4. Low infrastructure cost.** At ~$0-124/month for up to 11K users, the cost structure is sustainable for a solo project. NewsData.io's free tier covers early growth.

**S5. European/French angle.** 78 outlets catalogued with editorial judgment, strong French regional coverage. Most competitors are US-centric. This is a positioning advantage in European markets.

### Weaknesses

**W1. The globe is a gimmick, not yet a utility.** After the initial "wow" fades, does a 3D globe help users find news better than a sorted list? LiveUA Map uses a flat map and serves millions. The globe adds load time, accessibility issues, and mobile friction. It needs to earn its place by doing something a list cannot — like showing geographic clustering patterns or emerging story spread. Currently it shows dots. A list with location labels does the same thing.

**W2. Dataset is too small.** ~30 articles per refresh, updated every 4 hours. This is not enough to be anyone's primary news source. Google News surfaces hundreds. Ground News groups thousands. Even LiveUA Map has continuous updates. Users who visit twice will see the same articles. This fundamentally undermines the "see what the world is talking about" promise.

**W3. Messaging is generic.** "News, Mapped. Everywhere." could describe Google Maps with a news layer. It doesn't explain *why* mapping news matters. The subheading "See what the world is talking about. Heat shows where coverage is hottest" is closer but still vague. Compare to Ground News: "Compare news sources, reveal media bias, expand your news consumption." That's instantly clear. HeatNews needs a message that answers: "What will I understand after using this that I didn't before?"

**W4. Brand identity is fractured.** The repo is "HeatNews", the UI says "HeatStory", the package.json says "heatnews", the README says "HeatStory". Pick one and commit. Brand confusion erodes trust.

**W5. Trying to serve everyone, serving no one.** The README targets "journalists and readers." The monetization doc targets B2B API customers. The personalization spec targets power users. The soft gate targets casual visitors. These are four different products. Without a primary audience, feature decisions have no anchor.

**W6. No real-time signal.** 4-hour cache means HeatNews is always hours behind. The "heat" metaphor implies urgency and live data. A story that's "hot" but 4 hours old feels stale. This is a trust problem — the metaphor promises what the infrastructure can't deliver.

**W7. The credibility system is invisible.** Users can't see that Reuters is weighted higher than a random blog. The quality work happening behind the scenes doesn't translate to perceived value. Ground News makes its bias ratings a visible, interactive feature. HeatNews's credibility is silent plumbing.

**W8. No mobile app.** Web-only, and a 3D globe on mobile is a poor experience. The interaction model (click to activate, scroll to continue) is a workaround for a fundamental UX mismatch.

### Opportunities

**O1. Local news crisis.** Local newspapers are dying globally. Regional coverage is disappearing. HeatNews's multi-scale architecture and hyperlocal convergence bonus are designed for exactly this moment. "See stories your national newspaper won't cover" is a powerful narrative — but it's not being told.

**O2. No consumer-grade geographic news viz exists.** This is blue ocean. GDELT is academic, LiveUA Map is conflict-focused, World Monitor is OSINT. Nobody is building a beautiful, accessible, editorially curated geographic news experience for regular people.

**O3. Credibility as a visible feature.** If HeatNews made source quality visible (badges, tier indicators, "verified by X sources" labels), it would be the only consumer app transparently showing *why* it trusts its sources. In an era of misinformation anxiety, this is marketable.

**O4. Emerging story detection.** The hyperlocal convergence bonus is genuinely novel — detecting that 5 small outlets are covering the same issue before national media picks it up. This is the kind of feature journalists would pay for and readers would share. "HeatNews spotted this story 6 hours before Le Monde." That's a headline.

**O5. European market positioning.** Most news apps are US-centric. A product built from a European perspective, with French regional coverage and GDPR-friendly architecture, has a market gap to fill.

### Threats

**T1. World Monitor exists and is open source.** Same tech stack (Globe.gl), more data layers (45 vs. 1), active development. If they add editorial curation and a consumer UX, they'd be a direct competitor with more features.

**T2. Platform risk.** 100% dependent on NewsData.io. API changes, price increases, or service disruption would be catastrophic. No fallback data source.

**T3. Big tech could do this trivially.** Google Maps + Google News = geographic news visualization with unlimited data. Apple could add a map view to Apple News. If either decides to, HeatNews can't compete on data volume or distribution. The defense is editorial quality and curation — which doesn't scale easily but is hard to replicate.

**T4. Ground News has mindshare.** In the "alternative news consumption" space, Ground News owns the conversation. They have funding, mobile apps, a clear brand. HeatNews would need to avoid competing on their turf (bias) and instead own a different angle (geography + credibility).

---

## 2. Competitive Positioning Matrix

| Capability | HeatNews | Ground News | LiveUA Map | World Monitor | GDELT | Google News |
|---|---|---|---|---|---|---|
| Geographic visualization | 3D globe | None | 2D map | 3D globe + 2D | 2D map | None |
| Source credibility/quality | 6-tier system (invisible) | Bias ratings (visible) | None | None | None | Opaque algorithm |
| Multi-scale (local→global) | Yes (4 scales) | No | By region only | Yes (layers) | Yes | No |
| Article volume | ~30/refresh | Thousands | Continuous | Many layers | Millions | Unlimited |
| Update frequency | 4 hours | Near real-time | Real-time | Real-time | Hourly | Real-time |
| Emerging story detection | Convergence bonus | Blindspot feature | No | No | Trend detection | No |
| Mobile experience | Web (poor) | Native apps | Native apps | Web | Web | Native apps |
| Target audience | Unclear | Media-literate consumers | OSINT/security | Intelligence analysts | Researchers | Everyone |
| Pricing | Free (planned freemium) | $2.49-9.99/mo | Free + sub | Free (open source) | Free | Free |
| Languages | EN + FR | EN | EN + regional | EN | 65 languages | All |

**Key takeaway:** HeatNews's unique combination is geography + credibility + multi-scale. But it loses badly on volume, freshness, and platform maturity. The strategy should not be "more data" (can't win that) but "better curation" (can win that).

---

## 3. Current Messaging Assessment

### What HeatNews says about itself

| Element | Current text | Problem |
|---|---|---|
| Tagline | "News, Mapped. Everywhere." | Generic. Describes the mechanism (mapping), not the value (understanding). |
| Subheading | "See what the world is talking about. Heat shows where coverage is hottest." | "What the world is talking about" = Google Trends. "Coverage is hottest" = unclear to new users. |
| CTA | "Explore the globe" | Invites exploration (toy), not understanding (tool). |
| README mission | "Helping local news to thrive and users to read based on geolocation or topics of interest." | Two missions in one sentence. Neither is specific enough to be compelling. |
| README pitch | "Giving both journalists and readers their power." | Vague. What power? Power to do what? |

### What HeatNews should say

The core insight HeatNews offers is: **"See the stories your news feed hides — the ones that matter locally but don't make national headlines, and the ones the whole world covers that you might miss."**

This captures:
- The geographic angle (local vs. global)
- The credibility angle (implicit in "stories that matter")
- The unique value (your feed hides things; we show them)
- The emotional hook (fear of missing something important)

### Messaging recommendations

**Tagline options** (to be tested, not final):
- "The news beneath the headlines." — Positions as depth, not volume.
- "See what's happening where it's happening." — Geographic focus.
- "Every story has a place." — Poetic, geographic, hints at local news value.

**Subheading should explain the mechanism:** "HeatNews maps global coverage in real-time. See which stories are getting the most attention, which regions are underreported, and which local stories are bubbling up before they go national."

**CTA should promise value:** "See today's coverage map" instead of "Explore the globe."

---

## 4. Feature Gap Analysis

### Features that matter most (by audience)

**For news-curious readers:**
1. Volume — need 100+ articles minimum to be useful daily
2. Freshness — 4-hour cache is too stale; need ≤1 hour
3. Clear value over Google News — why come here instead?
4. Mobile — must work well on phones

**For journalists/newsroom:**
1. Emerging story detection — the convergence feature
2. Coverage gap analysis — "no one is covering X in region Y"
3. Source landscape — who's covering what, with what weight
4. Alerts — notify when a pattern emerges

**For media-literate power users:**
1. Visible credibility indicators — see why sources are weighted
2. Perspective diversity — how many independent sources confirm a story
3. Geographic context — understand regional relevance
4. Sharing — "look at this pattern I found"

### Priority recommendations

**Do first (high impact, feasible):**
1. Make credibility visible in the UI — add tier badges/labels to article cards
2. Increase article volume — multiple API sources or more aggressive fetching
3. Fix the messaging — rewrite hero, tagline, README
4. Pick a primary audience and optimize for them

**Do second (high impact, more work):**
5. Add emerging story alerts (convergence-based)
6. Coverage gap visualization — "no sources covering X region"
7. Reduce cache interval to 1 hour (requires API budget increase)

**Don't do yet:**
- B2B API (no demand signal yet)
- Mobile app (fix web mobile experience first)
- Premium tier (need users first, then monetize)

---

## 5. Strategic Recommendations

### R1. Pick one audience: media-literate readers

Journalists need enterprise features (alerts, API, bulk data) that require infrastructure you don't have. General public needs volume and freshness you can't afford. Media-literate readers — people who actively care about news quality and geographic diversity — are the sweet spot. They're the Ground News audience, approached from a different angle.

**Ground News says:** "Know the bias of what you're reading."
**HeatNews should say:** "Know the geography of what you're reading."

Same audience, complementary value. Not competitive — additive.

### R2. Make the invisible visible

The credibility system is HeatNews's most defensible feature, and users can't see it. Add:
- Source tier badges on article cards (Reference / Established / Regional / etc.)
- "Covered by X verified sources" count on cluster summaries
- "Source quality: High/Medium/Low" indicator

This turns silent plumbing into visible differentiation.

### R3. Lean into the local news narrative

"Local news is dying" is a story people care about. HeatNews is architecturally built to surface local stories. The hyperlocal convergence feature literally detects emerging stories before national media. This is the emotional hook:

*"Your national newspaper covers 5 stories today. In your region, 47 things happened. HeatNews shows you both."*

### R4. The globe must earn its keep

The globe should do something a list cannot:
- Show geographic clustering (stories spreading from one region to another)
- Animate coverage over time (heat building as more sources pick up a story)
- Highlight coverage deserts (areas with no markers = underreported regions)

If it's just dots on a sphere, a sorted list with location tags is better.

### R5. Resolve the brand

Pick "HeatStory" or "HeatNews" and use it everywhere. Rename the repo, update package.json, align all user-facing text. Brand inconsistency signals "side project," not "product."

---

## 6. Honest Assessment: Where HeatNews Stands

**What HeatNews does better than anyone:** Geographic multi-scale news visualization with editorial credibility weighting. This combination doesn't exist elsewhere.

**What HeatNews does worse than competitors:** Article volume (30 vs. thousands), freshness (4h vs. real-time), mobile experience, platform maturity, brand clarity.

**The fundamental question:** Is "geographic news visualization" a feature or a product? Ground News proved that "bias-aware news reading" is a product. HeatNews needs to prove the same for geography. The credibility system and convergence detection are the features that could make this case — but only if they're visible, communicated, and experienced by users.

**Bottom line:** HeatNews has a defensible technical foundation and a genuine gap in the market. What it lacks is focus (audience), volume (data), and voice (messaging). Fix those three and the product has legs.
