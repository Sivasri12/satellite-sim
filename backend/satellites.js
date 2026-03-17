const satellite = require("satellite.js");

function classifyOrbit(height){
  if(height < 2000) return "LEO";
  if(height < 35786) return "MEO";
  return "GEO";
}

function generateDebris(n){
  let debris = [];
  for(let i=0;i<n;i++){
    const radius = 7 + Math.random()*18;
    const angle = Math.random()*Math.PI*2;
    const speed = 0.002 + Math.random()*0.004;
    const inclination = Math.random()*Math.PI/3;
    const axisTilt = Math.random()*Math.PI*2;
    debris.push({id:i, radius, angle, speed, inclination, axisTilt, position:{x:0,y:0,z:0}});
  }
  return debris;
}

function updateDebris(debris){
  debris.forEach(d=>{
    d.angle += d.speed;
    let x = d.radius*Math.cos(d.angle);
    let z = d.radius*Math.sin(d.angle);
    let yTilt = z * Math.sin(d.inclination);
    let zTilt = z * Math.cos(d.inclination);
    const cosA = Math.cos(d.axisTilt);
    const sinA = Math.sin(d.axisTilt);
    d.position.x = x*cosA - yTilt*sinA;
    d.position.y = x*sinA + yTilt*cosA;
    d.position.z = zTilt;
  });
  return debris;
}

// Predict collisions
function predictCollision(sat, debrisList){
  const steps=50; const dt=1;
  for(let i=0;i<steps;i++){
    const futurePos = {x: sat.position.x + sat.velocity?.x*i*dt || 0, 
                       y: sat.position.y + sat.velocity?.y*i*dt ||0,
                       z: sat.position.z + sat.velocity?.z*i*dt ||0};
    for(const d of debrisList){
      const dx=futurePos.x-d.position.x;
      const dy=futurePos.y-d.position.y;
      const dz=futurePos.z-d.position.z;
      const dist=Math.sqrt(dx*dx+dy*dy+dz*dz);
      if(dist<2) return true;
    }
  }
  return false;
}

module.exports = {generateDebris, updateDebris, classifyOrbit, predictCollision};
