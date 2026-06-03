# Docs Cover Assets and Prompt Collection Packaging Plan

> **For Hermes:** Use this as the docs-asset companion plan for the prompt collection. Keep it small and reproducible.

**Goal:** Keep the existing cover-background generator as the canonical utility for the Swipe Job Search prompt collection and document how to use it.

**Architecture:** The repo already has `docs/scripts/gen-cover-bg.py`, which renders three cover backgrounds plus a shared body background for the DOCX prompt collection. That is enough for the current document family. This plan only adds documentation and light guardrails; it does not create a broader design pipeline.

**Tech Stack:** Python, Playwright, SVG/HTML rendering, DOCX packaging, markdown docs.

---

## Blueprint

- **Intent:** make the prompt-collection packaging reproducible and easy to hand off.
- **Constraints:** keep the asset generator small, avoid introducing another graphics pipeline, and avoid duplicating the existing cover styles unless a new document family appears.
- **Data Contract:** input HTML/SVG snippets -> rendered PNGs -> DOCX cover/body usage.
- **Success Criteria:** a new contributor can regenerate the four images and understand which one maps to which document without reading the script line by line.

## Technical Schema

- **Data Flow:** script -> HTML/SVG shell -> Playwright screenshot -> PNG output -> DOCX insertion.
- **Component Boundaries:** `docs/scripts/gen-cover-bg.py`, `docs/scripts/output/`, `docs/README.md`.
- **Algorithm Selection:** keep the existing SVG gradients and simple rendering flow; do not add a design-token system.
- **State Management:** the generator is stateless; the output directory is the only persistent artifact.
- **Interfaces:** command line invocation, output file names, and document mapping.

## Tasks

### Task 1: Document the generator usage

**Objective:** Make the generator discoverable without requiring source-code spelunking.

**Files:**
- Update: `docs/README.md`

**Plan:**
- Add a short note that the generator lives at `docs/scripts/gen-cover-bg.py`.
- List the four outputs and what they are for.
- Mention the command to regenerate them.

**Verification:**
- A new contributor can find the generator from the docs index.

### Task 2: Decide whether outputs are checked in or generated on demand

**Objective:** Make the asset lifecycle explicit.

**Files:**
- Update: `docs/README.md` or a small note near the generator

**Plan:**
- Choose one rule: commit the PNGs as stable artifacts or regenerate them on demand.
- Keep the rule simple and state it once.

**Verification:**
- There is no ambiguity about whether the PNGs are source or build output.

### Task 3: Add a smoke check for the four expected outputs

**Objective:** Catch accidental generator regressions.

**Files:**
- Update: `docs/scripts/gen-cover-bg.py` only if a tiny self-check is needed

**Plan:**
- Keep the script tiny.
- Add a light smoke check only if the team wants one.
- Do not build a full test harness for a static asset generator.

**Verification:**
- `python3 docs/scripts/gen-cover-bg.py`
- The four expected PNGs exist in `docs/scripts/output/`.

## Notes

- The user-provided `gen_bg.py` idea is already represented by the in-repo `docs/scripts/gen-cover-bg.py` utility, so no separate graphics subsystem is needed.
- If a future document family appears, add one new cover variant and keep the rest of the workflow unchanged.
