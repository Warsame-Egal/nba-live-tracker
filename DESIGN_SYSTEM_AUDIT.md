# Design System Audit & Recommendations

## Current State Analysis

After reviewing your entire frontend codebase, I've identified several inconsistencies that prevent a unified look and feel. Here's what I found:

### ✅ What's Working Well

1. **Theme Context**: You have a proper `ThemeContext` with dark/light mode support
2. **Color Palette**: Consistent primary/secondary colors across components
3. **Typography Scale**: Good base typography definitions in theme
4. **Component Structure**: Well-organized component hierarchy

### ❌ Inconsistencies Found

#### 1. **Border Radius** (Critical)
- **Theme defines**: `8px` (buttons), `12px` (cards), `10px` (text fields), `6px` (chips)
- **Components actually use**: 
  - `borderRadius: 2` (8px) - Most common ✅
  - `borderRadius: 1` (4px) - Small elements
  - `borderRadius: 12` - Some cards
  - `borderRadius: 6` - Chips
  - `borderRadius: 10` - TextFields
  - **Issue**: Theme says cards should be `12px`, but most components use `2` (8px)

**Recommendation**: Standardize to:
- Small elements (chips, badges): `1` (4px)
- Cards, containers: `2` (8px) - **Most common, keep this**
- Large cards: `3` (12px)
- TextFields: `2` (8px) - **Change from 10px**

#### 2. **Spacing** (Critical)
- **Container padding varies**:
  - `{ xs: 4, sm: 5, md: 6 }` - Scoreboard, TeamPage, PlayerProfile
  - `{ xs: 2, sm: 3, md: 4 }` - Scoreboard (px)
  - `{ xs: 2, sm: 3 }` - RosterPage
- **Component padding varies**:
  - `p: { xs: 2.5, sm: 3 }` - GameCard, ScoringLeaders
  - `p: { xs: 2, sm: 2.5 }` - GameDetailsDrawer, Standings cards
  - `p: { xs: 2, sm: 3 }` - Various
- **Section margins vary**:
  - `mb: { xs: 4, sm: 5 }` - Most common
  - `mb: { xs: 3, sm: 4 }` - Some sections
  - `mb: 2` - Fixed values (not responsive)

**Recommendation**: Use consistent spacing scale:
- Container padding: `{ xs: 2, sm: 3, md: 4 }` (horizontal), `{ xs: 4, sm: 5, md: 6 }` (vertical)
- Card padding: `{ xs: 2.5, sm: 3 }` (standard), `{ xs: 2, sm: 2.5 }` (compact)
- Section spacing: `{ xs: 4, sm: 5 }` (standard), `{ xs: 5, sm: 6 }` (large)

#### 3. **Typography** (Moderate)
- **Font weights vary**:
  - `fontWeight: 800` - Page titles (h1, h2, h3)
  - `fontWeight: 700` - Section headings, important text
  - `fontWeight: 600` - Subheadings, buttons
  - `fontWeight: 500` - Captions
  - `fontWeight: 400` - Body text
- **Font sizes**: Good responsive patterns, but some inconsistencies
- **Letter spacing**: Some use theme defaults, others override

**Recommendation**: 
- Page titles: `800` ✅
- Section headings: `700` ✅
- Subheadings: `600` ✅
- Body: `400` ✅
- **Keep current pattern, just ensure consistency**

#### 4. **Colors** (Moderate)
- **Mostly good**: Using theme colors (`primary.main`, `text.secondary`, `divider`)
- **Some hardcoded values**:
  - `#141414` - Background paper (should use `background.paper`)
  - `#1A1A1A` - Table headers (should use theme)
  - `rgba(255, 255, 255, 0.12)` - Dividers (should use `divider`)
  - `rgba(255, 255, 255, 0.08)` - Borders (should use `divider`)

**Recommendation**: Replace all hardcoded colors with theme tokens

#### 5. **Shadows** (Low)
- **Varies**: Some use theme defaults, others define custom shadows
- **Inconsistent**: Different shadow values for similar elevations

**Recommendation**: Standardize shadow values (see designSystem.ts)

#### 6. **Transitions** (Low)
- **Mostly consistent**: `0.2s ease-in-out` or `0.3s ease-in-out`
- **Some variations**: `0.15s`, `cubic-bezier` functions

**Recommendation**: Standardize to:
- Fast: `0.15s ease-in-out`
- Normal: `0.2s ease-in-out` (most common)
- Slow: `0.3s ease-in-out`

## Implementation Plan

### Phase 1: Create Design System (✅ DONE)
- Created `designSystem.ts` with standardized tokens
- Defines spacing, typography, colors, shadows, transitions

### Phase 2: Update Theme Configuration
- Ensure `ThemeContext.tsx` is the single source of truth
- Remove or deprecate old `theme.ts` if not used
- Update theme to match design system tokens

### Phase 3: Refactor Components (Recommended Order)
1. **High Priority**: 
   - Standardize border radius across all cards/containers
   - Standardize spacing (container padding, card padding, section margins)
   - Replace hardcoded colors with theme tokens

2. **Medium Priority**:
   - Standardize typography (ensure consistent font weights)
   - Standardize shadows
   - Standardize transitions

3. **Low Priority**:
   - Review and standardize empty states
   - Review and standardize loading states
   - Review and standardize error states

## Quick Wins

1. **Border Radius**: Change all cards to use `borderRadius: 2` (8px) consistently
2. **Spacing**: Use responsive spacing patterns from designSystem.ts
3. **Colors**: Replace hardcoded colors with theme tokens
4. **Typography**: Ensure all headings use theme typography variants

## Files to Update

### High Priority
- `nba-tracker/src/components/GameCard.tsx` - Border radius, spacing
- `nba-tracker/src/components/Standings.tsx` - Spacing, colors
- `nba-tracker/src/components/GameDetailsDrawer.tsx` - Spacing, border radius
- `nba-tracker/src/pages/Scoreboard.tsx` - Spacing consistency
- `nba-tracker/src/pages/TeamPage.tsx` - Spacing, colors
- `nba-tracker/src/pages/PlayerProfile.tsx` - Spacing, colors

### Medium Priority
- `nba-tracker/src/components/PlayByPlay.tsx` - Spacing, border radius
- `nba-tracker/src/components/ScoringLeaders.tsx` - Spacing
- `nba-tracker/src/components/WeeklyCalendar.tsx` - Border radius
- `nba-tracker/src/pages/RosterPage.tsx` - Spacing

## Next Steps

Would you like me to:
1. **Start refactoring components** to use the design system?
2. **Update the theme** to match design system tokens?
3. **Create example components** showing proper usage?
4. **All of the above** - systematic refactoring?

The design system file (`designSystem.ts`) is ready to use. Components can import it and use the standardized tokens for consistent styling.

