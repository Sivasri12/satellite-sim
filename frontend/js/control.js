const voiceBtn = document.getElementById("voiceBtn");
const voiceText = document.getElementById("voiceText");
const satSelect = document.getElementById("satSelect");
const actionSelect = document.getElementById("actionSelect");
const sendBtn = document.getElementById("sendBtn");

let satellitesList = [];

ws.onmessage = (msg)=>{
  const { type, satellites } = JSON.parse(msg.data);
  if(type==="update"){
    satSelect.innerHTML="";
    satellites.forEach(s=>{
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.text = s.name;
      satSelect.add(opt);
    });
    satellitesList = satellites;
  }
};

// Send manual command
sendBtn.onclick = ()=>{
  ws.send(JSON.stringify({
    type:"ai-command",
    id:parseInt(satSelect.value),
    action:actionSelect.value
  }));
};

// Voice command
if("SpeechRecognition" in window || "webkitSpeechRecognition" in window){
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recog = new Recognition();
  recog.onresult = evt=>{
    const text = evt.results[0][0].transcript;
    voiceText.innerText = text;
    const match = text.match(/satellite (\d+) (.+)/i);
    if(match){
      ws.send(JSON.stringify({
        type:"ai-command",
        id:parseInt(match[1]),
        action:match[2]
      }));
    }
  };
  voiceBtn.onclick = ()=>recog.start();
}
