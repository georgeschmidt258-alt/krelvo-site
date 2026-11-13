// Driving geometry only: no outcomes, timers, multiplier or wager data.
import {point,length,wrapAngle,clamp} from './circuit.mjs';
const smooth=t=>{t=clamp(t,0,1);return t*t*t*(10+t*(-15+6*t))};
// Entry / apex / exit anchors matched to the visible circuit. Linked bends
// share one transition rather than making an unnecessary trip to the outside.
export const anchors=[[-600,-43],[100,-43],[400,0],[610,-32],[880,30],
 [1090,30],[1310,-30],[1520,25],[1750,-28],[1910,-15],[2040,-28],
 [2160,10],[2370,29],[2590,-22],[2810,27],[2940,8],[3090,-27],
 [3290,12],[3490,29],[3650,25],[3870,27],[4090,-27],[4330,-25],
 [4570,30],[4800,30],[4990,-30],[length-600,-43]];
export function cornerOffset(s){s=((s+600)%length+length)%length-600;let i=0;while(i<anchors.length-2&&anchors[i+1][0]<s)i++;const a=anchors[i],b=anchors[i+1];return a[1]+(b[1]-a[1])*smooth((s-a[0])/(b[0]-a[0]));}
export function routePose(s,offset=cornerOffset(s)){const p=point(s,offset),a=point(s-2,cornerOffset(s-2)),b=point(s+2,cornerOffset(s+2));return{...p,a:Math.atan2(b.y-a.y,b.x-a.x)}}
// Braking looks only at road geometry. Bounded speed changes preserve arcade pace.
function rawCornerSpeed(s){let bend=0;for(const look of[0,60,120])bend=Math.max(bend,Math.abs(wrapAngle(routePose(s+look+18).a-routePose(s+look-18).a))/36);return clamp(Math.sqrt(1800/Math.max(.001,bend)),400,1200);}

const resolution=4,speeds=Array.from({length:Math.ceil(length/resolution)+1},(_,i)=>rawCornerSpeed(i*resolution));
export function cornerSpeed(s){s=(s%length+length)%length;const i=Math.floor(s/resolution),t=s/resolution-i;return speeds[i]+(speeds[i+1]-speeds[i])*t}
