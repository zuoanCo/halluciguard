# Text and similarity utilities

## Text

- `normalizeText`: Unicode NFKC, quote normalization, whitespace collapse.
- `tokenize`: word tokens for Latin text; Chinese Han sequences become character unigrams plus bigrams so short Chinese answers still produce a useful lexical signal.
- `splitSentences`: handles English and Chinese punctuation while protecting common abbreviations such as `et al.`, `e.g.`, and `Dr.`
- `extractNumbers`: extracts integers/decimals with optional `%`.
- `truncate`: safe excerpting for provider prompts.

## Similarity

`textSimilarity(a, b)` is the average of Jaccard and cosine similarity over the tokenizer above. It is intentionally cheap and deterministic; use the consistency LLM judge when semantic equivalence matters more than wording.

`pairwiseSimilarities(values)` returns all `i < j` scores used by consistency sampling.

## JSON

`extractJson` finds the first balanced object or array in model output and strips a wrapping markdown fence. `parseJson` is `JSON.parse(extractJson(text))`.

These helpers are for detector prompts. They are not a replacement for a strict structured-output library; pair `halluciguard` with `zodstructor` when the response itself must be schema-valid.
