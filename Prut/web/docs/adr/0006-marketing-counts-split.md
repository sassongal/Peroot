# ADR-0006: Two prompt-count constants, chosen by the Hebrew noun

**Status:** accepted

`src/lib/constants.ts` exports two genuinely different quantities:

- `PROMPT_LIBRARY_COUNT` (**650+**) — every active row in `public_library_prompts`.
  Use wherever the copy says **פרומפטים**.
- `PROMPT_TEMPLATE_COUNT` (**570+**) — the subset containing at least one fillable
  `{variable}` token, which is what `/templates` actually renders. Use wherever
  the copy says **תבניות**.

One constant previously served both meanings. The result was a live SEO defect:
the JSON-LD that Google reads said "480+" while meta descriptions said "540+".
No single value could be correct for both, so this was a semantic bug, not a
stale find-and-replace.

`PROMPT_TEMPLATE_COUNT` is necessarily ≤ `PROMPT_LIBRARY_COUNT`, so it is the safe
pick when the wording is ambiguous.

**Both constants already include the trailing `+`.** Writing `{CONST}+` renders
`570++`, which is how the earlier bug was introduced.

To re-measure, count `public_library_prompts` rows and the subset matching a
`{variable}` token.
