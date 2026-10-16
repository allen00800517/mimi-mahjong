// Taiwanese immediate-discard and own-latest-discard call restrictions.
export function chowCompletionTiles(sequence,incoming){
 const need=[...sequence];need.splice(need.indexOf(incoming),1);
 const [a,b]=need.sort(),suit=incoming[1],low=+a[0],high=+b[0];
 if(high-low!==1)return [incoming];
 return [low-1,high+1].filter(n=>n>=1&&n<=9).map(n=>n+suit);
}
export function forbiddenDiscards(call){
 if(!call)return [];
 return call.kind==='pon'?[call.tile]:chowCompletionTiles(call.tiles,call.tile);
}
export function canCallAndDiscard(player,kind,tile,tiles){
 const blocked=forbiddenDiscards({kind,tile,tiles});
 if(blocked.includes(player.river.at(-1)?.tile))return false;
 const remaining=[...player.hand],used=[...tiles];
 used.splice(used.indexOf(tile),1);
 for(const t of used){const i=remaining.indexOf(t);if(i<0)return false;remaining.splice(i,1);}
 return remaining.some(t=>!blocked.includes(t));
}
