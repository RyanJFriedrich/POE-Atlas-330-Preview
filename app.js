/**
 * Path of Exile Atlas Skill Tree Mockup & Planner
 * Version 3: Editor-First Engine with Fast Chain-Placement, Node Linking, Hotkeys & Scaffolding
 */

(function () {
  'use strict';

  // --- Standard Type-to-Radius Mapping (No redundant inputs!) ---
  const TYPE_CONFIG = {
    travel:   { radius: 13, label: 'Travel / Small Passive' },
    notable:  { radius: 20, label: 'Notable Passive' },
    keystone: { radius: 30, label: 'Keystone Passive' },
    gateway:  { radius: 24, label: 'Atlas Gateway' },
    start:    { radius: 32, label: 'Atlas Start Hub' }
  };

  // --- Atlas Gateway Symmetrical Pairs & Map ---
  const GATEWAY_PAIRS = [
    ['gateway_w', 'gateway_e'],
    ['gateway_nw', 'gateway_se'],
    ['gateway_ne', 'gateway_sw']
  ];

  const GATEWAY_MAP = new Map();
  for (const [g1, g2] of GATEWAY_PAIRS) {
    GATEWAY_MAP.set(g1, g2);
    GATEWAY_MAP.set(g2, g1);
  }

  // --- Global Application State ---
  const state = {
    treeData: null,
    adjacency: new Map(),
    allocated: new Set(['start_hub']),
    maxPoints: 150,
    history: [],
    historyIdx: -1,
    
    // Mode & Tools
    mode: 'planner', // 'planner' | 'editor'
    editorTool: 'select', // 'select' | 'chain' | 'connect' | 'delete'
    activeType: 'travel', // Default type for new nodes
    
    // Selection in Editor
    selectedNodeId: null,
    selectedEdge: null,
    connectFirstNode: null,
    
    // Display & Filtering
    bgOpacity: 0.45,
    filterMechanic: 'ALL',
    searchQuery: '',
    
    // Viewport transform
    camera: {
      x: 0,
      y: 0,
      zoom: 0.55,
      isPanning: false,
      startX: 0,
      startY: 0
    },
    
    // Dragging node in editor
    draggingNode: null,
    dragOffset: { x: 0, y: 0 },
    mouseCanvasCoords: { x: 1920, y: 1080 }
  };

  const STORAGE_KEY = 'poe_atlas_tree_v3_946';
  const dom = {};

  function init() {
    cacheDom();
    loadTreeData();
    setupEventListeners();
    centerCameraOnHub();
    updateUI();
  }

  function cacheDom() {
    dom.viewportContainer = document.getElementById('viewport-container');
    dom.svg = document.getElementById('tree-svg');
    dom.viewportGroup = document.getElementById('viewport-group');
    dom.bgImage = document.getElementById('bg-image');
    dom.edgesLayer = document.getElementById('edges-layer');
    dom.bridgesLayer = document.getElementById('bridges-layer');
    dom.nodesLayer = document.getElementById('nodes-layer');
    
    // HUD & Controls
    dom.pointsCount = document.getElementById('points-count');
    dom.pointsRemaining = document.getElementById('points-remaining');
    dom.btnUndo = document.getElementById('btn-undo');
    dom.btnRedo = document.getElementById('btn-redo');
    dom.btnReset = document.getElementById('btn-reset');
    dom.btnMode = document.getElementById('btn-mode');
    dom.btnStats = document.getElementById('btn-stats');
    dom.searchInput = document.getElementById('search-input');
    dom.searchClear = document.getElementById('search-clear');
    dom.filterBar = document.getElementById('filter-bar');
    dom.bgSlider = document.getElementById('bg-slider');
    dom.bgValue = document.getElementById('bg-value');
    dom.editorHint = document.getElementById('editor-hint');
    
    // Editor Toolbar
    dom.editorToolbar = document.getElementById('editor-toolbar');
    dom.toolSelect = document.getElementById('tool-select');
    dom.toolChain = document.getElementById('tool-chain');
    dom.toolConnect = document.getElementById('tool-connect');
    dom.toolDelete = document.getElementById('tool-delete');
    dom.toolDuplicate = document.getElementById('tool-duplicate');
    dom.typeBtns = document.querySelectorAll('.type-btn');
    
    // Zoom
    dom.btnZoomIn = document.getElementById('btn-zoom-in');
    dom.btnZoomOut = document.getElementById('btn-zoom-out');
    dom.btnZoomReset = document.getElementById('btn-zoom-reset');
    
    // Drawers
    dom.statsDrawer = document.getElementById('stats-drawer');
    dom.closeStats = document.getElementById('close-stats');
    dom.statsContent = document.getElementById('stats-content');
    
    dom.editorDrawer = document.getElementById('editor-drawer');
    dom.closeEditor = document.getElementById('close-editor');
    
    // Editor Drawer controls
    dom.editName = document.getElementById('edit-node-name');
    dom.editType = document.getElementById('edit-node-type');
    dom.editMechanic = document.getElementById('edit-node-mechanic');
    dom.editStats = document.getElementById('edit-node-stats');
    dom.btnDuplicateNode = document.getElementById('btn-duplicate-node');
    dom.btnDisconnectNode = document.getElementById('btn-disconnect-node');
    dom.btnDeleteNode = document.getElementById('btn-delete-node');
    dom.quickTagBtns = document.querySelectorAll('.tag-btn');
    
    // Tree Scaffolding Buttons
    dom.btnScaffoldRadial = document.getElementById('btn-scaffold-radial');
    dom.btnClearLines = document.getElementById('btn-clear-lines');
    dom.btnClearAll = document.getElementById('btn-clear-all');
    dom.btnRevertClean = document.getElementById('btn-revert-clean');
    dom.btnExportJson = document.getElementById('btn-export-json');
    dom.btnImportJson = document.getElementById('btn-import-json');
    dom.fileInput = document.getElementById('file-input');
    
    // Tooltip
    dom.tooltip = document.getElementById('node-tooltip');
    dom.tooltipTitle = document.getElementById('tooltip-title');
    dom.tooltipType = document.getElementById('tooltip-type');
    dom.tooltipMech = document.getElementById('tooltip-mech');
    dom.tooltipStats = document.getElementById('tooltip-stats');
    dom.tooltipStatus = document.getElementById('tooltip-status');
    
    // Modal
    dom.modalOverlay = document.getElementById('orphan-modal');
    dom.modalText = document.getElementById('modal-orphan-text');
    dom.btnModalConfirm = document.getElementById('btn-modal-confirm');
    dom.btnModalCancel = document.getElementById('btn-modal-cancel');
  }

  // --- Data Loading & Persistence ---
  function loadTreeData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        state.treeData = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved tree:', e);
      }
    }
    
    if (!state.treeData && window.DEFAULT_TREE_DATA) {
      state.treeData = JSON.parse(JSON.stringify(window.DEFAULT_TREE_DATA));
    }

    if (!state.treeData) {
      console.error('No tree data available!');
      return;
    }

    state.maxPoints = state.treeData.config.max_points || 150;
    buildAdjacency();
    buildFilterChips();
    renderTree();
    pushHistory('Initial State');
  }

  function saveCustomTree() {
    if (!state.treeData) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.treeData));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  function buildAdjacency() {
    state.adjacency.clear();
    const nodes = state.treeData.nodes;
    for (const nid in nodes) {
      state.adjacency.set(nid, new Set());
    }
    for (const [u, v] of state.treeData.edges) {
      if (state.adjacency.has(u) && state.adjacency.has(v)) {
        state.adjacency.get(u).add(v);
        state.adjacency.get(v).add(u);
      }
    }
  }

  function buildFilterChips() {
    const mechanics = new Set();
    for (const nid in state.treeData.nodes) {
      const m = state.treeData.nodes[nid].mechanic;
      if (m) mechanics.add(m);
    }

    dom.filterBar.innerHTML = '';
    const allChip = document.createElement('div');
    allChip.className = 'filter-chip active';
    allChip.textContent = 'All Mechanics';
    allChip.onclick = () => setFilter('ALL', allChip);
    dom.filterBar.appendChild(allChip);

    const sortedMechs = Array.from(mechanics).sort();
    for (const m of sortedMechs) {
      const chip = document.createElement('div');
      chip.className = 'filter-chip';
      chip.textContent = m;
      chip.onclick = () => setFilter(m, chip);
      dom.filterBar.appendChild(chip);
    }
  }

  function setFilter(mech, chipEl) {
    state.filterMechanic = mech;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    if (chipEl) chipEl.classList.add('active');
    applyHighlights();
  }

  // --- Rendering ---
  function renderTree() {
    renderEdges();
    renderGatewayBridges();
    renderNodes();
    updateAllocatedVisuals();
    applyHighlights();
  }

  function renderGatewayBridges() {
    if (!dom.bridgesLayer) return;
    dom.bridgesLayer.innerHTML = '';
    const nodes = state.treeData.nodes;

    for (const [g1Id, g2Id] of GATEWAY_PAIRS) {
      const n1 = nodes[g1Id];
      const n2 = nodes[g2Id];
      if (!n1 || !n2) continue;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', n1.x);
      line.setAttribute('y1', n1.y);
      line.setAttribute('x2', n2.x);
      line.setAttribute('y2', n2.y);
      line.setAttribute('class', 'gateway-bridge');
      line.setAttribute('data-bridge', `${g1Id}:${g2Id}`);
      line.setAttribute('id', `bridge-${g1Id}-${g2Id}`);

      dom.bridgesLayer.appendChild(line);
    }
  }

  function renderEdges() {
    dom.edgesLayer.innerHTML = '';
    const nodes = state.treeData.nodes;
    for (const [u, v] of state.treeData.edges) {
      const n1 = nodes[u];
      const n2 = nodes[v];
      if (!n1 || !n2) continue;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', n1.x);
      line.setAttribute('y1', n1.y);
      line.setAttribute('x2', n2.x);
      line.setAttribute('y2', n2.y);
      line.setAttribute('class', 'edge-line');
      line.setAttribute('data-edge', `${u}:${v}`);

      if (state.selectedEdge && tupleSorted(state.selectedEdge[0], state.selectedEdge[1]) === tupleSorted(u, v)) {
        line.classList.add('selected-edge');
      }

      dom.edgesLayer.appendChild(line);
    }
  }

  function renderNodes() {
    dom.nodesLayer.innerHTML = '';
    const nodes = state.treeData.nodes;

    for (const nid in nodes) {
      const n = nodes[nid];
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `tree-node node-${n.type}`);
      g.setAttribute('id', `node-el-${nid}`);
      g.setAttribute('data-id', nid);
      g.setAttribute('transform', `translate(${n.x}, ${n.y})`);

      const r = n.radius || (TYPE_CONFIG[n.type] ? TYPE_CONFIG[n.type].radius : 13);

      // Translucent outer frame circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', r);
      circle.setAttribute('class', 'node-frame');
      g.appendChild(circle);

      // Subtle decorative accents (NO OPAQUE DISKS!)
      if (n.type === 'keystone') {
        const outer = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        outer.setAttribute('r', r + 4);
        outer.setAttribute('fill', 'none');
        outer.setAttribute('stroke', 'rgba(245, 158, 11, 0.7)');
        outer.setAttribute('stroke-width', '1.2');
        outer.setAttribute('stroke-dasharray', '5 3');
        g.appendChild(outer);
      } else if (n.type === 'notable') {
        const inner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        inner.setAttribute('r', r - 3);
        inner.setAttribute('fill', 'none');
        inner.setAttribute('stroke', 'rgba(255, 215, 120, 0.5)');
        inner.setAttribute('stroke-width', '1');
        inner.setAttribute('stroke-dasharray', '3 2');
        g.appendChild(inner);
      } else if (n.type === 'gateway') {
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ring.setAttribute('r', r * 0.65);
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', '#c084fc');
        ring.setAttribute('stroke-width', '1.5');
        g.appendChild(ring);
      } else if (n.type === 'start') {
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ring.setAttribute('r', r * 0.5);
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', '#38bdf8');
        ring.setAttribute('stroke-width', '2');
        g.appendChild(ring);
      }

      // Visual indicator for selected node or connect source
      if (state.selectedNodeId === nid) {
        g.classList.add('selected-node');
      }
      if (state.connectFirstNode === nid || (state.editorTool === 'chain' && state.selectedNodeId === nid)) {
        g.classList.add('chain-head');
      }

      dom.nodesLayer.appendChild(g);
    }
  }

  function updateAllocatedVisuals() {
    const nodes = state.treeData.nodes;
    
    for (const nid in nodes) {
      const el = document.getElementById(`node-el-${nid}`);
      if (!el) continue;
      if (state.allocated.has(nid)) {
        el.classList.add('allocated');
      } else {
        el.classList.remove('allocated');
      }
    }

    const edges = dom.edgesLayer.querySelectorAll('.edge-line');
    edges.forEach(line => {
      const [u, v] = line.getAttribute('data-edge').split(':');
      if (state.allocated.has(u) && state.allocated.has(v)) {
        line.classList.add('allocated');
      } else {
        line.classList.remove('allocated');
      }
    });

    // Update Gateway Wormhole Bridges
    if (dom.bridgesLayer) {
      const bridges = dom.bridgesLayer.querySelectorAll('.gateway-bridge');
      bridges.forEach(line => {
        const [u, v] = line.getAttribute('data-bridge').split(':');
        const uAlloc = state.allocated.has(u);
        const vAlloc = state.allocated.has(v);

        line.classList.remove('active', 'standby');
        if (uAlloc && vAlloc) {
          line.classList.add('active');
        } else if (uAlloc || vAlloc) {
          line.classList.add('standby');
        }
      });
    }

    // Toggle active wormhole aura on paired gateway nodes
    for (const [u, v] of GATEWAY_PAIRS) {
      const elU = document.getElementById(`node-el-${u}`);
      const elV = document.getElementById(`node-el-${v}`);
      const bothAlloc = state.allocated.has(u) && state.allocated.has(v);
      if (elU) elU.classList.toggle('wormhole-active', bothAlloc);
      if (elV) elV.classList.toggle('wormhole-active', bothAlloc);
    }

    const spent = Math.max(0, state.allocated.size - 1);
    dom.pointsCount.textContent = `${spent} / ${state.maxPoints}`;
    dom.pointsRemaining.textContent = `${state.maxPoints - spent} Points Remaining`;
    dom.btnUndo.disabled = state.historyIdx <= 0;
    dom.btnRedo.disabled = state.historyIdx >= state.history.length - 1;

    renderStatsDrawer();
  }

  function applyHighlights() {
    const query = state.searchQuery.trim().toLowerCase();
    const filter = state.filterMechanic;
    const nodes = state.treeData.nodes;

    for (const nid in nodes) {
      const n = nodes[nid];
      const el = document.getElementById(`node-el-${nid}`);
      if (!el) continue;

      let matchFilter = (filter === 'ALL' || n.mechanic === filter);
      let matchQuery = true;
      if (query.length > 0) {
        const nameMatch = n.name && n.name.toLowerCase().includes(query);
        const mechMatch = n.mechanic && n.mechanic.toLowerCase().includes(query);
        const statsMatch = n.stats && n.stats.some(s => s.toLowerCase().includes(query));
        matchQuery = nameMatch || mechMatch || statsMatch;
      }

      if (matchFilter && matchQuery) {
        el.classList.remove('dimmed');
        if (query.length > 0) {
          el.classList.add('highlighted');
        } else {
          el.classList.remove('highlighted');
        }
      } else {
        el.classList.add('dimmed');
        el.classList.remove('highlighted');
      }
    }
  }

  // --- Smart Allocation Engine (Planner Mode) ---
  function handleNodeClickPlanner(nodeId, evt) {
    if (state.allocated.has(nodeId)) {
      if (nodeId === 'start_hub') return;
      attemptUnallocate(nodeId, evt.shiftKey);
    } else {
      attemptAllocate(nodeId);
    }
  }

  function attemptAllocate(targetId) {
    const path = findPathToAllocated(targetId);
    if (!path) {
      console.warn('No path to allocated tree found!');
      return;
    }

    const currentSpent = Math.max(0, state.allocated.size - 1);
    const needed = path.length;
    if (currentSpent + needed > state.maxPoints) {
      alert(`Cannot allocate: requires ${needed} point(s), but only ${state.maxPoints - currentSpent} point(s) remaining!`);
      return;
    }

    for (const nid of path) {
      state.allocated.add(nid);
    }

    pushHistory(`Allocated ${path.length} node(s)`);
    updateAllocatedVisuals();
  }

  // --- Min-Priority Queue for Dijkstra Shortest-Path Search ---
  class MinPriorityQueue {
    constructor() {
      this.heap = [];
    }
    push(item, priority) {
      this.heap.push({ item, priority });
      this._bubbleUp(this.heap.length - 1);
    }
    pop() {
      if (this.heap.length === 0) return null;
      const top = this.heap[0];
      const bottom = this.heap.pop();
      if (this.heap.length > 0) {
        this.heap[0] = bottom;
        this._bubbleDown(0);
      }
      return top;
    }
    isEmpty() {
      return this.heap.length === 0;
    }
    _bubbleUp(idx) {
      while (idx > 0) {
        const pIdx = Math.floor((idx - 1) / 2);
        if (this.heap[idx].priority < this.heap[pIdx].priority) {
          [this.heap[idx], this.heap[pIdx]] = [this.heap[pIdx], this.heap[idx]];
          idx = pIdx;
        } else {
          break;
        }
      }
    }
    _bubbleDown(idx) {
      const len = this.heap.length;
      while (true) {
        let smallest = idx;
        const left = 2 * idx + 1;
        const right = 2 * idx + 2;
        if (left < len && this.heap[left].priority < this.heap[smallest].priority) {
          smallest = left;
        }
        if (right < len && this.heap[right].priority < this.heap[smallest].priority) {
          smallest = right;
        }
        if (smallest !== idx) {
          [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
          idx = smallest;
        } else {
          break;
        }
      }
    }
  }

  function findPathToAllocated(targetId) {
    if (state.allocated.has(targetId)) return [];

    const pq = new MinPriorityQueue();
    const dist = new Map();
    const parent = new Map();

    // All currently allocated nodes start at cost 0
    for (const allocId of state.allocated) {
      dist.set(allocId, 0);
      pq.push(allocId, 0);
    }

    while (!pq.isEmpty()) {
      const { item: curr, priority: d } = pq.pop();
      if (d > (dist.get(curr) ?? Infinity)) continue;

      if (curr === targetId) {
        // Reconstruct path of UNALLOCATED nodes from allocated boundary to targetId
        const path = [];
        let step = curr;
        while (step && !state.allocated.has(step)) {
          path.unshift(step);
          step = parent.get(step);
        }
        return path;
      }

      // 1. Regular adjacent edges
      const neighbors = state.adjacency.get(curr) || [];
      for (const nb of neighbors) {
        const cost = state.allocated.has(nb) ? 0 : 1;
        const nextDist = d + cost;
        if (nextDist < (dist.get(nb) ?? Infinity)) {
          dist.set(nb, nextDist);
          parent.set(nb, curr);
          pq.push(nb, nextDist);
        }
      }

      // 2. Gateway wormhole teleport (instant link to paired gateway)
      if (GATEWAY_MAP.has(curr)) {
        const partner = GATEWAY_MAP.get(curr);
        if (state.treeData.nodes[partner]) {
          const cost = state.allocated.has(partner) ? 0 : 1;
          const nextDist = d + cost;
          if (nextDist < (dist.get(partner) ?? Infinity)) {
            dist.set(partner, nextDist);
            parent.set(partner, curr);
            pq.push(partner, nextDist);
          }
        }
      }
    }

    return null;
  }

  function attemptUnallocate(nodeId, forceShift) {
    const simulated = new Set(state.allocated);
    simulated.delete(nodeId);

    const reachable = getReachableAllocated(simulated);
    const orphans = [];
    for (const nid of simulated) {
      if (!reachable.has(nid)) {
        orphans.push(nid);
      }
    }

    if (orphans.length === 0) {
      state.allocated.delete(nodeId);
      pushHistory(`Unallocated node`);
      updateAllocatedVisuals();
    } else {
      if (forceShift) {
        state.allocated.delete(nodeId);
        for (const o of orphans) state.allocated.delete(o);
        pushHistory(`Trimmed ${orphans.length + 1} nodes`);
        updateAllocatedVisuals();
      } else {
        promptOrphanModal(nodeId, orphans);
      }
    }
  }

  function getReachableAllocated(allocatedSet) {
    if (!allocatedSet.has('start_hub')) return new Set();
    const reachable = new Set(['start_hub']);
    const queue = ['start_hub'];

    while (queue.length > 0) {
      const curr = queue.shift();

      // 1. Regular adjacent edges
      const neighbors = state.adjacency.get(curr) || [];
      for (const nb of neighbors) {
        if (allocatedSet.has(nb) && !reachable.has(nb)) {
          reachable.add(nb);
          queue.push(nb);
        }
      }

      // 2. Gateway wormhole bridge:
      // Both curr and its partner MUST be in allocatedSet to cross!
      if (GATEWAY_MAP.has(curr)) {
        const partner = GATEWAY_MAP.get(curr);
        if (state.treeData.nodes[partner] && allocatedSet.has(partner) && !reachable.has(partner)) {
          reachable.add(partner);
          queue.push(partner);
        }
      }
    }
    return reachable;
  }

  let pendingOrphanAction = null;
  function promptOrphanModal(nodeId, orphans) {
    pendingOrphanAction = () => {
      state.allocated.delete(nodeId);
      for (const o of orphans) state.allocated.delete(o);
      pushHistory(`Trimmed ${nodeId} and ${orphans.length} dependent nodes`);
      updateAllocatedVisuals();
    };
    dom.modalText.innerHTML = `Unallocating <strong>${state.treeData.nodes[nodeId].name}</strong> will disconnect <strong>${orphans.length}</strong> dependent passive node(s).<br><br>Do you want to unallocate all ${orphans.length + 1} nodes?`;
    dom.modalOverlay.classList.add('open');
  }

  // --- History (Undo / Redo) ---
  function pushHistory(desc) {
    state.history = state.history.slice(0, state.historyIdx + 1);
    state.history.push({
      desc,
      allocated: new Set(state.allocated),
      treeData: JSON.parse(JSON.stringify(state.treeData))
    });
    state.historyIdx = state.history.length - 1;
    dom.btnUndo.disabled = state.historyIdx <= 0;
    dom.btnRedo.disabled = state.historyIdx >= state.history.length - 1;
  }

  function undo() {
    if (state.historyIdx > 0) {
      state.historyIdx--;
      const snap = state.history[state.historyIdx];
      state.treeData = JSON.parse(JSON.stringify(snap.treeData));
      state.allocated = new Set(snap.allocated);
      buildAdjacency();
      renderTree();
      saveCustomTree();
    }
  }

  function redo() {
    if (state.historyIdx < state.history.length - 1) {
      state.historyIdx++;
      const snap = state.history[state.historyIdx];
      state.treeData = JSON.parse(JSON.stringify(snap.treeData));
      state.allocated = new Set(snap.allocated);
      buildAdjacency();
      renderTree();
      saveCustomTree();
    }
  }

  function resetTree() {
    if (confirm('Reset all allocated Atlas passive points?')) {
      state.allocated = new Set(['start_hub']);
      pushHistory('Reset Tree Allocations');
      updateAllocatedVisuals();
    }
  }

  // --- Fast Editor-First Engine ---
  function setEditorTool(tool) {
    state.editorTool = tool;
    
    // Update toolbar buttons
    [dom.toolSelect, dom.toolChain, dom.toolConnect, dom.toolDelete].forEach(btn => btn.classList.remove('active'));
    if (tool === 'select') dom.toolSelect.classList.add('active');
    if (tool === 'chain') dom.toolChain.classList.add('active');
    if (tool === 'connect') dom.toolConnect.classList.add('active');
    if (tool === 'delete') dom.toolDelete.classList.add('active');

    // Update viewport cursor
    dom.viewportContainer.className = `tool-${tool}`;
    
    // Update hint
    if (tool === 'chain') {
      dom.editorHint.innerHTML = '<strong>Chain Add Mode:</strong> Click anywhere on canvas to place nodes. Each click automatically links to the previous node!';
    } else if (tool === 'connect') {
      dom.editorHint.innerHTML = '<strong>Connect Mode:</strong> Click Node 1, then click Node 2 to link/unlink them.';
    } else if (tool === 'delete') {
      dom.editorHint.innerHTML = '<strong>Delete Mode:</strong> Click any node or connecting line to delete it immediately.';
    } else {
      dom.editorHint.innerHTML = '<strong>Select Mode:</strong> Click to inspect, drag to move. Shift+Click to link. Press 1/2/3/4 to change type.';
    }

    state.connectFirstNode = null;
    renderTree();
  }

  function setActiveType(type) {
    state.activeType = type;
    dom.typeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-type') === type);
    });

    // If a node is currently selected, immediately update its type & radius!
    if (state.selectedNodeId && state.treeData.nodes[state.selectedNodeId]) {
      const n = state.treeData.nodes[state.selectedNodeId];
      if (n.type !== 'start') {
        n.type = type;
        n.radius = TYPE_CONFIG[type].radius;
        dom.editType.value = type;
        saveCustomTree();
        renderTree();
      }
    }
  }

  function setSelectedNode(nid) {
    state.selectedNodeId = nid;
    state.selectedEdge = null;

    document.querySelectorAll('.tree-node.selected-node').forEach(el => el.classList.remove('selected-node'));
    document.querySelectorAll('.edge-line.selected-edge').forEach(el => el.classList.remove('selected-edge'));

    if (nid && state.treeData.nodes[nid]) {
      const el = document.getElementById(`node-el-${nid}`);
      if (el) el.classList.add('selected-node');
      selectNodeInEditor(nid);
      const n = state.treeData.nodes[nid];
      dom.editorHint.innerHTML = `Selected <strong>${n.name || nid}</strong>. Edit properties in the right panel, or drag to move.`;
    } else {
      state.selectedNodeId = null;
      clearEditorForm();
      dom.editorHint.innerHTML = `Tip: Click any node to select and edit. Shift+Click two nodes to toggle connecting line.`;
    }
  }

  function handleEditorCanvasClick(coords) {
    if (state.editorTool === 'chain') {
      // Place node and link to previous
      const newId = addNodeAt(coords.x, coords.y, state.activeType);
      if (state.selectedNodeId && state.selectedNodeId !== newId) {
        toggleEdge(state.selectedNodeId, newId, true); // force add link
      }
      setSelectedNode(newId);
      pushHistory(`Added and linked node ${newId}`);
    } else if (state.editorTool === 'select') {
      // Deselect
      setSelectedNode(null);
    }
  }

  function handleEditorNodeClick(nodeId, evt) {
    // Delete Tool
    if (state.editorTool === 'delete') {
      deleteNodeById(nodeId);
      return;
    }

    // Connect Tool
    if (state.editorTool === 'connect') {
      if (!state.connectFirstNode) {
        state.connectFirstNode = nodeId;
        renderTree();
      } else {
        if (state.connectFirstNode !== nodeId) {
          toggleEdge(state.connectFirstNode, nodeId);
          pushHistory(`Toggled edge between ${state.connectFirstNode} and ${nodeId}`);
        }
        state.connectFirstNode = nodeId; // chain forward
      }
      return;
    }

    // Chain Tool (click existing node to set chain head)
    if (state.editorTool === 'chain') {
      setSelectedNode(nodeId);
      renderTree();
      return;
    }

    // Select Tool: Shift+Click toggles edge
    if (evt.shiftKey && state.selectedNodeId && state.selectedNodeId !== nodeId) {
      toggleEdge(state.selectedNodeId, nodeId);
      pushHistory(`Toggled edge between ${state.selectedNodeId} and ${nodeId}`);
      return;
    }

    // Select Tool: Click to select
    setSelectedNode(nodeId);
  }

  function handleEditorEdgeClick(edgeKey) {
    const [u, v] = edgeKey.split(':');
    
    if (state.editorTool === 'delete') {
      toggleEdge(u, v);
      pushHistory(`Deleted edge ${edgeKey}`);
      return;
    }

    state.selectedEdge = [u, v];
    setSelectedNode(null);
    dom.editorHint.innerHTML = `Selected line <strong>${u} &harr; ${v}</strong>. Press <strong>Delete</strong> / <strong>Backspace</strong> to remove.`;
    renderEdges();
  }

  function selectNodeInEditor(nodeId) {
    const n = state.treeData.nodes[nodeId];
    if (!n) return;

    dom.editName.value = n.name || '';
    dom.editType.value = n.type || 'travel';
    dom.editMechanic.value = n.mechanic || 'Core';
    dom.editStats.value = (n.stats || []).join('\n');
    
    dom.btnDeleteNode.disabled = (nodeId === 'start_hub');
    dom.btnDuplicateNode.disabled = (nodeId === 'start_hub');
    dom.btnDisconnectNode.disabled = (nodeId === 'start_hub');

    // Highlight active mechanic quick-tag
    dom.quickTagBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mech') === n.mechanic);
    });
  }

  function clearEditorForm() {
    dom.editName.value = '';
    dom.editMechanic.value = '';
    dom.editStats.value = '';
    dom.btnDeleteNode.disabled = true;
    dom.btnDuplicateNode.disabled = true;
    dom.btnDisconnectNode.disabled = true;
    dom.quickTagBtns.forEach(btn => btn.classList.remove('active'));
  }

  function applyEditorFormChanges() {
    if (!state.selectedNodeId) return;
    const n = state.treeData.nodes[state.selectedNodeId];
    if (!n) return;

    n.name = dom.editName.value;
    const newType = dom.editType.value;
    const typeChanged = (n.type !== newType);
    n.type = newType;
    n.radius = TYPE_CONFIG[newType] ? TYPE_CONFIG[newType].radius : 13;
    n.mechanic = dom.editMechanic.value;
    n.stats = dom.editStats.value.split('\n').map(s => s.trim()).filter(s => s.length > 0);

    saveCustomTree();

    if (typeChanged) {
      renderTree();
      const el = document.getElementById(`node-el-${state.selectedNodeId}`);
      if (el) el.classList.add('selected-node');
    }
  }

  function addNodeAt(x, y, type = 'travel', name = null, mechanic = 'Core', stats = null) {
    const newId = `node_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const radius = TYPE_CONFIG[type] ? TYPE_CONFIG[type].radius : 13;

    state.treeData.nodes[newId] = {
      id: newId,
      name: name || `${mechanic} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type: type,
      mechanic: mechanic,
      x: Math.round(x),
      y: Math.round(y),
      radius: radius,
      stats: stats || ['+1% Currently Unknown']
    };

    buildAdjacency();
    saveCustomTree();
    renderTree();
    return newId;
  }

  function duplicateSelectedNode() {
    if (!state.selectedNodeId || state.selectedNodeId === 'start_hub') return;
    const src = state.treeData.nodes[state.selectedNodeId];
    if (!src) return;

    // Place duplicate at mouse position or offset by 30px
    const newX = state.mouseCanvasCoords.x ? state.mouseCanvasCoords.x : src.x + 35;
    const newY = state.mouseCanvasCoords.y ? state.mouseCanvasCoords.y : src.y + 35;

    const newId = addNodeAt(newX, newY, src.type, src.name + ' (Copy)', src.mechanic, [...(src.stats || [])]);
    state.selectedNodeId = newId;
    selectNodeInEditor(newId);
    pushHistory(`Duplicated node ${src.id}`);
  }

  function deleteNodeById(nid) {
    if (nid === 'start_hub') {
      alert('Cannot delete the central Atlas Origin hub!');
      return;
    }
    delete state.treeData.nodes[nid];
    state.treeData.edges = state.treeData.edges.filter(e => e[0] !== nid && e[1] !== nid);
    state.allocated.delete(nid);
    state.selectedNodeId = null;
    clearEditorForm();

    buildAdjacency();
    saveCustomTree();
    renderTree();
    pushHistory(`Deleted node ${nid}`);
  }

  function disconnectNodeById(nid) {
    state.treeData.edges = state.treeData.edges.filter(e => e[0] !== nid && e[1] !== nid);
    buildAdjacency();
    saveCustomTree();
    renderTree();
    pushHistory(`Disconnected all lines from node ${nid}`);
  }

  function toggleEdge(u, v, forceAdd = false) {
    const edgeKey = tupleSorted(u, v);
    const existingIdx = state.treeData.edges.findIndex(e => tupleSorted(e[0], e[1]) === edgeKey);

    if (existingIdx >= 0 && !forceAdd) {
      state.treeData.edges.splice(existingIdx, 1);
    } else if (existingIdx < 0) {
      state.treeData.edges.push([u, v]);
    }

    buildAdjacency();
    saveCustomTree();
    renderTree();
  }

  function tupleSorted(a, b) {
    return a < b ? `${a}:${b}` : `${b}:${a}`;
  }

  // --- Tree Scaffolding Tools ---
  function scaffoldRadialWeb() {
    if (!confirm('Generate the clean mathematical 8-spoke Astrolabe skeleton? This will build clean radial spokes and concentric rings connecting to the center hub.')) {
      return;
    }

    const cx = state.treeData.config.center_x || 1920;
    const cy = state.treeData.config.center_y || 1080;

    // Clear existing messy edges
    state.treeData.edges = [];
    
    // Ensure start hub exists
    state.treeData.nodes['start_hub'] = {
      id: 'start_hub',
      name: 'Atlas Origin',
      type: 'start',
      mechanic: 'Core',
      x: cx,
      y: cy,
      radius: 32,
      stats: ['Central starting hub of the Atlas Passive Tree']
    };

    // 8 Primary Spokes: Angles 0, 45, 90, 135, 180, 225, 270, 315
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    const ringRadii = [125, 255, 480, 725];
    const ringNodeIds = { 0: [], 1: [], 2: [], 3: [] };

    angles.forEach((angleDeg, spokeIdx) => {
      const rad = (angleDeg * Math.PI) / 180;
      let prevId = 'start_hub';

      ringRadii.forEach((rDist, rIdx) => {
        const nx = Math.round(cx + rDist * Math.cos(rad));
        const ny = Math.round(cy + rDist * Math.sin(rad));
        const nid = `spoke_${angleDeg}_r${rIdx + 1}`;

        state.treeData.nodes[nid] = {
          id: nid,
          name: `Atlas Travel (${angleDeg}°, Ring ${rIdx + 1})`,
          type: 'travel',
          mechanic: 'Core',
          x: nx,
          y: ny,
          radius: 13,
          stats: ['+1% chance for Maps to drop 1 Tier higher']
        };

        // Link radially outward
        state.treeData.edges.push([prevId, nid]);
        prevId = nid;
        ringNodeIds[rIdx].push(nid);
      });
    });

    // Connect rings together into concentric webs (Ring 1 & Ring 2)
    [0, 1, 2].forEach(rIdx => {
      const ringNodes = ringNodeIds[rIdx];
      for (let i = 0; i < ringNodes.length; i++) {
        const u = ringNodes[i];
        const v = ringNodes[(i + 1) % ringNodes.length];
        state.treeData.edges.push([u, v]);
      }
    });

    // 6 Symmetrical Atlas Gateways
    const gateways = [
      { id: 'gateway_w', name: 'Atlas Gateway (West)', x: 772, y: 1016 },
      { id: 'gateway_e', name: 'Atlas Gateway (East)', x: 3075, y: 1075 },
      { id: 'gateway_nw', name: 'Atlas Gateway (North-West)', x: 1120, y: 210 },
      { id: 'gateway_ne', name: 'Atlas Gateway (North-East)', x: 2720, y: 210 },
      { id: 'gateway_sw', name: 'Atlas Gateway (South-West)', x: 1165, y: 1495 },
      { id: 'gateway_se', name: 'Atlas Gateway (South-East)', x: 2675, y: 1495 }
    ];

    gateways.forEach(g => {
      state.treeData.nodes[g.id] = {
        id: g.id,
        name: g.name,
        type: 'gateway',
        mechanic: 'Gateway',
        x: g.x,
        y: g.y,
        radius: 24,
        stats: ['Allocating enables instantaneous travel to connected Atlas Gateways']
      };
    });

    buildAdjacency();
    saveCustomTree();
    renderTree();
    pushHistory('Scaffolded Clean Radial Astrolabe Web');
    alert('Generated clean 8-spoke Astrolabe radial web! You can now freely place and link mechanic clusters off the spokes.');
  }

  function clearAllLines() {
    if (confirm('Clear ALL connection lines in the tree? Placed nodes will be kept.')) {
      state.treeData.edges = [];
      buildAdjacency();
      saveCustomTree();
      renderTree();
      pushHistory('Cleared all connection lines');
    }
  }

  function clearAllNodes() {
    if (confirm('Wipe all nodes and start with a blank canvas (Origin Hub only)?')) {
      const cx = state.treeData.config.center_x || 1920;
      const cy = state.treeData.config.center_y || 1080;
      state.treeData.nodes = {
        'start_hub': {
          id: 'start_hub',
          name: 'Atlas Origin',
          type: 'start',
          mechanic: 'Core',
          x: cx,
          y: cy,
          radius: 32,
          stats: ['Starting hub of the Atlas Passive Tree']
        }
      };
      state.treeData.edges = [];
      state.allocated = new Set(['start_hub']);
      buildAdjacency();
      saveCustomTree();
      renderTree();
      pushHistory('Cleared all nodes to blank canvas');
    }
  }

  function resetToDefaultClean() {
    if (confirm('Revert all calibrations back to clean default dataset?')) {
      localStorage.removeItem(STORAGE_KEY);
      state.treeData = JSON.parse(JSON.stringify(window.DEFAULT_TREE_DATA));
      state.allocated = new Set(['start_hub']);
      buildAdjacency();
      buildFilterChips();
      renderTree();
      pushHistory('Reset to default clean dataset');
    }
  }

  // --- Viewport Navigation ---
  function centerCameraOnHub() {
    const rect = dom.viewportContainer.getBoundingClientRect();
    const cx = state.treeData ? state.treeData.config.center_x : 1920;
    const cy = state.treeData ? state.treeData.config.center_y : 1080;
    state.camera.zoom = 0.55;
    state.camera.x = rect.width / 2 - cx * state.camera.zoom;
    state.camera.y = rect.height / 2 - cy * state.camera.zoom;
    applyCamera();
  }

  function applyCamera() {
    dom.viewportGroup.setAttribute(
      'transform',
      `translate(${state.camera.x}, ${state.camera.y}) scale(${state.camera.zoom})`
    );
  }

  function zoomAtPoint(factor, clientX, clientY) {
    const rect = dom.viewportContainer.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const newZoom = Math.min(2.5, Math.max(0.18, state.camera.zoom * factor));
    const zoomRatio = newZoom / state.camera.zoom;

    state.camera.x = mouseX - (mouseX - state.camera.x) * zoomRatio;
    state.camera.y = mouseY - (mouseY - state.camera.y) * zoomRatio;
    state.camera.zoom = newZoom;
    applyCamera();
  }

  function screenToTreeCoords(screenX, screenY) {
    const rect = dom.viewportContainer.getBoundingClientRect();
    const px = screenX - rect.left;
    const py = screenY - rect.top;
    return {
      x: (px - state.camera.x) / state.camera.zoom,
      y: (py - state.camera.y) / state.camera.zoom
    };
  }

  function toggleMode() {
    state.mode = state.mode === 'planner' ? 'editor' : 'planner';
    if (state.mode === 'editor') {
      dom.btnMode.textContent = 'Mode: Editor (Active)';
      dom.btnMode.classList.add('active');
      dom.editorToolbar.classList.add('visible');
      dom.editorDrawer.classList.add('open');
      dom.bgSlider.value = 75;
      updateBgOpacity(0.75);
      setEditorTool('select');
    } else {
      dom.btnMode.textContent = 'Mode: Planner';
      dom.btnMode.classList.remove('active');
      dom.editorToolbar.classList.remove('visible');
      dom.editorDrawer.classList.remove('open');
      dom.editorHint.innerHTML = 'Tip: Click any node to auto-allocate shortest path. Shift+Click to trim/unallocate branches.';
      state.selectedNodeId = null;
      state.selectedEdge = null;
      renderTree();
    }
  }

  function updateBgOpacity(val) {
    state.bgOpacity = val;
    dom.bgImage.setAttribute('opacity', val);
    dom.bgValue.textContent = `${Math.round(val * 100)}%`;
  }

  // --- Tooltip & Stats Summary ---
  let activeHoveredGatewayBridge = null;

  function handleGatewayHover(nodeId) {
    if (!GATEWAY_MAP.has(nodeId)) return;
    const partnerId = GATEWAY_MAP.get(nodeId);

    const el1 = document.getElementById(`node-el-${nodeId}`);
    const el2 = document.getElementById(`node-el-${partnerId}`);
    if (el1) el1.classList.add('gateway-hovered');
    if (el2) el2.classList.add('gateway-hovered');

    const bridgeEl = document.getElementById(`bridge-${nodeId}-${partnerId}`) ||
                     document.getElementById(`bridge-${partnerId}-${nodeId}`);
    if (bridgeEl) {
      bridgeEl.classList.add('hovered');
      activeHoveredGatewayBridge = bridgeEl;
    }
  }

  function clearGatewayHover() {
    document.querySelectorAll('.tree-node.gateway-hovered').forEach(el => el.classList.remove('gateway-hovered'));
    if (activeHoveredGatewayBridge) {
      activeHoveredGatewayBridge.classList.remove('hovered');
      activeHoveredGatewayBridge = null;
    }
  }

  function showTooltip(nodeId, clientX, clientY) {
    if (state.mode === 'editor') return;
    const n = state.treeData.nodes[nodeId];
    if (!n) return;

    clearGatewayHover();
    if (GATEWAY_MAP.has(nodeId)) {
      handleGatewayHover(nodeId);
    }

    dom.tooltipTitle.textContent = n.name || 'Passive Skill';
    dom.tooltipType.textContent = (n.type || 'Travel').toUpperCase();
    dom.tooltipType.className = `tooltip-badge badge-${n.type}`;
    dom.tooltipMech.textContent = n.mechanic || 'Atlas';

    const isAlloc = state.allocated.has(nodeId);
    dom.tooltipStats.innerHTML = '';

    const isGateway = n.type === 'gateway' || GATEWAY_MAP.has(nodeId);
    if (isGateway && GATEWAY_MAP.has(nodeId)) {
      const partnerId = GATEWAY_MAP.get(nodeId);
      const partnerNode = state.treeData.nodes[partnerId];
      const partnerName = partnerNode ? partnerNode.name : partnerId;
      const isPartnerAlloc = state.allocated.has(partnerId);

      const addStat = (text, color = '#f5d0fe') => {
        const line = document.createElement('div');
        line.className = 'tooltip-stat-line';
        line.style.color = color;
        line.textContent = text;
        dom.tooltipStats.appendChild(line);
      };

      if (isAlloc && isPartnerAlloc) {
        addStat(`✦ Active Wormhole Conduit to ${partnerName}`, '#e879f9');
        addStat(`✦ 0 travel point cost across the Atlas tree`, '#f0abfc');
      } else if (isAlloc && !isPartnerAlloc) {
        addStat(`✦ Paired with ${partnerName}`, '#c084fc');
        addStat(`✦ Wormhole Inactive: Allocate ${partnerName} to activate`, '#fcd34d');
      } else if (!isAlloc && isPartnerAlloc) {
        addStat(`✦ Paired with ${partnerName} (Allocated!)`, '#38bdf8');
        addStat(`✦ Click to allocate for 1 point and open wormhole link`, '#7dd3fc');
      } else {
        addStat(`✦ Paired with ${partnerName}`, '#c084fc');
        addStat(`✦ Allocate both gateways to bridge across the Atlas`, '#94a3b8');
      }

      if (isAlloc && isPartnerAlloc) {
        dom.tooltipStatus.textContent = '● Wormhole Active (Click to unallocate)';
        dom.tooltipStatus.style.color = '#e879f9';
      } else if (isAlloc) {
        dom.tooltipStatus.textContent = '● Gateway Allocated (Awaiting partner allocation)';
        dom.tooltipStatus.style.color = '#f59e0b';
      } else if (isPartnerAlloc) {
        dom.tooltipStatus.textContent = '○ Ready to Connect (1 point to bridge)';
        dom.tooltipStatus.style.color = '#38bdf8';
      } else {
        dom.tooltipStatus.textContent = '○ Unallocated Gateway';
        dom.tooltipStatus.style.color = 'var(--poe-text-dim)';
      }
    } else {
      if (n.stats && n.stats.length > 0) {
        for (const s of n.stats) {
          const line = document.createElement('div');
          line.className = 'tooltip-stat-line';
          line.textContent = s;
          dom.tooltipStats.appendChild(line);
        }
      } else {
        const line = document.createElement('div');
        line.className = 'tooltip-stat-line';
        line.textContent = '+1% Currently Unknown';
        dom.tooltipStats.appendChild(line);
      }

      dom.tooltipStatus.textContent = isAlloc ? '✓ Allocated (Click to unallocate)' : '○ Unallocated (Click to allocate)';
      dom.tooltipStatus.style.color = isAlloc ? 'var(--poe-cyan)' : 'var(--poe-text-dim)';
    }

    dom.tooltip.style.left = `${clientX + 14}px`;
    dom.tooltip.style.top = `${clientY + 14}px`;
    dom.tooltip.style.display = 'block';
  }

  function hideTooltip() {
    dom.tooltip.style.display = 'none';
    clearGatewayHover();
  }

  function renderStatsDrawer() {
    const counts = {};
    const statsList = [];
    let totalSpent = 0;

    for (const nid of state.allocated) {
      if (nid === 'start_hub') continue;
      totalSpent++;
      const n = state.treeData.nodes[nid];
      if (!n) continue;

      const m = n.mechanic || 'Core';
      counts[m] = (counts[m] || 0) + 1;
      if (n.stats) {
        for (const s of n.stats) statsList.push(s);
      }
    }

    let html = `
      <div class="stat-section-title">Points Spent: ${totalSpent} / ${state.maxPoints}</div>
      <div style="margin-bottom: 16px;">
    `;

    for (const [m, count] of Object.entries(counts)) {
      html += `
        <div class="mechanic-spent-tag">
          <span>${m}</span>
          <strong style="color: var(--poe-gold-bright);">${count} pts</strong>
        </div>
      `;
    }
    html += `</div><div class="stat-section-title">Active Passive Modifiers</div>`;

    if (statsList.length === 0) {
      html += `<div style="font-size: 0.8rem; color: #888;">No passives allocated yet. Click nodes to build your tree.</div>`;
    } else {
      const summaryStats = {};
      for (const s of statsList) {
        summaryStats[s] = (summaryStats[s] || 0) + 1;
      }
      for (const [st, num] of Object.entries(summaryStats)) {
        html += `<div class="stat-item">${num > 1 ? `(${num}x) ` : ''}${st}</div>`;
      }
    }

    // Active Gateway Wormholes Section
    const activeGateways = [];
    for (const [g1, g2] of GATEWAY_PAIRS) {
      if (state.allocated.has(g1) && state.allocated.has(g2)) {
        const n1 = state.treeData.nodes[g1];
        const n2 = state.treeData.nodes[g2];
        activeGateways.push(`${n1 ? n1.name : g1} ⇄ ${n2 ? n2.name : g2}`);
      }
    }
    if (activeGateways.length > 0) {
      html += `<div class="stat-section-title" style="margin-top:14px; color: #e879f9;">Active Gateway Wormholes</div>`;
      for (const pairStr of activeGateways) {
        html += `<div class="stat-item" style="color: #f5d0fe; border-left: 2px solid #e879f9; padding-left: 6px;">✦ ${pairStr}</div>`;
      }
    }

    dom.statsContent.innerHTML = html;
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    dom.btnZoomIn.onclick = () => zoomAtPoint(1.25, window.innerWidth / 2, window.innerHeight / 2);
    dom.btnZoomOut.onclick = () => zoomAtPoint(0.8, window.innerWidth / 2, window.innerHeight / 2);
    dom.btnZoomReset.onclick = centerCameraOnHub;

    dom.viewportContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      zoomAtPoint(factor, e.clientX, e.clientY);
    }, { passive: false });

    // Track mouse canvas coordinates for duplicate / place
    dom.viewportContainer.addEventListener('pointermove', (e) => {
      state.mouseCanvasCoords = screenToTreeCoords(e.clientX, e.clientY);

      if (state.draggingNode && state.mode === 'editor') {
        const n = state.treeData.nodes[state.draggingNode];
        n.x = Math.round(state.mouseCanvasCoords.x - state.dragOffset.x);
        n.y = Math.round(state.mouseCanvasCoords.y - state.dragOffset.y);

        const el = document.getElementById(`node-el-${state.draggingNode}`);
        if (el) el.setAttribute('transform', `translate(${n.x}, ${n.y})`);
        renderEdges();
        return;
      }

      if (state.camera.isPanning) {
        state.camera.x = e.clientX - state.camera.startX;
        state.camera.y = e.clientY - state.camera.startY;
        applyCamera();
      }
    });

    let didDrag = false;
    let dragStartPos = { x: 0, y: 0 };

    dom.viewportContainer.addEventListener('pointerdown', (e) => {
      dragStartPos = { x: e.clientX, y: e.clientY };
      didDrag = false;

      if (e.target.closest('.tree-node')) {
        const nodeEl = e.target.closest('.tree-node');
        const nid = nodeEl.getAttribute('data-id');

        if (state.mode === 'editor' && state.editorTool === 'select' && !e.shiftKey) {
          state.draggingNode = nid;
          const coords = screenToTreeCoords(e.clientX, e.clientY);
          const n = state.treeData.nodes[nid];
          state.dragOffset = { x: coords.x - n.x, y: coords.y - n.y };
          setSelectedNode(nid);
        }
        return;
      }

      // Middle click or space+click or dragging on canvas background
      if (e.button === 1 || e.button === 0) {
        // If clicking on empty canvas in Select mode, allow panning
        if (state.editorTool === 'select' || state.mode === 'planner') {
          state.camera.isPanning = true;
          state.camera.startX = e.clientX - state.camera.x;
          state.camera.startY = e.clientY - state.camera.y;
          dom.viewportContainer.classList.add('dragging');
        }
      }
    });

    // Update didDrag on pointermove
    const origPointerMove = dom.viewportContainer.onpointermove;
    dom.viewportContainer.addEventListener('pointermove', (e) => {
      if (Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y) > 4) {
        didDrag = true;
      }
    });

    window.addEventListener('pointerup', () => {
      if (state.draggingNode) {
        state.draggingNode = null;
        saveCustomTree();
      }
      if (state.camera.isPanning) {
        state.camera.isPanning = false;
        dom.viewportContainer.classList.remove('dragging');
      }
    });

    // Main Click Delegation
    dom.viewportContainer.addEventListener('click', (e) => {
      if (didDrag) {
        didDrag = false;
        return;
      }

      // 1. Edge Click
      const edgeEl = e.target.closest('.edge-line');
      if (edgeEl && state.mode === 'editor') {
        const edgeKey = edgeEl.getAttribute('data-edge');
        handleEditorEdgeClick(edgeKey);
        return;
      }

      // 2. Node Click
      const nodeEl = e.target.closest('.tree-node');
      if (nodeEl) {
        const nid = nodeEl.getAttribute('data-id');
        if (state.mode === 'planner') {
          handleNodeClickPlanner(nid, e);
        } else {
          handleEditorNodeClick(nid, e);
        }
        return;
      }

      // 3. Canvas Click
      if (state.mode === 'editor') {
        const coords = screenToTreeCoords(e.clientX, e.clientY);
        handleEditorCanvasClick(coords);
      }
    });

    // Tooltip
    dom.viewportContainer.addEventListener('mousemove', (e) => {
      const nodeEl = e.target.closest('.tree-node');
      if (nodeEl) {
        const nid = nodeEl.getAttribute('data-id');
        showTooltip(nid, e.clientX, e.clientY);
      } else {
        hideTooltip();
      }
    });
    dom.viewportContainer.addEventListener('mouseleave', hideTooltip);

    // Header buttons
    dom.btnUndo.onclick = undo;
    dom.btnRedo.onclick = redo;
    dom.btnReset.onclick = resetTree;
    dom.btnMode.onclick = toggleMode;

    // Toolbar Tool Selection
    dom.toolSelect.onclick = () => setEditorTool('select');
    dom.toolChain.onclick = () => setEditorTool('chain');
    dom.toolConnect.onclick = () => setEditorTool('connect');
    dom.toolDelete.onclick = () => setEditorTool('delete');
    dom.toolDuplicate.onclick = duplicateSelectedNode;

    // Type buttons
    dom.typeBtns.forEach(btn => {
      btn.onclick = () => setActiveType(btn.getAttribute('data-type'));
    });

    // Quick mechanic chips
    dom.quickTagBtns.forEach(btn => {
      btn.onclick = () => {
        const mech = btn.getAttribute('data-mech');
        dom.editMechanic.value = mech;
        applyEditorFormChanges();
      };
    });

    // Drawer buttons
    dom.btnDuplicateNode.onclick = duplicateSelectedNode;
    dom.btnDisconnectNode.onclick = () => {
      if (state.selectedNodeId) disconnectNodeById(state.selectedNodeId);
    };
    dom.btnDeleteNode.onclick = () => {
      if (state.selectedNodeId) deleteNodeById(state.selectedNodeId);
    };

    // Scaffolding Tools
    dom.btnScaffoldRadial.onclick = scaffoldRadialWeb;
    dom.btnClearLines.onclick = clearAllLines;
    dom.btnClearAll.onclick = clearAllNodes;
    dom.btnRevertClean.onclick = resetToDefaultClean;

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      } else if ((e.ctrlKey || e.metaKey) && key === 'y') {
        e.preventDefault();
        redo();
      }
      // Tools
      else if (key === 'v') {
        setEditorTool('select');
      } else if (key === 'a') {
        setEditorTool('chain');
      } else if (key === 'c') {
        setEditorTool('connect');
      } else if (key === 'x') {
        setEditorTool('delete');
      } else if (key === 'd' || ((e.ctrlKey || e.metaKey) && key === 'd')) {
        e.preventDefault();
        duplicateSelectedNode();
      }
      // Type hotkeys (1-4)
      else if (key === '1') {
        setActiveType('travel');
      } else if (key === '2') {
        setActiveType('notable');
      } else if (key === '3') {
        setActiveType('keystone');
      } else if (key === '4') {
        setActiveType('gateway');
      }
      // Delete selected
      else if (key === 'delete' || key === 'backspace') {
        if (state.mode === 'editor') {
          if (state.selectedNodeId) deleteNodeById(state.selectedNodeId);
          else if (state.selectedEdge) {
            toggleEdge(state.selectedEdge[0], state.selectedEdge[1]);
            state.selectedEdge = null;
          }
        }
      }
      // Deselect / Cancel chain
      else if (key === 'escape') {
        state.connectFirstNode = null;
        setSelectedNode(null);
        renderTree();
      }
    });

    // Form Inputs
    [dom.editName, dom.editType, dom.editMechanic, dom.editStats].forEach(input => {
      input.addEventListener('input', applyEditorFormChanges);
    });

    // Search
    dom.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      dom.searchClear.style.display = state.searchQuery ? 'block' : 'none';
      applyHighlights();
    });

    dom.searchClear.onclick = () => {
      dom.searchInput.value = '';
      state.searchQuery = '';
      dom.searchClear.style.display = 'none';
      applyHighlights();
    };

    dom.bgSlider.addEventListener('input', (e) => {
      updateBgOpacity(parseFloat(e.target.value) / 100);
    });

    dom.btnStats.onclick = () => dom.statsDrawer.classList.toggle('open');
    dom.closeStats.onclick = () => dom.statsDrawer.classList.remove('open');
    dom.closeEditor.onclick = () => dom.editorDrawer.classList.remove('open');

    dom.btnExportJson.onclick = exportJson;
    dom.btnImportJson.onclick = () => dom.fileInput.click();
    dom.fileInput.onchange = handleImportFile;

    dom.btnModalConfirm.onclick = () => {
      if (pendingOrphanAction) pendingOrphanAction();
      dom.modalOverlay.classList.remove('open');
      pendingOrphanAction = null;
    };
    dom.btnModalCancel.onclick = () => {
      dom.modalOverlay.classList.remove('open');
      pendingOrphanAction = null;
    };
  }

  function exportJson() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state.treeData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', 'atlas_tree_custom.json');
    dlAnchor.click();
  }

  function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.nodes && imported.edges) {
          state.treeData = imported;
          saveCustomTree();
          buildAdjacency();
          buildFilterChips();
          renderTree();
          alert('Tree imported successfully!');
        } else {
          alert('Invalid tree JSON file format.');
        }
      } catch (err) {
        alert('Error parsing JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  window.addEventListener('DOMContentLoaded', init);
})();
