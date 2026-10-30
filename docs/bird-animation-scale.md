# Bird animation scale and turkey recovery

Goose and guinea action rows had been individually fitted to a fixed canvas,
which reduced the character in wider attack poses. Rendering now compensates
for the original row fit and anchors every pose at its feet. Goose sprites are
22% larger and guinea sprites 18% larger. Attack geometry is unchanged.

Charge-run frames play only during the active charge. Recovery uses reversed
preparation poses rather than continuing the running loop. Turkey peck frames
follow the configured peck interval.

The original generated turkey PNG was recovered without background removal or
regeneration: `art-recovery/turkey-original.png`, 1024 × 1536 RGBA, 2791652 bytes.
SHA-256: `31b719e84df5cf5d2bf9349a71149dd0c8db92457539fa475cf92e88b833e968`.
Its 24 poses were separated using source component bounds at one shared scale
and foot baseline. Runtime PNGs and lossless WebPs are in `assets/birds-v2`.
The source, bounds manifest and recovery script are retained in this repository.

Figma file `5CeOcsre3HC0PmRJVUxwOA`: original node `94:2`, recovered pose group
`95:2`. The damaged previous cuts are retained as a hidden archive for comparison.

Validation: 99 automated tests passed; browser battle checked with both bosses
and geese. No animation blending or per-frame canvas effects were introduced.
