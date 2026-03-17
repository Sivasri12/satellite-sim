const express = require("express");
const fetch = require("node-fetch");
const { WebSocketServer } = require("ws");
const satelliteJS = require("satellite.js");
const { generateDebris, updateDebris } = require("./satellites");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static("../frontend")); // serve frontend static files

const wss = new WebSocketServer({ port: PORT + 1 });

let debris = generateDebris(50);
let realSats = [];

// Load 50 active satellites from CelesTrak
async function loadSatellites() {
  try {
    const res = await fetch("https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json");
    const data = await res.json();
    realSats = data.slice(0, 50).map((sat, i) => {
      const satrec = satelliteJS.twoline2satrec(sat.TLE_LINE1, sat.TLE_LINE2);
      return { id: i, name: sat.OBJECT_NAME, satrec };
    });
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
    z: geo.height / 1000 + R // altitude above Earth
  };
}

// Check for collision and generate AI command
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

function generateAICommand(pos, debrisList, satId) {
  // Simple left/right X and forward/back Z command
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

// Broadcast satellite & debris updates
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

setInterval(broadcast, 50); // 20 FPS

app.listen(PORT, () => console.log("Backend running on port " + PORT));
