# Basic calculator verification cases

The public calculator uses five annual inputs and no hidden finance assumptions.

## Formulas

- Current cost per success = current annual process cost / annual completed outcomes
- AI cost per attempt = total annual AI-assisted cost / annual AI attempts
- Successful AI outcomes = AI attempts × success rate
- AI cost per success = total annual AI-assisted cost / successful AI outcomes
- Failed attempts = AI attempts × (1 − success rate)
- Allocated failure cost = AI cost per attempt × failed attempts

The failure-cost output assumes cost is distributed evenly across attempts. The directional signal assumes current and AI-assisted outcomes meet the same standard.

## Reconciled cases

| Case | Current cost/success | AI cost/attempt | AI cost/success | Failed attempts | Allocated failure cost | Signal |
|---|---:|---:|---:|---:|---:|---|
| Published example | $10.00 | $4.80 | $5.71 | 20,000 | $96,000 | Lower |
| 100% success | $10.00 | $6.00 | $6.00 | 0 | $0 | Lower |
| 50% success, higher AI cost | $10.00 | $7.50 | $15.00 | 50,000 | $375,000 | Higher |
| Unit-cost parity | $10.00 | $6.00 | $10.00 | 40,000 | $240,000 | Approximately the same |
| 0% success | $10.00 | $6.00 | Not calculable | 100,000 | $600,000 | No successful AI outcomes |
| Small content workflow | $77.50 | $26.25 | $36.21 | 990 | $25,988 | Lower |
| Zero AI cost | $10.00 | $0.00 | $0.00 | 20,000 | $0 | Lower |

Additional validation cases reject zero current outcomes, zero AI attempts, success rates above 100%, missing values, and negative values.
