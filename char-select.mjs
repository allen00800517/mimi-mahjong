// v1.01 · Character select (layout A-1, agreed 2026-10-18): pick who you play; the other three fill the remaining
// seats and the usual 抓位 decides where everyone sits. No opponent step and no voice preview (user: most people just
// want to start playing). It opens over the live table on a first launch and from 「開始新場」, and remembers the
// last pick, so a returning player only taps 決定.
import {WIN_ART,WIN_COLORS} from './win-show.mjs';
// Text from the character canon (設定正典); 牌風 is the playing style the CPU will follow.
export const SELECT_INFO=Object.freeze({
 mimi:{name:'蜜蜜',role:'蜜蜜餐廳 · 店主兼主廚',style:'快手',hint:'能胡就胡',text:'娃娃臉的元氣主廚。打牌跟做菜一樣講求手速，聽牌就衝、胡了就跳。'},
 ichika:{name:'春日莓香',role:'La Fraise · 店主兼甜點師',style:'穩健',hint:'很少放槍',text:'做蛋糕和打牌一樣細心，從不急著出手，常常不知不覺就門清自摸。'},
 harumi:{name:'金田珍美',role:'雀莊「麻雀珍」· 經營者',style:'貴氣',hint:'愛做混一色',text:'手腕高明的雀莊大姐大。字牌刻子、混一色是她的最愛，屁胡可入不了她的眼。'},
 gondo:{name:'權藤龍藏',role:'權藤組 · 頭目',style:'豪賭',hint:'會為大牌過水',text:'如今是蜜蜜餐廳的常客。手牌一偏就往清一色衝，小胡寧可放過。'},
});
export const SELECT_ORDER=Object.freeze(['mimi','ichika','harumi','gondo']);
// Roster for the match: you first, then your three opponents (seats are drawn afterwards). v1.52 · opponents can be
// picked; missing or invalid ones are filled from the select order.
export function rosterFor(self,opponents=[],order=SELECT_ORDER){
 if(!order.includes(self))self=order[0];
 const opp=[...new Set(opponents)].filter(id=>id!==self&&order.includes(id)).slice(0,3);
 for(const id of order)if(opp.length<3&&id!==self&&!opp.includes(id))opp.push(id);
 return [self,...opp];
}
const sprite=id=>'./assets/cast-v23/'+id+'-chibi.webp';
// v1.52 · one page for you and your opponents (user, 2026-10-21; mockup agreed): the first card tapped is you (gold
// 「你」 badge), the next three are your opponents (red 「對手」 badges); tapping a chosen card cancels it — cancel 「你」
// and the next tap becomes you. 決定 needs you plus three opponents; 🎲 fills the opponents at random. The left side
// shows whoever was tapped last, and 「這場陣容」 shows the four who will sit down. Last match's line-up is remembered.
export class CharSelect{
 constructor(host,{order=SELECT_ORDER,random=Math.random}={}){this.host=host;this.el=null;this.order=order;this.random=random;this.me=order[0];this.opp=[];this.onConfirm=null;}
 get open(){return !!this.el;}
 get choice(){return this.me;}
 get roster(){return this.me&&this.opp.length===3?[this.me,...this.opp]:null;}
 show({choice,opponents=[],cancellable=true,onConfirm,onCancel}={}){
  this.close();const order=this.order;
  [this.me,...this.opp]=rosterFor(order.includes(choice)?choice:order[0],opponents,order);this.focus=this.me;
  this.onConfirm=onConfirm;this.onCancel=onCancel;
  const el=document.createElement('section');el.id='char-select';el.setAttribute('aria-label','選擇角色與對手');
  el.innerHTML='<div class="cs-band"></div><img class="cs-portrait" alt="" draggable="false"><div class="cs-title">選擇角色</div>'+
   '<div class="cs-info"><h2></h2><div class="cs-role"></div><div class="cs-tags"><span class="cs-style"></span><span class="cs-hint"></span></div><p></p></div>'+
   '<div class="cs-lineup" aria-label="這場陣容"><em>這場陣容</em><div></div></div>'+
   '<div class="cs-status" role="status"></div>'+
   '<div class="cs-grid" aria-label="角色">'+order.map(id=>'<button type="button" class="cs-card" data-id="'+id+'" aria-pressed="false"><i class="cs-badge"></i><img src="'+sprite(id)+'" alt="" draggable="false"><b>'+SELECT_INFO[id].name+'</b></button>').join('')+'</div>'+
   (cancellable?'<button type="button" class="cs-back">返回</button>':'')+(order.length>4?'<button type="button" class="cs-random">🎲 對手隨機</button>':'')+'<button type="button" class="cs-go">決定　▶</button>';
  el.querySelectorAll('.cs-card').forEach(b=>b.onclick=()=>this.tap(b.dataset.id));
  el.querySelector('.cs-go').onclick=()=>{const r=this.roster;if(!r){this.flash();return;}const cb=this.onConfirm;this.close();cb?.(r);};
  el.querySelector('.cs-back')?.addEventListener('click',()=>{const cb=this.onCancel;this.close();cb?.();});
  el.querySelector('.cs-random')?.addEventListener('click',()=>this.shuffle());
  this.host.append(el);this.el=el;this.update(true);el.querySelector('.cs-go').focus({preventScroll:true});
 }
 tap(id){
  if(!SELECT_INFO[id])return;this.focus=id;
  // with exactly four characters there is nobody to choose between: a tap just picks who you are, as before
  if(this.order.length===4){this.me=id;this.opp=this.order.filter(x=>x!==id);this.update(true);return;}
  if(id===this.me)this.me=null;
  else if(this.opp.includes(id))this.opp=this.opp.filter(x=>x!==id);
  else if(!this.me)this.me=id;
  else if(this.opp.length<3)this.opp.push(id);
  else{this.update(true);this.flash('對手已滿，先點一位對手取消');return;}
  this.update(true);
 }
 shuffle(){
  if(!this.me)this.me=this.focus&&SELECT_INFO[this.focus]?this.focus:this.order[0];
  const pool=this.order.filter(id=>id!==this.me);
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  this.opp=pool.slice(0,3);this.update(false);
 }
 flash(text){const st=this.el?.querySelector('.cs-status');if(!st)return;if(text)st.textContent=text;st.classList.remove('warn');void st.offsetWidth;st.classList.add('warn');}
 update(animate){
  const el=this.el;if(!el)return;const id=SELECT_INFO[this.focus]?this.focus:(this.me||this.order[0]),info=SELECT_INFO[id];
  el.style.setProperty('--cs-color',WIN_COLORS[id]||'#c9963c');
  const img=el.querySelector('.cs-portrait');if(img.dataset.id!==id){img.dataset.id=id;img.src=WIN_ART.portrait(id);img.alt=info.name;
   if(animate){img.getAnimations?.().forEach(a=>a.cancel());img.animate?.([{opacity:0,transform:'translateX(-24px)'},{opacity:1,transform:'none'}],{duration:220,easing:'ease-out'});}}
  el.querySelector('.cs-info h2').textContent=info.name;el.querySelector('.cs-role').textContent=info.role;
  el.querySelector('.cs-style').textContent='牌風：'+info.style;el.querySelector('.cs-hint').textContent=info.hint;el.querySelector('.cs-info p').textContent=info.text;
  const full=!!this.roster;
  el.querySelectorAll('.cs-card').forEach(b=>{const c=b.dataset.id,me=c===this.me,op=this.opp.includes(c);
   b.classList.toggle('me',me);b.classList.toggle('opp',op);b.classList.toggle('off',full&&!me&&!op);b.classList.toggle('focus',c===id);
   b.setAttribute('aria-pressed',String(me||op));b.querySelector('.cs-badge').textContent=me?'你':op?'對手':'';});
  const slots=[this.me,...this.opp,null,null,null].slice(0,4);
  el.querySelector('.cs-lineup div').innerHTML=slots.map((c,i)=>'<span class="'+(c?(i===0?'me':'opp'):'empty')+'">'+(c?'<img src="'+sprite(c)+'" alt="'+SELECT_INFO[c].name+'" draggable="false">':'<i>？</i>')+'<small>'+(i===0?'你':'對手')+'</small></span>').join('');
  const need=3-this.opp.length,st=el.querySelector('.cs-status');st.classList.remove('warn');
  st.innerHTML=!this.me?'先點選<b>你的角色</b>':need>0?'再選 <b>'+need+'</b> 位對手':'對手 <b>3／3</b>　按「決定」開始';
  const go=el.querySelector('.cs-go');go.classList.toggle('wait',!full);go.textContent=full?'決定　▶':!this.me?'選你的角色':'再選 '+need+' 位';
 }
 close(){this.el?.remove();this.el=null;}
}
