/* ═══════════════════════════════════════════════════════
   DEV-DETECTIVE — APPLICATION LOGIC
   All three phases: Search, Repos, Battle Mode
   Uses native fetch() with async/await
   ═══════════════════════════════════════════════════════ */

// ── DOM REFERENCES ──
const modeToggleBtn = document.getElementById("mode-toggle-btn");
const toggleLabel = document.getElementById("toggle-label");
const singleSection = document.getElementById("single-search-section");
const battleSection = document.getElementById("battle-search-section");

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const resultArea = document.getElementById("result-area");

const battleForm = document.getElementById("battle-form");
const battleInput1 = document.getElementById("battle-input-1");
const battleInput2 = document.getElementById("battle-input-2");
const battleResultArea = document.getElementById("battle-result-area");

// ── GITHUB API BASE ──
const API_BASE = "https://api.github.com/users";

// ═══════════════════════════════════════════════════════
// UTILITY: Format ISO date to human-readable string
// e.g. "2023-01-25T12:00:00Z" → "25 Jan 2023"
// ═══════════════════════════════════════════════════════
function formatDate(isoString) {
  const date = new Date(isoString);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

// ═══════════════════════════════════════════════════════
// UTILITY: Abbreviate large numbers (e.g. 12400 → "12.4k")
// ═══════════════════════════════════════════════════════
function abbreviateNumber(num) {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "k";
  return num.toString();
}

// ═══════════════════════════════════════════════════════
// UTILITY: Language color map
// ═══════════════════════════════════════════════════════
const LANG_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Lua: "#000080",
  R: "#198CE7",
  Scala: "#c22d40",
  Vue: "#41b883",
  Jupyter: "#F37626",
  default: "#8b949e",
};

function getLangColor(lang) {
  return LANG_COLORS[lang] || LANG_COLORS.default;
}

// ═══════════════════════════════════════════════════════
// RENDER: Loading State
// ═══════════════════════════════════════════════════════
function renderLoading(container) {
  container.innerHTML = `
    <div class="loading-container" id="loading-indicator">
      <div class="spinner"></div>
      <p class="loading-text">Fetching profile data…</p>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════
// RENDER: Error State
// ═══════════════════════════════════════════════════════
function renderError(container, status, username) {
  let icon = "🔍";
  let title = "User Not Found";
  let message = `We couldn't find a GitHub user named "<strong>${escapeHTML(username)}</strong>". Please check the spelling and try again.`;

  if (status === 403) {
    icon = "⏱️";
    title = "Rate Limit Exceeded";
    message =
      "You've exceeded the GitHub API rate limit (60 requests/hour for unauthenticated users). Please wait a few minutes and try again.";
  } else if (status !== 404) {
    icon = "⚠️";
    title = "Something Went Wrong";
    message = `An unexpected error occurred (HTTP ${status}). Please try again later.`;
  }

  container.innerHTML = `
    <div class="error-container" id="error-display">
      <span class="error-icon">${icon}</span>
      <h3 class="error-title">${title}</h3>
      <p class="error-message">${message}</p>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════
// UTILITY: Escape HTML to prevent XSS
// ═══════════════════════════════════════════════════════
function escapeHTML(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ═══════════════════════════════════════════════════════
// FETCH: Get user profile from GitHub API
// ═══════════════════════════════════════════════════════
async function fetchUser(username) {
  const response = await fetch(`${API_BASE}/${username}`);
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  return data;
}

// ═══════════════════════════════════════════════════════
// FETCH: Get user repositories (sorted by most recent)
// ═══════════════════════════════════════════════════════
async function fetchRepos(username) {
  const response = await fetch(
    `${API_BASE}/${username}/repos?sort=updated&per_page=5`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch repos: HTTP ${response.status}`);
  }
  const data = await response.json();
  return data;
}

// ═══════════════════════════════════════════════════════
// FETCH: Get ALL repos for star counting (paginated)
// ═══════════════════════════════════════════════════════
async function fetchAllRepos(username) {
  let page = 1;
  let allRepos = [];
  // Fetch up to 5 pages (500 repos max) to stay within rate limits
  while (page <= 5) {
    const response = await fetch(
      `${API_BASE}/${username}/repos?per_page=100&page=${page}`
    );
    if (!response.ok) break;
    const data = await response.json();
    if (data.length === 0) break;
    allRepos = allRepos.concat(data);
    if (data.length < 100) break;
    page++;
  }
  return allRepos;
}

// ═══════════════════════════════════════════════════════
// CALCULATE: Total stars from repos array using reduce
// ═══════════════════════════════════════════════════════
function calculateTotalStars(repos) {
  return repos.reduce((total, repo) => total + (repo.stargazers_count || 0), 0);
}

// ═══════════════════════════════════════════════════════
// RENDER: Profile Card + Repos (Phase 1 & 2)
// ═══════════════════════════════════════════════════════
function renderProfile(container, user, repos) {
  const name = escapeHTML(user.name || user.login);
  const bio = escapeHTML(user.bio || "This user hasn't written a bio yet.");
  const joinDate = formatDate(user.created_at);
  const blogUrl = user.blog
    ? user.blog.startsWith("http")
      ? user.blog
      : `https://${user.blog}`
    : null;

  // Build repos HTML
  let reposHTML = "";
  if (repos && repos.length > 0) {
    const repoCards = repos
      .map((repo) => {
        const langDot = repo.language
          ? `<span class="repo-lang-dot" style="background:${getLangColor(repo.language)}"></span>
             <span>${escapeHTML(repo.language)}</span>`
          : "";
        const desc = repo.description
          ? `<p class="repo-desc">${escapeHTML(repo.description)}</p>`
          : "";
        const updatedAt = repo.updated_at
          ? `<p class="repo-updated">Updated ${formatDate(repo.updated_at)}</p>`
          : "";

        return `
        <div class="repo-card">
          <div class="repo-info">
            <a href="${escapeHTML(repo.html_url)}" target="_blank" rel="noopener" class="repo-name">
              ${escapeHTML(repo.name)}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
            ${desc}
            ${updatedAt}
          </div>
          <div class="repo-meta">
            ${
              repo.stargazers_count > 0
                ? `<span class="repo-stat stars">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    ${abbreviateNumber(repo.stargazers_count)}
                  </span>`
                : ""
            }
            ${
              repo.forks_count > 0
                ? `<span class="repo-stat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"/><line x1="12" y1="12" x2="12" y2="15"/></svg>
                    ${abbreviateNumber(repo.forks_count)}
                  </span>`
                : ""
            }
            ${
              langDot
                ? `<span class="repo-stat">${langDot}</span>`
                : ""
            }
          </div>
        </div>
      `;
      })
      .join("");

    reposHTML = `
      <div class="repos-section">
        <h3 class="repos-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          Latest Repositories
        </h3>
        <div class="repo-list">${repoCards}</div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="profile-card glass-card" id="profile-card">
      <div class="profile-header">
        <div class="avatar-wrapper">
          <img
            class="avatar"
            src="${escapeHTML(user.avatar_url)}"
            alt="${name}'s avatar"
            loading="lazy"
          />
          <div class="avatar-ring"></div>
        </div>
        <div class="profile-info">
          <h2 class="profile-name">${name}</h2>
          <p class="profile-login">@${escapeHTML(user.login)}</p>
          <p class="profile-bio">${bio}</p>
          <div class="profile-meta">
            <span class="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Joined ${joinDate}
            </span>
            ${
              blogUrl
                ? `<span class="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    <a href="${escapeHTML(blogUrl)}" target="_blank" rel="noopener">${escapeHTML(user.blog)}</a>
                  </span>`
                : ""
            }
            ${
              user.location
                ? `<span class="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    ${escapeHTML(user.location)}
                  </span>`
                : ""
            }
          </div>
        </div>
      </div>

      <div class="stats-bar" id="stats-bar">
        <div class="stat-item">
          <div class="stat-value">${abbreviateNumber(user.public_repos)}</div>
          <div class="stat-label">Repos</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${abbreviateNumber(user.followers)}</div>
          <div class="stat-label">Followers</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${abbreviateNumber(user.following)}</div>
          <div class="stat-label">Following</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${abbreviateNumber(user.public_gists || 0)}</div>
          <div class="stat-label">Gists</div>
        </div>
      </div>

      ${reposHTML}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════
// PHASE 1 & 2: Handle single user search
// ═══════════════════════════════════════════════════════
async function handleSearch(username) {
  // Show loading state
  renderLoading(resultArea);

  try {
    // Phase 1: Fetch user profile
    const user = await fetchUser(username);

    // Phase 2: Chain second request for repos using repos_url
    const repos = await fetchRepos(username);

    // Render the complete profile with repos
    renderProfile(resultArea, user, repos);
  } catch (error) {
    // Error handling — render clean error UI, app does NOT crash
    const status = error.status || 500;
    renderError(resultArea, status, username);
  }
}

// ═══════════════════════════════════════════════════════
// RENDER: Battle Card for one user
// ═══════════════════════════════════════════════════════
function renderBattleCard(user, totalStars, outcome) {
  // outcome: "winner" | "loser" | "draw"
  const badgeText =
    outcome === "winner" ? "🏆 Winner" : outcome === "loser" ? "Defeated" : "🤝 Draw";

  return `
    <div class="battle-card glass-card ${outcome}" id="battle-card-${escapeHTML(user.login)}">
      <span class="battle-badge">${badgeText}</span>
      <img class="battle-avatar" src="${escapeHTML(user.avatar_url)}" alt="${escapeHTML(user.login)}'s avatar" />
      <h3 class="battle-name">${escapeHTML(user.name || user.login)}</h3>
      <p class="battle-login">@${escapeHTML(user.login)}</p>

      <div class="battle-stars">
        <div class="battle-stars-value">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          ${abbreviateNumber(totalStars)}
        </div>
        <div class="battle-stars-label">Total Stars</div>
      </div>

      <div class="battle-stats-mini">
        <div class="battle-stat-mini">
          <div class="stat-value">${abbreviateNumber(user.public_repos)}</div>
          <div class="stat-label">Repos</div>
        </div>
        <div class="battle-stat-mini">
          <div class="stat-value">${abbreviateNumber(user.followers)}</div>
          <div class="stat-label">Followers</div>
        </div>
        <div class="battle-stat-mini">
          <div class="stat-value">${abbreviateNumber(user.following)}</div>
          <div class="stat-label">Following</div>
        </div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════
// PHASE 3: Handle Battle Mode
// Uses Promise.all() to fetch both users simultaneously
// ═══════════════════════════════════════════════════════
async function handleBattle(username1, username2) {
  renderLoading(battleResultArea);

  try {
    // Fetch BOTH users and their repos in parallel using Promise.all()
    const [user1, user2, repos1, repos2] = await Promise.all([
      fetchUser(username1),
      fetchUser(username2),
      fetchAllRepos(username1),
      fetchAllRepos(username2),
    ]);

    // Calculate total stars using reduce/accumulator
    const stars1 = calculateTotalStars(repos1);
    const stars2 = calculateTotalStars(repos2);

    // Determine winner/loser conditionally
    let outcome1, outcome2;
    if (stars1 > stars2) {
      outcome1 = "winner";
      outcome2 = "loser";
    } else if (stars2 > stars1) {
      outcome1 = "loser";
      outcome2 = "winner";
    } else {
      outcome1 = "draw";
      outcome2 = "draw";
    }

    // Render battle comparison UI
    battleResultArea.innerHTML = `
      <div class="battle-grid" id="battle-results">
        ${renderBattleCard(user1, stars1, outcome1)}
        ${renderBattleCard(user2, stars2, outcome2)}
      </div>
    `;
  } catch (error) {
    const status = error.status || 500;
    const failedUser = error.message.includes(username1) ? username1 : username2;
    renderError(battleResultArea, status, failedUser || "unknown");
  }
}

// ═══════════════════════════════════════════════════════
// EVENT: Search Form Submit
// ═══════════════════════════════════════════════════════
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = searchInput.value.trim();
  if (!username) return;
  handleSearch(username);
});

// ═══════════════════════════════════════════════════════
// EVENT: Battle Form Submit
// ═══════════════════════════════════════════════════════
battleForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const user1 = battleInput1.value.trim();
  const user2 = battleInput2.value.trim();
  if (!user1 || !user2) return;
  if (user1.toLowerCase() === user2.toLowerCase()) {
    battleResultArea.innerHTML = `
      <div class="error-container">
        <span class="error-icon">🤔</span>
        <h3 class="error-title">Same User</h3>
        <p class="error-message">Enter two different usernames to compare!</p>
      </div>
    `;
    return;
  }
  handleBattle(user1, user2);
});

// ═══════════════════════════════════════════════════════
// EVENT: Toggle Battle Mode
// ═══════════════════════════════════════════════════════
let isBattleMode = false;

modeToggleBtn.addEventListener("click", () => {
  isBattleMode = !isBattleMode;
  modeToggleBtn.classList.toggle("active", isBattleMode);
  toggleLabel.textContent = isBattleMode ? "Single Mode" : "Battle Mode";

  if (isBattleMode) {
    singleSection.classList.remove("active");
    battleSection.classList.add("active");
  } else {
    battleSection.classList.remove("active");
    singleSection.classList.add("active");
  }
});

// ═══════════════════════════════════════════════════════
// BONUS: Allow Enter key to submit in single search
// ═══════════════════════════════════════════════════════
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    searchForm.dispatchEvent(new Event("submit"));
  }
});
