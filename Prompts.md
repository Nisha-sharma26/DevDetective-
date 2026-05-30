# Dev-Detective — Prompts.md

## Project Overview
**Dev-Detective** is a client-side GitHub profile explorer built with vanilla HTML, CSS, and JavaScript. It interfaces with the GitHub REST API using `fetch()` with `async/await` to search users, display profiles with repositories, and compare developers in Battle Mode.

## Architecture Decisions

### Phase 1: Base MVP
- **Search Architecture**: Single input form with a submit handler that calls the GitHub Users API (`GET https://api.github.com/users/{username}`).
- **Async Logic**: All API calls use `async/await` with `try/catch` for error handling. The app never crashes on failure.
- **Loading State**: A CSS spinner animation is rendered while promises are resolving.
- **Error Handling**: HTTP 404 returns a clean "User Not Found" card. HTTP 403 shows rate limit info. Other errors show a generic fallback.

### Phase 2: Data Expansion
- **Endpoint Chaining**: After fetching the user profile, a second `fetch()` call hits `GET /users/{username}/repos?sort=updated&per_page=5` to get the 5 most recently updated repositories.
- **List Rendering**: Repos are mapped to clickable `<a>` elements opening in a new tab (`target="_blank"`).
- **Date Formatting**: A `formatDate()` utility converts ISO 8601 timestamps (e.g., `2023-01-25T12:00:00Z`) into human-readable format (`25 Jan 2023`).

### Phase 3: Battle Mode
- **Dual Input UI**: A toggle button switches between Single Search and Battle Mode, revealing two input fields.
- **Promise.all()**: Both users' profiles and repositories are fetched simultaneously using `Promise.all([...])` for optimal performance.
- **Star Calculation**: The `calculateTotalStars()` function uses `Array.reduce()` to accumulate `stargazers_count` across all repositories.
- **Conditional Rendering**: The winner is highlighted with a green indicator and "🏆 Winner" badge; the loser gets a red "Defeated" badge. Ties show a yellow "🤝 Draw" badge.

## Key Concepts Used
- **Promises & Async/Await**: All network operations are promise-based with async/await syntax.
- **JSON Parsing**: `response.json()` is used to parse API responses.
- **DOM Manipulation**: `innerHTML` is used for rendering dynamic content with proper HTML escaping for security.
- **Error Boundaries**: `try/catch` blocks ensure the application never crashes.
- **Array Methods**: `.map()`, `.reduce()`, `.concat()` for data processing.

## API Endpoints
| Endpoint | Purpose |
|----------|---------|
| `GET /users/{username}` | Fetch user profile |
| `GET /users/{username}/repos?sort=updated&per_page=5` | Fetch latest 5 repos |
| `GET /users/{username}/repos?per_page=100&page={n}` | Fetch all repos (for star counting) |

## File Structure
```
├── index.html    — Main HTML structure
├── style.css     — Complete styling with dark theme & animations
├── app.js        — All application logic (fetch, render, events)
└── Prompts.md    — This file
```
