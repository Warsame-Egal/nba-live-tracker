# NBA Live - Frontend

The frontend application for NBA Live, built with React, TypeScript, and Material UI.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development

The app runs on http://localhost:3000 by default (or the next available port).

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code with Prettier

## Project Structure

```
src/
├── components/     # Reusable UI components
│   ├── GameCard.tsx
│   ├── GameDetailsModal.tsx
│   ├── Navbar.tsx
│   ├── PlayByPlay.tsx
│   ├── ScoringLeaders.tsx
│   ├── Standings.tsx
│   └── WeeklyCalendar.tsx
├── pages/          # Page components
│   ├── NotFound.tsx
│   ├── PlayerProfile.tsx
│   ├── RosterPage.tsx
│   ├── Scoreboard.tsx
│   └── TeamPage.tsx
├── services/       # API and WebSocket services
│   ├── PlayByPlayWebSocketService.ts
│   └── websocketService.ts
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── theme.ts        # Material UI theme configuration
```

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=http://localhost:8000
```

## Technologies

- **React 19** - UI library
- **TypeScript** - Type safety
- **Material UI** - Component library
- **Vite** - Build tool
- **React Router** - Navigation
- **date-fns** - Date utilities
- **lodash** - Utility functions

For more information, see the [main README](../README.md).
