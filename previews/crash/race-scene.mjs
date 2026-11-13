import{RaceMotion,point,clamp,wrapAngle,ACCENT,length,CAR_SCALE}from'./race-motion.mjs';
import{project,WORLD,VIEW_X,ROAD_HALF_WIDTH}from'./circuit.mjs';
import{CircuitArt}from'./circuit-art.mjs';
import{drawGrandPrixCar}from'./grand-prix-car.mjs';
// Place the selection marker in free space; even close racing never sits behind it.
export function markerLayout(p,poses,scale,stretch=1,preferred=null){
 const size=clamp(1/scale,.78,3.2),width=44*size/stretch,height=16*size,clearance=55+5*size,gapX=clearance+4+width/2,gapY=clearance+4+height/2;
 const clear=box=>poses.every(q=>box.right<q.x-clearance||box.left>q.x+clearance||box.bottom<q.y-clearance||box.top>q.y+clearance);
 const candidates=[];if(preferred)candidates.push([preferred.rx,preferred.ry,preferred.ring]);
 for(const ring of[1,1.5,2,3])for(const [x,y]of[[0,-1],[1,0],[-1,0],[0,1],[1,-1],[-1,-1],[1,1],[-1,1]])candidates.push([x,y,ring]);
 for(const [x,y,ring]of candidates){
  const cx=p.x+x*gapX*ring,cy=p.y+y*gapY*ring,box={left:cx-width/2,right:cx+width/2,top:cy-height/2,bottom:cy+height/2};
  if(box.left<8||box.right>WORLD.width-8||box.top<8||box.bottom>WORLD.height-8||!clear(box))continue;
  return{...box,size,cx,cy,width,height,rx:x,ry:y,ring};
 }
 return null;
}
export class RaceScene{
 constructor(canvas,{createCanvas=()=>document.createElement('canvas'),random=Math.random,onCrash=()=>{},reducedMotion=false}={}){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.createCanvas=createCanvas;this.random=random;this.onCrash=onCrash;this.reducedMotion=reducedMotion;this.motion=new RaceMotion(random);this.camera={x:WORLD.width/2,y:WORLD.height/2,zoom:1};this.art=new CircuitArt(createCanvas);this.backdrop=createCanvas();this.backdropKey=null;this.reset();
 }
 get ready(){return this.art.ready}
 reset(){this.motion.reset();this.wrecks=Array(4).fill(null);this.feedback=Array.from({length:4},()=>({steer:0,accel:0,load:0}));this.camera={x:WORLD.width/2,y:WORLD.height/2,zoom:1};this.lastAlive=4;this.momentUntil=0;this.moment='';this.launchAt=null;this.fxAt=-10000;this.clock=0;this.markerPreference=null;this.markerCar=-1}
 celebrate(now){this.fxAt=now}
 update(dt,state){
  this.clock=state.now;this.state=state;this.motion.update(dt,state.phase==='racing',state.eliminated);
  // Atomic elimination: no preparation state and no delayed explosion cue.
  for(let i=0;i<4;i++)if(state.eliminated[i]&&!this.wrecks[i]){const car=this.motion.cars[i];this.wrecks[i]={s:car.s,lane:car.renderLane??car.lane,pose:{...car.pose},at:state.now,type:Math.floor(this.random()*6),speed:car.speed,impactAfter:0,impactSound:true};this.onCrash(i)}
  // Filter steering/suspension feedback independently of authoritative positions.
  const blend=1-Math.exp(-Math.max(0,dt)*18);
  for(const car of this.motion.cars){const f=this.feedback[car.i];for(const [key,value] of [['steer',car.steer],['accel',clamp(car.accel,-400,400)],['load',clamp(car.speed*car.speed*car.pose.curvature,-300,300)]])f[key]+=(value-f[key])*blend;}
  const alive=state.eliminated.filter(x=>!x).length;
  if(state.phase==='racing'&&alive!==this.lastAlive){if(alive===2){this.moment='FINAL TWO';this.momentUntil=state.now+2200}else if(alive===1){this.moment='LAST CAR STANDING';this.momentUntil=state.now+2200}}this.lastAlive=alive;
 }
 updateCamera(dt,w,h,top){
  // Fit the asphalt and barriers, excluding the empty outer scenery margins.
  const bounds={x:25,y:55,width:2100,height:1040},padding=10;
  const scale=Math.min((w-padding*2)/bounds.width*2,Math.max(1,h-top-padding*2)/bounds.height);
  const stretch=(w-padding*2)/(bounds.width*scale);
  this.camera={x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2,zoom:1};this.viewStretch=stretch;
  return{scale,stretch,x:padding-bounds.x*scale*stretch,y:top+padding+(h-top-padding*2-bounds.height*scale)/2-bounds.y*scale};
 }
 draw(now,dt=1/60){
  const c=this.ctx,canvas=this.canvas,rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height;if(!w||!h||!this.state)return;const dpr=Math.min(globalThis.devicePixelRatio||1,3,4096/w,2400/h);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
  const top=w<700?24:4,cam=this.updateCamera(dt,w,h,top),key=`${w}:${h}:${dpr}:${this.art.ready}`;
  // Rasterize static scenery at the viewport size once, then reuse it without scaling.
  if(this.backdropKey!==key){
   this.backdrop.width=canvas.width;this.backdrop.height=canvas.height;const b=this.backdrop.getContext('2d');b.setTransform(dpr,0,0,dpr,0,0);const sky=b.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#080d15');sky.addColorStop(.45,'#0b1420');sky.addColorStop(1,'#080c13');b.fillStyle=sky;b.fillRect(0,0,w,h);
   b.setTransform(dpr*cam.scale*cam.stretch,0,0,dpr*cam.scale,dpr*cam.x,dpr*cam.y);this.art.draw(b,0,true);this.backdropKey=key;
  }
  c.setTransform(1,0,0,1,0,0);c.drawImage(this.backdrop,0,0);c.setTransform(dpr*cam.scale*cam.stretch,0,0,dpr*cam.scale,dpr*cam.x,dpr*cam.y);
  if(!this.reducedMotion)this.art.animate(c,now);
  if(!this.art.ready){c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#bdd7eb';c.textAlign='center';c.font='14px Arial';c.fillText(this.art.error?'Track could not load. Reload to retry.':'Preparing circuit…',w/2,h/2);return}
  const drawables=this.motion.cars.map(car=>{const wr=this.wrecks[car.i];return{car,wr,world:wr?this.wreckPose(wr,now):car.pose}}).sort((a,b)=>Number(!!b.wr)-Number(!!a.wr)||a.world.y-b.world.y);
  for(const {car,wr,world} of drawables){
   const p=project(world);
   if(wr)this.crashMarks(c,{...wr,pose:project(wr.pose)},p,now);
   this.car(c,p,car.i,{steer:wr?0:this.feedback[car.i].steer,speed:wr?0:car.speed,accel:wr?0:this.feedback[car.i].accel,load:wr?0:this.feedback[car.i].load,wrecked:!!wr,now});
   if(wr)this.crashEffects(c,wr,p,now);
  }
  const selected=drawables.find(v=>v.car.i===this.state.selected);if(selected)this.marker(c,project(selected.world),selected.car.i,cam.scale,drawables.map(v=>project(v.world)));

 }
 car(c,p,i,options={}){if(p.bodyA!==undefined){c.save();c.translate(p.x,p.y);const stretch=this.viewStretch||1;c.scale(1/stretch,1);const a=Math.atan2(Math.sin(p.bodyA),VIEW_X*stretch*Math.cos(p.bodyA));drawGrandPrixCar(c,{x:0,y:0,a:a+Math.PI},i,{...options,scale:CAR_SCALE});c.restore()}else drawGrandPrixCar(c,p,i,options)}
 marker(c,p,i,scale,poses){
  if(this.markerCar!==i){this.markerPreference=null;this.markerCar=i}
  const stretch=this.viewStretch||1,box=markerLayout(p,poses,scale,stretch,this.markerPreference);if(!box)return;this.markerPreference=box;
  c.save();c.fillStyle=ACCENT[i];
  // Small selection arrow only; no color-name label or backing box.
  const dx=p.x-box.cx,dy=p.y-box.cy,d=Math.hypot(dx,dy),ux=dx/d,uy=dy/d;
  const reach=Math.min(Math.abs(ux)>1e-6?box.width/2/Math.abs(ux):Infinity,Math.abs(uy)>1e-6?box.height/2/Math.abs(uy):Infinity),x=box.cx+ux*reach,y=box.cy+uy*reach;
  c.beginPath();c.moveTo(x-uy*3*box.size,y+ux*3*box.size);c.lineTo(x+uy*3*box.size,y-ux*3*box.size);c.lineTo(x+ux*4*box.size,y+uy*4*box.size);c.fill();c.restore();
 }
 crashDuration(w){return[780,950,1000,850,720,900][w.type]}
 wreckPose(w,now){
  const elapsed=Math.max(0,now-w.at),t=clamp(elapsed/this.crashDuration(w),0,1),engine=w.type===2||w.type===5;
  const coast=1-(1-t)**3,travel=w.speed*(engine?.29:[.18,.22,0,.2,.16,0][w.type])*coast;
  const direction=Math.sign(w.lane||1),edge=direction*(ROAD_HALF_WIDTH-20);
  const side=engine?w.lane:w.lane+(edge-w.lane)*(t*t*(3-2*t));
  const anchor=point(w.s,w.lane),p=point(w.s+travel,side);p.x+=(w.pose.x-anchor.x)*(1-coast);p.y+=(w.pose.y-anchor.y)*(1-coast);p.lane=side;p.travel=travel;
  const turn=[1.75,-2.7,0,-1.45,.95,0][w.type];p.a=w.pose.a+turn*coast;
  return p;
 }

 crashMarks(c,w,p,now){if(w.type===2||w.type===5)return;c.save();c.strokeStyle='#07111b99';c.lineWidth=2;for(const offset of[-9,9]){c.beginPath();c.moveTo(w.pose.x,w.pose.y+offset);c.quadraticCurveTo((w.pose.x+p.x)/2,p.y+offset,p.x,p.y+offset);c.stroke()}c.restore()}
 crashEffects(c,w,p,now){
  const elapsed=now-w.at;if(elapsed<0)return;
  // Already at full brightness/size on the elimination frame; fade only.
  // Anchor the burst at the failure location, never ahead of the moving car.
  const origin=project(w.pose),t=clamp(elapsed/300,0,1);
  if(elapsed<300){
   const stretch=this.viewStretch||1,radius=48-18*t;
   c.save();c.translate(origin.x,origin.y);c.scale(1/stretch,1);
   const glow=c.createRadialGradient(0,0,0,0,0,radius);
   glow.addColorStop(0,`rgba(255,249,214,${(1-t)*.95})`);
   glow.addColorStop(.25,`rgba(255,194,80,${(1-t)*.85})`);
   glow.addColorStop(.65,`rgba(244,103,30,${(1-t)*.6})`);
   glow.addColorStop(1,'rgba(220,68,15,0)');c.fillStyle=glow;
   c.beginPath();c.arc(0,0,radius,0,Math.PI*2);c.fill();
   for(let j=0;j<14;j++){const a=j*2.399+w.type*.7,d=14+(16+j%4*7)*t;
    c.strokeStyle=`rgba(255,${180+j%3*22},95,${(1-t)**2})`;c.lineWidth=2*(1-t)+.5;
    c.beginPath();c.moveTo(Math.cos(a)*d,Math.sin(a)*d);c.lineTo(Math.cos(a)*(d+7*(1-t)),Math.sin(a)*(d+7*(1-t)));c.stroke();
   }
   c.restore();
  }
  // Only aftermath remains; no second flash, delayed flame or impact cue.
  const smoke=(elapsed-150)/1000;if(smoke>=0&&smoke<1.5){for(let j=0;j<4;j++){const a=(smoke+j*.2)%1.5;c.fillStyle=`rgba(159,174,183,${Math.max(0,.16-a*.1)*(1-smoke/1.5)})`;c.beginPath();c.arc(p.x+Math.sin(j*4)*a*8,p.y-12-a*24,3+a*7,0,7);c.fill()}}
 }
}
