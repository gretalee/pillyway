---
name: "Pillyway UI component library pattern"
description: "Base UI React is the headless component primitive, not Radix — affects how polymorphism and composition work"
type: project
---

This project uses `@base-ui/react` (v1.4.1, MUI's headless library) as its component primitive, NOT Radix UI. The shadcn CLI was used to scaffold component files but the underlying primitives are Base UI.

**Why:** The repo was set up with Base UI as the headless layer. This is non-standard compared to most shadcn/ui setups which use Radix.

**How to apply:** Never assume Radix patterns like `asChild` prop work here. Use Base UI's `render` prop for polymorphism. For link-as-button, apply `buttonVariants` className directly to an `<a>` tag instead of using `asChild`.

## Base UI Menu API (used for UserMenu)
- `Menu.Root` — context provider
- `Menu.Trigger` — button that opens menu
- `Menu.Portal` — renders outside DOM hierarchy
- `Menu.Positioner` — floating positioner with `side` / `align` / `sideOffset` props
- `Menu.Popup` — the popup container
- `Menu.Item` — interactive item
- `Menu.LinkItem` — anchor `<a>` item with `href` and optional `closeOnClick`
- `Menu.Separator` — visual divider

## Button variants for links
Use `buttonVariants()` from `@/components/ui/button` + `cn()` applied to a plain `<a>` element. Do NOT pass `asChild` — it does not exist on Base UI Button.
