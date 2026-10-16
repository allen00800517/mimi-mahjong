import {wallSlots} from './table-views.mjs';
export const SIZE={width:1,length:1.375,thickness:.45,radius:.065};
const {length:L,thickness:T}=SIZE;
const angles=[0,-Math.PI/2,Math.PI,Math.PI/2];
export const WALL_SCALE=.62;
const wallRails=[4.0,9.6,10.2,9.6];
export const RIVER_LAYOUT=[
 {cols:6,rows:3},{cols:4,rows:6},{cols:6,rows:3},{cols:4,rows:6}
];
function place(t,n,seat,z,rx,face,extra){const a=angles[seat];return {x:t*Math.cos(a)-n*Math.sin(a),y:t*Math.sin(a)+n*Math.cos(a),z,rz:a,rx,face,seat,...extra};}
// Pose changes the visible back, never the seat rail or horizontal direction.
function handPlace(t,n,seat,index){
 return place(t,n,seat,L/2,-Math.PI/2,null,{kind:'hand',index});
}
export function sceneFor(game,skin='character',lastEffect=null){
 const objects=[];
 wallSlots({wallCount:game.wall.length,deal:game.deal,backDraws:game.backDraws||0}).forEach((slots,seat)=>slots.forEach(s=>objects.push({...place((s.stack-8.5)*WALL_SCALE,wallRails[seat],seat,T*WALL_SCALE*(s.layer==='upper'?1.5:.5),Math.PI,null,{kind:'wall',scale:WALL_SCALE,...s}),rz:angles[seat]+Math.PI})));
 game.players.forEach((p,seat)=>{
  if(seat){
   // Concealed tiles use only the count. Their identities never enter the renderer.
   const side=seat===1||seat===3,rails=[{span:p.hand.length,groups:[]}];
   for(const [group,m] of p.melds.entries()){
    let rail=rails.at(-1),gap=rail.span ? (rail.groups.length ? .4 : .75) : 0;
    if(side&&rail.span+gap+m.tiles.length>18){rail={span:0,groups:[]};rails.push(rail);gap=0;}
    rail.groups.push({group,m,gap});rail.span+=gap+m.tiles.length;
   }
   rails.forEach((rail,row)=>{
    const rearShift=row ? .4 : Math.min(3.2,Math.max(0,13.8-rail.span/2));
    const offset=seat===1?rearShift:seat===3?-rearShift:0,normal=row?11.1:13.3;
    let cursor=-rail.span/2+.5+offset;
    if(!row)for(let index=0;index<p.hand.length;index++,cursor++)objects.push(handPlace(cursor,normal,seat,index));
    for(const {group,m,gap} of rail.groups){
     cursor+=gap;const shown=m.kind==='concealedKan'?Array(m.tiles.length).fill(null):[...m.tiles];
     if(m.kind==='sequence'&&m.calledTile){shown.splice(shown.indexOf(m.calledTile),1);shown.splice(1,0,m.calledTile);}
     shown.forEach((tile,index)=>{const hidden=m.kind==='concealedKan';objects.push({...place(cursor++,normal,seat,T/2,hidden?Math.PI:0,hidden?null:tile,{kind:'meld',group,index,rail:row}),rz:angles[seat]+(hidden?Math.PI:0)});});
    }
   });
   const flowerShift=rails.length>1?9.5:Math.min(3.2,Math.max(0,13.8-rails[0].span/2));
   const flowerOffset=seat===1?flowerShift:seat===3?-flowerShift:0;
   p.flowers.forEach((tile,index)=>objects.push(place(index-(p.flowers.length-1)/2+flowerOffset,rails.length>1?10.95:11.8,seat,T/2,0,skin+'/'+tile,{kind:'flower',tile,index})));
  }
  // Claimed discards are physically in a meld. Earlier overflow stays in the complete river dialog.
  const side=seat===1||seat===3,{cols,rows}=RIVER_LAYOUT[seat],limit=cols*rows;
  const entries=p.river.map((r,index)=>({...r,index})).filter(r=>!r.claimed);
  const page=Math.floor(Math.max(0,entries.length-1)/limit),start=page*limit;
  // Calls take the newest discard before that seat can discard again, so older
  // tiles keep their slots. Only physically present tiles consume table space.
  const visible=entries.slice(start);
  visible.forEach((r,k)=>{const col=k%cols,row=Math.floor(k/cols);let x,y;
   if(side){x=(seat===1?6.2:-6.2)+col-(cols-1)/2;y=(row-(rows-1)/2)*L;}
   else{x=col-2.5;y=(seat===0?1:-1)*((seat===0?.1:.6)+L/2+row*L);}
   objects.push({x,y,z:T/2,rz:0,rx:0,face:r.tile,kind:'river',seat,index:r.index,page:page+1,last:(game.event?.from===seat||lastEffect?.seat===seat)&&r.index===p.river.length-1});
  });
 });
 return objects;
}
export function ownMeldsFor(game){let cursor=0;const objects=[];
 game.players[0].melds.forEach((m,group)=>{const shown=[...m.tiles];if(m.kind==='sequence'&&m.calledTile){shown.splice(shown.indexOf(m.calledTile),1);shown.splice(1,0,m.calledTile);}shown.forEach((face,index)=>objects.push({x:cursor++,y:0,z:T/2,rx:0,rz:0,face,kind:'meld',seat:0,group,index}));cursor+=.4;});
 const span=Math.max(1,cursor-.4);objects.forEach(o=>o.x-=(span-1)/2);return {objects,span};
}
