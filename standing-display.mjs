// One layout for concealed cards, melds and flowers. These screen rails are
// intentionally independent from physical tile proportions and table perspective.
export const displayKey=o=>[o.seat,o.kind,o.group??'',o.index].join(':');
function shape(face,depth,standing){
 const lift=p=>[p[0]+depth[0],p[1]+depth[1]];
 const top=standing?[face[0],lift(face[0]),lift(face[1]),face[1]]:[];
 const side=standing?[face[1],lift(face[1]),lift(face[2]),face[2]]:[face[3],face[2],lift(face[2]),lift(face[3])];
 const all=[...face,...top,...side],xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);
 return {face,top,side,rect:{x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)},order:Math.round(Math.max(...ys)*100)};
}
export function opponentDisplays(cam,objects,blockers=[]){
 const map=new Map(),w=cam.width,h=cam.height;
 for(const seat of [1,2,3]){
  const list=objects.filter(o=>o.seat===seat&&['hand','meld','flower'].includes(o.kind)),north=seat===2,sign=seat===1?1:-1;
  const unit=north?w*.018:w*.0086,step=north?0:h*.0245,height=h*(north?.055:.061);
  const rails=[list.filter(o=>o.kind!=='flower'&&!o.rail),list.filter(o=>o.kind==='meld'&&o.rail===1)];
  for(const [row,items] of rails.entries()){
   const groups=new Set(items.filter(o=>o.kind==='meld').map(o=>o.group));
   const span=items.length+groups.size*.55;let cursor=0,lastGroup=null;
   for(const o of items){
    if(o.kind==='meld'&&o.group!==lastGroup){cursor+=.55;lastGroup=o.group;}
    const x=north?(w-span*unit)/2+cursor*unit:w*(seat===1?.72:.28)+sign*(cursor*unit-row*w*.035);
    const y=north?h*.23+row*h*.06-(o.kind==='meld'?h*.046:0):h*.28+cursor*step;
    let face,depth;
    if(o.kind==='hand'){
     face=[[x,y-height],[x+(north?unit:sign*unit),y+step-height],[x+(north?unit:sign*unit),y+step],[x,y]];
     if(!north&&seat===3)face=[face[1],face[0],face[3],face[2]];
     depth=north?[0,-h*.008]:[sign*w*.0045,-h*.004];
    }else{
     const dx=north?0:-sign*w*.022,dy=north?h*.038:0;
     face=[[x,y],[x+(north?unit:sign*unit),y+step],[x+(north?unit:sign*unit)+dx,y+step+dy],[x+dx,y+dy]];
     depth=[0,h*.008];
    }
    const l=shape(face,depth,o.kind==='hand');
    if(o.kind==='hand'&&seat===3)l.side=[face[0],[face[0][0]+depth[0],face[0][1]+depth[1]],[face[3][0]+depth[0],face[3][1]+depth[1]],face[3]];
    map.set(displayKey(o),{...l,standing:o.kind==='hand',faceId:o.face});cursor++;
   }
  }
 }
 // Keep flower groups together; choose a clear seat-adjacent pocket when a
 // second meld rail occupies their usual place. Never lay them over a wall.
 const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
 for(const seat of [1,2,3]){
  const flowers=objects.filter(o=>o.seat===seat&&o.kind==='flower');if(!flowers.length)continue;
  const fw=w*.014,fh=h*.035,north=seat===2;
  const candidates=north?[[.22,.145],[.22,.25],[.44,.36],[.44,.57]]:seat===1?[[.625,.30],[.625,.43],[.68,.51],[.72,.59],[.61,.62]]:[[.32,.30],[.32,.43],[.264,.51],[.224,.59],[.334,.62]];
  const occupied=[...blockers,...[...map.values()].map(l=>l.rect)];
  let best=null;
  for(const [cx,cy] of candidates){const rect={x:w*cx,y:h*cy,width:Math.min(4,flowers.length)*fw,height:Math.ceil(flowers.length/4)*h*.042};const score=occupied.reduce((n,b)=>n+overlap(rect,b),0);if(!best||score<best.score)best={rect,score};if(score<.01)break;}
  for(const [i,o] of flowers.entries()){
   const x=best.rect.x+i%4*fw,y=best.rect.y+Math.floor(i/4)*h*.042;
   map.set(displayKey(o),{...shape([[x,y],[x+fw,y],[x+fw,y+fh],[x,y+fh]],[0,h*.007],false),standing:false,faceId:o.face});
  }

 }
 return map;
}
const number=n=>Number(n.toFixed(3));
export function standingMarkup(layout){
 const {rect,face,top,side,standing,faceId}=layout,local=p=>[p[0]-rect.x,p[1]-rect.y],pts=ps=>ps.map(p=>local(p).map(number).join(',')).join(' '),f=face.map(local);
 const matrix=[f[1][0]-f[0][0],f[1][1]-f[0][1],f[3][0]-f[0][0],f[3][1]-f[0][1],...f[0]].map(number).join(' ');
 const art=!faceId?'./assets/table-v52/back-plain.webp':faceId.includes('/')?'./assets/table-v37/'+faceId+'.webp':'./assets/table-v34/glyphs/'+faceId+'.webp';
 return '<svg class="standing-display" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+number(rect.width)+' '+number(rect.height)+'" aria-hidden="true">'+(top.length?'<polygon points="'+pts(top)+'" fill="#f6edce" stroke="#d4d0af" stroke-width=".45" stroke-linejoin="round"/>':'')+'<polygon points="'+pts(side)+'" fill="#d7ccb0" stroke="#9e9d84" stroke-width=".45" stroke-linejoin="round"/><polygon points="'+pts(face)+'" fill="'+(!faceId?'#006b40':'#fff5d9')+'"/><image href="'+art+'" width="1" height="1" preserveAspectRatio="none" transform="matrix('+matrix+')"/><polygon points="'+pts(face)+'" fill="none" stroke="'+(!faceId?'#003e29':'#c9bb96')+'" stroke-width=".5" stroke-linejoin="round"/></svg>';
}
