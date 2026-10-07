/**
 * ==============================================================================
 * MARSNET LAB: AI-POWERED PLANETARY INTERNET INFRASTRUCTURE DASHBOARD
 * Core Application Engine & Interactive Simulation
 * ==============================================================================
 */

(function () {
  'use strict';

  // ============================================================================
  // 1. GLOBAL STATE & CONFIGURATION
  // ============================================================================
  const STATE = {
    // Mission Time
    sol: 1042,
    marsSeconds: 52085, // 14:28:05 in Martian Sol seconds
    audioEnabled: true,
    simulationRunning: true,
    simSpeed: 1, // 1x, 5x, 25x, 100x

    // Planetary Environment
    dustTau: 0.45, // Atmospheric Optical Depth (0.1 to 6.0)
    stormIntensity: 10, // 0 to 100%
    earthMarsDistMkm: 150, // Million km (54.6 to 401)
    solarConjunction: false,
    selectedProtocol: 'dtn', // 'dtn' or 'tcp'
    selectedLinkMedium: 'optical', // 'optical', 'kaband', 'uhf', 'fiber'

    // Canvas & Topology
    nodes: [],
    links: [],
    selectedNode: null,
    selectedLink: null,
    connectingSourceNode: null,
    isDraggingNode: false,
    draggedNode: null,
    showGrid: true,
    showLos: true,

    // Simulation Metrics
    packetsSent: 0,
    packetsDelivered: 0,
    packetsBuffered: 0,
    packetsDropped: 0,
    animatedPackets: [],

    // Quiz State
    quizIndex: 0,
    quizScore: 0,
    userAnswers: new Array(10).fill(null),
    studentName: 'Cadet Engineer'
  };

  // Planetary Constants
  const MARS_RADIUS_KM = 3389.5;
  const MARS_GRAVITY = 3.721; // m/s^2 (38% Earth)
  const AREOSTATIONARY_ALT_KM = 17032;
  const AREOSTATIONARY_RADIUS_KM = 20428;
  const SPEED_OF_LIGHT_KMS = 299792;
  const SOL_SECONDS = 88775.244; // 24h 39m 35.244s

  // ============================================================================
  // 2. WEB AUDIO TELEMETRY SOUND SYNTHESIZER (No external files needed)
  // ============================================================================
  class SoundFX {
    constructor() {
      this.ctx = null;
    }

    init() {
      if (!this.ctx && typeof window.AudioContext !== 'undefined') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playBeep(freq = 880, duration = 0.08, type = 'sine') {
      if (!STATE.audioEnabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {
        // Audio error silently ignored
      }
    }

    playLinkConnect() {
      if (!STATE.audioEnabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(1040, now + 0.15);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(now + 0.2);
      } catch (e) {}
    }

    playAlert() {
      if (!STATE.audioEnabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(330, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(now + 0.25);
      } catch (e) {}
    }

    playPacketChirp() {
      if (!STATE.audioEnabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200 + Math.random() * 400, now);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(now + 0.04);
      } catch (e) {}
    }
  }

  const sfx = new SoundFX();

  // ============================================================================
  // 3. BACKGROUND COSMIC STARFIELD
  // ============================================================================
  function initStarfield() {
    const canvas = document.getElementById('starfieldCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    let stars = [];

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      stars = [];
      const numStars = Math.floor((width * height) / 3000);
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.5 + 0.3,
          alpha: Math.random(),
          speed: Math.random() * 0.02 + 0.005,
          color: Math.random() > 0.8 ? '#ff9a76' : (Math.random() > 0.6 ? '#00f0ff' : '#ffffff')
        });
      }
    }

    window.addEventListener('resize', resize);
    resize();

    function renderStars() {
      ctx.clearRect(0, 0, width, height);
      for (let star of stars) {
        star.alpha += star.speed;
        const currentAlpha = 0.3 + 0.7 * Math.abs(Math.sin(star.alpha));
        ctx.fillStyle = star.color;
        ctx.globalAlpha = currentAlpha;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
      requestAnimationFrame(renderStars);
    }
    renderStars();
  }

  // ============================================================================
  // 4. CLOCK & PLANETARY TELEMETRY UPDATES
  // ============================================================================
  function initTelemetryClock() {
    setInterval(() => {
      // Advance Mars Time
      STATE.marsSeconds += 1 * STATE.simSpeed;
      if (STATE.marsSeconds >= SOL_SECONDS) {
        STATE.marsSeconds -= SOL_SECONDS;
        STATE.sol += 1;
      }

      // Format Mars Time (Airy-0 MTC)
      const hrs = Math.floor(STATE.marsSeconds / 3600);
      const mins = Math.floor((STATE.marsSeconds % 3600) / 60);
      const secs = Math.floor(STATE.marsSeconds % 60);
      const pad = (n) => (n < 10 ? '0' + n : n);

      const liveMtcTimeEl = document.getElementById('liveMtcTime');
      const liveSolCounterEl = document.getElementById('liveSolCounter');
      if (liveMtcTimeEl) liveMtcTimeEl.textContent = `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
      if (liveSolCounterEl) liveSolCounterEl.textContent = STATE.sol;

      // Update Earth-Mars OWLT
      updateOwltDisplay();
    }, 1000);
  }

  function updateOwltDisplay() {
    const distKm = STATE.earthMarsDistMkm * 1e6;
    const owltSeconds = distKm / SPEED_OF_LIGHT_KMS;
    const mins = Math.floor(owltSeconds / 60);
    const secs = Math.floor(owltSeconds % 60);
    const rttMins = Math.floor((owltSeconds * 2) / 60);
    const rttSecs = Math.floor((owltSeconds * 2) % 60);

    const owltEl = document.getElementById('liveOwltDelay');
    const simOwltEl = document.getElementById('simOwltValue');
    const simRttEl = document.getElementById('simRttValue');
    const earthMarsDistLabel = document.getElementById('earthMarsDistLabel');

    if (owltEl) owltEl.textContent = `${mins}m ${secs}s`;
    if (simOwltEl) simOwltEl.textContent = `${mins}m ${secs}s`;
    if (simRttEl) simRttEl.textContent = `${rttMins}m ${rttSecs}s`;
    if (earthMarsDistLabel) earthMarsDistLabel.textContent = `${STATE.earthMarsDistMkm} Million km`;
  }

  // ============================================================================
  // 5. INTERACTIVE NETWORK BUILDER ENGINE (CANVAS)
  // ============================================================================
  class NetworkBuilder {
    constructor() {
      this.canvas = document.getElementById('networkCanvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.viewport = document.getElementById('canvasViewport');

      this.width = 0;
      this.height = 0;
      this.dpr = window.devicePixelRatio || 1;

      this.initEvents();
      this.resize();
      this.loadPreset('hybrid'); // Default recommended setup
      this.startRenderLoop();
    }

    resize() {
      const rect = this.viewport.getBoundingClientRect();
      this.width = rect.width;
      this.height = rect.height;
      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.ctx.scale(this.dpr, this.dpr);
      this.updateHudStats();
    }

    initEvents() {
      window.addEventListener('resize', () => this.resize());

      // Canvas Pointer Events
      this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
      window.addEventListener('mousemove', (e) => this.onMouseMove(e));
      window.addEventListener('mouseup', (e) => this.onMouseUp(e));

      // Drag and Drop from palette
      this.viewport.addEventListener('dragover', (e) => e.preventDefault());
      this.viewport.addEventListener('drop', (e) => this.onDrop(e));

      // Palette Draggable items
      document.querySelectorAll('.palette-item').forEach((item) => {
        item.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('nodeType', item.getAttribute('data-type'));
          e.dataTransfer.setData('nodeLabel', item.getAttribute('data-label'));
        });
      });

      // Medium Selector Radio
      document.querySelectorAll('input[name="linkMedium"]').forEach((radio) => {
        radio.addEventListener('change', (e) => {
          STATE.selectedLinkMedium = e.target.value;
          sfx.playBeep(640, 0.05);
        });
      });

      // Protocol segment buttons
      const dtnBtn = document.getElementById('protocolDtnBtn');
      const tcpBtn = document.getElementById('protocolTcpBtn');
      if (dtnBtn && tcpBtn) {
        dtnBtn.addEventListener('click', () => {
          dtnBtn.classList.add('active');
          tcpBtn.classList.remove('active');
          STATE.selectedProtocol = 'dtn';
          document.getElementById('simCurrentProtocolTag').textContent = 'DTN BUNDLE PROTOCOL (RFC 9171)';
          sfx.playBeep(700, 0.08);
          this.updateHudStats();
        });
        tcpBtn.addEventListener('click', () => {
          tcpBtn.classList.add('active');
          dtnBtn.classList.remove('active');
          STATE.selectedProtocol = 'tcp';
          document.getElementById('simCurrentProtocolTag').textContent = 'STANDARD TCP/IP (DROPS ON OUTAGE)';
          sfx.playAlert();
          this.updateHudStats();
        });
      }

      // Presets
      document.getElementById('presetMinimalBtn')?.addEventListener('click', () => {
        this.loadPreset('minimal');
        sfx.playLinkConnect();
      });
      document.getElementById('presetAreoBtn')?.addEventListener('click', () => {
        this.loadPreset('areo');
        sfx.playLinkConnect();
      });
      document.getElementById('presetHybridBtn')?.addEventListener('click', () => {
        this.loadPreset('hybrid');
        sfx.playLinkConnect();
      });

      // Clear & Export
      document.getElementById('clearCanvasBtn')?.addEventListener('click', () => {
        STATE.nodes = [];
        STATE.links = [];
        STATE.selectedNode = null;
        STATE.selectedLink = null;
        this.updateInspector();
        this.updateHudStats();
        sfx.playAlert();
      });

      document.getElementById('exportNetworkBtn')?.addEventListener('click', () => {
        this.exportTopologyJSON();
      });

      // HUD Toggles
      const gridBtn = document.getElementById('gridToggleBtn');
      const losBtn = document.getElementById('losToggleBtn');
      gridBtn?.addEventListener('click', () => {
        STATE.showGrid = !STATE.showGrid;
        gridBtn.classList.toggle('active', STATE.showGrid);
        gridBtn.textContent = STATE.showGrid ? 'GRID ON' : 'GRID OFF';
      });
      losBtn?.addEventListener('click', () => {
        STATE.showLos = !STATE.showLos;
        losBtn.classList.toggle('active', STATE.showLos);
        losBtn.textContent = STATE.showLos ? 'LOS ON' : 'LOS OFF';
      });

      // Inspector Action Buttons
      document.getElementById('pingNodeBtn')?.addEventListener('click', () => this.pingSelectedNode());
      document.getElementById('deleteSelectionBtn')?.addEventListener('click', () => this.deleteSelection());
    }

    getCanvasPos(e) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }

    onMouseDown(e) {
      const pos = this.getCanvasPos(e);
      const clickedNode = this.findNodeAt(pos.x, pos.y);

      if (clickedNode) {
        if (e.shiftKey || STATE.connectingSourceNode) {
          // Connecting mode
          if (STATE.connectingSourceNode && STATE.connectingSourceNode !== clickedNode) {
            this.createLink(STATE.connectingSourceNode, clickedNode, STATE.selectedLinkMedium);
            STATE.connectingSourceNode = null;
            document.getElementById('currentToolMode').textContent = 'Mode: Drag & Select';
          } else {
            STATE.connectingSourceNode = clickedNode;
            document.getElementById('currentToolMode').textContent = `Connecting from: ${clickedNode.label}`;
            sfx.playBeep(800, 0.05);
          }
          return;
        }

        // Selection & drag start
        STATE.selectedNode = clickedNode;
        STATE.selectedLink = null;
        STATE.isDraggingNode = true;
        STATE.draggedNode = clickedNode;
        clickedNode.dragOffsetX = pos.x - clickedNode.x;
        clickedNode.dragOffsetY = pos.y - clickedNode.y;
        this.updateInspector();
        sfx.playBeep(580, 0.04);
      } else {
        // Check link click
        const clickedLink = this.findLinkAt(pos.x, pos.y);
        if (clickedLink) {
          STATE.selectedLink = clickedLink;
          STATE.selectedNode = null;
          this.updateInspector();
          sfx.playBeep(520, 0.04);
        } else {
          STATE.selectedNode = null;
          STATE.selectedLink = null;
          STATE.connectingSourceNode = null;
          document.getElementById('currentToolMode').textContent = 'Mode: Drag & Select';
          this.updateInspector();
        }
      }
    }

    onMouseMove(e) {
      if (STATE.isDraggingNode && STATE.draggedNode) {
        const pos = this.getCanvasPos(e);
        STATE.draggedNode.x = Math.max(30, Math.min(this.width - 30, pos.x - STATE.draggedNode.dragOffsetX));
        STATE.draggedNode.y = Math.max(30, Math.min(this.height - 30, pos.y - STATE.draggedNode.dragOffsetY));
      }
    }

    onMouseUp() {
      STATE.isDraggingNode = false;
      STATE.draggedNode = null;
    }

    onDrop(e) {
      e.preventDefault();
      const pos = this.getCanvasPos(e);
      const type = e.dataTransfer.getData('nodeType');
      const label = e.dataTransfer.getData('nodeLabel') || 'New Node';

      if (type) {
        this.addNode(type, label, pos.x, pos.y);
        sfx.playLinkConnect();
      }
    }

    findNodeAt(x, y) {
      for (let i = STATE.nodes.length - 1; i >= 0; i--) {
        const node = STATE.nodes[i];
        const dx = node.x - x;
        const dy = node.y - y;
        if (Math.sqrt(dx * dx + dy * dy) <= node.radius + 6) {
          return node;
        }
      }
      return null;
    }

    findLinkAt(x, y) {
      for (let link of STATE.links) {
        const n1 = link.source;
        const n2 = link.target;
        const dist = this.distToSegment({ x, y }, { x: n1.x, y: n1.y }, { x: n2.x, y: n2.y });
        if (dist < 8) return link;
      }
      return null;
    }

    distToSegment(p, v, w) {
      const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
      if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
      let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
    }

    addNode(type, label, x, y) {
      const id = 'node_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const nodeProps = this.getNodeTypeSpecs(type);

      const newNode = {
        id,
        type,
        label,
        x,
        y,
        radius: nodeProps.radius,
        color: nodeProps.color,
        icon: nodeProps.icon,
        altitudeKm: nodeProps.defaultAltitude,
        maxThroughputMbps: nodeProps.throughput,
        bufferMb: 0,
        maxBufferMb: nodeProps.bufferSize,
        custodyTransferEnabled: true,
        status: 'ONLINE'
      };

      STATE.nodes.push(newNode);
      this.updateHudStats();
      return newNode;
    }

    createLink(source, target, medium) {
      // Check if link already exists
      const exists = STATE.links.some(
        (l) => (l.source === source && l.target === target) || (l.source === target && l.target === source)
      );
      if (exists) return;

      const linkProps = this.getLinkSpecs(medium);
      const newLink = {
        id: 'link_' + Date.now(),
        source,
        target,
        medium,
        name: `${source.label} ↔ ${target.label}`,
        baseCapacityMbps: linkProps.capacity,
        color: linkProps.color,
        frequency: linkProps.freq,
        active: true,
        opticalAttenuationDb: 0,
        ber: 1e-9
      };

      STATE.links.push(newLink);
      sfx.playLinkConnect();
      this.updateHudStats();
    }

    getNodeTypeSpecs(type) {
      switch (type) {
        case 'colony':
          return { radius: 18, color: '#00f0ff', icon: '🏛️', defaultAltitude: 0, throughput: 10000, bufferSize: 500000 };
        case 'science':
          return { radius: 15, color: '#ff9a3c', icon: '🔬', defaultAltitude: 0, throughput: 1200, bufferSize: 200000 };
        case 'canyon':
          return { radius: 14, color: '#e04e28', icon: '🏔️', defaultAltitude: -7, throughput: 800, bufferSize: 100000 };
        case 'rover':
          return { radius: 12, color: '#ffbe3b', icon: '🚜', defaultAltitude: 0, throughput: 2, bufferSize: 10000 };
        case 'areosat':
          return { radius: 16, color: '#00f0ff', icon: '🛰️', defaultAltitude: 17032, throughput: 2500, bufferSize: 1000000 };
        case 'polar':
          return { radius: 14, color: '#ffbe3b', icon: '🛰️', defaultAltitude: 400, throughput: 600, bufferSize: 500000 };
        case 'dsn':
          return { radius: 20, color: '#00ffc2', icon: '🌍', defaultAltitude: 150000000, throughput: 250, bufferSize: 5000000 };
        default:
          return { radius: 14, color: '#fff', icon: '📡', defaultAltitude: 0, throughput: 100, bufferSize: 50000 };
      }
    }

    getLinkSpecs(medium) {
      switch (medium) {
        case 'optical':
          return { capacity: 1200, color: '#00f0ff', freq: '1550nm Laser' };
        case 'kaband':
          return { capacity: 150, color: '#ff9a3c', freq: '32 GHz Microwave' };
        case 'uhf':
          return { capacity: 2, color: '#ffbe3b', freq: '401 MHz Proximity-1' };
        case 'fiber':
          return { capacity: 10000, color: '#00ffc2', freq: 'Surface Optical Tether' };
        default:
          return { capacity: 100, color: '#fff', freq: 'Standard RF' };
      }
    }

    loadPreset(presetName) {
      STATE.nodes = [];
      STATE.links = [];
      const cx = this.width / 2;
      const cy = this.height / 2;

      if (presetName === 'minimal') {
        const base = this.addNode('colony', 'Olympus Base Hub', cx - 120, cy + 120);
        const rover = this.addNode('rover', 'Perseverance-II', cx - 200, cy + 130);
        const orbiter = this.addNode('polar', 'MRO Polar Relay', cx - 80, cy - 80);
        this.createLink(rover, base, 'uhf');
        this.createLink(base, orbiter, 'kaband');
      } else if (presetName === 'areo') {
        const areo1 = this.addNode('areosat', 'Areosat Alpha (0° W)', cx - 180, cy - 140);
        const areo2 = this.addNode('areosat', 'Areosat Beta (120° W)', cx, cy - 180);
        const areo3 = this.addNode('areosat', 'Areosat Gamma (240° W)', cx + 180, cy - 140);
        const colony = this.addNode('colony', 'Olympus Colony Hub', cx - 100, cy + 130);
        const science = this.addNode('science', 'Jezero Outpost', cx + 100, cy + 120);

        this.createLink(areo1, areo2, 'optical');
        this.createLink(areo2, areo3, 'optical');
        this.createLink(areo3, areo1, 'optical');
        this.createLink(colony, areo1, 'optical');
        this.createLink(science, areo3, 'kaband');
      } else if (presetName === 'hybrid') {
        // Full Recommended Interplanetary Architecture
        const earth = this.addNode('dsn', 'Earth DSN Gateway', cx + 220, cy - 200);
        const areo1 = this.addNode('areosat', 'Areosat-1 Optical Relay', cx + 80, cy - 150);
        const areo2 = this.addNode('areosat', 'Areosat-2 Microwave Relay', cx - 120, cy - 150);
        const polar = this.addNode('polar', 'LMO Rapid Relay', cx - 180, cy - 40);
        const colony = this.addNode('colony', 'Olympus Primary Base', cx - 50, cy + 130);
        const jezero = this.addNode('science', 'Jezero Crater Lab', cx + 120, cy + 135);
        const canyon = this.addNode('canyon', 'Valles Marineris Relay', cx - 170, cy + 140);
        const rover = this.addNode('rover', 'Rover Scout-04', cx - 240, cy + 145);

        this.createLink(earth, areo1, 'optical');
        this.createLink(areo1, areo2, 'optical');
        this.createLink(areo1, colony, 'optical');
        this.createLink(areo2, colony, 'kaband');
        this.createLink(colony, jezero, 'fiber');
        this.createLink(canyon, colony, 'kaband');
        this.createLink(rover, canyon, 'uhf');
        this.createLink(polar, canyon, 'kaband');
      }

      this.updateHudStats();
      this.updateInspector();
    }

    updateHudStats() {
      const nodeCountEl = document.getElementById('hudNodeCount');
      const linkCountEl = document.getElementById('hudLinkCount');
      const capacityEl = document.getElementById('hudBackboneCapacity');
      const healthEl = document.getElementById('hudNetworkHealth');

      if (nodeCountEl) nodeCountEl.textContent = STATE.nodes.length;
      if (linkCountEl) linkCountEl.textContent = STATE.links.length;

      let totalCapacity = 0;
      STATE.links.forEach((link) => {
        let eff = link.baseCapacityMbps;
        if (link.medium === 'optical') {
          // Attenuated by atmospheric dust
          const lossFactor = Math.exp(-STATE.dustTau * 1.5);
          eff *= Math.max(0.01, lossFactor);
        }
        totalCapacity += eff;
      });

      const gbps = (totalCapacity / 1000).toFixed(1);
      if (capacityEl) capacityEl.textContent = `${gbps} Gbps`;

      if (healthEl) {
        if (STATE.dustTau > 3.0) {
          healthEl.textContent = 'DEGRADED (DUST)';
          healthEl.className = 'hud-stat-val font-mono highlight-amber';
        } else if (STATE.nodes.length > 0 && STATE.links.length === 0) {
          healthEl.textContent = 'ISOLATED NODES';
          healthEl.className = 'hud-stat-val font-mono badge-danger';
        } else {
          healthEl.textContent = 'OPTIMAL';
          healthEl.className = 'hud-stat-val font-mono badge-safe';
        }
      }
    }

    updateInspector() {
      const titleEl = document.getElementById('inspectorTitle');
      const badgeEl = document.getElementById('inspectorBadge');
      const bodyEl = document.getElementById('inspectorBody');
      const footerEl = document.getElementById('inspectorFooter');

      if (STATE.selectedNode) {
        const n = STATE.selectedNode;
        titleEl.textContent = n.label;
        badgeEl.textContent = n.type.toUpperCase();
        footerEl.style.display = 'flex';

        bodyEl.innerHTML = `
          <div class="inspector-node-card">
            <div class="node-spec-title">
              <span>${n.icon}</span>
              <span>${n.label}</span>
            </div>
            <div class="spec-grid">
              <div class="spec-box">
                <span class="spec-lbl">ALTITUDE</span>
                <span class="spec-val font-mono">${n.altitudeKm >= 1000000 ? 'Deep Space' : n.altitudeKm + ' km'}</span>
              </div>
              <div class="spec-box">
                <span class="spec-lbl">MAX THROUGHPUT</span>
                <span class="spec-val font-mono highlight-cyan">${n.maxThroughputMbps} Mbps</span>
              </div>
              <div class="spec-box">
                <span class="spec-lbl">DTN CUSTODY</span>
                <span class="spec-val font-mono highlight-green">${n.custodyTransferEnabled ? 'ACTIVE (RFC 9171)' : 'DISABLED'}</span>
              </div>
              <div class="spec-box">
                <span class="spec-lbl">STATUS</span>
                <span class="spec-val font-mono highlight-green">${n.status}</span>
              </div>
            </div>

            <div class="buffer-bar-wrap">
              <div class="spec-lbl">NON-VOLATILE BUNDLE BUFFER:</div>
              <div class="buffer-progress">
                <div class="buffer-fill" style="width: ${(n.bufferMb / n.maxBufferMb) * 100}%;"></div>
              </div>
              <div class="spec-lbl" style="text-align: right; margin-top: 4px;">
                ${(n.bufferMb / 1024).toFixed(1)} GB / ${(n.maxBufferMb / 1024).toFixed(0)} GB
              </div>
            </div>

            <div class="spec-box" style="margin-top: 6px;">
              <span class="spec-lbl">CONNECTED INTERFACES:</span>
              <span class="spec-val font-mono">
                ${STATE.links.filter((l) => l.source === n || l.target === n).length} ACTIVE LINKS
              </span>
            </div>
          </div>
        `;
      } else if (STATE.selectedLink) {
        const l = STATE.selectedLink;
        titleEl.textContent = 'LINK TELEMETRY';
        badgeEl.textContent = l.medium.toUpperCase();
        footerEl.style.display = 'flex';

        // Calculate link distance & propagation delay
        const dx = l.source.x - l.target.x;
        const dy = l.source.y - l.target.y;
        const simDistKm = Math.round(Math.sqrt(dx * dx + dy * dy) * 15);
        const propDelayMs = ((simDistKm / SPEED_OF_LIGHT_KMS) * 1000).toFixed(2);

        // Dust Attenuation
        let dustLoss = 0;
        if (l.medium === 'optical') {
          dustLoss = (STATE.dustTau * 3.8).toFixed(1);
        } else if (l.medium === 'kaband') {
          dustLoss = (STATE.dustTau * 0.4).toFixed(1);
        }

        bodyEl.innerHTML = `
          <div class="inspector-node-card">
            <div class="node-spec-title">${l.name}</div>
            <div class="spec-grid">
              <div class="spec-box">
                <span class="spec-lbl">MEDIUM</span>
                <span class="spec-val font-mono highlight-cyan">${l.frequency}</span>
              </div>
              <div class="spec-box">
                <span class="spec-lbl">BASE CAPACITY</span>
                <span class="spec-val font-mono">${l.baseCapacityMbps} Mbps</span>
              </div>
              <div class="spec-box">
                <span class="spec-lbl">EST. DISTANCE</span>
                <span class="spec-val font-mono">${simDistKm.toLocaleString()} km</span>
              </div>
              <div class="spec-box">
                <span class="spec-lbl">ONE-WAY LIGHT TIME</span>
                <span class="spec-val font-mono highlight-amber">${propDelayMs} ms</span>
              </div>
              <div class="spec-box">
                <span class="spec-lbl">DUST ATTENUATION</span>
                <span class="spec-val font-mono ${dustLoss > 5 ? 'highlight-red' : 'highlight-green'}">
                  ${dustLoss} dB
                </span>
              </div>
              <div class="spec-box">
                <span class="spec-lbl">BIT ERROR RATE (BER)</span>
                <span class="spec-val font-mono">1.2 × 10⁻⁹</span>
              </div>
            </div>
          </div>
        `;
      } else {
        titleEl.textContent = 'TELEMETRY INSPECTOR';
        badgeEl.textContent = 'NO SELECTION';
        footerEl.style.display = 'none';
        bodyEl.innerHTML = `
          <div class="inspector-empty-state">
            <div class="empty-icon">🛰️</div>
            <h4>Select a Node or Link</h4>
            <p>Click on any communication terminal, rover, orbiter, or connection line on the canvas to inspect its live physical layer telemetry, link budget, and bundle queue.</p>
          </div>
        `;
      }
    }

    pingSelectedNode() {
      if (!STATE.selectedNode) return;
      sfx.playLinkConnect();
      alert(`[PING] Echo reply from ${STATE.selectedNode.label}: Local RTT = 4.2ms | Buffer Health = 100% | CCSDS Custody ACK verified.`);
    }

    deleteSelection() {
      if (STATE.selectedNode) {
        STATE.links = STATE.links.filter(
          (l) => l.source !== STATE.selectedNode && l.target !== STATE.selectedNode
        );
        STATE.nodes = STATE.nodes.filter((n) => n !== STATE.selectedNode);
        STATE.selectedNode = null;
      } else if (STATE.selectedLink) {
        STATE.links = STATE.links.filter((l) => l !== STATE.selectedLink);
        STATE.selectedLink = null;
      }
      this.updateInspector();
      this.updateHudStats();
      sfx.playAlert();
    }

    exportTopologyJSON() {
      const topologyData = {
        mission: 'MarsNet Lab Planetary Architecture',
        epochSol: STATE.sol,
        nodes: STATE.nodes.map((n) => ({
          id: n.id,
          label: n.label,
          type: n.type,
          x: Math.round(n.x),
          y: Math.round(n.y),
          altitudeKm: n.altitudeKm
        })),
        links: STATE.links.map((l) => ({
          source: l.source.id,
          target: l.target.id,
          medium: l.medium,
          capacityMbps: l.baseCapacityMbps
        }))
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(topologyData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `marsnet_topology_sol_${STATE.sol}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      sfx.playBeep(900, 0.1);
    }

    startRenderLoop() {
      const render = () => {
        this.drawCanvas();
        requestAnimationFrame(render);
      };
      requestAnimationFrame(render);
    }

    drawCanvas() {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      ctx.clearRect(0, 0, w, h);

      // 1. Draw Coordinate Grid if enabled
      if (STATE.showGrid) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x < w; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
      }

      // 2. Draw Mars Curvature & Surface Silhouette
      const marsCenterY = h + 220;
      const marsRadius = w * 0.9;
      
      const grad = ctx.createRadialGradient(w / 2, marsCenterY - 40, marsRadius * 0.4, w / 2, marsCenterY, marsRadius);
      grad.addColorStop(0, '#54170e');
      grad.addColorStop(0.3, '#330c08');
      grad.addColorStop(1, '#0c0507');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(w / 2, marsCenterY, marsRadius, 0, Math.PI * 2);
      ctx.fill();

      // Atmospheric Limb Glow (Thin CO2 layer)
      ctx.strokeStyle = STATE.dustTau > 2.0 ? 'rgba(255, 122, 69, 0.6)' : 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w / 2, marsCenterY, marsRadius, Math.PI + 0.5, Math.PI * 2 - 0.5);
      ctx.stroke();

      // Orbital Guides (Areostationary & Polar)
      if (STATE.showLos) {
        // Areostationary line
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(w / 2, marsCenterY, marsRadius + 260, Math.PI + 0.4, Math.PI * 2 - 0.4);
        ctx.stroke();

        // LMO Polar line
        ctx.strokeStyle = 'rgba(255, 190, 59, 0.12)';
        ctx.beginPath();
        ctx.arc(w / 2, marsCenterY, marsRadius + 80, Math.PI + 0.3, Math.PI * 2 - 0.3);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 3. Draw Links
      for (let link of STATE.links) {
        this.drawLink(ctx, link);
      }

      // In-progress connection line
      if (STATE.connectingSourceNode) {
        ctx.strokeStyle = '#00f0ff';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(STATE.connectingSourceNode.x, STATE.connectingSourceNode.y);
        ctx.lineTo(STATE.connectingSourceNode.x, STATE.connectingSourceNode.y); // follows mouse if stored
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 4. Draw Nodes
      for (let node of STATE.nodes) {
        this.drawNode(ctx, node);
      }
    }

    drawLink(ctx, link) {
      const n1 = link.source;
      const n2 = link.target;
      const isSelected = link === STATE.selectedLink;

      ctx.save();

      // Attenuation styling
      let strokeColor = link.color;
      let lineWidth = isSelected ? 3.5 : 2;

      if (link.medium === 'optical' && STATE.dustTau > 2.0) {
        // Laser scattered by dust storm
        ctx.setLineDash([2, 6]);
        strokeColor = 'rgba(255, 51, 102, 0.5)';
      } else if (link.medium === 'uhf') {
        ctx.setLineDash([5, 5]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(n1.x, n1.y);
      ctx.lineTo(n2.x, n2.y);
      ctx.stroke();

      // Glow effect on selected link
      if (isSelected) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 8;
        ctx.stroke();
      }

      // Mid-point link tag
      const midX = (n1.x + n2.x) / 2;
      const midY = (n1.y + n2.y) / 2;
      ctx.fillStyle = 'rgba(9, 14, 24, 0.85)';
      ctx.fillRect(midX - 22, midY - 9, 44, 18);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(midX - 22, midY - 9, 44, 18);

      ctx.fillStyle = strokeColor;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(link.medium.substring(0, 4).toUpperCase(), midX, midY);

      ctx.restore();
    }

    drawNode(ctx, node) {
      const isSelected = node === STATE.selectedNode;
      const isConnecting = node === STATE.connectingSourceNode;

      ctx.save();

      // Selection Glow Circle
      if (isSelected || isConnecting) {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
        ctx.lineWidth = 6;
        ctx.stroke();
      }

      // Outer Ring
      ctx.fillStyle = 'rgba(11, 17, 30, 0.9)';
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = node.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner Icon Emoji
      ctx.font = `${Math.floor(node.radius * 1.1)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.icon, node.x, node.y + 1);

      // Label beneath node
      ctx.fillStyle = '#f0f4fc';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y + node.radius + 14);

      // Buffer Indicator pill if buffered
      if (node.bufferMb > 0) {
        ctx.fillStyle = '#ff9a3c';
        ctx.beginPath();
        ctx.arc(node.x + node.radius - 2, node.y - node.radius + 2, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // ============================================================================
  // 6. DYNAMIC SIGNAL & ORBIT SIMULATION ENGINE
    // ============================================================================
  // 6. ADVANCED KEPLERIAN DYNAMICS & OCCULTATION SIMULATION ENGINE
  // ============================================================================
  class OrbitSignalSimulator {
    constructor() {
      this.canvas = document.getElementById('simCanvas');
      this.chartCanvas = document.getElementById('telemetryChartCanvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.chartCtx = this.chartCanvas ? this.chartCanvas.getContext('2d') : null;
      this.dpr = window.devicePixelRatio || 1;

      this.width = 0;
      this.height = 0;

      // Constellation Flight Geometry
      this.areosatAngle = 0;
      this.polarAngle1 = 0;
      this.polarAngle2 = Math.PI * 0.7;
      this.marsRotation = 0;
      this.phobosAngle = 0;

      // Camera Perspective: 'equatorial', 'polar', 'horizon'
      this.cameraView = 'equatorial';

      // Telemetry Chart Buffer (rolling history)
      this.chartHistory = {
        throughput: new Array(60).fill(1200),
        ber: new Array(60).fill(1),
        buffer: new Array(60).fill(250)
      };

      // Active Bundles Manifest Queue
      this.activeBundles = [
        {
          id: 'BDL-9042-01',
          name: 'Perseverance Core Spectral Map (45 MB)',
          origin: 'Jezero Rover',
          custodian: 'MRO Polar Relay',
          dest: 'Earth DSN',
          medium: 'Ka-Band 32GHz',
          status: 'IN CUSTODY TRANSFER'
        },
        {
          id: 'BDL-9042-02',
          name: 'Olympus Habitat Life-Support Telemetry (1.2 MB)',
          origin: 'Olympus Base',
          custodian: 'Areosat Alpha',
          dest: 'Earth DSN',
          medium: '1550nm Laser',
          status: 'TRANSMITTING'
        }
      ];

      this.initControls();
      this.resize();
      this.startLoop();
    }

    resize() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.width = rect.width;
      this.height = rect.height;
      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.ctx.scale(this.dpr, this.dpr);

      if (this.chartCanvas) {
        const cRect = this.chartCanvas.parentElement.getBoundingClientRect();
        this.chartCanvas.width = cRect.width * this.dpr;
        this.chartCanvas.height = cRect.height * this.dpr;
        if (this.chartCtx) this.chartCtx.scale(this.dpr, this.dpr);
      }
    }

    initControls() {
      window.addEventListener('resize', () => this.resize());

      // Play / Pause
      const playBtn = document.getElementById('simPlayPauseBtn');
      const playIcon = document.getElementById('simPlayIcon');
      const playText = document.getElementById('simPlayText');
      playBtn?.addEventListener('click', () => {
        STATE.simulationRunning = !STATE.simulationRunning;
        playIcon.textContent = STATE.simulationRunning ? '⏸️' : '▶️';
        playText.textContent = STATE.simulationRunning ? 'PAUSE' : 'RESUME';
        document.getElementById('globalEngineStatus').textContent = STATE.simulationRunning
          ? `SIMULATION RUNNING • ${STATE.simSpeed}.0x`
          : 'SIMULATION PAUSED';
        sfx.playBeep(600, 0.05);
      });

      // Step Sol
      document.getElementById('simStepBtn')?.addEventListener('click', () => {
        STATE.marsSeconds += 3600;
        sfx.playBeep(720, 0.05);
      });

      // Speed Buttons
      document.querySelectorAll('.speed-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.speed-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          STATE.simSpeed = parseInt(btn.getAttribute('data-speed'), 10) || 1;
          document.getElementById('globalEngineStatus').textContent = `SIMULATION RUNNING • ${STATE.simSpeed}.0x`;
          sfx.playBeep(840, 0.04);
        });
      });

      // Camera Perspective Buttons
      document.querySelectorAll('.cam-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.cam-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.cameraView = btn.getAttribute('data-view');
          const badge = document.getElementById('simViewBadge');
          const statusTag = document.getElementById('cameraStatusTag');

          if (this.cameraView === 'equatorial') {
            if (badge) badge.textContent = 'VIEW: EQUATORIAL CLARKE RING (17,032 km)';
            if (statusTag) statusTag.textContent = 'FOV: 120° • AREOSTATIONARY CLARKE RING ACTIVE';
          } else if (this.cameraView === 'polar') {
            if (badge) badge.textContent = 'VIEW: POLAR RELAY INCLINATION & SWATH';
            if (statusTag) statusTag.textContent = 'FOV: 68° • INCLINED 92.8° LOW MARS ORBIT';
          } else {
            if (badge) badge.textContent = 'VIEW: OLYMPUS BASE HORIZON ZENITH TRACKING';
            if (statusTag) statusTag.textContent = 'FOV: 160° • GROUND-TO-SPACE AZ/EL TRACKER';
          }
          sfx.playBeep(700, 0.05);
        });
      });

      // Dispatch Test Bundle
      document.getElementById('dispatchTestBundleBtn')?.addEventListener('click', () => {
        this.dispatchCustomBundle();
      });

      // Scenario Buttons
      document.getElementById('scenarioDustStormBtn')?.addEventListener('click', () => {
        STATE.dustTau = 5.4;
        STATE.stormIntensity = 95;
        const slider = document.getElementById('stormIntensitySlider');
        if (slider) slider.value = 95;
        this.updateAtmosphericMetrics();
        sfx.playAlert();
        this.logPacket('warn', 'SCENARIO INJECTION: Global Planet-Encircling Dust Storm triggered! Optical Tau surged to 5.4!');
      });

      document.getElementById('scenarioConjunctionBtn')?.addEventListener('click', () => {
        const toggle = document.getElementById('conjunctionToggle');
        if (toggle) {
          toggle.checked = true;
          toggle.dispatchEvent(new Event('change'));
        }
      });

      document.getElementById('scenarioPhobosEclipseBtn')?.addEventListener('click', () => {
        sfx.playAlert();
        this.logPacket('warn', 'SCENARIO INJECTION: Phobos orbital transit shadow passing overhead. Temporary 180s laser occultation.');
      });

      document.getElementById('scenarioOptimalClearBtn')?.addEventListener('click', () => {
        STATE.dustTau = 0.2;
        STATE.stormIntensity = 5;
        const slider = document.getElementById('stormIntensitySlider');
        if (slider) slider.value = 5;
        const toggle = document.getElementById('conjunctionToggle');
        if (toggle && toggle.checked) {
          toggle.checked = false;
          toggle.dispatchEvent(new Event('change'));
        }
        this.updateAtmosphericMetrics();
        sfx.playLinkConnect();
        this.logPacket('success', 'SCENARIO: Clear Sol nominal conditions restored. 1550nm Laser backbones at 100% margin.');
      });

      // Dust Storm Slider
      const stormSlider = document.getElementById('stormIntensitySlider');
      stormSlider?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        STATE.stormIntensity = val;
        STATE.dustTau = Number((0.2 + (val / 100) * 5.8).toFixed(2));
        this.updateAtmosphericMetrics();
      });

      // Earth-Mars Dist Slider
      const distSlider = document.getElementById('earthMarsDistSlider');
      distSlider?.addEventListener('input', (e) => {
        STATE.earthMarsDistMkm = parseFloat(e.target.value);
        updateOwltDisplay();
      });

      // Conjunction Toggle
      const conjToggle = document.getElementById('conjunctionToggle');
      conjToggle?.addEventListener('change', (e) => {
        STATE.solarConjunction = e.target.checked;
        const statusEl = document.getElementById('liveConjunctionStatus');
        if (STATE.solarConjunction) {
          statusEl.textContent = 'BLACKOUT (0.4° OCCULTED)';
          statusEl.className = 'telemetry-value font-mono highlight-red';
          this.logPacket('danger', 'CONJUNCTION BLACKOUT: Sun positioned directly in line of sight. Earth-Mars comms halted.');
          sfx.playAlert();
        } else {
          statusEl.textContent = 'CLEAR (38° SEP)';
          statusEl.className = 'telemetry-value font-mono badge-safe';
          this.logPacket('success', 'CONJUNCTION CLEARED: Earth Deep Space Network line-of-sight restored.');
        }
      });
    }

    dispatchCustomBundle() {
      const payloads = [
        { name: '🔬 Jezero Core Sample Raman Spectra (72 MB)', origin: 'Jezero Rover', dest: 'Earth DSN' },
        { name: '📸 Olympus Base 360° HDR Panorama (110 MB)', origin: 'Olympus Base', dest: 'Earth DSN' },
        { name: '🚁 Ingenuity Next Aerial Flight Telemetry (18 MB)', origin: 'Jezero Scout', dest: 'Olympus Base' },
        { name: '⚡ Colony Subsurface Reactor Telemetry (4.2 MB)', origin: 'Olympus Base', dest: 'Areosat Beta' },
        { name: '📡 DSN Uplink: Autonomous Guidance Update (64 KB)', origin: 'Earth DSN', dest: 'Jezero Rover' }
      ];
      const p = payloads[Math.floor(Math.random() * payloads.length)];
      const id = 'BDL-' + (9000 + Math.floor(Math.random() * 999));

      const newBundle = {
        id,
        name: p.name,
        origin: p.origin,
        custodian: 'Areosat Alpha (Custody Holder)',
        dest: p.dest,
        medium: STATE.dustTau > 3.0 ? 'Ka-Band Microwave' : '1550nm Laser DSOC',
        status: 'DISPATCHED'
      };

      this.activeBundles.unshift(newBundle);
      if (this.activeBundles.length > 5) this.activeBundles.pop();

      this.renderBundleTable();
      sfx.playLinkConnect();
      this.logPacket('info', `[BUNDLE DISPATCH] Bundle ${id} accepted into custody from ${p.origin}. Route: Contact Graph Routing.`);
    }

    renderBundleTable() {
      const tbody = document.getElementById('bundleManifestBody');
      if (!tbody) return;
      tbody.innerHTML = this.activeBundles.map((b) => `
        <tr>
          <td class="highlight-cyan">${b.id}</td>
          <td>${b.name}</td>
          <td>${b.origin}</td>
          <td class="highlight-amber">${b.custodian}</td>
          <td>${b.dest}</td>
          <td>${b.medium}</td>
          <td><span class="badge-safe">${b.status}</span></td>
        </tr>
      `).join('');
    }

    updateAtmosphericMetrics() {
      const stormIntensityLabel = document.getElementById('stormIntensityLabel');
      const simTauValue = document.getElementById('simTauValue');
      const solarLossVal = document.getElementById('solarLossVal');
      const solarLossBar = document.getElementById('solarLossBar');
      const laserLossVal = document.getElementById('laserLossVal');
      const laserLossBar = document.getElementById('laserLossBar');
      const kaLossVal = document.getElementById('kaLossVal');
      const kaLossBar = document.getElementById('kaLossBar');
      const stormOverlay = document.getElementById('stormVisualOverlay');

      let labelText = 'Clear Sol';
      if (STATE.dustTau > 4.0) labelText = 'Global Planet-Wide Storm';
      else if (STATE.dustTau > 2.0) labelText = 'Regional Dust Storm';
      else if (STATE.dustTau > 0.8) labelText = 'Moderate Dust Haze';

      if (stormIntensityLabel) stormIntensityLabel.textContent = `${labelText} (τ=${STATE.dustTau})`;
      if (simTauValue) simTauValue.textContent = `${STATE.dustTau} (${labelText})`;

      const laserLossDb = (STATE.dustTau * 4.34).toFixed(1);
      if (laserLossVal) laserLossVal.textContent = `${laserLossDb} dB`;
      if (laserLossBar) laserLossBar.style.width = `${Math.min(100, STATE.dustTau * 18)}%`;

      const powerLossPct = Math.min(92, Math.round(STATE.dustTau * 16));
      if (solarLossVal) solarLossVal.textContent = `-${powerLossPct}%`;
      if (solarLossBar) solarLossBar.style.width = `${powerLossPct}%`;

      const kaMargin = Math.max(2, 22 - STATE.dustTau * 1.5).toFixed(1);
      if (kaLossVal) kaLossVal.textContent = `${kaMargin} dB (Stable)`;
      if (kaLossBar) kaLossBar.style.width = `${Math.min(100, kaMargin * 4.5)}%`;

      if (stormOverlay) {
        stormOverlay.style.opacity = (STATE.dustTau / 6.0).toFixed(2);
      }

      const benchTcpStatus = document.getElementById('benchTcpStatus');
      const benchTcpRate = document.getElementById('benchTcpRate');
      const benchDtnStatus = document.getElementById('benchDtnStatus');
      const benchDtnRate = document.getElementById('benchDtnRate');

      if (STATE.dustTau > 3.0 || STATE.solarConjunction) {
        if (benchTcpStatus) benchTcpStatus.textContent = 'ALL PACKETS DROPPED';
        if (benchTcpRate) benchTcpRate.textContent = '0.0 Mbps (Timed out)';
        if (benchDtnStatus) benchDtnStatus.textContent = 'BUFFERING IN CUSTODY';
        if (benchDtnRate) benchDtnRate.textContent = '100% Retained in Store & Forward';
      } else {
        if (benchTcpStatus) benchTcpStatus.textContent = 'CONNECTING';
        if (benchTcpRate) benchTcpRate.textContent = '12.4 Mbps';
        if (benchDtnStatus) benchDtnStatus.textContent = 'CUSTODY OK';
        if (benchDtnRate) benchDtnRate.textContent = '98.8% Delivered';
      }
    }

    logPacket(level, message) {
      const stream = document.getElementById('simPacketStream');
      if (!stream) return;
      const entry = document.createElement('div');
      entry.className = `log-entry ${level}`;
      const now = new Date();
      const timeStr = `[${now.toTimeString().split(' ')[0]}]`;
      entry.textContent = `${timeStr} ${message}`;
      stream.appendChild(entry);
      stream.scrollTop = stream.scrollHeight;
    }

    startLoop() {
      let lastPacketTime = 0;
      let lastChartTime = 0;

      const loop = (timestamp) => {
        if (STATE.simulationRunning) {
          const delta = (0.008 * STATE.simSpeed);
          this.areosatAngle += delta * 0.15;
          this.polarAngle1 += delta * 1.6;
          this.polarAngle2 += delta * 1.4;
          this.marsRotation += delta * 0.15;
          this.phobosAngle += delta * 0.45;

          if (timestamp - lastPacketTime > 600 / Math.min(5, STATE.simSpeed)) {
            lastPacketTime = timestamp;
            this.generateSimulationPacket();
          }

          if (timestamp - lastChartTime > 250) {
            lastChartTime = timestamp;
            this.updateChartData();
          }

          this.updatePackets();
        }

        this.drawSimStage();
        this.drawTelemetryCharts();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    updateChartData() {
      // Calculate current fleet throughput based on Tau
      let currentThroughput = 1200;
      if (STATE.dustTau > 3.0) currentThroughput = 150;
      else if (STATE.dustTau > 1.5) currentThroughput = 650;
      if (STATE.solarConjunction) currentThroughput = 0;

      // Bit error rate
      const currentBer = STATE.dustTau > 3.0 ? 85 : Math.max(1, Math.round(STATE.dustTau * 12));

      // Buffer usage
      const currentBuffer = Math.min(500, Math.round(200 + STATE.dustTau * 45 + (STATE.solarConjunction ? 180 : 0)));

      this.chartHistory.throughput.push(currentThroughput + (Math.random() * 40 - 20));
      this.chartHistory.throughput.shift();

      this.chartHistory.ber.push(currentBer);
      this.chartHistory.ber.shift();

      this.chartHistory.buffer.push(currentBuffer);
      this.chartHistory.buffer.shift();
    }

    drawTelemetryCharts() {
      if (!this.chartCtx || !this.chartCanvas) return;
      const ctx = this.chartCtx;
      const rect = this.chartCanvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = 20; y < h; y += 30) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      const numPoints = this.chartHistory.throughput.length;
      const step = w / (numPoints - 1);

      // 1. Draw Custody Buffer Area (Amber)
      ctx.fillStyle = 'rgba(255, 154, 60, 0.12)';
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < numPoints; i++) {
        const val = this.chartHistory.buffer[i];
        const y = h - (val / 500) * (h - 20);
        ctx.lineTo(i * step, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // 2. Draw Throughput Curve (Cyan)
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < numPoints; i++) {
        const val = this.chartHistory.throughput[i];
        const y = h - (val / 1400) * (h - 20);
        if (i === 0) ctx.moveTo(0, y);
        else ctx.lineTo(i * step, y);
      }
      ctx.stroke();

      // 3. Draw BER Curve (Red dashed)
      ctx.strokeStyle = '#ff3366';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let i = 0; i < numPoints; i++) {
        const val = this.chartHistory.ber[i];
        const y = h - (val / 100) * (h - 20);
        if (i === 0) ctx.moveTo(0, y);
        else ctx.lineTo(i * step, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    generateSimulationPacket() {
      STATE.packetsSent++;
      const elSent = document.getElementById('statsPacketsSent');
      if (elSent) elSent.textContent = STATE.packetsSent;

      const isPolarOcculted = Math.sin(this.polarAngle1) < -0.3;
      const isLaserBlocked = STATE.dustTau > 3.2;

      let status = 'in_transit';
      if (isPolarOcculted || isLaserBlocked || STATE.solarConjunction) {
        if (STATE.selectedProtocol === 'tcp') {
          status = 'dropped';
          STATE.packetsDropped++;
          const elDrop = document.getElementById('statsPacketsDropped');
          if (elDrop) elDrop.textContent = STATE.packetsDropped;
        } else {
          status = 'buffered';
          STATE.packetsBuffered++;
          const elBuff = document.getElementById('statsPacketsBuffered');
          if (elBuff) elBuff.textContent = STATE.packetsBuffered;
        }
      } else {
        STATE.packetsDelivered++;
        const elDeliv = document.getElementById('statsPacketsDelivered');
        if (elDeliv) elDeliv.textContent = STATE.packetsDelivered;
        sfx.playPacketChirp();
      }

      STATE.animatedPackets.push({
        progress: 0,
        status: status,
        speed: 0.02 * Math.min(STATE.simSpeed, 3)
      });
    }

    updatePackets() {
      for (let i = STATE.animatedPackets.length - 1; i >= 0; i--) {
        const p = STATE.animatedPackets[i];
        p.progress += p.speed;
        if (p.progress >= 1) {
          STATE.animatedPackets.splice(i, 1);
        }
      }
    }

    drawSimStage() {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const marsR = 64;

      if (this.cameraView === 'horizon') {
        // Horizon Tracking View from Olympus Base
        this.drawHorizonView(ctx, w, h);
        return;
      }

      // Orbital Stage Rendering (Equatorial / Polar)
      // 1. Draw Day/Night Planetary Terminator on Mars
      const marsGrad = ctx.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, marsR);
      if (STATE.dustTau > 3.0) {
        marsGrad.addColorStop(0, '#e6804d');
        marsGrad.addColorStop(0.7, '#ad4b23');
        marsGrad.addColorStop(1, '#541c09');
      } else {
        marsGrad.addColorStop(0, '#ff7a45');
        marsGrad.addColorStop(0.6, '#b83416');
        marsGrad.addColorStop(1, '#3b1005');
      }
      ctx.fillStyle = marsGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, marsR, 0, Math.PI * 2);
      ctx.fill();

      // Atmospheric Limb Glow
      ctx.strokeStyle = STATE.dustTau > 2.0 ? 'rgba(255, 122, 69, 0.6)' : 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // 2. Areostationary Constellation Ring (3 satellites spaced 120° apart)
      const areoR = 200;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, areoR, 0, Math.PI * 2);
      ctx.stroke();

      const areoPositions = [
        { angle: this.areosatAngle, name: 'AREOSAT-ALPHA' },
        { angle: this.areosatAngle + (Math.PI * 2) / 3, name: 'AREOSAT-BETA' },
        { angle: this.areosatAngle + (Math.PI * 4) / 3, name: 'AREOSAT-GAMMA' }
      ];

      const satCoords = areoPositions.map((sat) => ({
        x: cx + Math.cos(sat.angle) * areoR,
        y: cy + Math.sin(sat.angle) * areoR,
        name: sat.name
      }));

      // Draw Inter-Satellite Laser Cross-Links (ISLs) forming a glowing triangle
      ctx.strokeStyle = STATE.dustTau > 3.0 ? 'rgba(0, 240, 255, 0.3)' : 'rgba(0, 240, 255, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(satCoords[0].x, satCoords[0].y);
      ctx.lineTo(satCoords[1].x, satCoords[1].y);
      ctx.lineTo(satCoords[2].x, satCoords[2].y);
      ctx.closePath();
      ctx.stroke();

      // Draw Areosat nodes & Antenna Beams
      satCoords.forEach((sat) => {
        // Antenna beam cone to Mars surface
        ctx.fillStyle = 'rgba(0, 240, 255, 0.04)';
        ctx.beginPath();
        ctx.moveTo(sat.x, sat.y);
        ctx.lineTo(cx - 30, cy);
        ctx.lineTo(cx + 30, cy);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(sat.x, sat.y, 6.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = '9px monospace';
        ctx.fillText(sat.name, sat.x + 9, sat.y - 4);
      });

      // 3. Polar Orbiters
      const polarR = 98;
      ctx.strokeStyle = 'rgba(255, 190, 59, 0.2)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, polarR, polarR * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();

      const polarX = cx + Math.cos(this.polarAngle1) * polarR;
      const polarY = cy + Math.sin(this.polarAngle1) * (polarR * 0.7);
      const isPolarOcculted = Math.sin(this.polarAngle1) < -0.2 && Math.abs(polarX - cx) < marsR;

      if (!isPolarOcculted) {
        ctx.fillStyle = '#ffbe3b';
        ctx.beginPath();
        ctx.arc(polarX, polarY, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffbe3b';
        ctx.fillText('MRO RELAY', polarX + 8, polarY + 10);
      } else {
        ctx.fillStyle = '#ff3366';
        ctx.beginPath();
        ctx.arc(polarX, polarY, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff3366';
        ctx.fillText('OCCULTED', polarX + 6, polarY);
      }

      // 4. Surface Stations
      const baseX = cx + Math.cos(this.marsRotation) * (marsR - 2);
      const baseY = cy + Math.sin(this.marsRotation) * (marsR - 2);
      ctx.fillStyle = '#00ffc2';
      ctx.beginPath();
      ctx.arc(baseX, baseY, 5, 0, Math.PI * 2);
      ctx.fill();

      // Raycast line from Surface Base to nearest Areosat
      const targetSat = satCoords[0];
      const distToCenter = this.distToSegment({ x: cx, y: cy }, { x: baseX, y: baseY }, { x: targetSat.x, y: targetSat.y });
      const isBeamBlocked = distToCenter < marsR * 0.95;

      ctx.strokeStyle = isBeamBlocked ? 'rgba(255, 51, 102, 0.4)' : (STATE.dustTau > 3.0 ? 'rgba(255, 154, 60, 0.5)' : 'rgba(0, 240, 255, 0.7)');
      ctx.setLineDash(isBeamBlocked ? [4, 4] : []);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(targetSat.x, targetSat.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // 5. Earth Directional Vector
      ctx.strokeStyle = STATE.solarConjunction ? 'rgba(255, 51, 102, 0.4)' : 'rgba(0, 255, 194, 0.7)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(satCoords[2].x, satCoords[2].y);
      ctx.lineTo(satCoords[2].x + 90, satCoords[2].y - 80);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = STATE.solarConjunction ? '#ff3366' : '#00ffc2';
      ctx.fillText(
        STATE.solarConjunction ? '⚡ CONJUNCTION BLACKOUT' : '→ DSN GOLDSTONE (EARTH)',
        satCoords[2].x + 95,
        satCoords[2].y - 80
      );

      // 6. Packet Particles
      for (let p of STATE.animatedPackets) {
        const px = targetSat.x + (baseX - targetSat.x) * p.progress;
        const py = targetSat.y + (baseY - targetSat.y) * p.progress;
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        if (p.status === 'dropped') ctx.fillStyle = '#ff3366';
        else if (p.status === 'buffered') ctx.fillStyle = '#ff9a3c';
        else ctx.fillStyle = '#00f0ff';
        ctx.fill();
      }
    }

    drawHorizonView(ctx, w, h) {
      // Ground-level Azimuth/Elevation sky tracker from Olympus Base
      ctx.fillStyle = '#0a0507';
      ctx.fillRect(0, 0, w, h);

      // Red Martian Horizon line
      ctx.fillStyle = '#3d120a';
      ctx.fillRect(0, h - 80, w, 80);
      ctx.strokeStyle = '#e04e28';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, h - 80);
      ctx.lineTo(w, h - 80);
      ctx.stroke();

      // Elevation rings in sky (30°, 60°, Zenith 90°)
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      [h - 160, h - 240, h - 320].forEach((elevY) => {
        ctx.beginPath();
        ctx.moveTo(0, elevY);
        ctx.lineTo(w, elevY);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '10px monospace';
      ctx.fillText('ZENITH (90°)', 14, h - 325);
      ctx.fillText('ELEVATION 60°', 14, h - 245);
      ctx.fillText('ELEVATION 30° (MIN CONTACT MASK)', 14, h - 165);
      ctx.fillText('LOCAL MARTIAN HORIZON (0°)', 14, h - 85);

      // Areosat Stationary at Zenith
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(w / 2, h - 310, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText('AREOSAT-ALPHA (FIXED AT ZENITH)', w / 2 + 14, h - 310);

      // Polar Orbiter Transit Across Sky
      const transitX = ((this.polarAngle1 / Math.PI) * w) % w;
      const transitY = h - 180 + Math.sin(this.polarAngle1) * 60;
      ctx.fillStyle = '#ffbe3b';
      ctx.beginPath();
      ctx.arc(transitX, transitY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText('MRO TRANSIT PASS', transitX + 10, transitY);
    }

    distToSegment(p, v, w) {
      const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
      if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
      let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
    }
  }

  // ============================================================================
  // 7. MARS MISSION OPERATIONS DASHBOARD & LINK BUDGET ENGINE
  // ============================================================================
  class MarsMocEngine {
    constructor() {
      this.globeCanvas = document.getElementById('marsGlobeCanvas');
      this.spectrumCanvas = document.getElementById('spectrumCanvas');

      this.globeCtx = this.globeCanvas ? this.globeCanvas.getContext('2d') : null;
      this.spectrumCtx = this.spectrumCanvas ? this.spectrumCanvas.getContext('2d') : null;

      this.marsRotation = 0;
      this.isDraggingGlobe = false;
      this.dragStartX = 0;
      this.selectedSite = 'jezero';

      this.sitesData = {
        jezero: {
          name: 'Jezero Crater Science Outpost',
          coords: '18.38° N, 77.58° E • Elevation: -2.5 km',
          airTemp: '-21°C / -84°C',
          groundTemp: '-12°C',
          pressure: '618 Pa (6.18 mbar)',
          tau: '0.45',
          flux: '520 W/m²',
          wind: '8.4 m/s (ESE 112°)'
        },
        olympus: {
          name: 'Olympus Mons Primary Colony Hub',
          coords: '18.65° N, 226.2° E • Elevation: +21.9 km Peak',
          airTemp: '-45°C / -98°C',
          groundTemp: '-38°C',
          pressure: '140 Pa (Thin Caldera)',
          tau: '0.22',
          flux: '560 W/m²',
          wind: '14.2 m/s (NW 315°)'
        },
        valles: {
          name: 'Valles Marineris Canyon Station',
          coords: '13.90° S, 59.20° W • Elevation: -7.0 km Depth',
          airTemp: '-14°C / -72°C',
          groundTemp: '-6°C',
          pressure: '890 Pa (High Density Trench)',
          tau: '0.62',
          flux: '480 W/m²',
          wind: '4.8 m/s (Channel Flow)'
        },
        gale: {
          name: 'Gale Crater Curiosity Basecamp',
          coords: '4.58° S, 137.44° E • Elevation: -4.5 km',
          airTemp: '-18°C / -78°C',
          groundTemp: '-10°C',
          pressure: '740 Pa',
          tau: '0.38',
          flux: '535 W/m²',
          wind: '6.1 m/s (E 90°)'
        },
        arcadia: {
          name: 'Arcadia Planitia Ice Extraction Camp',
          coords: '39.30° N, 189.70° E • Subsurface Glacial Ice',
          airTemp: '-32°C / -95°C',
          groundTemp: '-28°C',
          pressure: '580 Pa',
          tau: '0.30',
          flux: '440 W/m²',
          wind: '11.5 m/s (N 0°)'
        }
      };

      this.initEvents();
      this.initLinkBudget();
      this.startMocLoop();
    }

    initEvents() {
      // Hotspot Site selection chips
      document.querySelectorAll('.site-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          document.querySelectorAll('.site-chip').forEach((c) => c.classList.remove('active'));
          chip.classList.add('active');
          this.selectedSite = chip.getAttribute('data-site');
          this.updateSiteWeatherUI();
          sfx.playBeep(640, 0.05);
        });
      });

      // Globe dragging
      if (this.globeCanvas) {
        this.globeCanvas.addEventListener('mousedown', (e) => {
          this.isDraggingGlobe = true;
          this.dragStartX = e.clientX;
        });
        window.addEventListener('mousemove', (e) => {
          if (this.isDraggingGlobe) {
            const dx = e.clientX - this.dragStartX;
            this.dragStartX = e.clientX;
            this.marsRotation += dx * 0.008;
          }
        });
        window.addEventListener('mouseup', () => {
          this.isDraggingGlobe = false;
        });
      }
    }

    updateSiteWeatherUI() {
      const data = this.sitesData[this.selectedSite];
      if (!data) return;

      document.getElementById('weatherSiteTitle').textContent = `${data.name.toUpperCase()} METEOROLOGICAL TELEMETRY`;
      document.getElementById('weatherSiteCoords').textContent = data.coords;
      document.getElementById('currentSelectedSiteTag').textContent = `SITE: ${data.name.toUpperCase()}`;
      document.getElementById('wAirTemp').textContent = data.airTemp;
      document.getElementById('wGroundTemp').textContent = data.groundTemp;
      document.getElementById('wPressure').textContent = data.pressure;
      document.getElementById('wTau').textContent = `${STATE.dustTau} (Live)`;
      document.getElementById('wSolarFlux').textContent = `${Math.round(520 * Math.exp(-STATE.dustTau * 0.3))} W/m²`;
      document.getElementById('wWind').textContent = data.wind;
    }

    initLinkBudget() {
      const carrierSelect = document.getElementById('budgetCarrierSelect');
      const txSlider = document.getElementById('budgetTxPowerSlider');
      const dishSlider = document.getElementById('budgetDishDiameterSlider');

      const updateBudget = () => {
        const carrier = carrierSelect ? carrierSelect.value : 'laser';
        const txWatts = parseFloat(txSlider.value) || 50;
        const dishDia = parseFloat(dishSlider.value) || 3.0;

        document.getElementById('budgetTxPowerLabel').textContent = `${txWatts} W (${(10 * Math.log10(txWatts)).toFixed(1)} dBW)`;
        document.getElementById('budgetDishDiameterLabel').textContent = `${dishDia.toFixed(1)} meters dish`;

        // Physical Link Budget Calculation
        let wavelength = 1.55e-6; // 1550nm
        let freqGhz = 193400;
        let reqEbN0 = 4.0; // dB

        if (carrier === 'kaband') {
          wavelength = 0.00937; // 32 GHz
          freqGhz = 32;
          reqEbN0 = 3.5;
        } else if (carrier === 'xband') {
          wavelength = 0.0357; // 8.4 GHz
          freqGhz = 8.4;
          reqEbN0 = 2.8;
        } else if (carrier === 'uhf') {
          wavelength = 0.748; // 401 MHz
          freqGhz = 0.401;
          reqEbN0 = 2.0;
        }

        // Distance: Mean Mars-Earth 150M km
        const distMeters = STATE.earthMarsDistMkm * 1e9;
        const fsplDb = 20 * Math.log10((4 * Math.PI * distMeters) / wavelength);

        // Antenna Gain (Parabolic aperture efficiency ~ 0.55)
        const gainTxRx = 20 * Math.log10((Math.PI * dishDia) / wavelength) * 0.65;

        // Dust Attenuation
        let dustLossDb = 0;
        if (carrier === 'laser') dustLossDb = STATE.dustTau * 4.34;
        else if (carrier === 'kaband') dustLossDb = STATE.dustTau * 0.35;
        else dustLossDb = 0.1;

        // Margin calculation
        const txDbw = 10 * Math.log10(txWatts);
        const marginDb = (txDbw + gainTxRx - fsplDb * 0.35 - dustLossDb - reqEbN0).toFixed(1);

        document.getElementById('budgetFsplVal').textContent = `-${fsplDb.toFixed(1)} dB`;
        document.getElementById('budgetDustLossVal').textContent = `-${dustLossDb.toFixed(1)} dB`;
        document.getElementById('budgetGainVal').textContent = `+${gainTxRx.toFixed(1)} dBi`;

        const marginEl = document.getElementById('budgetMarginVal');
        const marginBar = document.getElementById('budgetMarginBar');

        if (marginDb > 3.0) {
          marginEl.textContent = `+${marginDb} dB (HEALTHY LOCK)`;
          marginEl.className = 'highlight-green';
          marginBar.style.width = `${Math.min(100, marginDb * 8)}%`;
          marginBar.className = 'budget-meter-fill fill-green';
        } else if (marginDb > 0) {
          marginEl.textContent = `+${marginDb} dB (MARGINAL)`;
          marginEl.className = 'highlight-amber';
          marginBar.style.width = '35%';
          marginBar.className = 'budget-meter-fill fill-amber';
        } else {
          marginEl.textContent = `${marginDb} dB (LINK DROPPED)`;
          marginEl.className = 'highlight-red';
          marginBar.style.width = '10%';
          marginBar.className = 'budget-meter-fill fill-red';
        }
      };

      carrierSelect?.addEventListener('change', updateBudget);
      txSlider?.addEventListener('input', updateBudget);
      dishSlider?.addEventListener('input', updateBudget);
      updateBudget();
    }

    startMocLoop() {
      let spectrumPhase = 0;

      const loop = () => {
        if (!this.isDraggingGlobe) {
          this.marsRotation += 0.003;
        }

        this.drawMarsGlobe();
        this.drawSpectrumWaterfall(spectrumPhase);
        spectrumPhase += 0.05;

        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    drawMarsGlobe() {
      if (!this.globeCtx || !this.globeCanvas) return;
      const ctx = this.globeCtx;
      const rect = this.globeCanvas.getBoundingClientRect();
      this.globeCanvas.width = rect.width * (window.devicePixelRatio || 1);
      this.globeCanvas.height = rect.height * (window.devicePixelRatio || 1);
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2 - 10;
      const radius = Math.min(w, h) * 0.38;

      ctx.clearRect(0, 0, w, h);

      // Mars Sphere Base
      const grad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, radius * 0.1, cx, cy, radius);
      grad.addColorStop(0, '#ff7a45');
      grad.addColorStop(0.5, '#c43d1a');
      grad.addColorStop(0.85, '#6b1b08');
      grad.addColorStop(1, '#240802');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Atmospheric Ring
      ctx.strokeStyle = STATE.dustTau > 3.0 ? 'rgba(255, 122, 69, 0.6)' : 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 1, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating Surface Features & Hotspots
      const hotspots = [
        { id: 'jezero', label: 'Jezero', lon: 0.4, lat: 0.3 },
        { id: 'olympus', label: 'Olympus Mons', lon: 1.6, lat: 0.2 },
        { id: 'valles', label: 'Valles Marineris', lon: 2.8, lat: -0.2 },
        { id: 'gale', label: 'Gale Crater', lon: 4.1, lat: -0.1 },
        { id: 'arcadia', label: 'Arcadia', lon: 5.2, lat: 0.5 }
      ];

      hotspots.forEach((spot) => {
        const netLon = spot.lon + this.marsRotation;
        const visible = Math.cos(netLon) > 0; // Front side of planet

        if (visible) {
          const sx = cx + Math.sin(netLon) * (radius * 0.85);
          const sy = cy - spot.lat * (radius * 0.75);

          const isSelected = spot.id === this.selectedSite;

          ctx.fillStyle = isSelected ? '#00f0ff' : '#ff9a3c';
          ctx.beginPath();
          ctx.arc(sx, sy, isSelected ? 6 : 4, 0, Math.PI * 2);
          ctx.fill();

          if (isSelected) {
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy, 10, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.fillStyle = '#f0f4fc';
          ctx.font = '10px monospace';
          ctx.fillText(spot.label, sx + 8, sy + 3);
        }
      });
    }

    drawSpectrumWaterfall(phase) {
      if (!this.spectrumCtx || !this.spectrumCanvas) return;
      const ctx = this.spectrumCtx;
      const rect = this.spectrumCanvas.getBoundingClientRect();
      this.spectrumCanvas.width = rect.width * (window.devicePixelRatio || 1);
      this.spectrumCanvas.height = rect.height * (window.devicePixelRatio || 1);
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      // Noise floor
      ctx.fillStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.fillRect(0, h - 25, w, 25);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(0, h - 25);
      ctx.lineTo(w, h - 25);
      ctx.stroke();

      // FFT Carrier Spikes:
      // UHF 401M (x = 15%), X-Band 8.4G (x = 40%), Ka-Band 32G (x = 65%), Optical 1550nm (x = 90%)
      const carriers = [
        { x: w * 0.15, color: '#ffbe3b', height: 45, label: '401M UHF' },
        { x: w * 0.40, color: '#00ffc2', height: 60, label: '8.4G X-BAND' },
        { x: w * 0.65, color: '#ff9a3c', height: 85, label: '32G Ka-BAND' },
        { x: w * 0.90, color: '#00f0ff', height: STATE.dustTau > 3.0 ? 15 : 100, label: '1550nm LASER' }
      ];

      carriers.forEach((c) => {
        const jitter = Math.sin(phase * 4 + c.x) * 4;
        const currentHeight = Math.max(5, c.height + jitter);

        // Carrier spike gradient
        const spikeGrad = ctx.createLinearGradient(c.x, h - 25 - currentHeight, c.x, h - 25);
        spikeGrad.addColorStop(0, c.color);
        spikeGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = spikeGrad;
        ctx.beginPath();
        ctx.moveTo(c.x - 12, h - 25);
        ctx.lineTo(c.x, h - 25 - currentHeight);
        ctx.lineTo(c.x + 12, h - 25);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = c.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(c.x - 12, h - 25);
        ctx.lineTo(c.x, h - 25 - currentHeight);
        ctx.lineTo(c.x + 12, h - 25);
        ctx.stroke();
      });
    }
  }

  class AresAiMentor {
    constructor() {
      this.stream = document.getElementById('chatMessageStream');
      this.input = document.getElementById('chatUserQuery');
      this.form = document.getElementById('chatInputForm');

      this.initEvents();
    }

    initEvents() {
      this.form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = this.input.value.trim();
        if (!text) return;
        this.addUserMessage(text);
        this.input.value = '';
        this.respondToQuery(text);
      });

      // Quick question triggers
      document.querySelectorAll('.quick-question-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const query = btn.getAttribute('data-query');
          this.addUserMessage(query);
          this.respondToQuery(query);
          sfx.playBeep(750, 0.05);
        });
      });

      // Audit buttons
      document.getElementById('mentorAuditCanvasBtn')?.addEventListener('click', () => {
        this.auditCurrentCanvasTopology();
      });
      document.getElementById('auditNetworkBtn')?.addEventListener('click', () => {
        // Switch to mentor tab and run audit
        document.querySelector('[data-tab="tab-mentor"]').click();
        this.auditCurrentCanvasTopology();
      });

      document.getElementById('mentorDustCheckBtn')?.addEventListener('click', () => {
        this.auditDustStormSurvival();
      });

      document.getElementById('clearChatBtn')?.addEventListener('click', () => {
        if (this.stream) {
          this.stream.innerHTML = '';
          this.addAiMessage('System log cleared. I am ready for your architectural inquiries, Engineer.');
        }
      });
    }

    addUserMessage(text) {
      const msg = document.createElement('div');
      msg.className = 'chat-msg user-msg';
      msg.innerHTML = `
        <div class="msg-avatar">👨‍🚀</div>
        <div class="msg-bubble">
          <div class="msg-sender font-mono">MISSION ENGINEER</div>
          <div class="msg-text"><p>${this.escapeHtml(text)}</p></div>
          <div class="msg-time font-mono">SOL_${STATE.sol}</div>
        </div>
      `;
      this.stream.appendChild(msg);
      this.stream.scrollTop = this.stream.scrollHeight;
    }

    addAiMessage(htmlContent) {
      const msg = document.createElement('div');
      msg.className = 'chat-msg ai-msg';
      msg.innerHTML = `
        <div class="msg-avatar">🤖</div>
        <div class="msg-bubble">
          <div class="msg-sender font-mono">ARES-AI • SENIOR PLANETARY ARCHITECT</div>
          <div class="msg-text">${htmlContent}</div>
          <div class="msg-time font-mono">SOL_${STATE.sol}_REALTIME</div>
        </div>
      `;
      this.stream.appendChild(msg);
      this.stream.scrollTop = this.stream.scrollHeight;
      sfx.playPacketChirp();
    }

    escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    respondToQuery(userQuery) {
      const q = userQuery.toLowerCase();

      // Show typing indicator
      const typingEl = document.createElement('div');
      typingEl.className = 'chat-msg ai-msg font-mono';
      typingEl.innerHTML = `<small style="color:var(--cyber-cyan); padding-left:48px;">ARES-AI evaluating telemetry models...</small>`;
      this.stream.appendChild(typingEl);
      this.stream.scrollTop = this.stream.scrollHeight;

      setTimeout(() => {
        typingEl.remove();

        if (q.includes('tcp') || q.includes('fail') || q.includes('handshake')) {
          this.addAiMessage(`
            <p><strong>Why Terrestrial TCP/IP Fails on Mars:</strong></p>
            <p>On Earth, TCP relies on rapid synchronous handshakes (SYN, SYN-ACK, ACK). Across the Earth-Mars gulf, the one-way speed of light delay (OWLT) ranges from <strong>3.03 to 22.28 minutes</strong>. A full 3-way handshake would take between <strong>6 to 45 minutes</strong> before transmitting even a single byte!</p>
            <ul>
              <li><strong>Retransmission Timers:</strong> Standard TCP timeouts are milliseconds. In deep space, every packet would immediately trigger false timeout retransmissions, leading to congestion collapse.</li>
              <li><strong>Sliding Windows:</strong> Mars-Earth Round-Trip Time (RTT) of 1,000+ seconds creates a Bandwidth-Delay Product (BDP) requiring multi-gigabyte TCP window buffers that standard OS kernels reject.</li>
              <li><strong>Intermittent Orbits:</strong> When Low Mars Orbiters pass behind Mars, the physical path breaks. TCP interprets loss as network congestion, cutting throughput to zero.</li>
            </ul>
            <p><strong>The Solution:</strong> Deploy the <strong>CCSDS Bundle Protocol (RFC 9171)</strong> with Delay-Tolerant Networking (DTN) which replaces end-to-end handshakes with hop-by-hop custody transfer.</p>
          `);
        } else if (q.includes('dtn') || q.includes('bundle') || q.includes('rfc 9171') || q.includes('custody')) {
          this.addAiMessage(`
            <p><strong>Delay-Tolerant Networking (DTN) &amp; Bundle Protocol (RFC 9171):</strong></p>
            <p>DTN operates as an overlay network above the transport layer. Its cornerstone is <strong>Store-and-Forward Custody Transfer</strong>:</p>
            <ol>
              <li>Data is encapsulated into self-contained <em>bundles</em> with long expiration TTLs (hours or days).</li>
              <li>When Node A transmits to Node B, Node B stores the bundle in <strong>non-volatile flash storage</strong> and assumes legal <em>custody</em>.</li>
              <li>Node A can now safely purge its buffer copy. Even if the link is severed 5 seconds later, the data is preserved on Node B!</li>
              <li>Node B uses <strong>Contact Graph Routing (CGR)</strong> to wait for the next deterministic orbital contact window before forwarding to Node C.</li>
            </ol>
            <p>NASA SCaN has flight-proven this protocol on the International Space Station and the PACE lunar mission.</p>
          `);
        } else if (q.includes('areostationary') || q.includes('geostationary') || q.includes('orbit')) {
          this.addAiMessage(`
            <p><strong>Areostationary (Mars Synchronous) Orbit Parameters:</strong></p>
            <p>Because Mars' mass is only 10.7% of Earth's and its gravity is <strong>38% (0.379g)</strong>, orbital altitudes differ drastically:</p>
            <ul>
              <li><strong>Orbital Radius ($r$):</strong> $\\sqrt[3]{\\frac{G M T^2}{4\\pi^2}} = 20,428 \\text{ km}$ from the center of Mars.</li>
              <li><strong>Surface Altitude:</strong> $20,428 - 3,389.5 = \\mathbf{17,032 \\text{ km}}$ (Earth's Geostationary is $35,786 \\text{ km}$).</li>
              <li><strong>Orbital Velocity:</strong> $1.448 \\text{ km/s}$ (vs Earth's $3.07 \\text{ km/s}$).</li>
              <li><strong>Global Ring:</strong> Exactly <strong>3 Areostationary satellites</strong> spaced at 120° intervals provide continuous 24/7 equatorial coverage of Martian settlements without tracking dish motion!</li>
            </ul>
          `);
        } else if (q.includes('laser') || q.includes('optical') || q.includes('ka-band') || q.includes('rf')) {
          this.addAiMessage(`
            <p><strong>Tradeoff Analysis: 1550nm Laser (DSOC) vs. 32 GHz Ka-Band RF:</strong></p>
            <p>Neither medium alone is sufficient; Mars requires a <strong>Hybrid Multi-Band Architecture</strong>:</p>
            <ul>
              <li><strong>Deep Space Optical Comms (1550nm Laser):</strong> Delivers massive bandwidth (1.2 to 10 Gbps) at fractional mass and power. However, it requires microradian pointing accuracy and is <em>completely extinguished</em> during Martian dust storms ($\tau > 3.0$).</li>
              <li><strong>Ka-Band Microwave RF (32 GHz):</strong> Delivers 150–300 Mbps. It effortlessly cuts through high atmospheric dust with minimal path loss ($< 2.5 \\text{ dB}$).</li>
            </ul>
            <p><strong>ARES Recommendation:</strong> Route real-time science telemetry and video via Optical Lasers during clear Sols, and automatically fall back to Ka-Band RF or stored DTN buffering during dust events!</p>
          `);
        } else if (q.includes('gravity') || q.includes('38%') || q.includes('0.38')) {
          this.addAiMessage(`
            <p><strong>Impact of Mars' 0.38g Gravity on Network Engineering:</strong></p>
            <ul>
              <li><strong>Taller Ground Masts:</strong> With lower structural gravitational loading, surface antenna towers and microwave repeaters can be erected <strong>2.6x taller</strong> than Earth equivalents with equal truss mass, extending line-of-sight past the 60km horizon!</li>
              <li><strong>Orbital Station-Keeping:</strong> The lower Martian gravitational gradient reduces the required station-keeping $\\Delta V$, prolonging satellite operational lifespans past 15+ Sols.</li>
              <li><strong>Tethered Aerostats:</strong> In the low gravity, tethered high-altitude balloons/aerostats equipped with optical transceivers can float above the dust layer.</li>
            </ul>
          `);
        } else if (q.includes('conjunction')) {
          this.addAiMessage(`
            <p><strong>Surviving Solar Conjunction (2-3 Week Blackout):</strong></p>
            <p>Every ~26 months, Mars and Earth align on opposite sides of the Sun. High-energy solar corona plasma severely corrupts radio frequencies below 10 GHz and scatters optical links.</p>
            <ul>
              <li>NASA SCaN mandates an <strong>autonomous flight command lock</strong>—no mission-critical uplink commands are accepted.</li>
              <li>The Mars local mesh network (Colonies, Orbiters, Science Stations) must operate <strong>100% self-sufficiently</strong>.</li>
              <li>Science data is accumulated in large non-volatile DTN custody stores on surface servers and forwarded once solar elongation exceeds 3.5°.</li>
            </ul>
          `);
        } else {
          // General Intelligent Response
          this.addAiMessage(`
            <p>Acknowledged, Engineer. Regarding <em>"${this.escapeHtml(userQuery)}"</em>:</p>
            <p>In planetary network engineering, all protocols must adhere to the <strong>CCSDS Space Data Systems</strong> framework. Key factors to evaluate for your scenario:</p>
            <ul>
              <li><strong>Link Budget Margins:</strong> Free-space path loss (FSPL) scales with distance squared ($L = (4\\pi d / \\lambda)^2$).</li>
              <li><strong>Atmospheric Opacity ($\tau$):</strong> Current simulated dust opacity is <strong>$\tau = ${STATE.dustTau}</strong>.</li>
              <li><strong>Protocol Choice:</strong> Currently running in <strong>${STATE.selectedProtocol.toUpperCase()}</strong> mode.</li>
            </ul>
            <p>Would you like me to <strong>audit your canvas network topology</strong> for vulnerabilities?</p>
          `);
        }
      }, 500);
    }

    auditCurrentCanvasTopology() {
      const nodeCount = STATE.nodes.length;
      const linkCount = STATE.links.length;

      if (nodeCount === 0) {
        this.addAiMessage(`
          <p>⚠️ <strong>Audit Warning: Canvas is Empty</strong></p>
          <p>Please deploy infrastructure components (Colonies, Orbiters, Earth DSN) onto the Mars Topology Canvas before requesting an audit!</p>
        `);
        return;
      }

      // Analyze graph properties
      const hasEarth = STATE.nodes.some((n) => n.type === 'dsn');
      const hasAreo = STATE.nodes.some((n) => n.type === 'areosat');
      const hasColony = STATE.nodes.some((n) => n.type === 'colony');
      const rovers = STATE.nodes.filter((n) => n.type === 'rover');
      const opticalLinks = STATE.links.filter((l) => l.medium === 'optical');
      const rfLinks = STATE.links.filter((l) => l.medium === 'kaband' || l.medium === 'uhf');

      let score = 100;
      const issues = [];
      const compliments = [];

      if (!hasEarth) {
        score -= 25;
        issues.push('<strong>Missing Interplanetary Gateway:</strong> No Earth DSN node connected. Martian settlements are entirely isolated from Earth mission control.');
      } else {
        compliments.push('Earth DSN Gateway present.');
      }

      if (!hasAreo) {
        score -= 20;
        issues.push('<strong>No Areostationary Backbone:</strong> Without an Areosat at 17,032 km, surface nodes must rely on brief 10-minute passes from Low Mars Orbiters.');
      } else {
        compliments.push('Areostationary constellation element deployed.');
      }

      if (opticalLinks.length > 0 && rfLinks.length === 0) {
        score -= 25;
        issues.push('<strong>Severe Single-Point-of-Failure:</strong> Network relies exclusively on optical laser comms with no RF backup. A Martian dust storm ($\tau > 2.5$) will completely blackout communications!');
      } else if (opticalLinks.length > 0 && rfLinks.length > 0) {
        compliments.push('Resilient Hybrid Optical + RF multi-tier routing architecture detected.');
      }

      if (STATE.selectedProtocol === 'tcp') {
        score -= 20;
        issues.push('<strong>Non-Compliant Protocol:</strong> Standard TCP/IP selected. Intermittent orbital occultation will result in continuous packet timeouts. Recommend toggling to <strong>DTN / Bundle Protocol</strong>.');
      } else {
        compliments.push('CCSDS RFC 9171 DTN Custody Transfer enabled.');
      }

      // Check isolated nodes
      const isolated = STATE.nodes.filter(
        (n) => !STATE.links.some((l) => l.source === n || l.target === n)
      );
      if (isolated.length > 0) {
        score -= isolated.length * 10;
        issues.push(`<strong>Isolated Nodes Detected:</strong> ${isolated.map((n) => n.label).join(', ')} have zero active links.`);
      }

      score = Math.max(10, Math.min(100, score));

      this.addAiMessage(`
        <p class="font-orbitron"><strong>ARES PLANETARY NETWORK AUDIT REPORT</strong></p>
        <p>Topology Resilience Rating: <strong class="${score >= 80 ? 'highlight-green' : score >= 50 ? 'highlight-amber' : 'highlight-red'}">${score} / 100 (${score >= 80 ? 'EXCELLENT' : score >= 50 ? 'MODERATE' : 'CRITICAL DEFICIENCIES'})</strong></p>
        
        ${compliments.length > 0 ? `<p><strong>Architectural Strengths:</strong><ul>${compliments.map((c) => `<li>✓ ${c}</li>`).join('')}</ul></p>` : ''}
        
        ${issues.length > 0 ? `<p><strong>Vulnerability &amp; Latency Flags:</strong><ul>${issues.map((i) => `<li>⚠️ ${i}</li>`).join('')}</ul></p>` : '<p>✓ No architectural flaws detected. Network exceeds CCSDS resilience standards!</p>'}
        
        <p><strong>Recommended Action:</strong> ${score < 80 ? 'Implement backup RF links and ensure areostationary relay coverage for deep canyon and surface stations.' : 'Architecture is validated for crewed Mars expedition operations.'}</p>
      `);
    }

    auditDustStormSurvival() {
      const opticalLinks = STATE.links.filter((l) => l.medium === 'optical');
      const rfLinks = STATE.links.filter((l) => l.medium === 'kaband');
      const fiberLinks = STATE.links.filter((l) => l.medium === 'fiber');

      if (opticalLinks.length > 0 && rfLinks.length === 0 && fiberLinks.length === 0) {
        this.addAiMessage(`
          <p class="highlight-red"><strong>STORM SURVIVAL SIMULATION: CATASTROPHIC FAILURE</strong></p>
          <p>Under a $\\tau = 4.5$ Global Dust Storm, your optical links will experience <strong>35+ dB attenuation</strong>, cutting throughput by 99.9%. With no Ka-Band RF or buried surface fiber tethers, colony communications will collapse completely.</p>
        `);
      } else {
        this.addAiMessage(`
          <p class="highlight-green"><strong>STORM SURVIVAL SIMULATION: RESILIENT PASS</strong></p>
          <p>While 1550nm laser links will degrade, your deployed <strong>${rfLinks.length} Ka-Band RF links</strong> and <strong>${fiberLinks.length} surface fiber tethers</strong> will maintain baseline telemetry at 150+ Mbps. Non-volatile DTN bundle storage ensures zero data loss!</p>
        `);
      }
    }
  }

  // ============================================================================
  // 9. LEARNING HUB, LESSON READER & CERTIFICATION QUIZ
  // ============================================================================
  class LearningAcademy {
    constructor() {
      this.quizQuestions = [
        {
          q: 'What is the surface gravity of Mars compared to Earth, and how does it influence antenna mast heights?',
          options: [
            '10% of Earth; requires guy wires every 5 meters',
            '38% of Earth; allows building antenna towers ~2.6x taller for the same structural load',
            '62% of Earth; has no effect on structural mast engineering',
            'Same as Earth; Mars gravity is nearly identical to Earth'
          ],
          correct: 1,
          explanation: 'Mars gravity is 3.721 m/s² (38% of Earth). Because structural gravitational load is 62% lower, engineers can construct masts approximately 2.6x taller than on Earth, drastically extending surface radio horizons.'
        },
        {
          q: 'Why does terrestrial TCP/IP fail across Earth-to-Mars interplanetary distances?',
          options: [
            'Martian solar radiation scrambles TCP header bits',
            '3-way handshake round-trip light time (6 to 44 minutes) triggers repeated connection timeouts and drops',
            'Mars uses an incompatible IP address format that Earth routers reject',
            'Fiber cables in space freeze due to absolute zero temperature'
          ],
          correct: 1,
          explanation: 'Standard TCP requires synchronous 3-way handshakes (SYN, SYN-ACK, ACK). Because the speed of light delay between Earth and Mars is 3 to 22 minutes (6 to 44 min RTT), standard TCP timers expire and disconnect the session.'
        },
        {
          q: 'At what altitude is an Areostationary Orbit (Mars-synchronous Clarke orbit) located above the Martian equator?',
          options: [
            '35,786 km (same as Earth Geostationary)',
            '17,032 km (orbital radius of 20,428 km)',
            '400 km (Low Mars Orbit)',
            '1,500,000 km (Earth-Sun L2 point)'
          ],
          correct: 1,
          explanation: 'Due to Mars\' lower planetary mass and 24h 39m 35s rotation period, an areostationary satellite sits at 17,032 km altitude (radius ~20,428 km), much lower than Earth\'s 35,786 km Clarke orbit.'
        },
        {
          q: 'What is the primary mechanism of Delay-Tolerant Networking (DTN) specified in CCSDS RFC 9171?',
          options: [
            'Immediate packet dropping on any link disruption',
            'Store-and-Forward Custody Transfer where intermediate nodes cache bundles in non-volatile storage',
            'Streaming raw UDP packets without any confirmation',
            'Continuous quantum teleportation of bits'
          ],
          correct: 1,
          explanation: 'DTN Bundle Protocol (RFC 9171) employs store-and-forward custody transfer. Nodes buffer bundles in non-volatile memory until deterministic contact windows re-open, avoiding packet loss.'
        },
        {
          q: 'How do Martian planet-wide dust storms affect Deep Space Optical (1550nm Laser) vs 32 GHz Ka-Band RF links?',
          options: [
            'Dust storms enhance laser comms by reflecting light',
            'Optical lasers suffer severe Mie scattering attenuation (up to 40 dB), while Ka-Band microwave penetrates with minimal loss',
            'Both frequencies are completely unaffected by atmospheric dust',
            'Ka-Band RF is completely blocked while laser passes effortlessly'
          ],
          correct: 1,
          explanation: 'Martian dust particles (1-3 μm) are close in size to optical infrared wavelengths (1.55 μm), causing strong Mie scattering. Optical links drop precipitously, whereas 32 GHz Ka-band microwave waves pass through with minor loss.'
        },
        {
          q: 'What event causes a 2-week total radio communication blackout between Earth and Mars approximately every 26 months?',
          options: [
            'Lunar Eclipse',
            'Solar Conjunction (Sun positioned directly between Earth and Mars)',
            'Phobos Transiting the Sun',
            'Mars Perihelion Opposition'
          ],
          correct: 1,
          explanation: 'Solar Conjunction occurs when the Sun stands directly between Earth and Mars. The Sun\'s intense ionized solar corona plasma disrupts and corrupts radio waves, enforcing an autonomous communications pause.'
        },
        {
          q: 'How many Areostationary satellites are mathematically required to provide continuous equatorial coverage across Mars?',
          options: [
            '1 satellite',
            'Exactly 3 satellites spaced 120° apart',
            '24 satellites like GPS',
            '100 micro-satellites'
          ],
          correct: 1,
          explanation: 'Just like Arthur C. Clarke\'s original geostationary orbit derivation for Earth, 3 satellites positioned in Areostationary orbit at 120° intervals provide 24/7 overlapping line-of-sight coverage of the entire Martian equatorial region.'
        },
        {
          q: 'What international body establishes interoperable communication standards for deep space exploration, including NASA and ISRO?',
          options: [
            'IEEE Computer Society',
            'CCSDS (Consultative Committee for Space Data Systems)',
            'Wi-Fi Alliance',
            'United Nations Postal Union'
          ],
          correct: 1,
          explanation: 'CCSDS (Consultative Committee for Space Data Systems), founded in 1982 by NASA, ESA, ISRO, and other agencies, develops the Blue Books and space communication standards used across interplanetary missions.'
        },
        {
          q: 'What geographic obstacle on Mars poses the largest line-of-sight horizontal RF shadow in the Solar System?',
          options: [
            'Olympus Mons (21.9 km elevation shield spanning ~600 km)',
            'Gale Crater rim',
            'Victoria Crater',
            'Elysium Planitia flatlands'
          ],
          correct: 0,
          explanation: 'Olympus Mons towers 21.9 km above Mars datum and spans 600 km wide. Its immense volcanic mass completely blocks direct horizontal line-of-sight RF signals, requiring orbital relays or high-altitude ridges.'
        },
        {
          q: 'What is Contact Graph Routing (CGR) in interplanetary satellite networks?',
          options: [
            'A social media friend graph algorithm',
            'A dynamic routing algorithm that calculates time-varying contact schedules based on predictable orbital ephemerides',
            'A random broadcast flooding protocol',
            'A hardware switch connector cable standard'
          ],
          correct: 1,
          explanation: 'In space networks, nodes move along known Keplerian orbital paths. Contact Graph Routing (CGR) exploits predictable orbital contact timetables to determine optimal multi-hop paths across time.'
        }
      ];

      this.lessonContent = {
        1: {
          title: 'Module 01: Earth vs. Mars: The Planetary Gap',
          content: `
            <h4>The Physical Realities of Deep Space Networking</h4>
            <p>Terrestrial networking thrives on abundant bandwidth, microsecond round-trip latencies, global fiber networks, and continuous GPS clock synchronization. In contrast, Mars represents an entirely uncarved frontier:</p>
            <ul>
              <li><strong>Speed-of-Light Propagation:</strong> At the closest approach (perihelic opposition), Mars is 54.6 million km from Earth, yielding a One-Way Light Time (OWLT) of <strong>3.03 minutes</strong>. At aphelion conjunction, the distance widens to 401 million km, extending OWLT to <strong>22.28 minutes</strong>. Round-Trip Time (RTT) ranges between 6 to 45 minutes!</li>
              <li><strong>Zero Legacy Infrastructure:</strong> Mars possesses no undersea fiber optic backbones, no cellular towers, and no GPS constellation. Every communications link must be designed, transported, and deployed from scratch.</li>
              <li><strong>Autonomous Networking:</strong> Because real-time human intervention from Earth is impossible with an 8-to-40 minute control loop, Martian networks must be fully self-healing, utilizing intelligent local routing.</li>
            </ul>
          `
        },
        2: {
          title: 'Module 02: Delay-Tolerant Networking & DTN',
          content: `
            <h4>The CCSDS Bundle Protocol (RFC 9171 / RFC 5050)</h4>
            <p>To overcome planetary latency and orbital occultation, space engineers developed Delay-Tolerant Networking (DTN). While TCP expects an immediate ACK, DTN embraces <strong>asynchronous custody transfer</strong>:</p>
            <ul>
              <li><strong>Bundles vs. Packets:</strong> Data is packaged into autonomous bundles carrying long time-to-live (TTL) envelopes and cryptographic integrity checks.</li>
              <li><strong>Custody Acceptance:</strong> Intermediate nodes take ownership of bundles into non-volatile storage. The previous node only frees its buffer once custody is confirmed.</li>
              <li><strong>Contact Graph Routing (CGR):</strong> Because satellite orbits around Mars are deterministic and predictable via Keplerian ephemeris, routers know precisely when the next 12-minute pass will occur, queueing bundles accordingly.</li>
            </ul>
          `
        },
        3: {
          title: 'Module 03: Orbital Mechanics in 38% Gravity',
          content: `
            <h4>Areostationary vs. Low Mars Orbit Constellations</h4>
            <p>Mars has a surface gravity of 3.721 m/s² (38% of Earth) and a mass of $6.417 \\times 10^{23} \\text{ kg}$. This modifies satellite mechanics:</p>
            <ul>
              <li><strong>Areostationary Altitude:</strong> $17,032 \\text{ km}$ above the equator. A satellite at this altitude completes one orbit in exactly one Martian Sol ($24\\text{h } 39\\text{m } 35\\text{s}$), remaining fixed over a Martian colony.</li>
              <li><strong>Low Mars Orbit (LMO):</strong> Typically placed at $350 - 500 \\text{ km}$ altitude with an orbital period of $\\sim 118 \\text{ minutes}$. While closer (lower path loss), an LMO satellite only remains in contact with a surface station for 8 to 15 minutes before setting behind the horizon.</li>
              <li><strong>Three-Satellite Ring:</strong> A triangular constellation of 3 Areosats at 120° provides 100% continuous equatorial surface coverage.</li>
            </ul>
          `
        },
        4: {
          title: 'Module 04: Atmospheric & Topographic Attenuation',
          content: `
            <h4>Dust Storm Scattering & Planetary Geography</h4>
            <p>Mars has a thin carbon dioxide atmosphere (~610 Pa), but dust storms present a severe engineering barrier:</p>
            <ul>
              <li><strong>Optical Depth (Tau $\\tau$):</strong> Clear Martian skies have $\\tau \\approx 0.2 - 0.5$. Planet-encircling storms elevate $\\tau$ past 5.0 to 6.0, extinguishing over 99% of optical laser links.</li>
              <li><strong>Topographic Relief:</strong> Mars hosts extreme elevation differences. Olympus Mons rises 21.9 km high, creating a 600km RF shadow. Valles Marineris canyon is 7 km deep, requiring rim-mounted repeaters to eliminate multipath fading.</li>
            </ul>
          `
        },
        5: {
          title: 'Module 05: Deep Space Optical vs. Ka-Band RF',
          content: `
            <h4>Comparing 1550nm Laser DSOC with 32 GHz Microwave</h4>
            <p>NASA's Deep Space Optical Communications (DSOC) experiment demonstrated over 267 Mbps across 30+ million km. How do laser and radio compare?</p>
            <ul>
              <li><strong>Optical (1550nm):</strong> Extremely high bandwidth (1 to 10+ Gbps), compact aperture size, low power. Vulnerable to atmospheric dust and pointing jitter.</li>
              <li><strong>Ka-Band (32 GHz):</strong> 150 Mbps, all-weather penetration through dust storms. Requires larger 3m+ high-gain parabolic dishes.</li>
              <li><strong>Optimal Hybrid Architecture:</strong> Use optical laser for trunk backbones between orbiters, and redundant Ka-Band RF for surface-to-orbit links during weather events.</li>
            </ul>
          `
        },
        6: {
          title: 'Module 06: Interplanetary Standards & DSN',
          content: `
            <h4>CCSDS Blue Books & Deep Space Network Heritage</h4>
            <p>Interoperability across NASA, ESA, ISRO, and commercial entities requires standardized protocols:</p>
            <ul>
              <li><strong>CCSDS 734.2-B-1:</strong> Bundle Protocol Specification for Space Communications.</li>
              <li><strong>CCSDS 211.0-B-6:</strong> Proximity-1 Space Link Protocol used by rovers (Perseverance, Curiosity) to transmit to overhead orbiters.</li>
              <li><strong>NASA Deep Space Network (DSN):</strong> 70-meter giant antennas in Goldstone, Madrid, and Canberra providing 360° celestial coverage.</li>
            </ul>
          `
        }
      };

      this.initEvents();
      this.renderQuizQuestion();
    }

    initEvents() {
      // Sub-tab switching in Academy
      document.querySelectorAll('.academy-subtab').forEach((tab) => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.academy-subtab').forEach((t) => t.classList.remove('active'));
          document.querySelectorAll('.academy-subview').forEach((v) => v.classList.remove('active'));
          tab.classList.add('active');
          const target = tab.getAttribute('data-subtab');
          document.getElementById(target)?.classList.add('active');
          sfx.playBeep(680, 0.05);
        });
      });

      // Open Lesson Modals
      document.querySelectorAll('.open-lesson-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.openLessonModal(id);
        });
      });

      document.getElementById('closeLessonModalBtn')?.addEventListener('click', () => {
        document.getElementById('lessonReaderModal')?.classList.remove('active');
      });
      document.getElementById('finishLessonBtn')?.addEventListener('click', () => {
        document.getElementById('lessonReaderModal')?.classList.remove('active');
        sfx.playLinkConnect();
      });

      // Quiz navigation
      document.getElementById('quizNextBtn')?.addEventListener('click', () => this.nextQuizQuestion());
      document.getElementById('quizPrevBtn')?.addEventListener('click', () => this.prevQuizQuestion());

      // Certificate generation
      document.getElementById('generateCertBtn')?.addEventListener('click', () => {
        const nameInput = document.getElementById('studentCertName');
        STATE.studentName = nameInput.value.trim() || 'Cadet Engineer';
        this.renderCertificate();
        document.getElementById('certificateModal')?.classList.add('active');
        sfx.playLinkConnect();
      });

      document.getElementById('closeCertModalBtn')?.addEventListener('click', () => {
        document.getElementById('certificateModal')?.classList.remove('active');
      });

      document.getElementById('downloadCertPngBtn')?.addEventListener('click', () => {
        this.downloadCertificatePNG();
      });

      document.getElementById('printCertBtn')?.addEventListener('click', () => {
        window.print();
      });

      // Mission Modal
      document.getElementById('openMissionModalBtn')?.addEventListener('click', () => {
        document.getElementById('missionReportModal')?.classList.add('active');
        sfx.playBeep(700, 0.06);
      });
      document.getElementById('closeReportModalBtn')?.addEventListener('click', () => {
        document.getElementById('missionReportModal')?.classList.remove('active');
      });
      document.getElementById('dismissReportBtn')?.addEventListener('click', () => {
        document.getElementById('missionReportModal')?.classList.remove('active');
      });

      // Audio Toggle Button
      const audioBtn = document.getElementById('audioToggleBtn');
      audioBtn?.addEventListener('click', () => {
        STATE.audioEnabled = !STATE.audioEnabled;
        audioBtn.querySelector('.btn-text').textContent = STATE.audioEnabled ? 'AUDIO ON' : 'AUDIO MUTED';
        audioBtn.querySelector('.btn-icon').textContent = STATE.audioEnabled ? '🔊' : '🔇';
        if (STATE.audioEnabled) sfx.playBeep(880, 0.08);
      });
    }

    openLessonModal(id) {
      const lesson = this.lessonContent[id];
      if (!lesson) return;
      document.getElementById('lessonReaderTitle').textContent = lesson.title;
      document.getElementById('lessonReaderBody').innerHTML = lesson.content;
      document.getElementById('lessonReaderModal')?.classList.add('active');
      sfx.playBeep(720, 0.06);
    }

    renderQuizQuestion() {
      const qData = this.quizQuestions[STATE.quizIndex];
      const card = document.getElementById('quizQuestionCard');
      const textEl = document.getElementById('quizQuestionText');
      const listEl = document.getElementById('quizOptionsList');
      const feedbackBox = document.getElementById('quizFeedbackBox');
      const currentIdxEl = document.getElementById('quizCurrentIdx');
      const progressBar = document.getElementById('quizProgressBar');
      const scoreValEl = document.getElementById('quizScoreVal');
      const prevBtn = document.getElementById('quizPrevBtn');
      const nextBtn = document.getElementById('quizNextBtn');

      if (!qData || !textEl || !listEl) return;

      currentIdxEl.textContent = STATE.quizIndex + 1;
      scoreValEl.textContent = STATE.quizScore;
      progressBar.style.width = `${((STATE.quizIndex + 1) / 10) * 100}%`;
      prevBtn.disabled = STATE.quizIndex === 0;

      textEl.textContent = `${STATE.quizIndex + 1}. ${qData.q}`;
      listEl.innerHTML = '';

      const userAnswer = STATE.userAnswers[STATE.quizIndex];

      qData.options.forEach((optText, idx) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option-btn';
        if (userAnswer !== null) {
          if (idx === qData.correct) btn.classList.add('correct');
          else if (idx === userAnswer) btn.classList.add('wrong');
        }

        btn.innerHTML = `
          <span class="opt-idx">${String.fromCharCode(65 + idx)}</span>
          <span class="opt-text">${optText}</span>
        `;

        btn.addEventListener('click', () => {
          if (STATE.userAnswers[STATE.quizIndex] === null) {
            this.handleQuizAnswer(idx);
          }
        });

        listEl.appendChild(btn);
      });

      if (userAnswer !== null) {
        feedbackBox.style.display = 'block';
        const isCorrect = userAnswer === qData.correct;
        document.getElementById('feedbackTitle').textContent = isCorrect ? '✓ CORRECT ANSWER' : '✗ INCORRECT';
        document.getElementById('feedbackTitle').className = `feedback-title font-mono ${isCorrect ? 'highlight-green' : 'highlight-red'}`;
        document.getElementById('feedbackDesc').textContent = qData.explanation;
      } else {
        feedbackBox.style.display = 'none';
      }

      if (STATE.quizIndex === 9) {
        nextBtn.textContent = 'Finish & View Score';
      } else {
        nextBtn.textContent = 'Next Question →';
      }
    }

    handleQuizAnswer(selectedIdx) {
      const qData = this.quizQuestions[STATE.quizIndex];
      STATE.userAnswers[STATE.quizIndex] = selectedIdx;

      if (selectedIdx === qData.correct) {
        STATE.quizScore++;
        sfx.playLinkConnect();
      } else {
        sfx.playAlert();
      }

      this.renderQuizQuestion();
    }

    nextQuizQuestion() {
      if (STATE.quizIndex < 9) {
        STATE.quizIndex++;
        this.renderQuizQuestion();
        sfx.playBeep(640, 0.04);
      } else {
        // Complete quiz
        this.showQuizResults();
      }
    }

    prevQuizQuestion() {
      if (STATE.quizIndex > 0) {
        STATE.quizIndex--;
        this.renderQuizQuestion();
        sfx.playBeep(580, 0.04);
      }
    }

    showQuizResults() {
      document.getElementById('quizQuestionCard').style.display = 'none';
      document.querySelector('.quiz-controls').style.display = 'none';
      const resultsCard = document.getElementById('quizResultsCard');
      resultsCard.style.display = 'flex';

      const pct = Math.round((STATE.quizScore / 10) * 100);
      document.getElementById('resultsScore').textContent = `${STATE.quizScore} / 10 (${pct}%)`;

      if (pct >= 70) {
        document.getElementById('resultsTitle').textContent = 'CERTIFICATION PASSED!';
        document.getElementById('resultsTitle').className = 'font-orbitron highlight-green';
        sfx.playLinkConnect();
      } else {
        document.getElementById('resultsTitle').textContent = 'EXAM COMPLETED (PROVISIONAL)';
        document.getElementById('resultsTitle').className = 'font-orbitron highlight-amber';
      }
    }

    renderCertificate() {
      const canvas = document.getElementById('certCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = 900;
      const h = 600;

      // Dark sci-fi aerospace certificate background
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, w, h);

      // Gold & Cyan borders
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, w - 40, h - 40);

      ctx.strokeStyle = '#ff9a3c';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(26, 26, w - 52, h - 52);

      // Corner tech brackets
      const drawBracket = (x, y, dx, dy) => {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + dx * 24, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + dy * 24);
        ctx.stroke();
      };
      drawBracket(34, 34, 1, 1);
      drawBracket(w - 34, 34, -1, 1);
      drawBracket(34, h - 34, 1, -1);
      drawBracket(w - 34, h - 34, -1, -1);

      // Header Banner
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 22px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MARSNET LAB • PLANETARY INTERNET INITIATIVE', w / 2, 85);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px "Space Grotesk", sans-serif';
      ctx.fillText('CONSULTATIVE COMMITTEE FOR SPACE DATA SYSTEMS (CCSDS) COMPLIANT', w / 2, 110);

      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px Orbitron, sans-serif';
      ctx.fillText('CERTIFICATE OF PLANETARY NETWORK ENGINEERING', w / 2, 170);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'italic 16px "Space Grotesk", sans-serif';
      ctx.fillText('This credential officially certifies that', w / 2, 220);

      // Recipient Name
      ctx.fillStyle = '#ff9a3c';
      ctx.font = 'bold 36px "Space Grotesk", sans-serif';
      ctx.fillText(STATE.studentName, w / 2, 275);

      // Underline
      ctx.strokeStyle = 'rgba(255, 154, 60, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 200, 290);
      ctx.lineTo(w / 2 + 200, 290);
      ctx.stroke();

      // Body text
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '15px "Space Grotesk", sans-serif';
      ctx.fillText(
        'has successfully demonstrated proficiency in Deep Space Delay-Tolerant Networking (RFC 9171),',
        w / 2,
        335
      );
      ctx.fillText(
        'Areostationary Constellation Design, Optical Attenuation Physics, and Interplanetary Routing.',
        w / 2,
        360
      );

      // Exam score
      ctx.fillStyle = '#00ffc2';
      ctx.font = 'bold 18px "JetBrains Mono", monospace';
      ctx.fillText(`EXAM SCORE: ${STATE.quizScore} / 10 (${STATE.quizScore * 10}%) • DISTINCTION`, w / 2, 405);

      // Seals and Signatures
      const dateStr = `SOL ${STATE.sol} • ${new Date().toISOString().split('T')[0]}`;
      ctx.fillStyle = '#64748b';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`ISSUED: ${dateStr}`, 60, 520);
      ctx.fillText('VERIFICATION HASH: 0x9F4A-CCSDS-MARS-2026', 60, 540);

      // Digital Seal
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w - 120, 500, 42, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 10px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MARSNET', w - 120, 495);
      ctx.fillText('VERIFIED', w - 120, 510);
    }

    downloadCertificatePNG() {
      const canvas = document.getElementById('certCanvas');
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `MarsNet_Certificate_${STATE.studentName.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      sfx.playBeep(900, 0.1);
    }
  }

  // ============================================================================
  // 10. PRIMARY TAB NAVIGATION CONTROLLER
  // ============================================================================
  function initTabNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetId = tab.getAttribute('data-tab');
        tabs.forEach((t) => t.classList.remove('active'));
        contents.forEach((c) => c.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(targetId)?.classList.add('active');

        // Resize canvases if tab opened
        if (targetId === 'tab-builder' && window.networkBuilder) {
          window.networkBuilder.resize();
        }
        if (targetId === 'tab-simulator' && window.simEngine) {
          window.simEngine.resize();
        }

        sfx.playBeep(620, 0.04);
      });
    });
  }

  // ============================================================================
  // 11. INITIALIZATION ON DOM READY
  // ============================================================================
  window.addEventListener('DOMContentLoaded', () => {
    initStarfield();
    initTelemetryClock();
    initTabNavigation();

    window.networkBuilder = new NetworkBuilder();
    window.simEngine = new OrbitSignalSimulator();
    window.mocEngine = new MarsMocEngine();
    window.aresMentor = new AresAiMentor();
    window.academy = new LearningAcademy();

    console.log('%c[MARSNET LAB] Interplanetary Network System Online.', 'color:#00f0ff; font-weight:bold; font-size:14px;');
  });

})();
