// Optical proportions only for side-seat concealed hands. Flat tiles retain their model.
export const SIDE_STANDING=Object.freeze({height:.84,width:1.12,thickness:2,top:.24});
const add=(a,b,k=1)=>a.map((n,i)=>n+b[i]*k);
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function hull(points){const sorted=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),lower=[],upper=[];for(const p of sorted){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}for(const p of sorted.reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}return lower.slice(0,-1).concat(upper.slice(0,-1));}
function points(o){const face=[o.origin,add(o.origin,o.u),add(add(o.origin,o.u),o.v),add(o.origin,o.v)];return [...face,...face.map(p=>add(p,o.d))];}
function bounds(p){return [Math.min(...p.map(p=>p[0])),Math.min(...p.map(p=>p[1])),Math.max(...p.map(p=>p[0])),Math.max(...p.map(p=>p[1]))];}
function overlaps(a,b){for(const poly of [a,b])for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],normal=[q[1]-p[1],p[0]-q[0]],dot=p=>p[0]*normal[0]+p[1]*normal[1],aa=a.map(dot),bb=b.map(dot);if(Math.min(...aa)>=Math.max(...bb)-.1||Math.min(...bb)>=Math.max(...aa)-.1)return false;}return true;}
export function sideStanding(objects,game,finish){
 const replacements=new Map();
 for(const seat of [1,3]){
  const row=objects.filter(o=>o.kind==='hand'&&o.seat===seat);if(!row.length)continue;
  const count=Math.max(row.length,17-game.players[seat].melds.length*3),first=row[0],pitch=first.u.map(n=>n/.95),foot=add(first.origin,first.v);
  // A fixed reserved endpoint (including a future draw) prevents the row shifting on draw.
  const anchor=seat===1?add(foot,pitch,count-.05):foot;
  function pose(index,width){const oldFoot=add(foot,pitch,index),newFoot=anchor.map((n,i)=>n+(oldFoot[i]-n)*width),v=first.v.map(n=>n*SIDE_STANDING.height),d=[first.d[0]*SIDE_STANDING.thickness,-Math.abs(first.d[0]*SIDE_STANDING.thickness)*SIDE_STANDING.top];return {...first,origin:newFoot.map((n,i)=>n-v[i]),u:first.u.map(n=>n*width),v,d};}
  // Broad-phase envelopes avoid per-tile searches. Own melds share the fixed contact rail.
  const blockers=objects.filter(o=>o.kind!=='hand'&&!(o.kind==='meld'&&o.seat===seat)).map(o=>{const polygon=hull(points(o));return {polygon,rect:bounds(polygon)};});
  const safe=width=>{const polygon=hull([...points(pose(0,width)),...points(pose(count-1,width))]),r=bounds(polygon);if(r[0]<0||r[1]<0||r[2]>854||r[3]>292)return false;return !blockers.some(b=>r[0]<b.rect[2]&&r[2]>b.rect[0]&&r[1]<b.rect[3]&&r[3]>b.rect[1]&&overlaps(polygon,b.polygon));};
  let width=SIDE_STANDING.width;
  if(!safe(width)){let lo=.9,hi=width;for(let i=0;i<12;i++){const mid=(lo+hi)/2;if(safe(mid))lo=mid;else hi=mid;}width=Math.max(.9,lo-.001);}
  for(const o of row){const p=pose(o.index,width);replacements.set(o.key,finish({...o,origin:p.origin,u:p.u,v:p.v,d:p.d}));}
 }
 return objects.map(o=>replacements.get(o.key)||o);
}
