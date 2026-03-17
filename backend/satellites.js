function generateSatellites(n) {
  let sats = [];
  for (let i = 1; i <= n; i++) {
    sats.push({
      id: i,
      name: `Sat-${i}`,
      orbitRadius: 8 + Math.random() * 10,
      angle: Math.random() * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.007,
      health: 100,
      target: null,
      position: { x: 0, y: 0, z: 0 }
    });
  }
  return sats;
}

function generateDebris(n) {
  let debris = [];
  for (let i = 0; i < n; i++) {
    const radius = 7 + Math.random() * 18;      // orbit radius
    const angle = Math.random() * Math.PI * 2;  // starting angle
    const speed = 0.002 + Math.random() * 0.004; // angular speed
    const tilt = (Math.random() - 0.5) * 0.5;  // tilt of orbital plane
    debris.push({ id: i, radius, angle, speed, tilt, position: { x: 0, y: 0, z: 0 } });
  }
  return debris;
}

function updateSatellites(sats) {
  sats.forEach(s => {
    s.angle += s.speed;
    s.position.x = s.orbitRadius * Math.cos(s.angle);
    s.position.z = s.orbitRadius * Math.sin(s.angle);
    if (s.target === "avoid debris") s.orbitRadius += 0.05;
    if (s.orbitRadius > 25) s.orbitRadius = 12;
  });
  return sats;
}

function updateDebris(debris) {
  debris.forEach(d => {
    d.angle += d.speed;
    // Multi-plane orbital motion
    d.position.x = d.radius * Math.cos(d.angle);
    d.position.z = d.radius * Math.sin(d.angle);
    d.position.y = d.radius * Math.sin(d.angle * 3) * d.tilt;
  });
  return debris;
}

function checkCollisions(sats, debrisList) {
  sats.forEach(s => {
    debrisList.forEach(d => {
      const dx = s.position.x - d.position.x;
      const dy = s.position.y - d.position.y;
      const dz = s.position.z - d.position.z;
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (distance < 0.5) {
        s.target = "avoid debris";
      }
    });
  });
}

module.exports = { generateSatellites, generateDebris, updateSatellites, updateDebris, checkCollisions };
