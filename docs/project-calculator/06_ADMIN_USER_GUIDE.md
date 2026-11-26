# Admin user guide

1. Open the AWEXEN dashboard as an owner or administrator and select Cost Calculator.
2. Edit projects, sections, questions, options, pricing rules, conditions and settings. Use reusable templates or duplicate an item to start from existing copy.
3. Each section is one step in the public calculator. In the Sections view, set **Show this step only when earlier answers match** to branch the flow — for example show store questions only for store projects, or swap the process steps after a WordPress versus custom-development choice. A step can only depend on questions from earlier steps. The starter draft already uses this in two places: the custom-software scope question keeps only the platform steps the visitor selects, and choosing WordPress skips the Backend and database step. Each gate keeps an `empty` fallback, so the step still appears when the branching answer does not apply to the project or is left unanswered; clear a step's condition to make it unconditional again.
4. Enter prices in the configured minor currency unit. For EGP with 2 minor digits, enter `150000` for EGP 1,500. Choose Free, Included, or Manual review explicitly where applicable.
5. Preview scenarios, review validation messages, save the draft, and choose **Publish saved draft** when the configuration and amounts are approved.
6. To revert, copy an earlier version to draft, validate it, then publish it as a new version. Incoming requests use the new version. Historical quotations retain their issued figures.
7. Use Quotations and Leads for snapshot inspection and calculator lead stages. Customer communications and CRM conversion continue through Quote Inbox.

The starter catalog has no approved prices. Set real rates, mark inclusions, or select manual review before publishing. The live page is unavailable until a version is explicitly published.
