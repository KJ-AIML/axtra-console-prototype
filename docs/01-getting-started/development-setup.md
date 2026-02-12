# Development Setup

Configure your development environment for optimal productivity.

---

## 🛠️ IDE Recommendations

### Visual Studio Code (Recommended)

**Required Extensions:**
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript Importer** - Auto imports
- **Tailwind CSS IntelliSense** - Class autocomplete
- **Vitest** - Test runner

**Recommended Settings** (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

### Alternative: WebStorm

Built-in support for:
- TypeScript
- React
- Tailwind CSS
- Vitest

---

## 🔧 Development Tools

### 1. Git Configuration

```bash
# Set your identity
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Useful aliases
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
```

### 2. Node Version Management

**Using nvm (macOS/Linux):**
```bash
nvm install 20
nvm use 20
nvm alias default 20
```

**Using nvm-windows:**
```powershell
nvm install 20.0.0
nvm use 20.0.0
```

### 3. Package Manager

This project uses **npm**. Alternative package managers:

```bash
# Using pnpm (faster)
pnpm install
pnpm dev

# Using yarn
yarn install
yarn dev
```

---

## 🐛 Debugging

### Frontend Debugging

**Browser DevTools:**
1. Open http://localhost:3000
2. Press `F12` or `Cmd+Option+I` (macOS)
3. Go to Sources tab
4. Find `src/` folder under `localhost:3000/src`

**VS Code Launch Config** (`.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Frontend",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

### Backend Debugging

**Using Node.js Inspector:**
```bash
# Start with inspector
node --inspect server/index.ts

# Or with tsx
npx tsx --inspect server/index.ts
```

**VS Code Launch Config:**
```json
{
  "name": "Debug Backend",
  "type": "node",
  "request": "launch",
  "runtimeExecutable": "npx",
  "runtimeArgs": ["tsx", "--inspect", "server/index.ts"],
  "envFile": "${workspaceFolder}/.env.local"
}
```

### Python Agent Debugging

```bash
cd server/agent/python-livekit

# Run with debug logging
DEBUG_MODE=true uv run python livekit_agent_langchain.py dev
```

---

## 📝 Code Quality

### ESLint

Configuration in `package.json`:
```json
{
  "eslintConfig": {
    "extends": ["react-app", "react-app/jest"]
  }
}
```

Run linting:
```bash
npx eslint src --ext .ts,.tsx
```

### Prettier

Configuration in `.prettierrc`:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

Format code:
```bash
npx prettier --write "src/**/*.{ts,tsx,css}"
```

### TypeScript Strict Mode

Enabled in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

---

## 🧪 Testing Workflow

### Running Tests

```bash
# All tests
npm test -- --run

# Specific file
npm test -- src/components/Button.test.tsx

# Watch mode
npm test

# With UI
npm run test:ui

# Coverage
npm run test:coverage
```

### Test Structure

```
src/
├── Component.tsx
├── Component.test.tsx    # Component test
├── utils/
│   ├── helper.ts
│   └── helper.test.ts    # Unit test
└── stores/
    ├── useStore.ts
    └── useStore.test.ts  # Store test
```

### Writing Tests

Example component test:
```typescript
import { render, screen } from '@testing-library/react';
import { Component } from './Component';

vi.mock('../stores', () => ({
  useStore: () => ({ data: [] }),
}));

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByText('Title')).toBeInTheDocument();
  });
});
```

---

## 🎨 Design System

### Tailwind Configuration

Using Tailwind CSS v4 with PostCSS:

```javascript
// tailwind.config.js
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
      },
    },
  },
};
```

### Color Usage

| Token | Value | Usage |
|-------|-------|-------|
| Brand | `indigo-600` | Primary buttons, active states |
| Success | `emerald-500` | Success states |
| Warning | `amber-500` | Warnings |
| Error | `rose-500` | Errors |
| Background | `slate-50` | App background |
| Surface | `white` | Cards, panels |

---

## 🚀 Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
# Write tests
# Run tests
npm test -- --run

# Build
npm run build

# Commit
git add .
git commit -m "feat: add new feature"
```

### 2. Code Review Checklist

- [ ] Tests pass (`npm test -- --run`)
- [ ] Build succeeds (`npm run build`)
- [ ] No TypeScript errors
- [ ] Code follows conventions
- [ ] Component has proper types
- [ ] Edge cases handled

### 3. Hot Reload

Vite provides instant updates:
- Frontend changes: ~100ms
- Backend changes: Automatic restart

---

## 🔍 Debugging Tips

### Common Issues

**1. "Module not found"**
```bash
# Clear cache
rm -rf node_modules/.vite
npm run dev
```

**2. TypeScript errors not showing**
```bash
# Restart TypeScript server in VS Code
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

**3. Tests failing intermittently**
```bash
# Run with UI to debug
npm run test:ui
```

**4. API not responding**
```bash
# Check if backend is running
curl http://localhost:3001/api/health
```

---

## 📚 Additional Resources

- [Testing Guide](../04-development/testing.md)
- [Coding Standards](../04-development/coding-standards.md)
- [Design System](../04-development/design-system.md)
- [Troubleshooting](../06-reference/troubleshooting.md)
