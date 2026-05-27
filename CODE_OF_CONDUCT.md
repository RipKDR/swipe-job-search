# Contributor Covenant Code of Conduct

## Our Pledge

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, caste, color, religion, or sexual identity and orientation.

We pledge to act and interact in ways that contribute to an open, welcoming, diverse, inclusive, and healthy community.

**Australia-specific (Hi-Hired 2026-05-28):** This project builds a recruitment platform for casual local jobs (beachhead hospitality/retail in Melbourne northern suburbs). All contributions and platform features must respect the Disability Discrimination Act 1992 (Cth), Racial Discrimination Act 1975 (Cth), Sex Discrimination Act 1984 (Cth), Age Discrimination Act 2004 (Cth), and Fair Work Act 2009 (Cth) adverse action / sham casual provisions. Swipe hiring UX, job cards, matching logic, and employer tools must not enable or facilitate discrimination. See `docs/legal/` (ANTI_DISCRIMINATION_SWIPE_HIRING_AU.md when authored; GUARDRAILS.md a11y section; AU_FAIR_WORK... and PRIVACY... for related compliance). Violations (in code, docs, or proposed features) are treated as Code of Conduct breaches.

## Our Standards

Examples of behavior that contributes to a positive environment for our community include:

* Demonstrating empathy and kindness toward other people
* Being respectful of differing opinions, viewpoints, and experiences
* Giving and gracefully accepting constructive feedback
* Accepting responsibility and apologizing to those affected by our mistakes, and learning from the experience
* Focusing on what is best not just for us as individuals, but for the overall community

Examples of unacceptable behavior include:

* The use of sexualized language or imagery, and sexual attention or advances of any kind
* Trolling, insulting or derogatory comments, and personal or political attacks
* Public or private harassment
* Publishing others' private information, such as a physical or email address, without their explicit permission
* Other conduct which could reasonably be considered inappropriate in a professional setting
* **Australia-specific breaches:** Proposing or implementing features that enable discriminatory hiring (e.g. biased swipe filters, exclusionary language in job cards, failure to surface work rights/visa accommodations per DES/Asuria, pay transparency violations per Fair Work 2026 amendments); ignoring a11y requirements (WCAG 2.2 AA + DDA) for jobseeker/employer flows; handling jobseeker PII (swipes, matches, experience, availability, avatars) in ways that violate Privacy Act APPs or the missing bulk_swipe_consent flag gap identified in ARCHITECTURE_AUDIT.md 2026-05-27.

## Enforcement Responsibilities

Community leaders are responsible for clarifying and enforcing our standards of acceptable behavior and will take appropriate and fair corrective action in response to any behavior that they deem inappropriate, threatening, offensive, or harmful.

Community leaders have the right and responsibility to remove, edit, or reject comments, commits, code, wiki edits, issues, and other contributions that are not aligned to this Code of Conduct, and will communicate reasons for moderation decisions when appropriate.

## Scope

This Code of Conduct applies within all community spaces, and also applies when an individual is officially representing the community in public spaces. Examples of representing our community include using an official e-mail address, posting via an official social media account, or acting as an appointed representative at an online or offline event.

## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported to the community leaders responsible for enforcement at security@hi-hired.example (or via GitHub security advisory / Discord private channel to orchestrator). All complaints will be reviewed and investigated promptly and fairly.

All community leaders are obligated to respect the privacy and security of the reporter of any incident.

## Enforcement Guidelines

Community leaders will follow these Community Impact Guidelines in determining the consequences for any action they deem in violation of this Code of Conduct:

### 1. Correction

**Community Impact:** Use of inappropriate language or other behavior deemed unprofessional or unwelcome in the community.

**Consequence:** A private, written warning from community leaders, providing clarity around the nature of the violation and an explanation of why the behavior was inappropriate. A public apology may be requested.

### 2. Warning

**Community Impact:** A violation through a single incident or series of actions.

**Consequence:** A warning with consequences for continued behavior. No interaction with the people involved, including unsolicited interaction with those enforcing the Code of Conduct, for a specified period of time. This includes avoiding interactions in community spaces as well as external channels like social media. Violating these terms may lead to a temporary or permanent ban.

### 3. Temporary Ban

**Community Impact:** A serious violation of community standards, including sustained inappropriate behavior.

**Consequence:** A temporary ban from any sort of interaction or public communication with the community for a specified period of time. No public or private interaction with the people involved, including unsolicited interaction with those enforcing the Code of Conduct, is allowed during this period. Violating these terms may lead to a permanent ban.

### 4. Permanent Ban

**Community Impact:** Demonstrating a pattern of violation of community standards, including sustained inappropriate behavior, harassment of an individual, or aggression toward or disparagement of classes of individuals.

**Consequence:** A permanent ban from any sort of public interaction within the community.

## Attribution

This Code of Conduct is adapted from the [Contributor Covenant][homepage], version 2.1, available at [https://www.contributor-covenant.org/version/2/1/code_of_conduct.html][v2.1].

Community Impact Guidelines were inspired by [Mozilla's code of conduct enforcement ladder][Mozilla CoC].

For answers to common questions about this code of conduct, see the FAQ at [https://www.contributor-covenant.org/faq][FAQ]. Translations are available at [https://www.contributor-covenant.org/translations][translations].

[homepage]: https://www.contributor-covenant.org
[v2.1]: https://www.contributor-covenant.org/version/2/1/code_of_conduct.html
[Mozilla CoC]: https://github.com/mozilla/diversity
[FAQ]: https://www.contributor-covenant.org/faq
[translations]: https://www.contributor-covenant.org/translations

---

**Hi-Hired 2026-05-28 Adaptation Note (per design spec §1 + gap §3/5):** Added explicit AU DDA/anti-discrimination + beachhead inclusive hiring + Privacy Act / Fair Work compliance hooks. Violations in platform features or contributions are CoC breaches. Cross-refs: GUARDRAILS.md §7 (AU Privacy + a11y WCAG 2.2 AA + DDA), new legal/ANTI_DISCRIMINATION..., ARCHITECTURE_AUDIT.md (consent flag gap = Privacy violation risk), docs/legal/AU_FAIR_WORK... (pay transparency 2026). See also CODE_OF_CONDUCT in OpenClaw workspace rules for consistency.

*Full hygiene state 2026-05-28: All root hygiene files + AGENTS.md + .github templates + index updates complete via swarm (orchestrator + sam) per dispatch DOC-011/012 + design §1 + gap §3/5/6/7/9. DRY citations throughout.*