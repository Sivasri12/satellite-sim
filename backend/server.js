const express = require("express");
const { WebSocketServer } = require("ws");
const satelliteJS = require("satellite.js");
const path = require("path");
const { generateDebris, updateDebris } = require("./satellites");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Start HTTP server
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// WebSocket on same server
const wss = new WebSocketServer({ server });

// Generate initial debris
let debris = generateDebris(50);

// Load 50 active satellites from CelesTrak (TLE text parsing)
let realSats = [];
async function loadSatellites() {
  try {
    const res = await fetch("https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=2");
    const text = await res.text();

    const lines = text.split("\n").filter(l => l.trim() !== "");
    realSats = [];
    for (let i = 0; i < lines.length; i += 3) {
      const name = lines[i].trim();
      const tle1 = lines[i + 1].trim();
      const tle2 = lines[i + 2].trim();
      const satrec = satelliteJS.twoline2satrec(tle1, tle2);
      realSats.push({ id: i / 3, name, satrec });
      if (realSats.length >= 50) break; // limit to 50
    }

    console.log("Satellites loaded:", realSats.length);
  } catch (err) {
    console.error("Error loading satellites:", err);
  }
}
loadSatellites();

// Convert TLE to 3D position
function getPosition(satrec) {
  const now = new Date();
  const gmst = satelliteJS.gstime(now);
  const posVel = satelliteJS.propagate(satrec, now);
  if (!posVel.position) return { x: 0, y: 0, z: 0 };
  const geo = satelliteJS.eciToGeodetic(posVel.position, gmst);
  const R = 5; // Earth radius in Three.js units
  return {
    x: (geo.longitude / 180) * Math.PI * R,
    y: (geo.latitude / 90) * R,
    z: geo.height / 1000 + R
  };
}

// Check for collision
function predictCollision(pos, debrisList) {
  for (let d of debrisList) {
    const dx = pos.x - d.position.x;
    const dy = pos.y - d.position.y;
    const dz = pos.z - d.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (distance < 2) return true;
  }
  return false;
}

// Generate AI voice command
function generateAICommand(pos, debrisList, satId) {
  let dx = 0, dz = 0;
  for (let d of debrisList) {
    const diffX = pos.x - d.position.x;
    const diffZ = pos.z - d.position.z;
    const distance = Math.sqrt(diffX * diffX + diffZ * diffZ);
    if (distance < 2) {
      dx = (diffX >= 0) ? 5 : -5;
      dz = (diffZ >= 0) ? 5 : -5;
      break;
    }
  }
  if (dx || dz) {
    return {
      target: `move ${dx.toFixed(1)} ${dz.toFixed(1)}`,
      voiceCommand: `Satellite ${satId}, move ${dx.toFixed(1)}m X, ${dz.toFixed(1)}m Z`
    };
  }
  return { target: "Normal", voiceCommand: null };
}

// Broadcast satellites & debris every 50ms
function broadcast() {
  debris = updateDebris(debris);
  const satellitesData = realSats.map(s => {
    const pos = getPosition(s.satrec);
    const ai = predictCollision(pos, debris)
      ? generateAICommand(pos, debris, s.id)
      : { target: "Normal", voiceCommand: null };
    return {
      id: s.id,
      name: s.name,
      position: pos,
      target: ai.target,
      voiceCommand: ai.voiceCommand
    };
  });

  const payload = JSON.stringify({ type: "update", satellites: satellitesData, debris });
  wss.clients.forEach(c => c.readyState === 1 && c.send(payload));
}

setInterval(broadcast, 50);
