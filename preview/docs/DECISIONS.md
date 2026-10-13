# Decision record — Season 2 preview

October 13, 2026. Latest user request authorizes autonomous implementation of a staged preview before any merge to production, superseding the earlier planning-only constraint. It also overrides AGENTS.md's direct push-to-main instruction for this work.

Confirmed: two guaranteed regular-season matches; players use GHIN on the correct course/tees; strokes locked at least 24 hours before tee time; simple logo based on the supplied pair; substantial improvement to scorecard and site UI; show earned prize money; preview before merge.

Proposed: optional April play, regular season through June, published extension procedure, photo/AI transcription with human approval, later authorized GHIN retrieval. No provider access is established. Buy-in, payout amounts, expanded field, exact format allowances and unresolved-tie procedure need approval. Preview uses 18 fictional teams and a clearly labeled $250/team example ($4,500 total: six $250 pod awards, $2,000 first, $1,000 second).

Architecture choice: a standalone static Next.js app under preview/, not imported by the production app. No production credentials, data, environments, services or live cards copied. The new flow uses supplied hole strokes, not a recreated Handicap Index/Course Handicap engine. Net better-ball arithmetic is deterministic over staged inputs.

Logo: generated with the built-in image tool using the user's golf-ball duo reference. Prompt: simplify to one pine-green ink; flat cap left/bucket hat right, sunglasses, 3–4 dimples each, transparent negative space, no text/gradients/shadows. Saved as public/two-man-mark.png. The asset is a raster concept; vector/embroidery validation remains after design selection. User originals untouched.

Nothing is merged or deployed to production. No global Vercel project setting may be changed to serve this standalone preview. The hosted preview deploys only static output in preview scope.
