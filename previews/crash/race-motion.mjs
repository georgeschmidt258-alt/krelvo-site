// Cosmetic simulation only. This module has no access to bets, balances or crash points.
export const CAR_NAMES=['VORTEX','INFERNO','PHANTOM','NOVA'];
export const PAINT=['#16a9ff','#ff435c','#202735','#b85bff'];
export const ACCENT=['#93dfff','#ffadbd','#d5e5f6','#ecc1ff'];
import{point,path,length,wrapAngle,clamp,forwardGap,WORLD,knots,lanePoint,lanes}from'./circuit.mjs';
export{point,path,length,wrapAngle,clamp,forwardGap,WORLD,knots};
// Convex hull of the actual Grand Prix silhouette, including the wings/tires.
// Testing its real shape avoids false corner collisions from a large rectangle.
export const CAR_SCALE=2.34;
const footprint=[[-22,-7],[-19,-11],[14,-13],[19,-13],[19,13],[14,13],[-19,11],[-22,7]].map(([x,y])=>[x*CAR_SCALE,y*CAR_SCALE]);
const normals=footprint.map((p,i)=>{const q=footprint[(i+1)%footprint.length],dx=q[0]-p[0],dy=q[1]-p[1],d=Math.hypot(dx,dy);return[-dy/d,dx/d]});
export function intersects(a,b,pad=0){
 if(Math.abs((a.z??0)-(b.z??0))>24)return false;
 const dx=b.x-a.x,dy=b.y-a.y;if(dx*dx+dy*dy>(CAR_SCALE*48+pad*2)**2)return false;
 const ca=Math.cos(a.a+Math.PI),sa=Math.sin(a.a+Math.PI),cb=Math.cos(b.a+Math.PI),sb=Math.sin(b.a+Math.PI);
 for(const [cos,sin]of[[ca,sa],[cb,sb]])for(const [lx,ly]of normals){
  const nx=lx*cos-ly*sin,ny=lx*sin+ly*cos,d=dx*nx+dy*ny;
  const ax=ca*nx+sa*ny,ay=-sa*nx+ca*ny,bx=cb*nx+sb*ny,by=-sb*nx+cb*ny;
  let amin=Infinity,amax=-Infinity,bmin=Infinity,bmax=-Infinity;
  for(const [x,y]of footprint){const av=x*ax+y*ay,bv=x*bx+y*by;amin=Math.min(amin,av);amax=Math.max(amax,av);bmin=Math.min(bmin,bv);bmax=Math.max(bmax,bv)}
  if(amax+pad<=bmin+d-pad||bmax+d+pad<=amin-pad)return false;
 }
 return true;
}
import {preferredOffset,routeGeometry,MAX_OFFSET,signedDistance,roadDistance,ROAD_HALF_WIDTH,ROAD_MARGIN} from './driving-road.mjs';
export const BUILD_ID='NGC-INSTANT-42';
import{cornerOffset,cornerSpeed}from'./corner-path.mjs';
export const FIXED_STEP=1/120;
export const RACING_LINES=[-48,48]; // Starting grid only; not driving lanes.
export const LANE_LIMIT=58; // Tracking envelope, including steering lag; planned centers stay within ±50.
export const racingLine=preferredOffset;
export function lanePose(index,distance){return {...point(distance,RACING_LINES[index]),centerS:distance}}
export function bodyVertices(p){const a=p.a+Math.PI,c=Math.cos(a),s=Math.sin(a);return footprint.map(([x,y])=>({x:p.x+x*c-y*s,y:p.y+x*s+y*c}))}
export function bodyRoadClearance(p,s){return ROAD_HALF_WIDTH-Math.max(...bodyVertices(p).map(v=>roadDistance(v.x,v.y,s)))}
// Independent per-race cosmetic stream. Seed once; never use the outcome generator.
export function cosmeticRandom(){let seed=new Uint32Array(1);globalThis.crypto.getRandomValues(seed);let x=seed[0];return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296}}
// Reference: published Grand Prix /game, racePositions() and pointOnLane().
// Its .8s launch and sinusoidal progress shaping are retained. Cosmetic slots
// are shuffled independently; no finish order or future elimination is received.
export const GP_REFERENCE='NightGrid Grand Prix v57 /game racePositions + pointOnLane';
export function grandPrixProgress(t,slot=0,phase=0,amplitude=.12){
 const ramp=.8,travel=t<ramp?t*t/(2*ramp):t-ramp/2;
 const u=Math.max(0,travel)/(29.2+slot*.45-ramp/2);
 return -.012+5.012*(u+amplitude/(2*Math.PI)*(Math.sin(2*Math.PI*u+phase)-Math.sin(phase)));
}
export function grandPrixRate(t,slot=0,phase=0,amplitude=.12){
 const ramp=.8,travel=t<ramp?t*t/(2*ramp):t-ramp/2,u=Math.max(0,travel)/(29.2+slot*.45-ramp/2);
 return 5.012/(29.2+slot*.45-ramp/2)*Math.min(1,Math.max(0,t)/ramp)*(1+amplitude*Math.cos(2*Math.PI*u+phase));
}
// Cosmetic traffic controller. No bets, future crash points or round outcome input.
export const RACE_SPEED=.8;
export const screenPose=(p,xScale=.625)=>({...p,x:p.x*xScale,a:Math.atan2(Math.sin(p.a),Math.cos(p.a)*xScale)});
// Screen-space clearance applies to cars sharing a road section. Nearby but
// distinct bends must not create traffic deadlocks through camera projection.
const touches=(a,b)=>intersects(a,b,3)||(Math.abs(gap(a.centerS,b.centerS))<500&&intersects(screenPose(a),screenPose(b),3));
const dtFixed=1/120,side=43;
const gap=(a,b)=>((b-a+length/2)%length+length)%length-length/2;
const ease=t=>{t=clamp(t,0,1);return t*t*t*(10+t*(-15+6*t))};
const station=s=>{const v=(s%length+length)%length;return v>length-1000?v-length:v};
const baseLine=cornerOffset;
const curvature=s=>wrapAngle(point(s+8).a-point(s-8).a)/16;
function pose(s,lane,latRate=0,rate=1){const p=point(s,lane);p.a+=Math.atan2(latRate,Math.max(1,rate));p.curvature=curvature(s);p.centerS=s;return p}
export class RaceMotion{
 constructor(random=Math.random){this.random=random;this.reset()}
 reset(){this.time=0;this.accumulator=0;this.events=[];this.plan=null;this.nextMove=1;const grid=[0,1,2,3];for(let i=3;i>0;i--){const j=Math.floor(this.random()*(i+1));[grid[i],grid[j]]=[grid[j],grid[i]]}const round=Math.floor(this.random()*1000000),paceShift=Math.floor(this.random()*4);
  this.cars=grid.map((slot,i)=>{const s=-120-slot*175,lane=baseLine(s);return{i,slot:(slot+paceShift)%4,phase:((round*37+i*73)%360)*Math.PI/180,amplitude:.5,pose:pose(s,lane),s,simS:s,lane,renderLane:lane,targetLane:lane,progress:s/length,rate:0,speed:0,accel:0,steer:0,gear:1,eliminated:false}});
 }
 emit(type,c,other){this.events.push({type,at:this.time,car:c.i,other});if(this.events.length>200)this.events.shift()}
 free(c){return Math.min(cornerSpeed(c.s)*(.88+c.slot*.08),grandPrixRate(this.time*RACE_SPEED,c.slot,c.phase,c.amplitude)*RACE_SPEED*length)}
 plannedState(plan,id,t){const item=plan.states[id];const driver=id===plan.car,a=driver?plan.acceleration:0,ramp=Math.min(t,.35),s=item.s+item.rate*t+a*(ramp*ramp/2+Math.max(0,t-.35)*.35),rate=item.rate+a*ramp;
  let lane=baseLine(s);if(driver){if(t<.25)lane=item.lane+(side-item.lane)*ease(t/.25);else if(t<plan.duration-.25)lane=side;else lane=side+(baseLine(s)-side)*ease((t-plan.duration+.25)/.25)}return{s,lane,rate};
 }
 plannedPose(plan,id,t){const p=this.plannedState(plan,id,t),before=this.plannedState(plan,id,Math.max(0,t-.001)),after=this.plannedState(plan,id,t+.001);return pose(p.s,p.lane,(after.lane-before.lane)/(t<.001?.001:.002),p.rate)}
 tryPass(active){if(this.time<this.nextMove)return;this.nextMove=this.time+.1;
  for(const c of active){const q=station(c.s);if(q< -900||q> -250||c.speed<150)continue;
   const b=active.filter(b=>b!==c&&gap(c.s,b.s)>140&&gap(c.s,b.s)<420).sort((a,b)=>gap(c.s,a.s)-gap(c.s,b.s))[0];if(!b)continue;
   const desired=Math.min(cornerSpeed(c.s+220)*(.88+c.slot*.08),grandPrixRate(this.time*RACE_SPEED,c.slot,c.phase,c.amplitude)*RACE_SPEED*length),relative=desired-b.rate;if(relative<100)continue;
   const duration=(gap(c.s,b.s)+130+(desired-c.rate)*.175)/relative+.25;
   if(duration<.85||duration>3)continue;
   const plan={car:c.i,other:b.i,at:this.time-dtFixed,duration,acceleration:(desired-c.rate)/.35,states:this.cars.map(v=>({s:v.s,lane:v.lane,rate:v.rate}))};
   const end=this.plannedState(plan,c.i,duration);if(station(end.s)>500||end.s-c.s>1400)continue;
   let safe=true;for(let t=0;t<=duration+.02&&safe;t+=.025){const poses=active.map(v=>this.plannedPose(plan,v.i,Math.min(t,duration)));for(let i=0;i<poses.length;i++)for(let j=i+1;j<poses.length;j++)if(touches(poses[i],poses[j]))safe=false;}
   if(!safe)continue;this.plan=plan;this.nextMove=this.time+duration+1;this.emit('pass-start',c,b.i);return;
  }
 }
 update(dt,racing,eliminated){for(const c of this.cars)c.eliminated=!!eliminated[c.i];if(!racing)return;this.accumulator+=clamp(dt,0,.05);while(this.accumulator+1e-10>=dtFixed){this.accumulator-=dtFixed;this.step(dtFixed)}}
 apply(c,s,lane,rate,p,dt){const old=c.speed;c.s=c.simS=s;c.lane=c.renderLane=lane;c.progress=s/length;c.rate=rate;c.speed=Math.hypot(p.x-c.pose.x,p.y-c.pose.y)/dt;c.accel=(c.speed-old)/dt;const traveled=c.speed*dt;p.curvature=traveled>.001?wrapAngle(p.a-c.pose.a)/traveled:0;c.steer=clamp(Math.atan(45*p.curvature),-.55,.55);c.previous=c.pose;p.a=c.pose.a+wrapAngle(p.a-c.pose.a);c.pose=p;c.gear=clamp(1+Math.floor(c.speed/115),1,5)}
 step(dt){this.time+=dt;const active=this.cars.filter(c=>!c.eliminated);
  if(!this.plan)this.tryPass(active);
  if(this.plan){const plan=this.plan,t=Math.min(this.time-plan.at,plan.duration);for(const c of active){const a=this.plannedState(plan,c.i,t);this.apply(c,a.s,a.lane,a.rate,this.plannedPose(plan,c.i,t),Math.max(1e-6,dt-Math.max(0,this.time-plan.at-plan.duration)))}if(t>=plan.duration){const driver=this.cars[plan.car];if(!driver.eliminated&&driver.s>this.cars[plan.other].s)this.emit('pass-complete',driver,plan.other);this.plan=null;const rest=this.time-plan.at-plan.duration;if(rest>1e-7){this.time-=rest;this.step(rest)}}return;}
  const targets=active.map(c=>{let rate=this.free(c);for(const b of active){if(b===c)continue;const d=gap(c.s,b.s);if(d<=0||d>700)continue;const need=station(c.s)<100&&station(c.s)>-700?165:300;if(d<need+250)rate=Math.min(rate,Math.max(90,b.rate+(d-need)*2.5));}return rate});
  for(let k=0;k<active.length;k++){const c=active[k];c.rate+=(targets[k]-c.rate)*(1-Math.exp(-dt*9))}
  const accepted=new Map();for(const c of [...active].sort((a,b)=>b.s-a.s)){const advance=c.rate*dt,newS=c.s+advance,lane=baseLine(newS),latRate=(lane-c.lane)/dt;
   const at=f=>pose(c.s+advance*f,c.lane+(lane-c.lane)*f,latRate*f,c.rate),safe=f=>active.every(b=>b===c||!touches(at(f),accepted.get(b.i)||b.pose));let fraction=1;
   if(!safe(1)){let lo=0,hi=1;for(let n=0;n<12;n++){const m=(lo+hi)/2;if(safe(m))lo=m;else hi=m}fraction=lo}if(!safe(fraction))fraction=0;
   const p=fraction>0?at(fraction):{...c.pose};accepted.set(c.i,p);this.apply(c,c.s+advance*fraction,c.lane+(lane-c.lane)*fraction,c.rate*fraction,p,dt);
  }
 }
 plannedLine(c,span=340){return Array.from({length:30},(_,i)=>this.plan?this.plannedPose(this.plan,c.i,Math.min(this.plan.duration,this.time-this.plan.at+i*.025)):point(c.s+i*span/29,baseLine(c.s+i*span/29)))}
}
