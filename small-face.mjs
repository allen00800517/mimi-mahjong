// Optical sizing only: keep the same texture and ease the adjustment out as it grows.
export function smallManFace(o,screenScale=1){
 if(o.kind!=='meld'||![1,2,3].includes(o.seat)||o.back||!(/^[1-9]m$/).test(o.face||''))return 0;
 const edge=Math.min(Math.hypot(...o.u),Math.hypot(...o.v))*screenScale;
 return Math.max(0,Math.min(1,(28-edge)/10));
}
