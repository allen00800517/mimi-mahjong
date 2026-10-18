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
// Roster for the match: you first, then everyone else (seats are drawn afterwards).
export function rosterFor(self,order=SELECT_ORDER){if(!order.includes(self))self=order[0];return [self,...order.filter(id=>id!==self)];}
const sprite=id=>'./assets/cast-v23/'+id+'-chibi.png';
export class CharSelect{
 constructor(host){this.host=host;this.el=null;this.choice=SELECT_ORDER[0];this.onConfirm=null;}
 get open(){return !!this.el;}
 show({choice,cancellable=true,onConfirm,onCancel}={}){
  this.close();this.choice=SELECT_ORDER.includes(choice)?choice:SELECT_ORDER[0];this.onConfirm=onConfirm;this.onCancel=onCancel;
  const el=document.createElement('section');el.id='char-select';el.setAttribute('aria-label','選擇角色');
  el.innerHTML='<div class="cs-band"></div><img class="cs-portrait" alt="" draggable="false"><div class="cs-title">選擇角色</div>'+
   '<div class="cs-info"><h2></h2><div class="cs-role"></div><div class="cs-tags"><span class="cs-style"></span><span class="cs-hint"></span></div><p></p></div>'+
   '<div class="cs-grid" role="radiogroup" aria-label="角色">'+SELECT_ORDER.map(id=>'<button type="button" class="cs-card" role="radio" data-id="'+id+'"><img src="'+sprite(id)+'" alt="" draggable="false"><b>'+SELECT_INFO[id].name+'</b></button>').join('')+'</div>'+
   (cancellable?'<button type="button" class="cs-back">返回</button>':'')+'<button type="button" class="cs-go">決定　▶</button>';
  el.querySelectorAll('.cs-card').forEach(b=>b.onclick=()=>this.pick(b.dataset.id));
  el.querySelector('.cs-go').onclick=()=>{const id=this.choice,cb=this.onConfirm;this.close();cb?.(id);};
  el.querySelector('.cs-back')?.addEventListener('click',()=>{const cb=this.onCancel;this.close();cb?.();});
  this.host.append(el);this.el=el;this.pick(this.choice);el.querySelector('.cs-go').focus({preventScroll:true});
 }
 pick(id){
  if(!this.el||!SELECT_INFO[id])return;this.choice=id;const info=SELECT_INFO[id],el=this.el;
  el.style.setProperty('--cs-color',WIN_COLORS[id]||'#c9963c');
  const img=el.querySelector('.cs-portrait');img.src=WIN_ART.portrait(id);img.alt=info.name;
  img.getAnimations?.().forEach(a=>a.cancel());img.animate?.([{opacity:0,transform:'translateX(-24px)'},{opacity:1,transform:'none'}],{duration:220,easing:'ease-out'});
  el.querySelector('.cs-info h2').textContent=info.name;el.querySelector('.cs-role').textContent=info.role;
  el.querySelector('.cs-style').textContent='牌風：'+info.style;el.querySelector('.cs-hint').textContent=info.hint;el.querySelector('.cs-info p').textContent=info.text;
  el.querySelectorAll('.cs-card').forEach(b=>{const on=b.dataset.id===id;b.classList.toggle('on',on);b.setAttribute('aria-checked',String(on));});
 }
 close(){this.el?.remove();this.el=null;}
}
