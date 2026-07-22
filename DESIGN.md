---
version: alpha
name: Paypers
description: A playful, high-trust Thai fintech system with crisp monochrome structure and colorful performance accents.
colors:
  primary: "#171717"
  secondary: "#0A0A0A"
  tertiary: "#E5E5E5"
  neutral: "#FFFFFF"
  surface: "#FFFFFF"
  on-surface: "#0A0A0A"
  text-muted: "#6B7280"
  accent-blue: "#3B82F6"
  accent-orange: "#F59E0B"
  accent-green: "#10B981"
  accent-lime: "#D9E021"
  border: "#E5E7EB"
  success: "#10B981"
  error: "#EF4444"
typography:
  headline-display:
    fontFamily: "Outfit"
    fontSize: "72px"
    fontWeight: 700
    lineHeight: "79.2px"
    letterSpacing: "-1.44px"
  headline-lg:
    fontFamily: "Outfit"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: "52px"
    letterSpacing: "-0.4px"
  headline-md:
    fontFamily: "Outfit"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "33.6px"
  headline-sm:
    fontFamily: "Outfit"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: "28px"
  body-lg:
    fontFamily: "Outfit"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: "32px"
  body-md:
    fontFamily: "Outfit"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "28px"
  body-sm:
    fontFamily: "Outfit"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "22px"
  label-lg:
    fontFamily: "Outfit"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: "28px"
  label-md:
    fontFamily: "Outfit"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: "24px"
  label-sm:
    fontFamily: "Outfit"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
  caption:
    fontFamily: "Outfit"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
rounded:
  none: 0px
  sm: 4px
  md: 6px
  lg: 12px
  xl: 24px
  full: 9999px
spacing:
  xs: 6px
  sm: 16px
  md: 40px
  lg: 64px
  xl: 76px
  gutter: 24px
  section: 96px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: "18px 24px"
    height: "56px"
  button-primary-hover:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: "18px 24px"
    height: "56px"
  button-secondary-hover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: "0px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: "32px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "16px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
---

# Paypers

## Overview

Paypers feels friendly, modern, and lightly playful, with a strong fintech credibility underneath. The page is spacious and poster-like, using a large Thai headline, generous white space, and a few hand-drawn illustrations to make a practical accounting product feel approachable. The tone is professional but not corporate, aimed at small businesses and operators who want speed, clarity, and low friction.

## Colors

- **Primary (#171717):** The main ink color for the strongest buttons, nav emphasis, and key text. It reads as near-black without feeling harsh.
- **Secondary (#0A0A0A):** A deeper text tone used for maximum contrast on bright white surfaces and for body copy hierarchy.
- **Tertiary (#E5E5E5):** A subtle neutral border and divider color that keeps the interface airy and low-contrast.
- **Surface (#FFFFFF):** The dominant canvas color, supporting the clean, spacious editorial layout.
- **Accent Blue (#3B82F6):** Used for the first metric and supporting graphic touches; it signals trust and system clarity.
- **Accent Orange (#F59E0B):** A warm, energetic highlight for performance statistics and lightweight illustration accents.
- **Accent Green (#10B981):** Used for success and productivity moments, especially metrics and time-saving messaging.
- **Accent Lime (#D9E021):** A bright hand-drawn accent that adds personality and sketch-like motion around the edges of the page.
- **Text Muted (#6B7280):** Used for supporting descriptions and secondary labels so the dominant headline remains prominent.
- **Border (#E5E7EB):** A quiet structural tone for cards, inputs, and call-to-action boundaries.
- **Success (#10B981):** Reinforces positive outcomes and operational efficiency.
- **Error (#EF4444):** Reserved for validation and problem states; it should stay rare in this otherwise optimistic palette.

## Typography

The system is built on Outfit, which keeps Thai text legible, contemporary, and precise. Headings use bold weights with tight negative letter spacing for a confident, compact display style, while body copy stays regular and breathable for explanatory content. Labels and buttons use medium weight to create clear interface hierarchy without adding visual noise.

- **Headline display:** 72px, 700, used for the hero statement and the most important marketing message.
- **Headline lg:** 40px, 700, used for major section titles and large supporting headlines.
- **Headline md:** 24px, 700, used for subsection headers and feature titles.
- **Headline sm:** 20px, 700, used for compact card headings and strong labels.
- **Body lg:** 18px, 400, used for hero supporting text and prominent descriptive copy.
- **Body md:** 16px, 400, used for standard paragraphs and interface text.
- **Body sm:** 14px, 400, used for footnotes and supporting notes.
- **Label lg:** 20px, 500, used for primary button text and high-visibility interface labels.
- **Label md:** 16px, 500, used for navigation, utility actions, and medium emphasis controls.
- **Label sm:** 12px, 500, used for compact badges and micro-labels.
- **Caption:** 14px, 400, used for auxiliary annotations.

Uppercase styling is not a dominant pattern; clarity comes more from size, weight, and spacing than from forced casing.

## Layout

The layout is centered and highly spacious, with a fixed-max-width feel rather than a dense fluid dashboard. The hero sits in a wide vertical stack: top navigation, large centered headline, subheading, primary CTA, and then proof metrics. Section spacing is substantial, using the 64px, 76px, and 96px rhythm to keep the page feeling airy and easy to scan.

Cards and content blocks prefer generous internal padding, especially 32px in larger containers. The layout relies on open white space and a few floating decorative elements at the edges, which makes the core content feel calm and premium while still playful. Dividers and vertical separators are thin and understated, preserving the editorial feel.

## Elevation & Depth

Depth is subtle and mostly achieved through soft shadows rather than heavy layering. The primary button uses a small, crisp shadow to lift it from the page, and cards use a wider, gentler shadow for separation without feeling dense. Borders are light and minimal, so contrast and spacing do most of the hierarchy work.

The overall system is close to flat, with tonal contrast used instead of dramatic elevation stacks. This keeps the interface clean and fast-looking, which fits a service centered on efficiency and trust.

## Shapes

The shape language is soft and restrained. Interactive controls use a 6px radius for a modern, approachable feel, while larger cards use 24px rounding to feel friendly and premium. The system avoids extreme pill shapes except where they help with compact chips or tags.

Overall, the geometry is calm and rounded enough to feel human, but not so soft that it loses the product’s professional edge.

## Components

**Buttons**
- Use `button-primary` for the main call to action. It should be dark, high-contrast, and sized for easy tapping with a 56px height.
- Use `button-secondary` for alternate actions such as cancel, learn more, or secondary confirmation.
- Keep button padding spacious at 18px 24px so text feels centered and deliberate.
- Hover states should stay subtle: slightly adjusted darkening or surface shifts, not animated color explosions.
- `button-link` should remain visually minimal, with no fill and an underline for low-priority navigation or legal links.

**Cards**
- Use `card` for content summaries, consent banners, or grouped metrics.
- Cards should stay white, lightly shadowed, and rounded at 24px for a soft container feel.
- Prefer 32px padding inside larger cards so text and controls never feel cramped.

**Inputs**
- Inputs should follow the same restrained rounding as buttons, with clear borders and a white background.
- Focus states should be obvious but not loud; use color and border contrast rather than thick outlines.
- Keep text sizes aligned with `body-md` for legibility.

**Chips and small tags**
- Chips should be compact, lightly bordered or softly filled, and fully rounded.
- Use them for status labels, categories, or short metadata only.
- Avoid oversized chip treatments; they should support content, not compete with it.

**Navigation**
- Top navigation is text-based and minimal, with medium-weight labels and generous horizontal spacing.
- The main login action should remain the only visually dominant item in the header.

**Metrics and feature callouts**
- Numbers should be large, colorful, and confident, with supporting labels muted beneath them.
- Use accent colors sparingly to distinguish metric groups and maintain scanability.
- Icons and illustrations should keep a hand-drawn, lighthearted character while staying small enough not to overpower the typography.

## Do's and Don'ts

- Do keep the page airy, centered, and easy to scan with large vertical gaps.
- Do use Outfit consistently for every text style.
- Do reserve dark filled buttons for the single primary action on a screen.
- Do use accent colors to differentiate statistics and small highlights, not entire sections.
- Don't introduce heavy gradients, loud backgrounds, or dense card grids.
- Don't over-round everything into pills; preserve the 6px to 24px radius range.
- Don't make body copy too small or too light; Thai text needs clear legibility.
- Don't add strong shadows or complex depth layers that conflict with the clean, editorial look.