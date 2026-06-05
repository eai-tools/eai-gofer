---
artifact: eai-preflight
feature: '{{feature_id}}'
status: '{{ready|blocked|deferred|not_applicable}}'
created: '{{iso_timestamp}}'
updated: '{{iso_timestamp}}'
---

# EAI App Delivery Preflight

## Summary

| Field                       | Status                                           | Evidence                                                                           |
| --------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| EAI app delivery applies    | {{yes/no}}                                       | {{classification evidence}}                                                        |
| First-run setup             | {{ready/missing/deferred}}                       | {{gofer:eai-first-run summary or not required}}                                    |
| CLI installed               | {{ready/missing/failed}}                         | {{eai path, eai --version}}                                                        |
| CLI capabilities discovered | {{ready/blocked}}                                | {{eai --describe timestamp}}                                                       |
| Logged in                   | {{ready/login_required/account_required}}        | {{eai whoami summary, no tokens}}                                                  |
| Tenant ready                | {{ready/tenant_required/operator_required}}      | {{tenant role category, no private payloads}}                                      |
| Template ready              | {{ready/template_required/deferred}}             | {{template markers or eai verify result}}                                          |
| App enrollment ready        | {{ready/confirmation_required/blocked/deferred}} | {{vertical list/create/select summary}}                                            |
| Block catalog ready         | {{ready/blocked/deferred}}                       | {{blocks list/readiness/describe summary}}                                         |
| App stack policy            | {{ready/exception_required/blocked}}             | {{EAI Platform including app template first, Azure second, or approved exception}} |

## Safe Public Sources Used

- EAI CLI overview: https://eai-tools.github.io/eai/docs/overview
- EAI API reference: https://eai-tools.github.io/eai/docs/api-reference
- EAI static registry: https://eai-tools.github.io/eai/registry/
- EAI scenario library: https://eai-tools.github.io/eai/scenarios
- EAI app template: https://github.com/eai-tools/eai-app-template

## Commands Run

| Purpose               | Command                                                            | Result                |
| --------------------- | ------------------------------------------------------------------ | --------------------- |
| Install check         | `command -v eai`                                                   | {{result}}            |
| Version check         | `eai --version`                                                    | {{result}}            |
| Capability discovery  | `eai --describe`                                                   | {{result}}            |
| Login check           | `eai whoami`                                                       | {{result}}            |
| Tenant check          | `eai tenant list --format json`                                    | {{result}}            |
| Project check         | `eai verify`                                                       | {{result_or_not_run}} |
| App enrollment check  | `eai vertical list --format json`                                  | {{result_or_not_run}} |
| Block catalog check   | `eai blocks list --format json`                                    | {{result_or_not_run}} |
| Block readiness check | `eai blocks readiness --package-profile {{profile}} --format json` | {{result_or_not_run}} |

## Template Markers

| Marker                           | Present    |
| -------------------------------- | ---------- |
| `src/eai.config/object-types.ts` | {{yes/no}} |
| `src/eai.config/register.ts`     | {{yes/no}} |
| `.env.example`                   | {{yes/no}} |
| `.npmrc`                         | {{yes/no}} |
| `package.json`                   | {{yes/no}} |

## Decisions

| Decision              | Value                                                                | Rationale           |
| --------------------- | -------------------------------------------------------------------- | ------------------- |
| Initialize template   | {{yes/no/deferred}}                                                  | {{reason}}          |
| App directory         | {{current_repo/new_sibling/existing_eai_app}}                        | {{reason}}          |
| Company tenant        | {{selected/blocked/deferred}}                                        | {{safe label only}} |
| Child tenant boundary | {{none/required/deferred}}                                           | {{reason}}          |
| Package profile       | {{external/internal/hybrid/deferred}}                                | {{reason}}          |
| App enrollment        | {{existing/create_confirmed/confirmation_required/blocked/deferred}} | {{reason}}          |
| App stack             | {{eai_platform_azure/approved_exception/blocked}}                    | {{reason}}          |

## App Stack Policy

For app delivery, Gofer builds on EAI Platform first, including the EAI app
template, and Azure second. Use the EAI app template, CLI, PublicAPI, object
types, workflows, block catalog, ResourceAPI/resource schema, tenant/app
enrollment, provisioning, diagnostics, and Azure-compatible
deployment/supporting services before any non-EAI exception. Record Firebase,
Supabase, Vercel primary runtime, AWS, GCP, bespoke backend, unmanaged database,
or unrelated SaaS usage only as an approved integration/migration/exception with
rationale, owner, expiry, and validation evidence.

## Next Action

{{continue_discovery|install_eai|login_required|tenant_access_required|initialize_template|confirm_app_enrollment|stop_non_eai}}

## Privacy Guardrail

Do not record access tokens, refresh tokens, secrets, full `.env.local` values,
private tenant payloads, or private platform topology in this artifact.
