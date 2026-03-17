const healthCtx = document.getElementById("healthChart").getContext("2d");
const riskCtx = document.getElementById("riskChart").getContext("2d");
const alertDiv = document.getElementById("alerts");

const healthChart = new Chart(healthCtx, {
  type: 'bar',
  data: { labels: [], datasets:[{label:'Health', data:[], backgroundColor:'cyan'}] },
  options:{ responsive:true, scales:{y:{min:0,max:100}} }
});

const riskChart = new Chart(riskCtx, {
  type:'line',
  data:{ labels:[], datasets:[{label:'Collision Risk %', data:[], borderColor:'yellow', fill:false}] },
  options:{ responsive:true, scales:{y:{min:0,max:100}} }
});

ws.onmessage = (msg)=>{
  const { type, satellites, debris } = JSON.parse(msg.data);
  if(type==="update"){
    // Update Health chart
    healthChart.data.labels = satellites.map(s=>s.name);
    healthChart.data.datasets[0].data = satellites.map(s=>s.health);
    healthChart.update();

    // Update Risk chart based on nearest debris
    riskChart.data.labels = satellites.map(s=>s.name);
    riskChart.data.datasets[0].data = satellites.map(s=>{
      const nearest = debris.reduce((min,d)=>{
        const dx = s.position.x-d.x, dz = s.position.z-d.z;
        const dist = Math.sqrt(dx*dx + dz*dz);
        return dist<min?dist:min;
      },1000);
      return Math.min(100, Math.max(0, 100 - nearest*10)); // risk %
    });
    riskChart.update();

    // Alerts
    alertDiv.innerHTML="";
    satellites.forEach((s,i)=>{
      if(riskChart.data.datasets[0].data[i]>70){
        alertDiv.innerHTML += `⚠️ ${s.name} at high collision risk! <br>`;
      }
    });
  }
};
