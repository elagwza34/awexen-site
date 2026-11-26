# Deployment guide

Production deployment, production migrations and pricing publication require explicit approval. Until then, use an isolated Supabase development project. Keep the current production website and data available throughout rollout.

1. Confirm the existing quote inbox schema and that the new route does not shadow an existing offer slug. Take the normal database backup.
2. Apply the two calculator migrations to the approved environment. Verify the catalog exists only as a draft.
3. Set a strong random `CALCULATOR_SIGNING_KEY` as an Edge Function secret. Store it in the established secret manager. Existing access tokens still work after rotation because the stored token hashes are compared on retrieval. Rotate after considering that retries of older estimate creation IDs derive a different token.
4. Deploy `project-calculator` using the existing Supabase workflow, then deploy the built Vite frontend. The function performs its own admin Auth and role check because the public calculator requires unauthenticated access.
5. Verify public and admin endpoints, the editable starting draft, lead inbox handoff, analytics consent, responsive summary, and both PDF languages in staging. Validate a restore with a separate test configuration.
6. Supply approved prices and obtain business approval before publishing the first configuration. Confirm customer-facing data excludes draft and internal fields.

To roll pricing back, copy the earlier valid version to draft and publish it. To roll code back, restore the previous frontend and function builds. The additive calculator tables can remain in place to preserve quotations.
