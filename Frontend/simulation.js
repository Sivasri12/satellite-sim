import * as THREE from './three.min.js';
import { GLTFLoader } from './GLTFLoader.js';
import { OrbitControls } from './OrbitControls.js';

const canvas = document.getElementById("three-canvas");
const alertDiv = document.getElementById("alert");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setSize(window.innerWidth, window.innerHeight);

scene.add(new THREE.AmbientLight(0x404040,1.5));
const point = new THREE.PointLight(0xffffff,1);
point.position.set(20,20,20);
scene.add(point);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping=true;
controls.dampingFactor=0.05;
controls.minDistance=10;
controls.maxDistance=100;

const earthGeo = new THREE.SphereGeometry(5,64,64);
const earthMat = new THREE.MeshPhongMaterial({
  map: new THREE.TextureLoader().load("assets/earth_texture.jpg")
});
const earth = new THREE.Mesh(earthGeo,earthMat);
scene.add(earth);

camera.position.set(0,15,30);
controls.update();

let satellites=[], satMeshes=[], debrisMeshes=[];
const loader=new GLTFLoader();

const ws=new WebSocket("ws://localhost:3000");
ws.onmessage = (msg)=>{
  const {type,satellites:satsData,debris} = JSON.parse(msg.data);

  if(type==="init"){
    satsData.forEach(s=>{
      satellites[s.id]=s;
      const trailGeo=new THREE.BufferGeometry();
      const points=[];for(let i=0;i<100;i++)points.push(new THREE.Vector3(s.position.x,0,s.position.z));
      trailGeo.setFromPoints(points);
      s.trail=new THREE.Line(trailGeo,new THREE.LineBasicMaterial({color:0x00ffff,transparent:true,opacity:0.7}));
      scene.add(s.trail);

      loader.load("assets/satellite_model.glb",gltf=>{
        const model=gltf.scene;
        model.scale.set(0.1,0.1,0.1);
        scene.add(model);
        s.mesh=model;
      });

      const geo=new THREE.SphereGeometry(0.2,12,12);
      const mat=new THREE.MeshPhongMaterial({color:0xff0000});
      const sphere=new THREE.Mesh(geo,mat);
      scene.add(sphere);
      satMeshes[s.id]=sphere;
    });

    debris.forEach(d=>{
      const geo=new THREE.SphereGeometry(0.1,8,8);
      const mat=new THREE.MeshStandardMaterial({color:0xffaa00,emissive:0xff8800,emissiveIntensity:0.5,transparent:true,opacity:0.7});
      const m=new THREE.Mesh(geo,mat);
      m.position.set(d.position.x,d.position.y,d.position.z);
      scene.add(m);
      debrisMeshes[d.id]=m;
    });
  }

  if(type==="update"){
    satsData.forEach(s=>{
      // Execute AI command
      if(s.target && s.target.startsWith("move")){
        const parts=s.target.split(" ");
        const moveX=parseFloat(parts[1]);
        const moveZ=parseFloat(parts[2]);
        s.position.x+=moveX*0.05;
        s.position.z+=moveZ*0.05;

        alertDiv.innerText=s.voiceCommand;
        const audio=new Audio("assets/alert.mp3");
        audio.play();

        s.target=null;
      }

      const sphere=satMeshes[s.id], mesh=s.mesh;
      if(sphere) sphere.position.lerp(new THREE.Vector3(s.position.x,0,s.position.z),0.1);
      if(mesh) mesh.position.lerp(new THREE.Vector3(s.position.x,0,s.position.z),0.1);

      // Orbit trail update
      const trail=s.trail;
      if(trail){
        const positions=trail.geometry.attributes.position.array;
        for(let i=0;i<positions.length-3;i+=3){
          positions[i]=positions[i+3];
          positions[i+1]=positions[i+4];
          positions[i+2]=positions[i+5];
        }
        const last=positions.length-3;
        positions[last]=s.position.x; positions[last+1]=0; positions[last+2]=s.position.z;
        trail.geometry.attributes.position.needsUpdate=true;
      }
    });

    debris.forEach(d=>{
      const m=debrisMeshes[d.id];
      if(m) m.position.set(d.position.x,d.position.y,d.position.z);
    });
  }
};

function animate(){
  requestAnimationFrame(animate);
  earth.rotation.y+=0.001;
  controls.update();
  renderer.render(scene,camera);
}

animate();
window.addEventListener("resize",()=>{
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
});
