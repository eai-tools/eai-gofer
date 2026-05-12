# Feature 026: Public Platform Builder Experience - Gofer

## Purpose

Gofer is a public-facing spec and delivery assistant for EnterpriseAI builders. It must help developers design verticals using PublicAPI capabilities while keeping private platform architecture out of public documentation and generated artifacts.

## Problem

Gofer can guide ambitious vertical builds, but it needs stronger platform literacy: it must separate public capabilities from private implementation details, validate whether a desired feature is self-service or operator-required, and create actionable specs when the platform lacks a required public API.

## Responsibilities

- Add a public/private knowledge boundary to Gofer research, specification, implementation, and validation stages.
- Require PublicAPI evidence before telling builders a platform capability is available.
- Create gap specs when a needed vertical capability cannot be completed through PublicAPI.
- Keep support docs and generated vertical docs public-safe.

## Functional Requirements

- Gofer research asks whether each required platform action has a PublicAPI path.
- Gofer specs include capability state: available, missing, operator-required, paid-upgrade-required, rate-limited, or unsupported.
- Gofer validation includes a public-private leak check for docs, help, generated guides, and PR descriptions.
- Gofer implementation guidance distinguishes vertical code work from platform feature work.

## Acceptance Criteria

- A Strategy Monitor spec identifies workflow runtime provisioning and existing secret rotation as platform capability gaps until PublicAPI supports them.
- Gofer does not instruct users to call private services or depend on private repo internals.
- Validation flags public docs that disclose private topology, private policies, or provider runbooks.
- Gofer can produce submodule-scoped specs for platform feature delivery.

