// Forced landscape: on a phone held upright the whole page is rotated 90° (game top toward the right edge),
// like native mahjong apps. Game code works in "virtual" landscape coordinates; these helpers convert
// the browser's screen-space rects and pointer positions into that space. Outside forced mode they are identity.
export const forcedLandscape=()=>typeof document!=='undefined'&&!!document.documentElement?.classList?.contains('force-landscape');
// v0.98 · An iPhone home-screen app sometimes reports innerHeight without the status bar (and fires no resize when it
// corrects), which left a black band along one edge. A home-screen app always covers the whole screen, so there the
// screen size wins when it is only slightly larger. navigator.standalone exists only on iOS, so nothing else changes.
export function screenSize(){
 let w=innerWidth,h=innerHeight;const sw=globalThis.screen?.width,sh=globalThis.screen?.height;
 if(globalThis.navigator?.standalone===true&&sw&&sh){const a=Math.min(sw,sh),b=Math.max(sw,sh),W=w<=h?a:b,H=w<=h?b:a;if(W>=w&&W-w<=120)w=W;if(H>=h&&H-h<=120)h=H;}
 return {width:w,height:h};
}
let applied='';
// Writes --screen-w/--screen-h; true when they changed.
export function applyScreenSize(){const {width,height}=screenSize(),key=width+'x'+height;if(key===applied)return false;applied=key;const d=document.documentElement.style;d.setProperty('--screen-w',width+'px');d.setProperty('--screen-h',height+'px');return true;}
export const wantsForcedLandscape=()=>{const v=screenSize();return v.height>v.width&&matchMedia('(pointer: coarse)').matches;};
// Physical width of the screen = virtual height (body is 100vw tall when rotated).
const screenWidth=()=>document.body.getBoundingClientRect().right;
export function viewSize(){const v=screenSize();return forcedLandscape()?{width:v.height,height:v.width}:v;}
export function rectOf(el){
 const r=el.getBoundingClientRect();if(!forcedLandscape())return r;
 const W=screenWidth(),x=r.top,y=W-r.right,width=r.height,height=r.width;
 return {x,y,left:x,top:y,width,height,right:x+width,bottom:y+height};
}
export function pointOf(clientX,clientY){return forcedLandscape()?{x:clientY,y:screenWidth()-clientX}:{x:clientX,y:clientY};}
