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

Sections accept the same condition model. Each active section is one step in the public calculator, and a section condition decides whether that step appears. Steps are evaluated in their configured order while answers accumulate, so a step can only depend on answers from earlier steps. When a condition stops matching, the step and every question inside it disappear from the flow, and their answers are ignored by previews and pricing. Publication rejects a section condition that references a question from the same or a later step, keeping step order deterministic.

The starter catalog gates its platform steps with an `or` that also accepts an `empty` answer, for example `{"or":[{"questionId":"custom-scope","operator":"selected","value":"store"},{"questionId":"custom-scope","operator":"empty"}]}`. A custom-software visitor therefore sees only the steps they selected, while an e-commerce visitor, who never sees the custom scope question, keeps the store step.

Publication rejects missing references, cycles, invalid defaults and ranges, contradictory conditions the validator can establish, and required questions with unavailable dependency chains. The validator does not prove full satisfiability of every arbitrary combination of user inputs.
