import{RaceScene}from'./crash/race-scene.mjs';
import{startPreview}from'./runtime.mjs';
const canvas=document.getElementById('track'),scene=new RaceScene(canvas);let elapsed=0,clock=0,order=[1,3,0,2];const names=['BLUE','RED','BLACK','PURPLE'];
function reset(){elapsed=0;scene.reset();order=[0,1,2,3];for(let i=3;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}}
startPreview({step(dt){if(!scene.ready){scene.state={phase:'racing',selected:-1,eliminated:[false,false,false,false],now:clock};scene.draw(clock,0);if(scene.art.error)throw Error('Unable to load the circuit');return{headline:'PREPARING CIRCUIT',detail:'LOADING CURRENT TRACK',cars:names.map(label=>({label,detail:'READY',out:false}))}}
 elapsed+=dt;clock+=dt*1000;if(elapsed>35.5)reset();const thresholds=[13.2,21.8,27.4,32.2];const eliminated=names.map((_,i)=>elapsed>=thresholds[order.indexOf(i)]);
 scene.update(dt,{now:clock,phase:'racing',selected:-1,eliminated});scene.draw(clock,dt);
 return{headline:Math.exp(Math.min(elapsed,32.2)*.075).toFixed(2)+'×',detail:eliminated.every(Boolean)?'ROUND COMPLETE · RESTARTING':'CRASH · '+eliminated.filter(x=>!x).length+' CARS RUNNING',cars:names.map((label,i)=>({label,detail:eliminated[i]?'CRASHED':'RACING',out:eliminated[i]}))};},restart:reset});
