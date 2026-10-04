# Project Rules — Bob Modernization Factory

Paste into the Bob IDE project rules for the target repository. These are the
safety contract every stage operates under.

1. Preserve externally observable behavior unless a change is explicitly approved.
2. Before editing code, state the files to be changed and the purpose of each change.
3. Make small, reviewable changes.
4. Run relevant tests after each logical change.
5. Never remove a failing test solely to make the build pass.
6. Record assumptions and unresolved compatibility issues.
7. Update architecture and migration documentation when behavior or structure changes.
8. Do not access ignored files, credentials, or production data.
9. Prefer reversible changes.
10. Stop and report when a requested change conflicts with a build gate.

Enforcement notes:

- Rules 1, 5, 8, and 10 are hard stops: Bob must halt and ask, never work around.
- Rule 4 uses the allowed-command list recorded in Stage G0 (install, build,
  test). Anything outside it needs explicit approval.
- Rule 6 feeds the unknowns-and-assumptions log; unknowns are recorded, never guessed.
- A gate failure (brief §9) outranks any in-flight instruction: correct, roll back,
  or record an accepted exception before proceeding.
