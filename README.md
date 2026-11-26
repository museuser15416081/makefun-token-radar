# makefun-token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/museuser15416081/makefun-token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/museuser15416081/makefun-token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar is an advanced pre-token protocol launch intelligence and valuation engine that processes sealed DefiLlama protocol snapshots to systematically discover, value, and rank high-potential pre-token protocols while segregating live-token trading markets.

## Run it

```bash
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts --input input/snapshot.json
```

## Valuation Model

The radar's implied value model derives valuations entirely from the snapshot's own figures without hardcoded names:

$$\text{Implied Value} = \text{TVL} \times \text{Category Multiple} \times \text{Growth Multiplier} \times \text{Maturity Multiplier} \times \text{Chain Multiplier}$$

1. **Category Multiples**: Computed dynamically from the median market cap to TVL ratio of protocols with active tokens in each category within the snapshot (clamped between 0.08x and 2.8x), falling back to the global median when sample sizes are small.
2. **Growth Momentum**: 7-day TVL percentage change clamped between -50% and +100%, scaled by weight 0.4.
3. **Maturity & Track Record**: Age in days from `listed_at` to `as_of`, scaled from 0.7 to 1.0 (saturating at 3 years). Rewards enduring protocols operating successfully without issuing a token.
4. **Chain Breadth**: Multi-chain presence bonus: $1 + 0.04 \times \min(\text{chains.length}, 5)$.

## Farm Plans

Every pre-token protocol receives a concrete 5-step farm plan derived from its category, chains, TVL, and age, detailing specific actions, estimated gas/capital costs, time commitments, weekly engagement requirements, and security precautions (avoiding scams and never paying to claim).

## Dashboard & Features

- **Pre-Token Board**: Ranked table of over 200 high-potential pre-token protocols (including all 40 watchlist protocols plus top early finds below the floor).
- **Interactive Filtering & Sorting**: Filter by search query, category, chain, or watchlist toggle; sort by rank, name, TVL, growth, age, or implied value.
- **Protocol Detail View**: Slide-over drawer displaying full valuation model breakdown and actionable farm plans.
- **Already Trading Feed**: Segregated live-token protocols ordered by market cap and valuation multiples.
- **Model Comps Explorer**: Transparent view of dynamically computed category multiples.

---

<sub>Entered on [make.fun](https://make.fun/?ref=mdw2e7jm&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
