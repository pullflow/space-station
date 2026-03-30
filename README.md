# 🛸 Space Station

**Space Station** is a high-performance development orchestrator designed to manage multiple parallel repository environments ("Planets") on a single machine. It is built for engineers and AI agents who need to work on multiple branches, PRs, or features simultaneously without environment contention.

By leveraging **Dynamic Port Mapping**, Space Station allows you to run entire infrastructure stacks (Databases, Proxies, Apps) in parallel, isolated by their own network "lanes."

---

## 🏗️ Architecture: Hub & Planets

Space Station uses a "Hub and Planet" model to manage your project:

*   **The Hub (`.hub/`)**: The central repository that acts as the single source of truth for your project.
*   **The Planets (`earth/`, `mars/`, etc.)**: Lightweight, linked working directories. Each planet is a full working environment where you can run and test code independently.
*   **Isolated Infrastructure**: Each planet is assigned a unique `BASE_PORT` (e.g., Earth = 10000, Mars = 11000). All services (Postgres, Caddy, Vite) run on ports derived from this base, ensuring zero conflicts.

---

## 🚀 Getting Started

### 1. Installation
Ensure you have [Bun](https://bun.sh) installed, then clone this repository and install dependencies:

```bash
cd space-station
bun install
```

### 2. Initialization
Run the interactive setup to point Space Station to your target repository:

```bash
./ss init
```
*   **REPO**: Your GitHub repository (e.g., `owner/repo`).
*   **SPACESTATION_DIR**: The absolute path where your planets will live.

### 3. Orchestration
Launch your universe of planets:

```bash
./ss setup
```
This will:
1.  Initialize your Hub.
2.  Create your defined planets (default: `mercury`, `venus`, `earth`, `mars`).
3.  Generate planet-specific `.env.local` files with isolated ports.
4.  Symlink shared resources from your `shared/` folder.

---

## 🛰️ The "Multi-Planet" Workflow

### Per-Planet Ports (The `ss-env` Pattern)
To ensure your app runs on the correct isolated port for its planet, all commands should be wrapped in an environment loader (e.g., `run-env` or `ss-env`). 

Space Station writes your isolated ports (like `BASE_PORT`, `POSTGRES_PORT`, etc.) into each planet's `.env.local`. When you run:
```bash
./run-env bun run dev
```
The app will automatically start on its assigned "lane" (e.g., `10823` for Earth), allowing you to run 4+ copies of your entire stack simultaneously.

### Common Commands
*   **`ss status`**: View the current branch and Git status of all planets.
*   **`ss prs`**: Interactively list and checkout PRs to a specific planet.
*   **`ss <planet>`**: Instantly reset a planet to `main` and open it in your editor.
*   **`ss agent <type> <number>`**: Launch an AI agent with the context of a specific Issue or PR.

---

## 🛠️ Customization

### Configuration (`ss.json`)
You can customize your universe in `ss.json`:
```json
{
  "PLANETS": ["mercury", "venus", "earth", "mars", "jupiter"],
  "BASE_PORT": 8000,
  "PORT_STEP": 1000,
  "EDITOR": "cursor"
}
```

### Templating
Place any `.template` file in `shared/templates/` (e.g., `Caddyfile.template`). During `ss setup`, these will be processed into every planet, replacing variables like:
*   `{{PLANET_NAME}}`
*   `{{PLANET_INDEX}}`
*   `{{BASE_PORT}}`
*   `{{POSTGRES_PORT}}` (and other standard offsets)

---

## 🌌 Why Space Station?
Modern development with AI agents creates a bottleneck: **testing**. If an agent is working in your only working tree, you can't test their work without stopping yours. 

**Space Station solves this.** It gives every agent their own planet, their own database, and their own public URL, allowing you to verify their progress in real-time while you continue to lead the mission from the bridge.

Safe travels, commander. 🛸
