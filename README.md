# Token Radar (token-radar-01)

Advanced pre-token protocol launch radar and valuation engine built for the make.fun competition.

## Overview

Token Radar processes sealed DefiLlama protocol snapshots to identify, value, and rank pre-token protocols before token issuance. It separates protocols with existing tokens into a live trading feed and builds a robust, data-driven valuation model for over 220 pre-token protocols.

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

## Running the Radar

Run the radar program (Node 22, standard library only):

```bash
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts --input /home/hatch/workspace/makefun/kits/token-radar-01-kit/input/snapshot.json
```

Runs are fully deterministic and produce byte-identical output across executions.
