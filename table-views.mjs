// New raster body candidates; approved face PNGs remain unchanged.
const DEPTH={
 'standing-front':{size:[1069,1471],box:[93,76,880,1329]},
 'standing-side':{size:[1069,1471],box:[140,49,789,1363]},
 'wall-flat':{size:[1069,1471],box:[46,157,978,1152]},
 'face-flat':{size:[1069,1472],box:[38,152,994,1161]}
};
function depthImage(key,extra=''){
 const d=DEPTH[key];
 return '<svg class="tile-art depth-art '+extra+'" viewBox="'+d.box.join(' ')+'" aria-hidden="true"><image href="./assets/depth-v23/'+key+'.png" width="'+d.size[0]+'" height="'+d.size[1]+'"/></svg>';
}
// Project a 512 x 704 face onto the blank upper plane; never rewrite its pixels.
function projectiveMatrix(from,to){
 const rows=[];
 for(let i=0;i<4;i++){const [x,y]=from[i],[u,v]=to[i];rows.push([x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]);}
 for(let k=0;k<8;k++){
  let pivot=k;for(let j=k+1;j<8;j++)if(Math.abs(rows[j][k])>Math.abs(rows[pivot][k]))pivot=j;
  [rows[k],rows[pivot]]=[rows[pivot],rows[k]];
  const n=rows[k][k];if(Math.abs(n)<1e-12)throw Error('Invalid face plane');
  for(let j=k;j<=8;j++)rows[k][j]/=n;
  for(let i=0;i<8;i++)if(i!==k){const n=rows[i][k];for(let j=k;j<=8;j++)rows[i][j]-=n*rows[k][j];}
 }
 const h=rows.map(r=>r[8]);
 return [h[0],h[3],0,h[6],h[1],h[4],0,h[7],0,0,1,0,h[2],h[5],0,1].map(n=>Number(n.toFixed(9))).join(',');
}
const FACE_MATRIX=projectiveMatrix([[0,0],[512,0],[512,704],[0,704]],[[146,174],[924,174],[992,1116],[78,1116]]);
export function standingBack(seat){return depthImage(seat===2?'standing-front':'standing-side',seat===1?'mirrored-back':'');}
export function flatBack(){return depthImage('wall-flat');}
export function flatFace(t){
 if(!/^(?:[1-9][mps]|[1-7]z)$/.test(t))return null;
 const d=DEPTH['face-flat'];
 return '<svg class="tile-art depth-art" viewBox="'+d.box.join(' ')+'" role="img"><image href="./assets/depth-v23/face-flat.png" width="1069" height="1472"/><image class="projected-face" href="./assets/glyphs-v23/'+t+'.png" width="512" height="704" style="transform-origin:0 0;transform:matrix3d('+FACE_MATRIX+');"/></svg>';
}
export function wallSlots({wallCount,deal,backDraws=0}){
 if(!Number.isInteger(wallCount)||wallCount<0||wallCount>144)throw Error('Invalid wall count');
 const groups=Array.from({length:4},()=>[]);
 if(deal){
  const consumedFront=144-wallCount-backDraws,removed=new Set();
  for(let n=0;n<backDraws;n++)removed.add(142-2*Math.floor(n/2)+n%2);
  for(let i=consumedFront;i<144;i++)if(!removed.has(i)){
   const p=(deal.cutIndex+i)%144,seat=[0,3,2,1][Math.floor(p/36)];
   groups[seat].push({stack:Math.floor(p%36/2),layer:p%2===0?'upper':'lower'});
  }
 }else{
  // Fixed training hands have no physical cut record. Show only their real count.
  for(let i=144-wallCount;i<144;i++){const seat=[0,3,2,1][Math.floor(i/36)];groups[seat].push({stack:Math.floor(i%36/2),layer:i%2===0?'upper':'lower'});}
 }
 return groups;
}
export function wallMarkup(game){
 const groups=wallSlots({wallCount:game.wall.length,deal:game.deal,backDraws:game.backDraws||0});
 return groups.map((slots,seat)=>'<div class="wall-rail wall-seat-'+seat+'" data-wall-seat="'+seat+'">'+slots.map(slot=>'<span class="wall-tile '+slot.layer+'" data-wall-layer="'+slot.layer+'" style="--stack:'+slot.stack+'">'+flatBack()+'</span>').join('')+'</div>').join('');
}
export function unseenWaitCounts(waits,game){
 const own=game.players[0];
 return waits.map(t=>{
  let seen=own.hand.filter(x=>x===t).length;
  for(const [seat,p] of game.players.entries()){
   seen+=p.river.filter(r=>r.tile===t&&!r.claimed).length;
   for(const meld of p.melds)if(seat===0||meld.kind!=='concealedKan')seen+=meld.tiles.filter(x=>x===t).length;
  }
  return {tile:t,count:Math.max(0,4-seen)};
 });
}

