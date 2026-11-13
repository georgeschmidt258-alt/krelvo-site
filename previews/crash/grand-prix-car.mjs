// The original NightGrid Grand Prix open-wheel model, reproduced in Canvas.
// Nose/front axle point toward local negative X. Racing heading adds PI.
// Crash-only model; Grand Prix source is untouched.
export const GP_COLORS=['#29b7ff','#ff4059','#465264','#c25dff'];
export function drawGrandPrixCar(c,p,i,{steer=0,speed=0,accel=0,load=0,now=0,wrecked=false,scale=1.28}={}){
 c.save();c.translate(p.x,p.y);c.rotate(p.a);c.scale(scale,scale);const alpha=c.globalAlpha*(wrecked?.9:1);c.globalAlpha=alpha;
 c.fillStyle='#000c';c.beginPath();c.ellipse(0,2,22,13,0,0,Math.PI*2);c.fill();
 const polygon=(points,fill,stroke,width=.8)=>{c.beginPath();points.forEach(([x,y],n)=>n?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke()}};
 const rect=(x,y,w,h)=>{c.beginPath();c.roundRect(x,y,w,h,2);c.fillStyle='#141a20';c.fill();c.strokeStyle='#ffffff';c.lineWidth=.65;c.stroke()};
 for(const y of[-10,4]){c.save();c.translate(-10.5,y+3);c.rotate(steer);rect(-4.5,-3,9,6);c.restore()}
 rect(7,-11,11,7);rect(7,4,11,7);
 // Tire shoulders and wheel hubs stay inside the original silhouette.
 c.strokeStyle='#536170';c.lineWidth=.55;for(const [x,y]of[[-10.5,-7],[-10.5,7],[12.5,-7.5],[12.5,7.5]]){c.beginPath();c.moveTo(x-2.8,y);c.lineTo(x+2.8,y);c.stroke();c.fillStyle='#8e9eac';c.fillRect(x-.7,y-.8,1.4,1.6)}
 // Rolling tire detail is speed-driven, never connected to a future crash.
 if(speed>20&&!wrecked){c.strokeStyle='#8395a455';c.lineWidth=.45;const tread=((now*.001*speed*.09)%4+4)%4;for(const [x,y]of[[-10.5,-7],[-10.5,7],[12.5,-7.5],[12.5,7.5]])for(let n=-1;n<=1;n++){c.beginPath();c.moveTo(x+((n*3+tread+12)%8)-4,y-1.8);c.lineTo(x+((n*3+tread+12)%8)-4,y+1.8);c.stroke()}}
 // Suspension settles under braking/acceleration while the wheels stay planted.
 c.save();c.translate(Math.max(-.5,Math.min(.5,-accel/330)),Math.max(-.55,Math.min(.55,load/550)));
 const paint=wrecked?'#343a43':GP_COLORS[i],color=c.createLinearGradient(0,-11,0,11);
 color.addColorStop(0,paint);color.addColorStop(.3,paint);color.addColorStop(.46,['#a7e9ff','#ffb7ba','#8795a8','#edc7ff'][i]);color.addColorStop(.58,paint);color.addColorStop(1,['#07537d','#821e2e','#101825','#58307f'][i]);
 const edge=wrecked?'#717982':'#eaf3fc';
 polygon([[-19,-11],[-12,-11],[-12,11],[-19,11],[-22,7],[-22,-7]],color,edge,.6);
 polygon([[14,-13],[19,-13],[19,13],[14,13],[12,9],[12,-9]],color,edge,.6);
 polygon([[-14,-5],[-9,-9],[3,-9],[9,-6],[16,-3],[9,0],[3,3],[-9,3],[-14,-1]],color,edge,.65);
 polygon([[-7,-4],[3,-4],[7,-1],[-7,-1]],'#17212a','#ffffff',.7);
 polygon([[5,-5],[10,-1],[5,3]],'#a9becd');
 polygon([[-10,-7],[-3,-7],[-1,-5],[-10,-5]],wrecked?'#30343b':GP_COLORS[i]);
 polygon([[5,-4],[8,-1],[5,1]],'#edf5f6');
 c.strokeStyle='#e4f4ff88';c.lineWidth=.65;c.beginPath();c.moveTo(-12,-3.7);c.lineTo(-4,-4.8);c.lineTo(3,-4.8);c.stroke();
 c.fillStyle='#d8f4ff';c.fillRect(-19,-8,3,1.3);c.fillRect(-19,6.7,3,1.3);
 c.fillStyle='#0a1018';c.fillRect(14,-11,1.3,22);c.fillRect(-20,-6,1,12);
 c.fillStyle='#07101c';c.fillRect(-7,-7.4,8,1);c.fillRect(-7,4.9,8,1);
 c.fillStyle='#080d14';c.globalAlpha*=.88;c.fillRect(-17,-8,5,2);c.fillRect(-17,4,5,2);c.globalAlpha=alpha;
 c.beginPath();c.arc(-1,0,4.6,0,Math.PI*2);c.fillStyle='#080d14';c.fill();c.lineWidth=.7;c.strokeStyle='#07111d';c.stroke();
 if(wrecked){c.fillStyle='#141820';c.fillRect(-12,-5,15,7);c.strokeStyle='#68717a';c.lineWidth=.9;c.beginPath();c.moveTo(-12,-7);c.lineTo(-4,0);c.lineTo(-7,6);c.stroke()}
 // Driver helmet and visor, kept within the existing cockpit silhouette.
 if(!wrecked){c.beginPath();c.ellipse(-1,.1,2.6,2.3,0,0,Math.PI*2);c.fillStyle=['#d6f3ff','#fff0e4','#c7d3e3','#f0d9ff'][i];c.fill();c.fillStyle='#14243a';c.fillRect(-3,-1.3,1.1,2.7);c.strokeStyle='#a8bacb';c.lineWidth=.7;c.beginPath();c.arc(-1,.1,3.8,-1.3,1.3);c.stroke()}
 c.fillStyle='#eef5fa';c.font='900 4px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(String(i+1),-10,-1);c.restore();c.restore();
}
