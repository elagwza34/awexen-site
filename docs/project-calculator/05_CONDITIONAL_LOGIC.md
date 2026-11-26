# Conditional logic

Conditions use declarative JSON. A comparison leaf names a question, a supported operator, and an optional literal. Groups use `and` or `or`.

```json
{
  "and": [
    { "questionId": "payments", "operator": "eq", "value": true },
    { "questionId": "products", "operator": "gte", "value": 25 }
  ]
}
```

Operators are `eq`, `ne`, `contains`, `notContains`, `gt`, `gte`, `lt`, `lte`, `selected`, `notSelected`, `empty` and `notEmpty`. The same model controls question visibility, option eligibility and rule applicability. Requirements are resolved in dependency order and can use only normalized eligible answers. Hidden values and unavailable selections cannot contribute charges.

Publication rejects missing references, cycles, invalid defaults and ranges, contradictory conditions the validator can establish, and required questions with unavailable dependency chains. The validator does not prove full satisfiability of every arbitrary combination of user inputs.
