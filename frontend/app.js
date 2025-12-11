var map = L.map('map').setView([28.6,77.2], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let marker = L.marker([28.6,77.2]).addTo(map);

async function fetchPos(){
  try{
    let r = await fetch('http://localhost:3000/api/latest');
    let d = await r.json();
    marker.setLatLng([d.lat, d.lon]);
    map.setView([d.lat, d.lon]);
  }catch(e){}
}
setInterval(fetchPos,3000);
