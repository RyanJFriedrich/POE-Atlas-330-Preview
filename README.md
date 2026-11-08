# Path of Exile - Atlas Skill Tree Mockup & Planner

An interactive web mockup and build planner for the redesigned radial **Path of Exile Atlas Passive Tree**. 

Built entirely in vanilla HTML5, CSS3, and modern SVG/JavaScript with zero dependencies. It runs directly as a standalone static application (compatible with GitHub Pages and local `file://` browser access).

---

## 🌟 Key Features

### 1. Interactive Skill Tree Planner
* **150-Point Cap Simulation**: Live tracker `[ X / 150 ]` showing allocated points and remaining allowance.
* **Auto-Pathfinding**: Click any node across the tree; Dijkstra/BFS calculates the shortest path from your allocated tree and allocates intermediate passives in a single click.
* **Smart Unallocation & Trimming**:
  * Unallocate leaf nodes safely.
  * `Shift + Click` an allocated branch node to auto-trim all dependent downstream passives.
* **Full History**: Undo (`Ctrl + Z`), Redo (`Ctrl + Y`), and one-click `Reset`.
* **Stats Breakdown**: Collapsible drawer showing points spent per mechanic and active passive bonuses.

### 2. Built-in Visual Calibration Editor
* **Background Opacity Slider**: Toggle the underlying high-resolution 4K game screenshot from 0% to 100% opacity to verify alignment.
* **Rapid Chain Placement (`A`)**: Click canvas to place nodes; each click automatically links to the previous node.
* **Connection Tool (`C`)**: Click Node 1, then Node 2 to toggle connection links.
* **One-Key Type & Size Switch**:
  * `1`: Travel / Small Passive ($13\text{px}$)
  * `2`: Notable Passive ($20\text{px}$)
  * `3`: Keystone Passive ($30\text{px}$)
  * `4`: Atlas Gateway ($24\text{px}$)
* **Duplicate Node (`D` / `Ctrl + D`)**: Clone selected node properties directly at cursor position.
* **Delete Tool (`X` / `Delete`)**: Click or select any node or connection line to delete it immediately.
* **Import & Export**: Download updated layout as `atlas_tree_custom.json` or restore saved configurations.

---

## 📁 Repository Structure

```
.
├── index.html              # Main application entry point
├── style.css               # PoE dark fantasy theme & UI layout
├── app.js                  # Allocation engine, pathfinding & editor logic
├── tree_data.js            # Bundled 877-node dataset (zero-CORS static support)
├── tree_data.json          # Clean JSON graph dataset
├── atlas_tree_final.json   # Exported master dataset
├── bg.webp                 # Optimized 4K background image (720 KB)
├── 1otiu5sdm20i1.png       # Original 4K source screenshot
├── .gitignore              # Git ignore rules
└── README.md               # Project documentation
```

---

## 🚀 How to Run

### Option 1: Direct File Open
Simply double-click `index.html` in your file explorer to open it directly in Chrome, Edge, Firefox, or Safari.

### Option 2: Local HTTP Server
```bash
# Python 3
python -m http.server 8080
```
Then navigate to `http://localhost:8080` in your browser.

### Option 3: Deploy to GitHub Pages
1. Push this repository to GitHub.
2. Go to **Settings** &rarr; **Pages**.
3. Under **Build and deployment**, select **Source: Deploy from a branch**, and choose branch `main` / root (`/`).
4. Your interactive planner will be live on `https://<username>.github.io/<repo>/`!

---

## ⌨️ Keyboard Shortcuts (Editor Mode)

| Key | Tool / Action |
| :--- | :--- |
| `V` | **Select / Move Tool** (drag nodes, inspect properties) |
| `A` | **Chain-Add Tool** (place nodes & auto-link) |
| `C` | **Connect Tool** (link / unlink pairs of nodes) |
| `X` | **Delete Tool** (click node or line to remove) |
| `D` or `Ctrl + D` | **Duplicate Selected Node** |
| `1` / `2` / `3` / `4` | **Set Node Type & Radius** (Travel / Notable / Keystone / Gateway) |
| `Delete` / `Backspace` | **Delete Selected Node or Link** |
| `Esc` | **Deselect Node / Cancel Chain** |
| `Ctrl + Z` / `Ctrl + Y` | **Undo / Redo** |
