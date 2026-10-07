# MarsNet Lab: AI-Powered Dashboard for Designing Mars' Future Internet Infrastructure

> **Aligned with NASA SCaN, CCSDS Interplanetary Standards, and ISRO Mars Orbiter Mission Heritage**

---

## 🚀 Overview

**MarsNet Lab** is a professional, feature-rich planetary network engineering and mission operations dashboard built with modern HTML5, Vanilla CSS3, and JavaScript (ES6+). It translates terrestrial networking principles into deep space realities, helping students, aerospace researchers, and future space engineers understand how Martian environmental factors—including **38% Earth gravity**, **planet-wide dust storms**, **deep canyon topography**, and **3-to-22 minute light travel delays**—fundamentally reshape communications infrastructure.

---

## 🌟 Upgraded Modules & Capabilities

### 1. 🛰️ Interactive Mars Network Builder
- **Drag-and-Drop Infrastructure Palette**:
  - **Surface Terminals**: Olympus Primary Colony Hub, Jezero Science Outpost, Valles Marineris Canyon Station (7 km depth), Autonomous Exploration Rovers.
  - **Orbital Relays**: Areostationary Satellites (17,032 km Clarke orbit), Low Mars Orbiters (LMO Polar Relays at ~400 km), and Earth Deep Space Network (DSN) Goldstone/Madrid/Canberra gateways.
- **Multi-Band Link Selection**:
  - **1550nm Laser Comms (DSOC)**: 1.2+ Gbps high-bandwidth optical trunk lines.
  - **Ka-Band RF (32 GHz Microwave)**: 150 Mbps all-weather dust-penetrating microwave links.
  - **UHF Proximity-1 (401 MHz)**: Low-power omnidirectional rover proximity links.
  - **Surface Fiber Optic Tethers**: 10 Gbps zero-latency buried lines immune to atmospheric weather.
- **Protocol Stack Toggle**: Switch between **CCSDS RFC 9171 DTN Bundle Protocol** (store-and-forward custody transfer) and **Standard TCP/IP** to witness why synchronous 3-way handshakes fail in deep space.
- **Mission Architecture Presets**: Load *Minimal Basecamp*, *3-Areosat Global Ring*, or *Resilient Hybrid Optical + RF Mesh*.
- **Export Topology**: Download full network designs as JSON schematics.

---

### 2. ⚡ Advanced Keplerian Dynamics & Occultation Simulator
- **Multi-Perspective Camera System**:
  - 🪐 **Equatorial Orbital Plane (Top-Down)**: Tracks the full 3-Areosat equilateral triangle constellation at 17,032 km with glowing inter-satellite laser crosslinks (ISLs).
  - 🛰️ **Polar Relay Inclination & Swath**: Visualizes high-inclination orbiters sweeping over Martian poles with active antenna field-of-view (FOV) ground cones.
  - 🔭 **Olympus Base Horizon Tracking**: Ground-up sky tracker displaying local 0° horizon, elevation masks (30°, 60°), and zenith transit passes.
- **Real-Time Line-of-Sight (LOS) Raycasting & Occultation**:
  - Mathematical ray-intersection testing against the Mars planetary sphere ($R_M = 3389.5\text{ km}$). When an orbiter passes behind Mars, line-of-sight is severed with visual occultation tags.
- **Live Telemetry Strip Charts (Canvas Rendered)**:
  - Continuously streams **Throughput (Mbps)**, **Bit Error Rate (BER)**, and **DTN Custody Buffer (MB)** in real time.
- **Active Data Bundle Manifest Table**:
  - Live custody queue displaying real deep-space data bundles in transit (payload names, sizes, origin, custodian, and hop status).
  - **"🚀 DISPATCH TEST BUNDLE"** button: Triggers custom high-priority science data packages across the constellation.
- **Tactical Scenario Injection Deck**:
  - *2018-Scale Global Dust Storm* ($\tau = 5.4$, 99% optical blackout, automatic RF failover).
  - *Solar Conjunction Blackout* (2-week Earth link freeze, autonomous local mesh custody mode).
  - *Phobos Transit RF Shadow* (180s orbital eclipse).
  - *Restore Clear Sol Nominal* ($\tau = 0.2$).

---

### 3. 🪐 Mars Mission Operations Center (MOC) Dashboard
- **Interactive 2.5D Rotating Mars Surface Operations Globe**:
  - Interactive Canvas with smooth mouse-drag planetary rotation, atmospheric limb glow, and day/night terminator line.
  - Clickable surface landing sites:
    - 🔬 **Jezero Crater** (Perseverance rover)
    - 🏛️ **Olympus Base** (Colony backbone hub)
    - 🏔️ **Valles Marineris** (7 km canyon station)
    - 🧪 **Gale Crater** (Curiosity basecamp)
    - ⛏️ **Arcadia Planitia** (Ice extraction facility)
  - **Live Meteorological Telemetry Feeds**: Air Temperature min/max, Ground Temp, Atmospheric Pressure (Pa), Dust Opacity ($\tau$), Solar Flux ($W/m^2$), and Wind speed & heading.
- **Deep Space Link Budget Calculator**:
  - Real aerospace RF link budget formulas: Transmitter power ($P_t$), Antenna dish diameter (0.5m to 34m), Carrier selection (UHF 401M, X-Band 8.4G, Ka-Band 32G, 1550nm Laser), Free Space Path Loss ($FSPL$), Dust Attenuation, and live **Link Margin ($E_b/N_0$ in dB)** with visual status meter.
- **RF Spectrum Waterfall & Carrier FFT Display**:
  - Animated frequency spectrum showing live peaks at 401 MHz, 8.4 GHz, 32 GHz, and 1550 nm with FFT noise floor, carrier lock indicators, and simulated Doppler shift.
- **Constellation Fleet Matrix**:
  - Real-time fleet health cards for 6 active space assets: Areosat Alpha, Areosat Beta, Areosat Gamma, MRO Relay, Perseverance Rover, and Olympus Base Hub (battery %, solar array power, custody memory, next contact pass).

---

### 4. 🤖 ARES AI Network Mentor
- **Planetary Network Architect**: Interactive intelligent advisor grounded in CCSDS standards, NASA SCaN research, and planetary communication physics.
- **One-Click Topology Auditor**: Evaluates the user's canvas network in real time, checking for single-points-of-failure, missing interplanetary gateways, protocol compliance, and assigns a **Resilience Rating (0 to 100)**.
- **Storm Survival Stress Test**: Simulates whether the current canvas architecture can survive a $\tau = 4.5$ planet-encircling dust storm.
- **Interactive Technical Q&A**: Answers deep questions about Delay-Tolerant Networking, Contact Graph Routing, areostationary constellations, and solar conjunctions.

---

### 5. 🎓 Learning Hub & Certification Academy
- **6 Curriculum Modules**: Complete visual lessons covering interplanetary latency, DTN RFC 9171, areostationary orbits, dust attenuation, optical vs. RF, and CCSDS standards.
- **10-Question Certification Exam**: Interactive quiz with instant technical feedback and scoring.
- **Official Printable Certificate**: Generates a high-resolution, custom verified **Certificate of Planetary Network Engineering** rendered on `<canvas>` with official seals and download/print capabilities.

---

## 🛠️ Technology Stack
- **HTML5**: Semantic, accessible markup with modal dialogues and canvas elements.
- **Vanilla CSS3**: Futuristic aerospace HUD aesthetic, glassmorphism, responsive grid/flexbox layouts, scanning lines, and glowing telemetry indicators.
- **Vanilla JavaScript (ES6+)**: Custom canvas rendering engine, orbital physics integrator, Web Audio API procedural sound synthesizer, and dynamic graph analyzer.
- **Zero External Runtime Dependencies**: Fully self-contained application that runs locally in any modern browser without npm build steps.

---

## 💻 Quick Start & Running Locally

1. Open `index.html` directly in any modern web browser:
   ```bash
   Start-Process "index.html"
   ```
2. Or serve via any local static server:
   ```bash
   python -m http.server 8000
   ```
   Navigate to `http://localhost:8000`.
