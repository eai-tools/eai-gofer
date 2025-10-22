# Branch-Specific Specifications

This folder contains specifications specific to the `005-test-update` branch.

## Structure

- **specs/**: Branch-specific specifications that extend or override main branch specs
- **memory/**: Branch-specific context and learnings
- **Main specs**: Inherited from `.specify/specs/` (parent directory)
- **Main constitution**: Inherited from `.specify/memory/constitution.md`

## Usage

Specifications in this folder are only active when working on the `005-test-update` branch.
When you switch branches, the SpecGofer extension will automatically load the appropriate specs.

## Inheritance

- Specs with the same ID as main branch specs will override them
- New specs are branch-specific and won't affect main branch
- The constitution is inherited from main branch (cannot be overridden per branch)
