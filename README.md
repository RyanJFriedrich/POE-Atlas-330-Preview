# Path of Exile - Atlas Skill Tree 3.30 Preview & Planner

[![Live Preview](https://img.shields.io/badge/Live_Tool-Open_Planner-blue?style=for-the-badge)](https://ryanjfriedrich.github.io/POE-Atlas-330-Preview/)

An interactive web mockup and build planner for the redesigned radial **Path of Exile Atlas Passive Tree**. 

> 🎮 **[Click here to open the Interactive Web Planner](https://ryanjfriedrich.github.io/POE-Atlas-330-Preview/)** (or open [`index.html`](index.html) locally).

*This is an unofficial community preview tool created for players to test allocating points, experiment with the new 150-point cap, and map out builds ahead of the upcoming patch.*

---

## 🌟 Key Features

* **Complete 877-Node Radial Map**: Accurately mapped from the high-resolution teaser screenshot.
* **150-Point Cap Simulation**: Live tracker `[ X / 150 ]` showing allocated points and remaining allowance.
* **Auto-Pathfinding**: Click any node across the tree; Dijkstra/BFS calculates the shortest path from the center hub and allocates all intermediate passives in a single click.
* **Smart Unallocation & Trimming**:
  * Safely unallocate leaf nodes.
  * `Shift + Click` any allocated branch node to auto-trim all dependent downstream passives.
* **Full History**: Undo (`Ctrl + Z`), Redo (`Ctrl + Y`), and one-click `Reset`.
* **Built-in Calibration Editor**: Switch to `Mode: Editor` to drag nodes, chain-add passives (`A`), link/unlink (`C`), or toggle background opacity.

---

## 🚀 How to Run Locally

Simply double-click [`index.html`](index.html) in your file explorer to open it in any web browser. No installation or build steps required.

To run via a local server:
```bash
python -m http.server 8080
```
Then visit `http://localhost:8080`.

---

## 📄 License & Fair Use Disclaimer

This project is licensed under the [MIT License](LICENSE).

> **Disclaimer:** *Path of Exile and all associated assets, mechanics, and imagery are trademarks and copyright of Grinding Gear Games. This is an unofficial, non-commercial fan tool created for the community to explore the new patch preview.*
