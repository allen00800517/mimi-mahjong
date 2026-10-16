import {meldWidth,meldDisplay} from './meld-layout.mjs';
/** Logical screen space. Every tile, hit target and animation shares this layout. */
export const VIEW={width:854,height:394};
export const RIVERS=[{x:362,y:221,cols:6,height:72},{x:512,y:164,cols:4,height:129},{x:362,y:129,cols:6,height:87},{x:260,y:164,cols:4,height:129}];
export function riverLayout(seat,count){
 const r=RIVERS[seat],rows=Math.max(1,Math.ceil(count/r.cols)),gap=2;
 const width=Math.min(21.5,(r.height-(rows-1)*gap)/rows/(1.1+3.8/21.5)),depth=width*3.8/21.5;
 return {...r,rows,width,depth,dx:width+gap,dy:width*1.1+depth+gap};
}
export const TILE={length:1.375,thickness:.36,standingHeight:25};
export const FLOWER_SCALE=.92;
export const FLOWER_GAP=.8;
// Projected table-contact rails; upright and exposed tiles share these directions.
export const SIDE_RAILS={1:[.8,1],3:[-.8,1]};
// Both exposed sets and flowers use this exact projected solid, uniformly scaled.
export function exposedBasis(seat,scale=1){
 if(seat===1||seat===3)return {u:SIDE_RAILS[seat].map(n=>n*11.33*scale),v:[24*scale,0],d:[0,25*TILE.thickness/TILE.length*scale],flipU:seat===1,flipV:seat===3};
 return {u:[14.15*scale,0],v:[0,17.5*scale],d:[0,23*scale*TILE.thickness/TILE.length],flipU:seat===2,flipV:seat===2};
}
export const tileKey=o=>[o.kind,o.seat,o.group??'',o.index??'',o.stack??'',o.layer??''].join(':');
const add=(a,b,k=1)=>a.map((v,i)=>v+b[i]*k);
export function tilePoint(o,x,y,z){return add(add(add(o.origin,o.u,x+.5),o.v,(y+TILE.length/2)/TILE.length),o.d,(TILE.thickness/2-z)/TILE.thickness);}
export function facePlane(o){return [[0,0],[1,0],[1,1],[0,1]].map(([x,y])=>[o.flipU?1-x:x,o.flipV?1-y:y]).map(([x,y])=>add(add(o.origin,o.u,x),o.v,y));}
export function tileBounds(o){const p=[...facePlane(o),...facePlane(o).map(p=>add(p,o.d))],xs=p.map(p=>p[0]),ys=p.map(p=>p[1]);return{x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};}
function tile(origin,u,v,d,extra){const o={origin,u,v,d,...extra};o.key=tileKey(o);o.rect=tileBounds(o);o.plane=facePlane(o);o.depth=origin[1]+Math.max(0,u[1])+Math.max(0,v[1]);return o;}
// A small physical seam separates adjacent standing tiles; slot pitch stays fixed.
function standing(origin,step,height,d,extra){const inset=.025;return tile(add(origin,step,inset),step.map(v=>v*(1-inset*2)),[0,height],d,extra);}
export function foregroundFor(game){
 const p=game.players[0],meldCount=p.melds.reduce((n,m)=>n+meldWidth(m),0),gaps=Math.max(0,p.melds.length-1)*7;
 const handCount=p.hand.length,units=handCount+meldCount*.92;
 const unit=Math.min(42,(790-gaps-(meldCount?9:0)-7)/Math.max(17,units)),meldUnit=unit*.92;
 const meldSpan=meldCount?meldCount*meldUnit+gaps+9:0,span=handCount*unit+meldSpan+(game.drawn&&game.turn===0?7:0);
 return {unit,meldUnit,meldSpan,span,left:(854-span)/2,bottom:30};
}
export function tableLayout(game,skin='character',lastEffect=null){
 const objects=[];
 const latest=game.event?.type==='discard'?{seat:game.event.from,tile:game.event.tile}:game.event?null:lastEffect;
 for(const [seat,p] of game.players.entries()){
  if(seat===1||seat===3){
   // One physical model and one far-end anchor, reflected around the table center.
   // Exposed sets keep their established ordering: left far, right near.
   const rail=SIDE_RAILS[seat],sign=seat===1?1:-1,height=21,pitch=9.296,flatPitch=11.33,flatDepth=25*TILE.thickness/TILE.length;
   const count=p.melds.reduce((n,m)=>n+meldWidth(m),0),gap=flatDepth+1.6;
   const span=count*flatPitch+Math.max(0,p.melds.length-1)*gap,reserved=Math.max(p.hand.length,17-p.melds.length*3);
   const extent=height+reserved*pitch+(count?span+height+5:0),scale=Math.min(1,181/extent);
   const far=[seat===1?584:270,100+height*scale],handOffset=seat===3&&count?span+height+5:0;
   const handFoot=add(far,rail,handOffset*scale),step=rail.map(n=>n*pitch*scale),start=[handFoot[0],handFoot[1]-height*scale];
   p.hand.forEach((_,index)=>objects.push(standing(add(start,step,index),step,height*scale,[sign*24*TILE.thickness/TILE.length*2*scale,-24*TILE.thickness/TILE.length*2*.24*scale],{kind:'hand',seat,index,back:true,flipU:seat===3})));
   const flatStep=rail.map(n=>n*flatPitch*scale),flatStart=seat===3?far:add(far,rail,(p.hand.length*pitch+flatDepth+3.1)*scale);let cursor=0;
   for(const[group,m]of p.melds.entries()){let middle;
    meldDisplay(m,seat).forEach(({face,index,slot,raised,back})=>{
     const contact=raised?middle:add(flatStart,flatStep,cursor++),origin=[contact[0]-(seat===3?24*scale:0),contact[1]-flatDepth*scale];
     const b=exposedBasis(seat,scale);
     if(index===1)middle=contact;const o=tile(raised?add(origin,b.d,-1):origin,b.u,b.v,b.d,{kind:'meld',seat,group,index,flipU:b.flipU,flipV:b.flipV,back,face:back?null:face});
     if(raised){o.raised=true;o.depth+=b.d[1]+4;}objects.push(o);
    });cursor+=gap/flatPitch;
   }
  }else if(seat===2){
   const scale=17/(17+p.melds.length*.85),start=[319,82],step=[14.15*scale,0],oldHeight=23*scale,height=oldHeight*.85,flatLength=17.5*scale,flatDepth=oldHeight*TILE.thickness/TILE.length;
   const handStart=add(start,[0,oldHeight-height]);
   p.hand.forEach((_,index)=>objects.push(standing(add(handStart,step,index),step,height,[0,-flatLength*TILE.thickness/TILE.length],{kind:'hand',seat,index,back:true,flipU:false})));
   const firstFlat=add(add(start,step,p.hand.length+.85),[0,1]);let cursor=0;
   for(const[group,m]of p.melds.entries()){let middle;
    const b=exposedBasis(seat,scale);
    meldDisplay(m,seat).forEach(({face,index,slot,raised,back})=>{const origin=raised?middle:add(firstFlat,step,cursor++);if(index===1)middle=origin;const o=tile(raised?add(origin,b.d,-1):origin,b.u,b.v,b.d,{kind:'meld',seat,group,index,flipU:b.flipU,flipV:b.flipV,back,face:back?null:face});if(raised){o.raised=true;o.depth+=b.d[1]+4;}objects.push(o);});cursor+=.85;
   }
  }
  // Fixed compact shelves, reserved for all eight flowers. Side glyphs face inward
  // like their exposed tiles; the top seat is rotated toward its own table edge.
  p.flowers.forEach((face,index)=>{
   const row=Math.floor(index/4),col=index%4,extra={kind:'flower',seat,index,flowerRow:row,face:'compact/'+face};
   const b=exposedBasis(seat,FLOWER_SCALE*(seat===0?1.3:1));
   const flowerAt=origin=>tile(origin,b.u,b.v,b.d,{...extra,flipU:b.flipU,flipV:b.flipV});
   if(seat===1||seat===3){
    // Reference: left flowers at the far end, right flowers at the near end.
    // Pack faces like exposed sets. Adjacent projected sidewalls can hide each other.
    const pitch=b.u[1]+FLOWER_GAP;
    const origin=seat===3?[296+row*28-col*.8*pitch,106+col*pitch]:[637-row*28+col*.8*pitch,223+col*pitch];
    objects.push(flowerAt(origin));
   }else if(seat===2)objects.push(flowerAt([506+col*(b.u[0]+FLOWER_GAP),108+row*(b.v[1]+b.d[1]+FLOWER_GAP)]));
   else objects.push(flowerAt([185+col*(b.u[0]+FLOWER_GAP),292.5-b.v[1]-b.d[1]-row*(b.v[1]+b.d[1]+FLOWER_GAP)]));
  });
  const entries=p.river.map((r,index)=>({...r,index})).filter(r=>!r.claimed),r=riverLayout(seat,entries.length);
  entries.forEach((r0,index)=>objects.push(tile([r.x+(index%r.cols)*r.dx,r.y+Math.floor(index/r.cols)*r.dy],[r.width,0],[0,r.width*1.1],[0,r.depth??3.8],{kind:'river',seat,index:r0.index,face:r0.tile,page:1,last:latest?.seat===seat&&latest.tile===r0.tile&&r0.index===p.river.length-1})));
 }
 return objects;
}
