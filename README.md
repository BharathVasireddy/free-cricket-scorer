# Cricket Scorer App

A modern, minimal cricket scoring app built with React, TypeScript, and Tailwind CSS. This app allows you to score cricket matches with custom rules, live ball-by-ball tracking, and detailed scorecards.

## 🏏 Features

### Phase 1 (Complete)
- ✅ Modern React TypeScript setup with Vite
- ✅ Mobile-first responsive design with Tailwind CSS
- ✅ Complete type definitions for cricket match data
- ✅ Zustand state management for match state
- ✅ Welcome page with modern design
- ✅ Match setup with configurable rules:
  - Number of overs (5-50)
  - Players per team (6-11)
  - Joker rule toggle
  - Single-side batting option
  - Custom team names and player names
- ✅ Live scoring interface with:
  - Ball-by-ball scoring (0,1,2,3,4,6)
  - Extras (wide, no-ball, bye, leg-bye)
  - Wicket tracking
  - Real-time score updates
  - Current over display
  - Player statistics
- ✅ Detailed scorecard with:
  - Batting statistics (runs, balls, 4s, 6s, strike rate)
  - Bowling statistics (overs, maidens, runs, wickets, economy)
  - Over-by-over summary

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cricket-scorer
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## 📱 How to Use

### Starting a New Match

1. **Welcome Screen**: Click "Start New Match"
2. **Match Setup**: 
   - Select number of overs (default: 10)
   - Choose players per team (default: 8)
   - Toggle Joker rule if needed
   - Toggle Single-side batting if needed
   - Enter team names
   - Enter player names for both teams
3. **Start Match**: Click "Start Match" to begin scoring

### Live Scoring

- **Select Batsman**: Tap on a batsman to make them the active scorer
- **Score Runs**: Use the number buttons (0,1,2,3,4,6) to record runs
- **Extras**: Use Wide, No Ball, Bye, Leg Bye buttons for extras
- **Wickets**: Use the red "Wicket" button to record dismissals
- **View Details**: Check "Scorecard" for detailed statistics
- **Navigation**: Use "Change Batsman" and "Change Bowler" (coming soon)

### Scorecard Features

- Complete batting scorecard with runs, balls, boundaries, and strike rates
- Bowling figures with overs, maidens, runs, wickets, and economy rates
- Over-by-over breakdown showing each ball bowled
- Real-time run rate calculations

## 🛠️ Technology Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router
- **Type Safety**: Full TypeScript coverage

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/           # Reusable UI components (planned)
│   ├── scoring/      # Scoring-specific components (planned)
│   └── navigation/   # Navigation components (planned)
├── pages/
│   ├── WelcomePage.tsx
│   ├── MatchSetupPage.tsx
│   ├── LiveScoringPage.tsx
│   └── ScorecardPage.tsx
├── store/
│   └── matchStore.ts # Zustand store for match state
├── types/
│   └── index.ts      # TypeScript type definitions
└── utils/            # Utility functions (planned)
```

## 🎯 Upcoming Features (Next Phases)

### Phase 2: Enhanced Scoring
- Player change modals
- Undo last ball functionality
- Over completion handling
- Innings transition

### Phase 3: Custom Rules
- Joker player implementation
- Single-side batting logic
- Bowling restrictions
- Advanced match configurations

### Phase 4: Firebase Integration
- WhatsApp authentication
- Cloud storage
- Real-time sync
- Offline support

### Phase 5: Analytics & History
- Match history
- Player statistics
- Performance analytics
- Export functionality

## 🎨 Design Principles

- **Mobile-First**: Optimized for phone screens
- **No-Scroll Scoring**: Key scoring elements fit in viewport
- **Minimal Interface**: Clean, uncluttered design
- **Fast Interactions**: Quick scoring without complex navigation
- **Accessible**: Large touch targets and good contrast

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style

- TypeScript strict mode enabled
- ESLint configuration included
- Tailwind CSS for styling
- Functional components with hooks

## 🤝 Contributing

This project follows the roadmap outlined in the development plan. Contributions are welcome for:

- Bug fixes
- Feature implementations from the roadmap
- UI/UX improvements
- Performance optimizations

## 📄 License

MIT License - see LICENSE file for details

## 📞 Support

For questions or support, please create an issue in the repository.

---

**Current Status**: Phase 1 Complete ✅  
**Next Phase**: Enhanced Scoring Logic  
**Target**: Production-ready cricket scoring app
