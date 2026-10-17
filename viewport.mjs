// Forced landscape: on a phone held upright the whole page is rotated 90° (game top toward the right edge),
// like native mahjong apps. Game code works in "virtual" landscape coordinates; these helpers convert
// the browser's screen-space rects and pointer positions into that space. Outside forced mode they are identity.
export const forcedLandscape=()=>typeof document!=='undefined'&&!!document.documentElement?.classList?.contains('force-landscape');
export const wantsForcedLandscape=()=>innerHeight>innerWidth&&matchMedia('(pointer: coarse)').matches;
// Physical width of the screen = virtual height (body is 100vw tall when rotated).
const screenWidth=()=>document.body.getBoundingClientRect().right;
export function viewSize(){return forcedLandscape()?{width:innerHeight,height:innerWidth}:{width:innerWidth,height:innerHeight};}
export function rectOf(el){
 const r=el.getBoundingClientRect();if(!forcedLandscape())return r;
 const W=screenWidth(),x=r.top,y=W-r.right,width=r.height,height=r.width;
 return {x,y,left:x,top:y,width,height,right:x+width,bottom:y+height};
}
export function pointOf(clientX,clientY){return forcedLandscape()?{x:clientY,y:screenWidth()-clientX}:{x:clientX,y:clientY};}
