---
name: "NestJS XOR DTO validation pattern"
description: "How to enforce mutually exclusive field groups in class-validator DTOs (no native XOR support)"
type: project
---

`class-validator` has no built-in `@XOR` or `@OneOf` decorator. When a DTO field must be either A or B (never both, never neither), use a custom `@ValidatorConstraint`.

**Pattern**: Register a class-level `ValidatorConstraintInterface` that inspects `args.object` (the full DTO instance) and checks the XOR condition. Attach it as a class-level decorator on the DTO.

**Why**: Established in PILLY-CAM-001 (2026-04-30). CaminoPointItemDto requires exactly one of `{ caminoPointId }` OR `{ name, country }`. Using all-optional fields without this check silently accepts structurally invalid inputs that the global ValidationPipe would otherwise not catch.

**How to apply:**
- Create the constraint in the same file as the DTO or a co-located `validators/` file
- The outer DTO array must use `@ValidateNested({ each: true })` and `@Type(() => ItemDto)`
- The global `ValidationPipe` with `forbidNonWhitelisted: true` complements this — it strips unknown fields before the XOR constraint runs, so both valid branches must be declared as `@IsOptional()` whitelisted fields on the DTO
