const ws = new WebSocket("ws://localhost:3000");
ws.onopen = () => console.log("Connected to backend");
ws.onerror = (err) => console.error(err);
