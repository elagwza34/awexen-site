# Pricing engine rules

1. Select an active project from the requested published version and normalize eligible answers.
2. Collect the configured base price and eligible question, option, and rule charges. Duplicate charge keys are applied once per billing period and stage.
3. Apply fixed, per-unit, graduated tier, volume and included-quantity charges. A graduated tier charges the number of units in each band. A volume tier supplies the rate for the entire chargeable quantity.
4. Apply per-charge caps and named maximum rules. Evaluate percentage and multiplier rules in deterministic configured order against their specified billing subtotal. A multiplier contributes the difference between the modified subtotal and its base.
5. Apply minimum rules and the higher of the project and global one-time minimum.
6. Apply eligible fixed or percentage discounts up to the configured billing-period limit. Percentage discounts read the subtotal before discounts.
7. Calculate tax on each discounted billing subtotal. Separate one-time, monthly and annual amounts.
8. Calculate first-year amount as one-time plus annual plus the configured number of monthly installments. The default is 12.

Prices and basis points use integer values. Arithmetic uses `bigint` and configured floor, ceiling or half-up rounding. Transport rejects values outside JavaScript’s safe integer range. Manual-review items remain visible and signal that the estimate is incomplete. Explicit free and included items have zero amount. Unconfigured active charges block publishing.
