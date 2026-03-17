const canvas = document.getElementById("three-canvas");
const alertDiv = document.getElementById("alert");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setSize(window.innerWidth, window.innerHeight);

const light = new THREE.PointLight(0xffffff,1);
light.position.set(20,20,20);
scene.add(light);

// Earth
const earthGeo = new THREE.SphereGeometry(5,64,64);
const earthMat = new THREE.MeshPhongMaterial({
  map: new THREE.TextureLoader().load("assets/earth_texture.jpg")
});
const earth = new THREE.Mesh(earthGeo, earthMat);
scene.add(earth);

camera.position.z = 30;

// Satellites & debris
let satMeshes = [], debrisMeshes = [];

// WebSocket real-time updates
ws.onmessage = (msg) => {
  const { type, satellites, debris } = JSON.parse(msg.data);
  if(type === "init"){
    satellites.forEach(s=>{
      const geo = new THREE.SphereGeometry(0.2,12,12);
      const mat = new THREE.MeshPhongMaterial({color:0xff0000});
      const m = new THREE.Mesh(geo,mat);
      scene.add(m);
      satMeshes[s.id] = m;
    });

    debris.forEach(d=>{
      const geo = new THREE.SphereGeometry(0.1,8,8);
      const mat = new THREE.MeshBasicMaterial({color:0xffaa00, transparent:true, opacity:0.7});
      const m = new THREE.Mesh(geo,mat);
      m.position.set(d.x,d.y,d.z);
      scene.add(m);
      debrisMeshes[d.id] = m;
    });
  }

  if(type==="update"){
    satellites.forEach(s=>{
      const m = satMeshes[s.id];
      if(m){
        m.position.lerp(new THREE.Vector3(s.position.x,0,s.position.z),0.1);
        if(s.target==="avoid debris"){
          alertDiv.innerText = `${s.name} avoiding debris! 🚀`;
          const audio = new Audio("assets/alert.mp3");
          audio.play();
        }
      }
    });
    debris.forEach(d=>{
      const m = debrisMeshes[d.id];
      if(m) m.position.set(d.x,d.y,d.z);
    });
  }
};

function animate(){
  requestAnimationFrame(animate);
  earth.rotation.y += 0.001;
  renderer.render(scene,camera);
}

animate();
