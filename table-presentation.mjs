import {rectOf} from './viewport.mjs';
import {actionSequence} from './action-sequence.mjs';
import {MOTION} from './motion-timeline.mjs';
import {meldSourcePoses} from './presentation-model.mjs';
// Owns the presentation of an already committed legal game action; never changes game state.
export function createTablePresenter({tableView,getGame,getSelectedIndex,getPresentation,setPresentation,clearTimer,clearEffects,render,reduced,paused,sound,syncSound,names,characterSprite,positionCallout,animatedResident=()=>false}){
 const $=id=>document.getElementById(id),seatNode=s=>document.getElementById(['south','east','north','west'][s]);
 const bounds=el=>{if(!el)return null;const r=rectOf(el);return {x:r.x,y:r.y,width:r.width,height:r.height};};
function captureTable(s,id){
 const game=getGame(),selectedIndex=getSelectedIndex();
 return {layout:tableView.captureLayout(),phase:game.phase,turn:game.turn,drawn:game.drawn,wall:game.wall.length,wallTiles:tableView.wallTiles(),handCounts:game.players.map(p=>p.hand.length),event:game.event?{from:game.event.from,tile:game.event.tile}:null,
 states:game.players.map(p=>p.state),flowers:game.players.map(p=>[...p.flowers]),counts:game.players.map(p=>p.melds.length),kinds:game.players.map(p=>p.melds.map(m=>m.kind)),
 selected:bounds(document.querySelector('.hand [data-hand-index="'+selectedIndex+'"]')),
 hands:Array.from(document.querySelectorAll('.hand .tile')).map(el=>({tile:el.dataset.tile,index:Number(el.dataset.handIndex),rect:bounds(el)})),
 backs:[0,1,2,3].map(seat=>tableView.objectFor(seatNode(seat).querySelector('.back:last-child'))||bounds(seatNode(seat).querySelector('.back:last-child'))),
 river:game.event?(tableView.objectFor(document.getElementById('river-'+game.event.from).lastElementChild)||bounds(document.getElementById('river-'+game.event.from).lastElementChild)):null};
}
function presentTable(before,seat,id){
 const game=getGame(),selectedIndex=getSelectedIndex();
 const isDiscard=/^(discard|declare):/.test(id),call=game.players.some((p,s)=>p.melds.length>before.counts[s]||p.melds.some((m,i)=>m.kind!==before.kinds[s][i]));
 if(!isDiscard||reduced())sound.play(isDiscard?'discard':call?'call':'select');syncSound();
 if(reduced()||paused())return;
 const changed=game.players.flatMap((p,s)=>p.melds.flatMap((m,i)=>i>=before.counts[s]?[{m,added:true}]:m.kind!==before.kinds[s][i]?[{m,added:false}]:[]))[0];
 const meldTiles=changed?(changed.added?changed.m.tiles.length:1):0,m=changed?.m;
 const calledIndex=changed?.added&&Number.isInteger(m.from)&&m.calledTile?(m.kind==='sequence'?m.tiles.indexOf(m.calledTile):1):-1;
 const newFlowers=game.players.flatMap((p,s)=>p.flowers.flatMap((t,i)=>before.flowers[s].includes(t)?[]:[{seat:s,tile:t,index:i}]));
 const sequence=actionSequence({discard:isDiscard,meldTiles,calledIndex,flowers:newFlowers.length});
 const animations=[tableView.animateLayout(before.layout,{handDelay:sequence.handDelay})],arrivals=[],ticket={};setPresentation(ticket);clearTimer();document.body.classList.add('moving-tiles');
 if(isDiscard)document.body.classList.add('discard-in-flight');
 if(sequence.hold)animations.push(tableView.hold(sequence.hold));
 const animate=(el,frames,ms,delay=0)=>{const a=el.animate(frames,{duration:ms,delay,fill:'both',easing:'cubic-bezier(.2,.7,.25,1)'});animations.push(a.finished.catch(()=>{}));};
 function fly(t,start,end,angle=0,{back=false,draw=false,meld=false,flower=false,delay=0}={}){const to=bounds(end);if(!start||!to||to.width<1)return;end.classList.add("motion-arrival");arrivals.push(end);const movement=tableView.fly(t,start,end,{back,draw,meld,flower,onContact:()=>{if(getPresentation()!==ticket)return;if(isDiscard&&!draw&&!flower)document.body.classList.remove("discard-in-flight");sound.play(draw?"draw":meld||flower?"place":"discard");syncSound();},delay:draw?sequence.drawDelay:meld?sequence.meldLead+delay:delay});animations.push(movement);}

 if(isDiscard){const t=id.split(':')[1],end=document.getElementById('river-'+seat).lastElementChild;fly(t,seat===0?before.selected:before.backs[seat],end,[0,-90,180,90][seat]);}
 // With no visible wall, a new tile enters over a short distance beside its hand.
 const drawOrigin=end=>{if(!end)return null;const o=tableView.objectFor(end);if(o)return {...o,origin:o.origin.map((n,i)=>n+o.u[i]*.6-o.v[i]*.2)};const r=bounds(end);return {...r,x:r.x+r.width*.6,y:r.y-r.height*.2};};
 // Public flowers arrive one by one before their replacement hand tile.
 for(const [i,f]of newFlowers.entries()){
  const end=(f.seat===0?$('self-flowers'):seatNode(f.seat)).querySelectorAll('.flower-tile')[f.index];
  fly('compact/'+f.tile,drawOrigin(end),end,0,{flower:true,delay:sequence.flowerDelay+i*sequence.flowerStep});
 }
 if(before.wall!==game.wall.length&&game.phase==='turn'&&game.turn!==0&&!!game.drawn){
  const end=seatNode(game.turn).querySelector('.back:last-child');fly(null,drawOrigin(end),end,0,{back:true,draw:true});
 }
 const usedHands=[...before.hands];
 if(isDiscard&&seat===0){ // Match the captured rectangle; selection has already been cleared.
  const captured=usedHands.findIndex(x=>before.selected&&Math.abs(x.rect.x-before.selected.x)<.1);
  if(captured>=0)usedHands.splice(captured,1);}
 for(let s=0;s<4;s++){
  const p=game.players[s],added=p.melds.length>before.counts[s],upgraded=p.melds.some((m,i)=>m.kind!==before.kinds[s][i]&&i<before.counts[s]);
  if(!added&&!upgraded)continue;
  const mi=added?p.melds.length-1:p.melds.findIndex((m,i)=>m.kind!==before.kinds[s][i]),m=p.melds[mi],group=(s===0?$('self-meld-dock'):seatNode(s)).querySelector('[data-meld-index="'+mi+'"]');if(!group)continue;
  const called=!upgraded&&Number.isInteger(m.from)&&m.calledTile;
  const sourcePoses=meldSourcePoses(before.layout,s,upgraded?1:m.tiles.length-(called?1:0));let sourceIndex=0;
  for(const [ti,end] of [...group.querySelectorAll('.tile')].entries()){
   const t=end.dataset.tile,hidden=end.classList.contains('concealed-card');if(!t&&!hidden)continue;
   const delay=sequence.meldDelays[upgraded?0:ti]??0;
   if(!upgraded&&end.classList.contains('claimed-in-meld')){fly(t,before.river,end,[0,-90,180,90][s],{meld:true,delay});continue;}
   if(upgraded&&ti!==m.tiles.length-1)continue;
   const found=s===0?usedHands.findIndex(x=>x.tile===t):-1,from=found>=0?usedHands.splice(found,1)[0].rect:sourcePoses[sourceIndex++];fly(t,from,end,[0,-90,180,90][s],{back:hidden,meld:true,delay});
  }
  showCall(m.kind==='sequence'?'吃':m.kind==='triplet'?'碰':'槓',s);
 }
 function showCall(text,s){const badge=document.createElement('div');badge.className='callout';badge.innerHTML=text+'<small>'+names()[s]+'</small>';$('effects').append(badge);positionCallout(badge,s);animate(badge,[{opacity:0,transform:'translate(-50%,-50%) scale(.8)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.2},{opacity:1,offset:.65},{opacity:0,transform:'translate(-50%,-50%) scale(1)'}],MOTION.call);
  let performer=seatNode(s).querySelector('.character-stage');if(s===0){performer=document.createElement('div');performer.className='call-performer';performer.innerHTML='<img src="'+characterSprite(s,'front')+'" alt="" draggable="false">';$('effects').append(performer);animate(performer,[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)',offset:.2},{opacity:1,offset:.65},{opacity:0,transform:'translateY(0)'}],MOTION.call);}else if(performer&&!animatedResident(s))animate(performer,[{transform:'translateY(0)',filter:'drop-shadow(0 3px 4px #0005)'},{transform:'translateY(-3px)',filter:'drop-shadow(0 0 6px #ffe0a0)',offset:.25},{transform:'translateY(0)',filter:'drop-shadow(0 3px 4px #0005)'}],MOTION.call);
 }
 for(let s=0;s<4;s++)if(before.states[s]==='S0'&&game.players[s].state!=='S0')showCall('聽',s);
 // Cards which remain in the hand move from their old places, rather than teleporting.
 const oldPositions=[...usedHands];
 for(const el of document.querySelectorAll('.hand .tile')){
  const draw=el.classList.contains('drawn')&&(before.wall!==game.wall.length||before.turn!==game.turn||before.phase!=='turn');
  if(draw){fly(el.dataset.tile,drawOrigin(el),el,0,{draw:true});continue;}
  const i=oldPositions.findIndex(x=>x.tile===el.dataset.tile);if(i<0)continue;const old=oldPositions.splice(i,1)[0].rect,now=bounds(el),scale=Number($('game-shell').style.getPropertyValue('--stage-scale'))||1,dx=(old.x-now.x)/scale,dy=(old.y-now.y)/scale;
  const sx=old.width/now.width,sy=old.height/now.height;
  if(Math.abs(dx)+Math.abs(dy)>2||Math.abs(sx-1)+Math.abs(sy-1)>.01)animate(el,[{transformOrigin:'0 0',transform:'translate('+dx+'px,'+dy+'px) scale('+sx+','+sy+')'},{transformOrigin:'0 0',transform:'translate(0,0) scale(1,1)'}],MOTION.settle,sequence.handDelay);
 }
 if(!animations.length){setPresentation(null);document.body.classList.remove('moving-tiles');render();return;}
 for(const b of document.querySelectorAll('.hand button,#actions button'))b.disabled=true;
 tableView.draw();
 Promise.allSettled(animations).then(()=>{if(getPresentation()!==ticket)return;for(const e of arrivals)e.classList.remove('motion-arrival');clearEffects();render();});
}

 return {capture:captureTable,present:presentTable};
}
