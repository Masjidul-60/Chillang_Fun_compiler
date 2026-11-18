# ChillLang 0.1
Keywords: yo chill peace out vibe maybe then otherwise done keep going while for each in gimme bail skip yup nope nada and or not.
Blocks are keyword-delimited (`done`), statements are newline-terminated, comments start with `~`. Indentation is cosmetic.
Scope: each maybe/loop/chill block has its own scope; `vibe` declares (duplicates in one scope are errors); assignment updates the nearest existing variable.
Types: number, string, bool (yup/nope), nada, list, dict, function. No implicit coercion. Falsy: nope, nada, 0, "", [], {}.
Built-ins: say ask size type range str number sum max min append keys upper lower.
Limits: 200000 steps, recursion depth 200, 3 s timeout, 100000 items per list/dict/range, 20000 source chars via API.
