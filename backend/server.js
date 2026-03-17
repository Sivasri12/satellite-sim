const express = require("express");
const fetch = require("node-fetch");
const { WebSocketServer } = require("ws");
const {generateDebris, updateDebris, classifyOrbit, predictCollision} = require("./satellites");
const satellite = require("satellite.js");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static("../frontend"));

const wss = new WebSocketServer({ port: PORT+1 });

let debris = generateDebris(50);
let realSats = [];

async function loadSatellites(){
  const res = await fetch("https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json");
  const data = await res.json();
  realSats = data.slice(0,50).map((sat,i)=>{
    const satrec = satellite.twoline2satrec(sat.TLE_LINE1, sat.TLE_LINE2);
    return {id:i,name:sat.OBJECT_NAME, satrec};
  });
}
loadSatellites();

function getPosition(satrec){
  const now = new Date();
  const gmst = satellite.gstime(now);
  const posVel = satellite.propagate(satrec, now);
  if(!posVel.position) return {x:0,y:0,z:0};
  const geo = satellite.eciToGeodetic(posVel.position, gmst);
  return {x: geo.longitude*10, y: geo.latitude*10, z: geo.height/100};
}

function broadcast(){
  debris = updateDebris(debris);
  const satellitesData = realSats.map(s=>{
    const pos = getPosition(s.satrec);
    const satObj = {id:s.id,name:s.name,position:pos,orbit:pos?classifyOrbit(pos.z*100):"Unknown",
                    target:predictCollision(pos,debris)?"avoid debris":"Normal"};
    return satObj;
  });
  const payload = JSON.stringify({type:"update", satellites: satellitesData, debris});
  wss.clients.forEach(c=>c.readyState===1 && c.send(payload));
}

setInterval(broadcast,50);

app.listen(PORT,()=>console.log("Backend running on port "+PORT));
