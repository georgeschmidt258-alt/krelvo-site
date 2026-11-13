export function startPreview({step,restart}){
 const $=id=>document.getElementById(id),colors=['#32a2ff','#ff4d67','#a2b0c4','#b17cff'];
 let paused=matchMedia('(prefers-reduced-motion: reduce)').matches,parentActive=window.parent===window,failed=false,last=null,raf=null,lastHud=-Infinity;
 const status=$('cars-status');status.innerHTML=colors.map((c,i)=>`<div class="car-status" style="--color:${c}"><i></i><span>${['BLUE','RED','BLACK','PURPLE'][i]}</span><b>RACING</b></div>`).join('');
 function updateButton(){$('pause').textContent=paused?'Play':'Pause';$('pause').setAttribute('aria-label',paused?'Play animation':'Pause animation');$('pause').setAttribute('aria-pressed',String(paused));document.body.classList.toggle('paused',paused)}
 function paint(dt,time=performance.now()){
  try{const state=step(dt);if(time-lastHud>100||dt===0){$('headline').textContent=state.headline;$('detail').textContent=state.detail;state.cars.forEach((car,i)=>{const el=status.children[i];el.classList.toggle('out',car.out);el.querySelector('b').textContent=car.detail;});lastHud=time;}}
  catch(error){failed=true;$('error').hidden=false;console.error('Preview render failed:',error);}
 }
 function tick(now){raf=null;const dt=last===null?0:Math.min(.05,(now-last)/1000);last=now;paint(dt,now);if(!paused&&parentActive&&!document.hidden&&!failed)raf=requestAnimationFrame(tick);else last=null;}
 function schedule(){if(raf!==null)cancelAnimationFrame(raf);raf=null;last=null;if(!paused&&parentActive&&!document.hidden&&!failed)raf=requestAnimationFrame(tick);else paint(0);}
 $('pause').onclick=()=>{paused=!paused;updateButton();schedule()};
 $('restart').onclick=()=>{restart();paint(0);schedule()};
 $('expand').onclick=async()=>{try{if(document.fullscreenElement){await document.exitFullscreen()}else if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen()}else{window.open(location.href,'_blank','noopener')}}catch{window.open(location.href,'_blank','noopener')}};
 window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='krelvo-preview-visibility')return;parentActive=!!e.data.visible;schedule()});
 document.addEventListener('visibilitychange',schedule);window.addEventListener('krelvo-art-ready',()=>paint(0));new ResizeObserver(()=>paint(0)).observe(document.body);updateButton();paint(0);schedule();
 parent.postMessage({type:'krelvo-preview-ready'},location.origin);
}
