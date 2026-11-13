// This is the SAME 208-unit asphalt stroke as CircuitArt, not a second track.
import {point,length,ROAD_HALF_WIDTH,clamp,wrapAngle} from './circuit.mjs';
export const ROAD_MARGIN=7;
export const MAX_OFFSET=54;
// Harbor Circuit plan; linked changes of direction share a corner exit/entry.
export const cornerStations=[
 [0,50],[480,50],[760,-48],[1110,50],[1290,50],[1540,-48],
 [1800,-45],[2080,-48],[2390,48],[2660,48],[2850,50],
 [3130,-48],[3550,-48],[3720,-48],[3840,45],[4020,48],
 [4260,-48],[4560,50],[length,50]
];
export const corners=[{entry:480,apex:760,exit:1110,sign:-1},{entry:2080,apex:2390,exit:2660,sign:1},{entry:4020,apex:4260,exit:4560,sign:-1}];
export const modulo=s=>(s%length+length)%length;
export const signedDistance=(a,b)=>modulo(b-a+length/2)-length/2;
const smooth=t=>t*t*t*(10+t*(-15+6*t));
export function preferredOffset(s){
 s=modulo(s);let i=0;while(cornerStations[i+1][0]<s)i++;
 const a=cornerStations[i],b=cornerStations[i+1];return a[1]+(b[1]-a[1])*smooth((s-a[0])/(b[0]-a[0]));
}
export function routePoint(s,offset=preferredOffset(s)){return point(s,offset)}
export function routeGeometry(s,offsetAt=preferredOffset){
 const a=point(s-4,offsetAt(s-4)),p=point(s,offsetAt(s)),b=point(s+4,offsetAt(s+4));
 const u={x:p.x-a.x,y:p.y-a.y},v={x:b.x-p.x,y:b.y-p.y};
 return {...p,a:Math.atan2(b.y-a.y,b.x-a.x),curvature:2*(u.x*v.y-u.y*v.x)/Math.max(1,Math.hypot(u.x,u.y)*Math.hypot(v.x,v.y)*Math.hypot(b.x-a.x,b.y-a.y))};
}
// Nearest centerline station restricted to the current road section, so a
// nearby parallel section cannot make a body outside its own road look valid.
export function roadDistance(x,y,s){
 let lo=s-100,hi=s+100;
 for(let n=0;n<16;n++){const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3,p=point(a),q=point(b);if((p.x-x)**2+(p.y-y)**2<(q.x-x)**2+(q.y-y)**2)hi=b;else lo=a}
 const p=point((lo+hi)/2);return Math.hypot(p.x-x,p.y-y);
}
export function roadBoundaries(step=12){const left=[],right=[];for(let s=0;s<=length;s+=step){left.push(point(s,-ROAD_HALF_WIDTH));right.push(point(s,ROAD_HALF_WIDTH))}return{left,right}}
export {ROAD_HALF_WIDTH,clamp,wrapAngle};
