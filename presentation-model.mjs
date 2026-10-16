import {sortTiles} from './scoring.mjs';

// Only the local player's legal actions contribute to response emphasis.
export function responseHandIndices(hand,actions,event){
 const needed=new Map();
 for(const action of actions){
  let tiles=[];
  if(action.id.startsWith('chi:')){tiles=[...action.tiles];const i=tiles.indexOf(event?.tile);if(i>=0)tiles.splice(i,1);}
  else if(action.id==='pon')tiles=Array(2).fill(event?.tile);
  else if(action.id==='openKan')tiles=Array(3).fill(event?.tile);
  const counts=new Map();for(const t of tiles)counts.set(t,(counts.get(t)||0)+1);
  for(const [t,n]of counts)needed.set(t,Math.max(n,needed.get(t)||0));
 }
 const indices=[];hand.forEach((t,i)=>{const n=needed.get(t)||0;if(n){indices.push(i);needed.set(t,n-1);}});return indices;
}

export function settlementGroups(result,melds=[]){
 const hand=sortTiles(result.hand||[]),groups=[];
 const winIndex=result.kind==='win'&&result.method!=='flower'?hand.lastIndexOf(result.tile):-1;
 const winning=winIndex>=0?hand.splice(winIndex,1):[];
 if(hand.length)groups.push({kind:'hand',label:'暗手',tiles:hand});
 for(const m of melds)groups.push({kind:'meld',label:m.kind==='sequence'?'吃':m.kind==='triplet'?'碰':m.kind==='concealedKan'?'暗槓':m.added?'加槓':'明槓',tiles:[...m.tiles]});
 if(winning.length)groups.push({kind:'winning',label:result.method==='tsumo'?'自摸':result.method==='rob_added_kan'?'搶槓':'胡牌',tiles:winning});
 return groups;
}

// Opponents' source positions are anonymous poses, never concealed tile values.
export function meldSourcePoses(layout,seat,count){
 return layout.filter(o=>o.kind==='hand'&&o.seat===seat).slice(-count).map(o=>({...o,face:null,back:true}));
}
