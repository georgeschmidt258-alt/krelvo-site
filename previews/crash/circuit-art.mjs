import{WORLD}from'./circuit.mjs';
export class CircuitArt{
 constructor(){this.ready=false;this.error=false;if(typeof Image!=='undefined'){const image=new Image();image.onload=()=>this.setImage(image);image.onerror=()=>{this.error=true};image.src=new URL('./circuit.svg',import.meta.url).href}}
 setImage(image){this.image=image;this.ready=true;globalThis.dispatchEvent?.(new Event("krelvo-art-ready"))}
 draw(c){if(this.ready)c.drawImage(this.image,0,0,WORLD.width,WORLD.height)}
 animate(){}
}