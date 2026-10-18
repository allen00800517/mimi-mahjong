import {organizeTableMenu} from './table-menu.mjs';
import {rectOf,viewSize,wantsForcedLandscape,applyScreenSize} from './viewport.mjs';
import {CharacterActors} from './character-actors.mjs';
import {SessionStorage} from './session-storage.mjs';
import {foregroundFor} from './table-layout.mjs';
import {isKan,meldDisplay} from './meld-layout.mjs';
import {responseHandIndices,settlementGroups} from './presentation-model.mjs';
import {createTablePresenter} from './table-presentation.mjs';
import {computerDelay} from './action-sequence.mjs';
import {PlayableTable} from './playable-table.mjs';
import {SettlementClock} from './settlement-clock.mjs';
import {Match} from './match.mjs';
import {restoreCurrent,restoreBackup,createBackup,tableSnapshot} from './session.mjs';
import {offerFile} from './file-export.mjs';
import {drawSeats} from './seating.mjs';
import {Game,trainingGame,chooseAction,STATE_NAMES} from './engine.mjs';
import {tileLabel,sortTiles} from './scoring.mjs';
import {waitPreview} from './wait-preview.mjs';
import {actionBandModel} from './action-band.mjs';
import {MusicPlayer,musicTrackFor} from './music.mjs';
import {tileFace,concealedFace,setFlowerSkin} from './tiles.mjs';
import {TableSound} from './sound.mjs';
import {DiceShow,diceBadgeText,DICE_TIMING} from './dice-show.mjs';
import {DealShow,DEAL_START_AFTER_DICE} from './deal-show.mjs';
import {winGrade,winPortraits,stampWord,winCaption,revealPlan,WIN_TIMING,WIN_COLORS,WIN_ART,WIN_ANIM} from './win-show.mjs';
import {TsumoShow,CLIP_MAX_MS} from './tsumo-show.mjs';
import {unseenWaitCounts} from './table-views.mjs';
import {bindHandInput} from './hand-input.mjs';
import {freshSeed,newGameSeed} from './new-game.mjs';
const $=id=>document.getElementById(id);
// Status messages are written to the menu's #feedback; mirror them on the table so a closed menu never hides them.
const toast={timer:null,pending:null,pendingAt:0,persistText:null};
function showToast(text,{action=null,persist=false}={}){
 const el=$('table-toast');clearTimeout(toast.timer);if(!text){el.hidden=true;toast.persistText=null;return;}
 $('table-toast-text').textContent=text;const b=$('table-toast-action');b.hidden=!action;if(action){b.textContent=action.label;b.onclick=action.run;}
 toast.persistText=persist?text:null;el.hidden=false;if(!persist)toast.timer=setTimeout(()=>{el.hidden=true;},5200);
}
new MutationObserver(()=>{const text=$('feedback').textContent.trim();if(!text||text===toast.persistText)return;if($('settings-dialog').open){toast.pending=text;toast.pendingAt=performance.now();}else showToast(text);}).observe($('feedback'),{childList:true,characterData:true,subtree:true});
$('settings-dialog').addEventListener('close',()=>{const text=toast.pending;toast.pending=null;if(text&&performance.now()-toast.pendingAt<2000)showToast(text);});
$('table-toast').addEventListener('click',e=>{if(!e.target.closest('#table-toast-action'))showToast('');});
// Practice layouts load in memory from the menu; they never overwrite the saved match.
const tableView=new PlayableTable($('table-canvas'),$('table-motion-canvas'));
tableView.onReady=()=>render();tableView.onUnavailable=()=>{clearTimeout(timer);clearEffects();syncCharacters();};$('table-retry').onclick=()=>location.reload();
const CAST={mimi:['蜜蜜','蜜蜜'],gondo:['權藤','權藤龍藏'],ichika:['莓香','春日莓香'],harumi:['珍美','金田珍美']};
// The resident table cast uses the approved full-body chibis. Cinematic callers
// explicitly request 'front', keeping the original-proportion performance assets.
const characterSprite=(seat,variant='chibi')=>'./assets/cast-v23/'+PORTRAITS[seat]+'-'+variant+'.png';
let PORTRAITS=['mimi','gondo','ichika','harumi'],NAMES=[],FULL_NAMES=[],nextCharacters=[];
function syncCast(){NAMES=PORTRAITS.map(k=>CAST[k][0]);FULL_NAMES=PORTRAITS.map(k=>CAST[k][1]);nextCharacters=[...PORTRAITS];for(let s=0;s<4;s++)$('character-'+s).value=PORTRAITS[s];}
const sound=new TableSound({sampleBase:'./assets/sfx-v1/'});const tsumoShow=new TsumoShow({sound});
// v0.96 · add ?mem=1 to the address to see how much character art is decoded (for testing on a phone).
if(/[?&]mem=1/.test(location.search)){const box=document.createElement('div');box.id='mem-debug';box.style.cssText='position:fixed;left:4px;top:4px;z-index:99999;background:rgba(0,0,0,.72);color:#9f9;font:11px/1.35 monospace;padding:4px 6px;border-radius:6px;pointer-events:none;white-space:pre';document.body.append(box);let peak=0;setInterval(()=>{try{const a=JSON.parse(document.getElementById('table').dataset.characterAudit||'{}'),m=a.memory||[],total=m.reduce((n,x)=>n+(x.mb||0),0);peak=Math.max(peak,total);box.textContent='角色圖 '+total.toFixed(0)+'MB（最高 '+peak.toFixed(0)+'）\n'+m.map(x=>x.id+' '+(x.mb||0)+'MB 等待'+(x.misses||0)).join('\n');}catch{}},1000);}
const characterActors=new CharacterActors(sound);
let preferences={speed:750,motion:true,sound:false,flowerSkin:'character',confirmButton:false,music:'auto'};
try{Object.assign(preferences,JSON.parse(localStorage.getItem('mimi-tw-preferences-4')||'{}'));}catch{}
if(Array.isArray(preferences.characters)&&preferences.characters.length===4&&new Set(preferences.characters).size===4&&preferences.characters.every(k=>typeof k==='string'&&Object.hasOwn(CAST,k)))PORTRAITS=[...preferences.characters];syncCast();
// Manual computer pause is a temporary debugging control, not a play preference.
// Ignore legacy saved `auto:false` left behind by a presentation failure.
$('auto').checked=true;
$('confirm-button').checked=preferences.confirmButton===true;
$('music-choice').value=['auto','east','south','west','north','off'].includes(preferences.music)?preferences.music:'auto';
$('speed').value=[250,750,1300].includes(Number(preferences.speed))?String(preferences.speed):'750';
$('motion').checked=preferences.motion!==false;
sound.enabled=preferences.sound===true;
$('flower-skin').value=setFlowerSkin(preferences.flowerSkin);
function renderFlowerPreview(){$('flower-preview').innerHTML=Array.from({length:8},(_,i)=>'<button class="flower-preview-tile" data-flower="'+(i+1)+'f" aria-label="放大'+tileLabel((i+1)+'f')+'">'+tileFace((i+1)+'f')+'</button>').join('');}
renderFlowerPreview();
const reduced=()=>!$('motion').checked||matchMedia('(prefers-reduced-motion: reduce)').matches;
function savePreferences(){preferences={music:$('music-choice').value,confirmButton:$('confirm-button').checked,speed:Number($('speed').value),motion:$('motion').checked,sound:sound.enabled,flowerSkin:$('flower-skin').value,characters:[...PORTRAITS]};try{localStorage.setItem('mimi-tw-preferences-4',JSON.stringify(preferences));}catch{}}
// Background music follows the master sound switch, the menu choice and page visibility.
const music=new MusicPlayer({context:()=>sound.context,enabled:()=>sound.enabled&&$('music-choice').value!=='off'&&!document.hidden});
function syncMusic(){try{music.want(musicTrackFor({phase:game.phase,players:game.players,roundWind:game.roundWind,rounds:match?.rounds??null,seed:match?.seed??0,choice:$('music-choice').value}));$('table').dataset.music=(music.wanted||'')+'/'+(music.active?.id||'');}catch(e){if(!(e instanceof ReferenceError))console.error(e);}}
$('music-choice').onchange=()=>{savePreferences();if(sound.enabled&&sound.state!=='running')sound.unlock().then(syncMusic);else syncMusic();};
function syncSound(){const b=$('sound-toggle');b.innerHTML='<img src="./assets/icons/'+(sound.enabled?'volume-2':'volume-x')+'.svg" alt="">';b.setAttribute('aria-label',sound.enabled?'音效開啟，點擊靜音':'音效關閉，點擊開啟');b.title=sound.enabled?'音效開':'音效關';b.setAttribute('aria-pressed',String(sound.enabled));b.dataset.audioState=sound.state;b.dataset.played=String(sound.played);b.dataset.samples=String(sound.samples?.size||0);syncMusic();}
$('sound-toggle').onclick=async()=>{await sound.toggle();if(sound.enabled)await characterActors.prepareVoices();else characterActors.stopVoices();sound.play('select');savePreferences();syncSound();};
const unlockAudio=()=>{if(sound.enabled&&sound.state!=='running')sound.unlock().then(()=>characterActors.prepareVoices()).then(syncSound);};
for(const type of ['pointerdown','pointerup','touchend','click','keydown'])document.addEventListener(type,unlockAudio,{passive:true,capture:true});
const diceShow=new DiceShow($('game-shell'));let pendingDice=false,dealTimer=null;
// v0.94 · the deal after the dice: opponents grow through a hand-count mask, your hand flips and sorts in place.
const dealShow=new DealShow({backSrc:()=>concealedFace().match(/src="([^"]+)"/)[1],onSound:k=>sound.play(k),
 onStep:()=>{document.body.classList.toggle('deal-hide-flowers',dealShow.running&&!dealShow.flowersShown());tableView.update(tableGame(),$('flower-skin').value,lastEffect);}});
function tableGame(){if(!dealShow.running)return game;const v=Object.create(game);v.players=game.players.map((p,s)=>({...p,hand:p.hand.slice(0,dealShow.handCount(s)),flowers:dealShow.flowersShown()?p.flowers:[]}));return v;}
let lastEffect=null,presentation=null,selectedIndex=null,stickerTimer=null;
function clearEffects(){tableView.cancelMotion({redraw:false});presentation=null;document.querySelectorAll('.motion-arrival').forEach(e=>e.classList.remove('motion-arrival'));document.querySelectorAll('.hand .tile').forEach(e=>e.getAnimations().forEach(a=>a.cancel()));$('effects').getAnimations({subtree:true}).forEach(a=>a.cancel());$('effects').replaceChildren();document.body.classList.remove('moving-tiles','discard-in-flight');}
const presenter=createTablePresenter({tableView,getGame:()=>game,getSelectedIndex:()=>selectedIndex,getPresentation:()=>presentation,setPresentation:value=>{presentation=value;},clearTimer:()=>clearTimeout(timer),clearEffects,render,reduced,paused:()=>paused(),sound,syncSound,names:()=>NAMES,characterSprite,positionCallout,animatedResident:s=>characterActors.resident(s)&&!reduced()});
function meldMarkup(m,s,i,compact=true){
 const hidden=m.kind==='concealedKan'&&s!==0,hasSource=Number.isInteger(m.from)&&m.calledTile;
 const label=m.kind==='concealedKan'?'暗槓':hasSource?(m.kind==='sequence'?'吃':'碰／槓')+' '+tileLabel(m.calledTile)+'，來自'+FULL_NAMES[m.from]:'副露（原紀錄未保存來源）';
 const shown=[...m.tiles];
 // Source is retained in the snapshot; all displayed cards stand in their owner's direction.
 const calledIndex=hasSource?(m.kind==='sequence'?shown.indexOf(m.calledTile):1):-1;
 const cards=compact?meldDisplay(m,s):shown.map((face,index)=>({face,index,back:hidden}));
 return '<div class="meld'+(compact&&isKan(m)?' compact-kan':'')+'" data-meld-index="'+i+'"'+(hasSource?' data-from="'+m.from+'"':'')+' title="'+label+'" aria-label="'+label+'">'+cards.map(({face,index,back,raised})=>{
  const cls=(hasSource&&index===calledIndex?'claimed-in-meld ':'')+(raised?'kan-top ':'')+(back?'concealed-card':'');
  return back?'<span class="tile small-tile '+cls+'"'+(s===0?' data-tile="'+face+'"':'')+' aria-label="暗槓牌背">'+(s===0?concealedFace():'')+'</span>':tile(face,cls,s!==0);
 }).join('')+'</div>';
}
const seatNode=s=>document.getElementById(['south','east','north','west'][s]);
function bounds(el){if(!el)return null;const r=rectOf(el);return {x:r.x,y:r.y,width:r.width,height:r.height};}
function captureTable(s,id){return presenter.capture(s,id);}
function presentTable(before,seat,id){return presenter.present(before,seat,id);}

for(const id of ['dealer','wall','deal-info'])$('table').append($(id));
// Response source is presented beside the central action choices.
function ownMeldMarkup(p,s){
 if(s!==0)return p.melds.map((m,i)=>'<div class="table-set" style="--set-units:'+ (m.tiles.length) +'">'+meldMarkup(m,s,i)+'</div>').join('');
 const perRow=5;let html='';for(let i=0;i<p.melds.length;i+=perRow)html+='<div class="meld-row">'+p.melds.slice(i,i+perRow).map((m,j)=>meldMarkup(m,s,i+j).replace('<div class="','<div role="button" tabindex="0" class="')).join('')+'</div>';return html;
}

function inspectMelds(){if(portrait()||winPresentation)return;const d=$('meld-dialog');$('meld-summary').innerHTML=game.players[0].melds.map((m,i)=>'<section><p>'+escape(m.from!==undefined?FULL_NAMES[m.from]+' · '+(m.kind==='sequence'?'吃':m.kind==='triplet'?'碰':'槓'):m.kind==='concealedKan'?'暗槓':'吃碰槓牌組')+'</p>'+meldMarkup(m,0,i,false)+'</section>').join('');clearTimeout(timer);clearEffects();d.showModal();render();}
function fitTableUI(){fitPrototypeUI();tableView.update(tableGame(),$('flower-skin').value,lastEffect);}
const statusCopy=document.querySelector('.controls .control-copy'),statusDetails=document.createElement('details');statusDetails.id='table-status';statusDetails.innerHTML='<summary>本局狀態與聽牌提示</summary>';statusDetails.append(statusCopy);document.querySelector('#settings-dialog .menu-options').after(statusDetails);organizeTableMenu();
$('chow-close').onclick=()=>$('chow-dialog').close();$('meld-close').onclick=()=>$('meld-dialog').close();for(const id of ['chow','meld'])$(id+'-dialog').addEventListener('close',()=>{if(!presentation)render();});
$('self-meld-dock').addEventListener('click',e=>{if(e.target.closest('.meld'))inspectMelds();});$('self-meld-dock').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('.meld')){e.preventDefault();inspectMelds();}});
$('header-count').append($('round-wind-token'),$('round-label'),$('wall'));
let resultDismissed=false,winPresentation=null,cinemaTimer=null;
function finishWinCinema(){
 if(!winPresentation)return;clearTimeout(cinemaTimer);tsumoShow.stop();winPresentation=null;$('win-cinema').hidden=true;$('win-cinema').getAnimations({subtree:true}).forEach(a=>a.cancel());$('game-shell').inert=portrait();render();if(!portrait()&&!document.hidden)document.querySelector('.close-result')?.focus();
}
// v0.97 · tier-1 win moment: table dims, the winning tile lights up, the winner's portrait slides in on a colour band
// and the 胡／自摸 stamp lands. 自摸 is a stronger version (gold, bigger, longer). Tap anywhere to skip.
function startWinCinema(){
 const r=game.result;if(r?.kind!=='win'||reduced()||portrait()||document.hidden)return;
 winPresentation={revision:game.revision,winner:r.winner};clearTimeout(timer);clearEffects();
 // v1.00 · 自摸 with a clip: rise, glide left, stamp at the clip's moment, hand off to the settlement portrait.
 const id=PORTRAITS[r.winner],anim=r.method==='tsumo'&&tsumoShow.canPlay(id);
 const stage=buildWinStamp(r,anim);
 $('win-cinema').hidden=false;$('game-shell').inert=true;$('result').hidden=true;
 $('cinema-skip').focus();syncSettlement();
 if(anim&&tsumoShow.start({id,stage,before:stage.querySelector('.wc-stamp'),
  onStamp:()=>{stage.classList.add('stamped');sound.play('stamp');},
  onEnd:()=>{clearTimeout(cinemaTimer);cinemaTimer=setTimeout(finishWinCinema,150);},
  onFail:()=>{if(!winPresentation)return;buildWinStamp(r,false);sound.play('stamp');clearTimeout(cinemaTimer);cinemaTimer=setTimeout(finishWinCinema,3000);}})){
  cinemaTimer=setTimeout(finishWinCinema,CLIP_MAX_MS+500);return;}
 if(anim)buildWinStamp(r,false);
 cinemaTimer=setTimeout(finishWinCinema,r.method==='tsumo'?WIN_TIMING.tsumo:WIN_TIMING.ron);
}
function buildWinStamp(r,anim=false){
 const c=$('win-cinema'),id=PORTRAITS[r.winner],tsumo=r.method==='tsumo',word=stampWord(r);
 c.querySelector('.wc-stage')?.remove();c.classList.remove('special');c.classList.toggle('tsumo',tsumo);c.dataset.tier=winGrade(r)?.tier??1;
 const stage=document.createElement('div');stage.className='wc-stage'+(anim?' anim':'');stage.style.setProperty('--wc-color',WIN_COLORS[id]||'#c9963c');
 let glow='';
 if(!tsumo){const payer=r.payments?.find(p=>p.to===r.winner)?.from,el=payer!==undefined?$('river-'+payer)?.lastElementChild:null;
  if(el&&el.style.display!=='none'){const sr=rectOf($('game-shell')),b=rectOf(el),k=sr.width/854||1;glow='<div class="wc-glow" style="left:'+((b.left+b.width/2-sr.left)/k).toFixed(1)+'px;top:'+((b.top+b.height/2-sr.top)/k).toFixed(1)+'px"></div>';}}
 // v0.98 · No portrait here: it only flashed for a moment and the settlement shows the same picture right after.
 stage.innerHTML='<div class="wc-dim"></div>'+glow+(tsumo&&r.tile&&!anim?'<div class="wc-tile">'+tileFace(r.tile)+'</div>':'')+'<div class="wc-stamp"><img alt="" draggable="false"><span>'+word+'</span></div><div class="wc-caption">'+escape(winCaption(r,NAMES))+'</div>';
 const st=stage.querySelector('.wc-stamp img');if(word!=='胡')st.remove();else{st.onload=()=>stage.querySelector('.wc-stamp').classList.add('art');st.onerror=()=>st.remove();st.src=WIN_ART.stamp;}
 c.prepend(stage);return stage;
}
$('win-cinema').addEventListener('click',e=>{if(winPresentation&&e.target.id!=='cinema-skip')finishWinCinema();});
$('cinema-skip').onclick=finishWinCinema;
// Phones held upright no longer pause: the page rotates into forced landscape (viewport.mjs), so nothing is 'portrait-blocked'.
const portrait=()=>false;
const overlayOpen=()=>!$('page-overlay').hidden;
const paused=()=>diceShow.running||dealShow.running||!tableView.ready||portrait()||document.hidden||overlayOpen()||winPresentation!==null||presentation!==null||Array.from(document.querySelectorAll('dialog')).some(d=>d.open);
function syncCharacters(){if(tableView.ready)tsumoShow.preload(PORTRAITS);try{characterActors.sync(game,PORTRAITS,{blocked:!tableView.ready||portrait()||document.hidden||overlayOpen()||winPresentation!==null||Array.from(document.querySelectorAll('dialog')).some(d=>d.open),reduced:reduced()});}catch(error){characterActors.disable();console.warn('角色動畫暫停，保留靜態圖',error);}}



let match=null,game,selected=null,declaring=false,timer=null,archives=[]; try {const savedArchives=JSON.parse(localStorage.getItem('mimi-tw-archives-5')||'[]');archives=Array.isArray(savedArchives)?savedArchives.slice(-20).filter(x=>x?.format==='mimi-tw-prototype-3'):[];}catch{}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function tile(t,cls='',flat=false){return '<span class="tile small-tile '+t[1]+' '+cls+(flat?' flat-card':'')+'" data-tile="'+t+'" title="'+tileLabel(t)+'">'+(flat?'':tileFace(t))+'</span>';}
function archiveCurrent(){archives.push(game.snapshot());archives=archives.slice(-20);try{localStorage.setItem('mimi-tw-archives-5',JSON.stringify(archives));return true;}catch{$('feedback').textContent='無法保存歷史紀錄，請下載牌局紀錄留存。';return false;}}
const sessionStore=new SessionStorage({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)});
function saveLocal(){if(sessionStore.write(sessionSnapshot()))return true;$('feedback').textContent='無法自動保存，請下載牌局紀錄留存。';return false;}
let seating=null,completedMatches=[],suspendedTable=null;
function sessionSnapshot(){return tableSnapshot(match??game,PORTRAITS,match?seating:null,completedMatches,match?null:suspendedTable);}
function adoptSession(restored){match=restored.match;game=restored.game;seating=restored.seating??null;completedMatches=restored.completedMatches??completedMatches;suspendedTable=restored.match?null:restored.suspended??null;if(restored.characters){PORTRAITS=[...restored.characters];syncCast();}}
function restoreSession(data){adoptSession(restoreCurrent(data));}
function newMatch(seed){
 const roster=Array.from({length:4},(_,s)=>$('character-'+s).value),draw=drawSeats(seed,roster);
 const next=new Match({seed,rounds:Number($('rounds').value),starter:draw.starter});
 archiveCompletedMatch();
 match=next;pendingDice=true;suspendedTable=null;game=match.game;seating=draw;PORTRAITS=[...draw.seats];syncCast();$('auto').checked=true;
}
function clearPracticeLink(){
 try{const url=new URL(location.href);if(url.searchParams.has('scene')){for(const key of ['scene','case','auto'])url.searchParams.delete(key);history.replaceState(null,'',url.pathname+url.search+url.hash);}}catch{}
 try{sessionStorage.removeItem('mimi-v35-active-practice');}catch{}
}
function archiveCompletedMatch(){if(match?.status==='completed')completedMatches=[...completedMatches,{current:match.snapshot(),characters:[...PORTRAITS],seating:structuredClone(seating)}].slice(-20);}
function settleTable(){clearEffects();lastEffect=null;resultDismissed=false;selected=null;selectedIndex=null;declaring=false;saveLocal();$('settings-dialog').close();render();}
// Practice is separate from the match: a match in progress is suspended intact and can be resumed.
function enterPractice(nextGame){
 archiveCurrent();
 if(match?.status==='playing')suspendedTable=tableSnapshot(match,PORTRAITS,seating,[]);
 else archiveCompletedMatch();
 match=null;seating=null;game=nextGame;clearPracticeLink();settleTable();
}
function resumeMatch(){
 if(!suspendedTable)return;
 try{const r=restoreCurrent({...suspendedTable,completedMatches:[]});if(!r.match)throw Error('暫停的整場紀錄不完整');
  match=r.match;game=r.game;seating=r.seating;PORTRAITS=[...r.characters];syncCast();suspendedTable=null;settleTable();$('feedback').textContent='已返回整場。';
 }catch(e){$('feedback').textContent='無法返回整場：'+e.message;}
}
const savedSession=sessionStore.read();
try{if(savedSession!==null)restoreSession(JSON.parse(savedSession));else {newMatch(freshSeed());saveLocal();}}catch(e){sessionStore.preserve(savedSession);newMatch(freshSeed());saveLocal();$('feedback').textContent='舊紀錄無法恢復，原始資料已保留。'+(sessionStore.blocked?'目前不會覆寫原存檔，請下載紀錄留存。':'可按「保存原始紀錄」留存。');}
const recovery=sessionStore.recovery();if(recovery!==null){const button=document.createElement('button');button.textContent='下載保留的原始紀錄';button.onclick=()=>saveRecovery();$('feedback').before(button);showToast($('feedback').textContent||'保留了一份無法讀取的原始紀錄。',{action:{label:'保存原始紀錄',run:saveRecovery},persist:true});}
async function saveRecovery(){const status=await offerFile('蜜蜜麻將-原始紀錄.json',recovery);$('feedback').textContent=fileMessage(status,'已存出保留的原始紀錄。');}
function fileMessage(status,ok){return status==='saved'?ok:status==='declined'?'已取消存檔。':'這個頁面目前無法存出檔案，請稍後再試。';}
function recoverPresentation(error){clearTimeout(timer);$('auto').checked=false;clearEffects();if(winPresentation){clearTimeout(cinemaTimer);tsumoShow.stop();winPresentation=null;$('win-cinema').hidden=true;$('game-shell').inert=portrait();}try{render();}catch(renderError){tableView.ready=false;$('table-loading').hidden=false;$('table-loading-text').textContent='畫面需要重新載入，牌局已保存。';$('table-retry').hidden=false;console.error(renderError);}$('feedback').textContent='演出中斷，已保留本次牌局操作；可按「繼續電腦行動」恢復。';console.error(error);}
tableView.onMotionError=recoverPresentation;
function perform(s,id,revision=game.revision){if(paused()||revision!==game.revision)return;try{const before=captureTable(s,id);resultDismissed=false;game.act(s,id,revision);if(/^(discard|declare):/.test(id))lastEffect={seat:s,tile:id.split(':')[1]};selected=null;selectedIndex=null;declaring=false;saveLocal();render();characterActors.events(before,game);if(game.result?.kind==='win'){sound.play('win',{method:game.result.method,anim:game.result.method==='tsumo'&&!reduced()&&tsumoShow.canPlay(PORTRAITS[game.result.winner])});syncSound();startWinCinema();syncCharacters();}else presentTable(before,s,id);}catch(e){characterActors.reset();recoverPresentation(e);}}
function player(s,id){
 const p=game.players[s],acts=game.actions(s),active=(game.phase==='turn'&&game.turn===s)||(game.phase==='response'&&acts.length>0)||(game.phase==='flower'&&game.flowerEvent.winner===s);
 const cue=game.phase==='turn'?'出牌':game.phase==='response'?'可回應':'花胡機會';
 const badges=(p.state==='S0'?'':'<span class="status-badge" title="'+STATE_NAMES[p.state]+'">'+({S1:'聽',S2:'地聽',S3:'天聽'}[p.state])+'</span>')+(p.passed?'<span class="status-badge passed" title="過水限制生效">過水</span>':'');
 const profile=(s===0?'':'<div class="character-stage" data-character="'+PORTRAITS[s]+'"><img src="'+characterSprite(s)+'" alt="'+FULL_NAMES[s]+'Q版" draggable="false"></div>')+'<div class="profile"><div class="identity">'+(active?'<span class="turn-cue" role="img" aria-label="'+NAMES[s]+'：'+cue+'" title="'+cue+'">▶</span>':'')+'<div class="name">'+(s===0?'<span class="wind">'+['東','南','西','北'][game.wind(s)]+'</span>':'')+NAMES[s]+(game.dealer===s?'<span class="dealer-mark">莊</span>':'')+'</div>'+(badges?'<div class="state">'+badges+'</div>':'')+'</div></div>';

 const backs=s===0?'':'<div class="backs" aria-label="'+p.hand.length+' 張暗牌">'+p.hand.map((_,i)=>'<i class="back" style="--back-index:'+i+';--back-depth:'+i+'">'+''+'</i>').join('')+'</div>';
 const flowers='<div class="flowers flower-group" aria-label="花牌">'+p.flowers.map(t=>'<button class="flower-tile tile small-tile" data-flower="'+t+'" aria-label="放大'+tileLabel(t)+'">'+(s===0?tileFace(t,{compact:true}):'')+'</button>').join('')+'</div>';
 const melds='<div class="melds" aria-label="副露">'+ownMeldMarkup(p,s)+'</div>';
 $(id).innerHTML=profile+(s===0?'':'<div class="opponent-tiles">')+backs+'<div class="exposed">'+(s===0?'':flowers)+melds+'</div>'+(s===0?'':'</div>');$(id).style.setProperty('--set-depth',1.375);$(id).style.setProperty('--set-columns',Math.max(1,Math.ceil(p.melds.length/2)));$(id).style.setProperty('--max-set-units',Math.max(3,...p.melds.map(m=>m.tiles.length)));if(s===0){const dock=$('self-flowers');dock.innerHTML=flowers;dock.hidden=!p.flowers.length;dock.style.setProperty('--flower-columns',Math.min(4,p.flowers.length)||1);dock.setAttribute('aria-label',FULL_NAMES[0]+'的花牌，共'+p.flowers.length+'張');}
 $(id).classList.toggle('active',active);$(id).dataset.seat=s;$(id).style.setProperty('--table-units',Math.max(1,p.hand.length*.66+p.flowers.length+p.melds.reduce((n,m)=>n+m.tiles.length,0)));$(id).style.setProperty('--table-gaps',Math.max(0,p.hand.length-1)+Math.max(0,p.flowers.length-1)*2+p.melds.length*10+20);
 const river=$('river-'+s),scrolled=river.scrollTop,oldLength=Number(river.dataset.length||0);
 river.setAttribute('aria-label',FULL_NAMES[s]+'的棄牌');
 river.innerHTML=p.river.map((r,i)=>tile(r.tile,(r.claimed?'claimed ':'')+((lastEffect?.seat===s||game.event?.from===s)&&i===p.river.length-1?'last-discard':''),true)).join('');
 river.dataset.length=p.river.length;if(p.river.length>oldLength)river.scrollTop=river.scrollHeight;else river.scrollTop=scrolled;
 if(s===0){
  const dock=$('self-meld-dock');dock.replaceChildren($('south').querySelector('.exposed'));dock.hidden=!p.melds.length;dock.style.setProperty('--flower-gap',p.flowers.length?($('self-flowers').offsetWidth+8)+'px':'0px');let maxUnits=1,maxGaps=0;const perRow=5;for(let j=0;j<p.melds.length;j+=perRow){const row=p.melds.slice(j,j+perRow);maxUnits=Math.max(maxUnits,row.reduce((n,m)=>n+m.tiles.length,0));maxGaps=Math.max(maxGaps,(row.length-1)*6+row.reduce((n,m)=>n+m.tiles.length-1,0));}dock.style.setProperty('--dock-units',maxUnits);dock.style.setProperty('--dock-gaps',maxGaps);const hand=document.createElement('div');hand.className='hand';hand.setAttribute('aria-label','你的暗手牌');
  const tiles=sortTiles(p.hand),revision=game.revision;
  if(game.phase==='turn'&&game.turn===0&&game.drawn){const i=tiles.indexOf(game.drawn);if(i>=0){tiles.splice(i,1);tiles.push(game.drawn);}}
  tiles.forEach((t,i)=>{
   const b=document.createElement('button'),legal=acts.some(a=>a.id===(declaring?'declare:':'discard:')+t)&&(p.state==='S0'||(i===tiles.length-1&&game.drawn===t));
   b.className='tile '+t[1]+(legal?' playable':'')+(selectedIndex===i?' chosen':'')+(game.phase==='turn'&&game.turn===0&&i===tiles.length-1&&game.drawn?' drawn':'');
   b.innerHTML=tileFace(t);b.dataset.tile=t;b.disabled=!legal||presentation!==null;b.setAttribute('aria-label',tileLabel(t)+(legal?'，選擇此牌':''));b.setAttribute('aria-pressed',String(selectedIndex===i));if(declaring&&legal){b.classList.add('declare-eligible');b.setAttribute('aria-label',tileLabel(t)+'，可打出並宣告聽牌');}
   b.dataset.handIndex=i;b.dataset.revision=revision;
 bindHandInput(b,{isCurrent:()=>legal&&!b.disabled&&!paused()&&revision===game.revision,
 select:()=>{
 if(selectedIndex===i){perform(0,(declaring?'declare:':'discard:')+t,revision);return;}
 selected=t;selectedIndex=i;sound.play('select');syncSound();render();},
 commit:()=>{selected=t;selectedIndex=i;perform(0,(declaring?'declare:':'discard:')+t,revision);}
 });
 hand.append(b);
  });const lane=document.createElement('div');lane.className='play-row';hand.style.setProperty('--hand-count',Math.max(1,p.hand.length));lane.style.setProperty('--hand-count',p.hand.length);lane.style.setProperty('--meld-tiles',p.melds.reduce((n,m)=>n+m.tiles.length,0));lane.style.setProperty('--meld-count',p.melds.length);lane.style.setProperty('--called-count',p.melds.filter(m=>m.from!==undefined).length);lane.append(hand);$('south').append(lane);
 }
}
function addButton(label,fn,primary=false,id=''){const b=document.createElement('button');b.textContent=label;b.disabled=presentation!==null;b.onclick=fn;b.dataset.action=id;if(primary)b.className='primary';$('actions').append(b);return b;}

// v0.98 · The settlement waits for the player: it never moves on by itself, only via 「下一手」 (user decision 2026-10-18).
const SETTLEMENT_AUTO_ADVANCE=false;
let settlementHeld=false,settlementIdentity=null;
function resultIdentity(){return game.result?[game.seed,game.revision,match?.handNumber??0,match?.status??'practice'].join(':'):null;}
const settlementClock=new SettlementClock({onUpdate:state=>{
 const b=$('next-hand'),p=$('settlement-pause'),label=$('settlement-countdown');
 if(b&&b.id==='next-hand')b.textContent=match?.status==='playing'&&match.nextProgress().completed?'查看整場結算':'下一手';
 if(label)label.textContent=state.eligible?(state.hold?'已暫停倒數':state.blocked?'暫停中':state.done?'準備下一手':state.seconds+' 秒後繼續'):(match?.status==='completed'?'整場已完成':game.phase==='review'?'等待規則核對':match?.status==='playing'?'':'練習牌例 · 手動繼續');
 if(p){p.hidden=!state.eligible;p.textContent=state.hold?'繼續倒數':'暫停倒數';}
},onFinish:key=>{if(key===resultIdentity())advanceResult(game.revision,match?.handNumber);}});
function syncSettlement(){
 const key=resultIdentity();if(key!==settlementIdentity){settlementIdentity=key;settlementHeld=false;}
 settlementClock.sync(key,{eligible:SETTLEMENT_AUTO_ADVANCE&&game.phase==='ended'&&match?.status==='playing',blocked:paused(),hold:settlementHeld});
}
function advanceResult(revision,handNumber){
 if(paused()||revision!==game.revision||!game.result||match?.status==='completed')return;
 settlementClock.clear();
 if(!match)return;
 try{match.advance(handNumber);game=match.game;sound.play('shuffle');pendingDice=true;
  lastEffect=null;clearEffects();resultDismissed=false;selected=null;selectedIndex=null;declaring=false;saveLocal();render();
 }catch(e){settlementHeld=true;$('feedback').textContent=e.message;const label=$('settlement-countdown');if(label)label.textContent='無法接續：'+e.message;console.error(e);}
}
function renderSettlement(){
 const el=$('result');el.replaceChildren();if(!game.result)return;
 const r=game.result,completed=match?.status==='completed';
 const title=completed?'整場結算':r.kind==='draw'?'本手流局':r.kind==='review'?'本手待核對':FULL_NAMES[r.winner]+' '+(r.method==='flower'?(r.flower.kind==='eight'?'八仙過海':'七搶一'):r.method==='tsumo'?'自摸':r.method==='rob_added_kan'?'搶槓胡':'胡牌');
 el.innerHTML='<div class="settlement-heading"><h2>'+escape(title)+'</h2><button class="close-result">返回牌桌</button></div><div class="settlement-body"></div><div class="settlement-footer"><span id="settlement-countdown" role="status"></span><button id="settlement-pause">暫停倒數</button></div>';
 const body=el.querySelector('.settlement-body');
 if(completed)body.innerHTML='<div class="standings">'+match.standings().map(p=>'<div><strong>'+p.rank+' 名 · '+NAMES[p.seat]+'</strong><span>'+signed(p.score)+' 分</span></div>').join('')+'</div><p>完成 '+match.rounds+' 圈 · 共 '+match.history.length+' 手</p><button id="final-history">查看逐手紀錄</button>';
 else{
  if(r.reason)body.innerHTML+='<p>'+escape(r.reason)+'</p>';
  if(r.hand){const melds=r.winner!==undefined?game.players[r.winner].melds:[],groups=settlementGroups(r,melds);
   const count=groups.reduce((n,g)=>n+g.tiles.length,0);
   if(count)body.innerHTML+='<div class="winning-tiles" aria-label="完整胡牌牌組" style="--tile-count:'+count+';--group-gap-count:'+Math.max(0,groups.length-1)+'">'+groups.map(g=>'<div class="result-group result-'+g.kind+'" aria-label="'+g.label+'"><div class="result-group-tiles">'+g.tiles.map(t=>tile(t)).join('')+'</div><small>'+g.label+'</small></div>').join('')+'</div>';
  }
  const resultFlowers=r.winner!==undefined?game.players[r.winner].flowers:[];
  if(resultFlowers.length)body.innerHTML+='<div class="result-flowers" aria-label="胡牌者花牌"><span>花牌</span>'+resultFlowers.map(t=>'<button class="result-flower" data-flower="'+t+'" aria-label="放大'+tileLabel(t)+'">'+tileFace(t)+'</button>').join('')+'</div>';
  if(r.score&&r.kind!=='review'){
   if(r.kind==='win')body.innerHTML+='<div class="score-rows rv2-rows">'+r.score.rows.map(x=>'<div class="rv2-row"><span>'+escape(x.name)+'</span><i></i><b>'+x.tai+' 台</b></div>').join('')+'</div><p class="tai-total">合計 '+r.score.tai+' 台'+(r.flower?' · 花胡另計':'')+'</p>';
   else body.innerHTML+='<div class="score-rows">'+r.score.rows.map(x=>'<span>'+escape(x.name)+' '+x.tai+' 台</span>').join('')+'</div><p class="tai-total">合計 '+r.score.tai+' 台'+(r.flower?' · 花胡另計':'')+'</p>';
  }
  const delta=[0,0,0,0];for(const x of r.payments??[]){delta[x.from]-=x.amount;delta[x.to]+=x.amount;}
  if(r.kind!=='review')body.innerHTML+='<div class="score-board">'+game.scores.map((score,s)=>'<div><strong>'+NAMES[s]+'</strong><b class="'+(delta[s]>0?'gain':delta[s]<0?'loss':'')+'">'+signed(delta[s])+'</b><small>累計 '+signed(score)+'</small></div>').join('')+'</div>';
  if(r.payments?.length)body.innerHTML+='<details><summary>查看付款與台數細節</summary>'+r.payments.map(x=>'<p>'+NAMES[x.from]+' → '+NAMES[x.to]+'：'+x.amount+' 分（底 100 ＋ '+x.tai+' 台 × 50；莊家／連莊 '+x.dealerTai+' 台'+(x.flowerTai!==undefined?'；本筆花台 '+x.flowerTai+' 台':'')+'）</p>').join('')+'</details>';
 }
 decorateWinSettlement(el,r,completed);
 el.querySelector('.close-result').onclick=()=>{resultDismissed=true;settlementHeld=true;render();};
 $('settlement-pause').onclick=()=>{settlementHeld=!settlementHeld;syncSettlement();};
 for(const event of ['pointerdown','wheel','keydown'])body.addEventListener(event,()=>{settlementHeld=true;syncSettlement();},{passive:true});
 if(!completed&&match){const b=document.createElement('button');b.className='primary';b.id='next-hand';b.onclick=()=>advanceResult(game.revision,match?.handNumber);el.querySelector('.settlement-footer').append(b);}
 else if(!completed){const b=document.createElement('button');b.className='primary';b.id='practice-exit';b.textContent=suspendedTable?'返回整場':'開始新場';b.onclick=()=>{if(suspendedTable)resumeMatch();else{$('seed').value='';$('new').click();}};el.querySelector('.settlement-footer').append(b);}
 else {
  $('final-history').onclick=()=>{$('history-dialog').showModal();render();};
  const b=document.createElement('button');b.className='primary';b.id='next-match';b.textContent='重新抓位・開始新場';b.onclick=()=>{$('seed').value='';$('new').click();};el.querySelector('.settlement-footer').append(b);
 }
}
// v0.97 · win settlement, 雀魂-style: winner portrait on the left, rows tick in one by one, then the total seal.
// The reveal plays once per hand (render() rebuilds this panel often); later rebuilds show the final state.
let settlementRevealed=null;
function decorateWinSettlement(el,r,completed){
 const v2=r.kind==='win'&&!completed&&r.winner!==undefined;el.classList.toggle('result-v2',v2);if(!v2)return;
 const id=PORTRAITS[r.winner];el.style.setProperty('--wc-color',WIN_COLORS[id]||'#c9963c');
 el.insertAdjacentHTML('afterbegin','<div class="rv2-band" aria-hidden="true"></div><img class="rv2-portrait" alt="" draggable="false">');
 const img=el.querySelector('.rv2-portrait'),tries=[...winPortraits(r,id),characterSprite(r.winner,'front')];img.classList.toggle('burst',r.method==='tsumo'||(winGrade(r)?.tier??1)>=2);if(r.method==='tsumo'&&WIN_ANIM[id])img.style.height=WIN_ANIM[id].handoff.portraitH+'px';img.onerror=()=>{tries.shift();if(tries.length>0)img.src=tries[0];else img.onerror=null;};img.src=tries[0];
 const body=el.querySelector('.settlement-body'),total=r.score?.tai??0;
 body.insertAdjacentHTML('beforeend','<div class="rv2-seal" aria-hidden="true"><img src="'+WIN_ART.seal+'" alt="" onerror="this.remove()"><b>'+total+'</b><small>台</small></div>');
 const rows=[...el.querySelectorAll('.rv2-row')],seal=el.querySelector('.rv2-seal');
 if(settlementRevealed===game.revision||reduced())return;
 // Wait a tick: on the winning action render() runs just before the win stamp hides this panel.
 const rev=game.revision;setTimeout(()=>{if(el.hidden||!el.isConnected||settlementRevealed===rev||game.revision!==rev)return;settlementRevealed=rev;revealSettlement(rows,seal);},0);
}
function revealSettlement(rows,seal){
 const plan=revealPlan(rows.map((_,i)=>({i})));
 rows.forEach((row,i)=>row.animate([{opacity:0,transform:'translateX(-10px)'},{opacity:1,transform:'translateX(0)'}],{duration:220,delay:plan.items[i].at,fill:'backwards',easing:'ease-out'}));
 plan.items.forEach(it=>setTimeout(()=>{if(settlementRevealed===game.revision)sound.play('select');},it.at));
 seal?.animate([{opacity:0,transform:'scale(1.8) rotate(-14deg)'},{opacity:1,transform:'scale(.94) rotate(-8deg)',offset:.75},{opacity:1,transform:'scale(1) rotate(-8deg)'}],{duration:320,delay:plan.sealAt,fill:'backwards',easing:'ease-in'});
 setTimeout(()=>{if(settlementRevealed===game.revision)sound.play('place');},plan.sealAt+240);
}
function signed(n){return n>0?'+'+n:String(n);}
function renderResponseContext(acts){
 const el=$('response-context');el.replaceChildren();el.hidden=true;
 const hand=[...document.querySelectorAll('.hand .tile')];
 const eligible=game.phase==='response'?new Set(responseHandIndices(hand.map(e=>e.dataset.tile),acts,game.event)):new Set();
 $('south').classList.toggle('response-choice',eligible.size>0);
 hand.forEach((e,i)=>e.classList.toggle('response-eligible',eligible.has(i)));
 // v0.90: the target tile and 花胡 now show in the action band; this old context box stays empty.
 document.querySelector('.controls').classList.toggle('responding',!el.hidden);
}
function positionCallout(badge,seat){
 badge.dataset.seat=seat;const t=rectOf($('table')),p=rectOf(seatNode(seat).querySelector('.profile'));
 let x=seat===1?650:seat===3?205:427,y=seat===2?130:seat===0?225:195;
 badge.style.left=x+'px';badge.style.top=y+'px';
}

// v0.90 · fixed action band (see action-band.mjs). Slots never move; unusable ones stay dimmed.
let bandChoice=null,bandDismissed=null;
function renderActionBand(a,p,revision){
 const band=$('action-band');
 if(bandChoice&&bandChoice.revision!==revision)bandChoice=null;
 if(bandDismissed!==null&&bandDismissed!==revision)bandDismissed=null;
 const m=actionBandModel({actions:a,phase:game.phase,eventTile:game.event?.tile??null,eventType:game.event?.type??null,declaring,selected,playerState:p.state,choice:bandChoice?.kind??null});
 if(bandDismissed===revision&&m.right?.action==='band-dismiss'&&!declaring)m.visible=false;
 band.hidden=!m.visible;band.dataset.choice=m.choice||'';
 if(!m.visible){bandChoice=null;return;}
 const busy=presentation!==null,run=id=>{
  if(id==='declare-start'){declaring=true;selected=null;selectedIndex=null;render();return;}
  if(id==='declare-cancel'){declaring=false;selected=null;selectedIndex=null;render();return;}
  if(id==='choice-back'){bandChoice=null;render();return;}
  if(id==='band-dismiss'){bandChoice=null;bandDismissed=revision;render();return;}
  bandChoice=null;perform(0,id,revision);
 };
 $('action-band-target').innerHTML=m.target?tile(m.target):'';
 const slots=$('action-band-slots'),choices=$('action-band-choices');
 slots.hidden=!!m.choice;choices.hidden=!m.choice;slots.replaceChildren();choices.replaceChildren();
 if(m.choice){
  for(const c of m.choices){
   const b=document.createElement('button');b.type='button';b.className='band-choice';b.dataset.action=c.id;b.disabled=busy;b.setAttribute('aria-label',c.label);
   b.innerHTML=c.tiles?c.tiles.map(t=>tile(t,t===c.called?'called-preview':'')).join(''):tile(c.tile)+'<small>'+c.kind+'</small>';
   b.onclick=()=>run(c.id);choices.append(b);
  }
 }else for(const s of m.slots){
  const b=document.createElement('button');b.type='button';b.className='band-slot tone-'+s.tone+(s.on?' on':' off')+(s.pressed?' pressed':'');
  b.dataset.slot=s.key;b.dataset.action=s.action||(s.choices?s.key+'-choose':'');b.disabled=busy||!s.on;
  b.innerHTML=s.text+(s.sub?'<sub>'+s.sub+'</sub>':s.tag?'<sub class="tag">'+s.tag+'</sub>':'');
  b.setAttribute('aria-label',s.on?(s.choices?s.text+'，選擇牌組':s.text+(s.sub?' '+s.sub:'')):s.text+'（不能使用）');
  if(s.on)b.onclick=()=>{if(s.action)run(s.action);else if(s.choices){bandChoice={kind:s.key,revision};render();}};
  slots.append(b);
 }
 const r=$('action-band-right');r.hidden=!m.right;
 if(m.right){r.textContent=m.right.text;r.dataset.action=m.right.action;r.disabled=busy;r.onclick=()=>run(m.right.action);}
}
function render(){
 const active=document.activeElement,handFocus=active?.matches('#south .hand .tile[data-hand-index]')?{index:active.dataset.handIndex,tile:active.dataset.tile,revision:active.dataset.revision}:null;
 clearTimeout(timer);
 document.body.classList.toggle('no-motion',reduced());syncSound();
 for(const [s,id] of [[0,'south'],[1,'east'],[2,'north'],[3,'west']])player(s,id);
 $('table-scores').innerHTML='<thead><tr><th scope="col">人物</th><th scope="col">門風</th><th scope="col">累計</th><th scope="col">狀態</th></tr></thead><tbody>'+game.players.map((p,s)=>'<tr><th scope="row">'+FULL_NAMES[s]+'</th><td>'+['東','南','西','北'][game.wind(s)]+'</td><td class="tally">'+(game.scores[s]>0?'+':'')+game.scores[s]+' 分</td><td class="status">'+[game.dealer===s?'莊':'',p.state==='S0'?'':STATE_NAMES[p.state],p.passed?'過水':''].filter(Boolean).join('・')+'</td></tr>').join('')+'</tbody>';
 $('table').dataset.phase=game.phase;
 $('wall').textContent='可摸 '+game.live+' 張';$('dealer').textContent=NAMES[game.dealer]+'莊 · 連 '+game.repeats;
 $('current-seed').textContent=match?String(match.seed):'練習牌例';
 $('round-label').textContent=match?(match.status==='completed'?'整場結束':'第 '+match.progress.handInRound+' 莊'+(game.repeats?' · 連 '+game.repeats:'')):'練習局';$('round-label').title=match?match.label:'固定配牌練習，不計入整場';
 $('deal-info').textContent=game.deal?'骰子 '+game.deal.dice.join('＋')+'＝'+game.deal.total+' · '+NAMES[game.deal.doorSeat]+'東位':'固定配牌練習';
 renderMatchSummary();
 const a=game.actions(0),p=game.players[0],revision=game.revision;
 for(const el of document.querySelectorAll('[data-wind-seat]')){const s=Number(el.dataset.windSeat);el.textContent=['東','南','西','北'][game.wind(s)];el.classList.toggle('active-wind',game.phase==='turn'&&game.turn===s);}
 $('last-play').hidden=!game.event?.tile||game.phase!=='response';if(!$('last-play').hidden)$('last-play').innerHTML=NAMES[game.event.from]+' '+(game.event.type==='addedKan'?'加槓':'打出')+tile(game.event.tile);
 $('turn-label').textContent=game.phase==='turn'?NAMES[game.turn]+'的回合':game.phase==='flower'?NAMES[game.flowerEvent.winner]+'的花胡機會':game.phase==='response'?NAMES[game.event.from]+(game.event.type==='addedKan'?'加槓 ':'打出 ')+tileLabel(game.event.tile)+'，等待回應':game.phase==='review'?'此手待核對':'本手結束';
 $('prompt').textContent=game.phase==='turn'&&game.turn===0?(a.some(x=>x.id==='win')?'可以自摸':declaring?'選金框牌，再點同張或向上滑宣告聽牌':'點牌選擇，再點同張或上滑出牌'):game.phase==='flower'?(a.length?'選擇是否接受花胡':'等待花胡回應'):game.phase==='response'&&a.length?'輪到你回應':game.phase==='ended'?(match?.status==='completed'?'整場已結束，可查看名次與逐手紀錄':'查看結算後繼續場次'):game.phase==='review'?'規則待核對，分數尚未收付':'等待電腦行動…';
 $('waits').textContent='';
 const hint=waitPreview(game,selected);
 if(hint.current.length)$('waits').textContent='目前聽：'+hint.current.map(tileLabel).join('、');
 if(hint.afterDiscard){
  const w=hint.preview;
  $('waits').textContent=w.length?'打出後聽：'+w.map(tileLabel).join('、'):'打出後尚未聽牌';
 }
 $('actions').replaceChildren();document.querySelector('.controls').classList.toggle('declaring',declaring);const readyTurn=!declaring&&p.state!=='S0'&&game.phase==='turn'&&game.turn===0;document.querySelector('.controls').classList.toggle('ready-locked',readyTurn);$('play-hint').hidden=!(declaring||readyTurn);$('play-hint').textContent=declaring?(selected?'打出選牌，宣告聽牌':'選擇要打出的牌'):readyTurn?'已聽牌，只能打新摸牌':'';
 // v0.90: 吃碰槓聽胡過 live in the fixed action band; #actions keeps only the optional discard-confirm button.
 renderActionBand(a,p,revision);
 if(a.some(x=>x.id.startsWith('discard:'))&&!declaring&&selected&&$('confirm-button').checked)addButton('出牌 · '+tileLabel(selected),()=>perform(0,'discard:'+selected,revision),true,'discard');
 $('notice').textContent=declaring?(a.find(x=>x.id.startsWith('declare:'))?.state==='S1'?'普通宣告：固定手牌，胡牌加 1 台；可以過水。':'天聽／地聽：固定手牌、有胡必胡、禁止槓；提交後不能撤回。'):p.state!=='S0'?'已宣告，不能任意換打原手牌。'+(['S2','S3'].includes(p.state)?'有胡必胡。':'普通宣告仍可過水。'):'再點同張或上滑即可出牌；也可按確認按鈕。';
 if(game.phase==='ended')$('notice').textContent=match?.status==='completed'?'整場分數已結算，可下載紀錄或開始新場。':'本手分數已結算；繼續場次不會再次收付。';
 if(game.phase==='flower')$('notice').textContent='接受花胡會依法補足手牌並結算；放棄不移轉他人的花，也不重開同一次機會。';
 const forced=a.length===1&&['win','flowerWin'].includes(a[0].id)&&['S2','S3'].includes(p.state);
 if(forced)$('notice').textContent='天聽／地聽有胡必胡（包含合法花胡），系統將自動接受。';
 $('result').hidden=!game.result||resultDismissed||winPresentation!==null;
 $('result-toggle').hidden=!game.result;
 // After 返回牌桌 the hand is still over: keep a visible way back to the settlement / next hand on the table itself.
 $('result-reopen').hidden=!game.result||!resultDismissed||winPresentation!==null;$('result-reopen').textContent=match?.status==='playing'?'本手結算・下一手 ▸':'查看本手結算 ▸';
 $('history-toggle').disabled=!match;$('resume-match').hidden=!suspendedTable;
 renderSettlement();
 $('log').innerHTML=game.log.slice(-100).map(t=>'<li>'+escape(t.replace(/你|下家|對家|上家/g,n=>({你:NAMES[0],下家:NAMES[1],對家:NAMES[2],上家:NAMES[3]})[n]))+'</li>').join('');$('log').scrollTop=$('log').scrollHeight;$('log-count').textContent=game.log.length+' 步';
 $('step').disabled=findComputer()===null;
 $('computer-resume').hidden=$('auto').checked||['ended','review'].includes(game.phase);
 if(!$('auto').checked&&findComputer()!==null&&!a.length)$('prompt').textContent='電腦已暫停，按「繼續電腦行動」恢復';
 renderResponseContext(a);
 renderPrototypeState();
 if(game.phase==='response'&&game.event.type==='discard')document.getElementById('river-'+game.event.from).lastElementChild?.classList.add('latest-discard');
 fitTableUI();syncCharacters();syncSettlement();
 if(handFocus&&handFocus.revision===String(game.revision)&&!paused()){
  const replacement=$('south').querySelector('.hand .tile[data-hand-index="'+handFocus.index+'"]');
  if(replacement&&!replacement.disabled&&replacement.dataset.tile===handFocus.tile)replacement.focus({preventScroll:true});
 }
 dealShow.apply();
 if(paused())return;
 if(pendingDice&&game.deal&&game.phase==='turn'&&!game.result){startDice();return;}
 pendingDice=false;
 if(forced)timer=setTimeout(()=>perform(0,a[0].id,revision),reduced()?250:600);
 else if($('auto').checked){const seat=findComputer();if(seat!==null){const id=chooseAction(game.publicView(seat));timer=setTimeout(()=>perform(seat,id,revision),computerDelay({id,speed:Number($('speed').value)}));}}
}
function renderMatchSummary(){
 const el=$('match-summary');el.hidden=!match;if(!match)return;
 const done=match.status==='completed';
 el.innerHTML='<h2>'+(done?'整場總結算':'整場進度')+'</h2><p>'+match.rounds+' 圈 · 已歸檔 '+match.history.length+' 手'+(done?' · 同分並列名次':' · 分數包含本手已成立收付')+'</p>';
 el.innerHTML+='<div class="standings">'+match.standings().map(p=>'<div><strong>'+p.rank+' 名 · '+NAMES[p.seat]+'</strong><span>'+(p.score>=0?'+':'')+p.score+' 分</span></div>').join('')+'</div>';
 if(seating)el.innerHTML+='<details><summary>開場抓位紀錄</summary><p>'+seating.roster.map((id,i)=>CAST[id][0]+' 抽到'+['東','南','西','北'][seating.winds[i]]).join('／')+'</p><p>定莊骰：'+seating.dice.join('・')+'；首莊：'+NAMES[seating.starter]+'。畫面始終以自家為下方；每手門風另依開門骰決定。</p></details>';
 if(completedMatches.length)el.innerHTML+='<details><summary>已完成場次（'+completedMatches.length+' 場）</summary>'+completedMatches.map(row=>'<p>'+row.current.rounds+' 圈／'+row.current.history.length+' 手：'+row.characters.map((id,s)=>CAST[id][0]+' '+signed(row.current.game.scores[s])).join('、')+'</p>').join('')+'</details>';
 if(match.history.length)el.innerHTML+='<details><summary>逐手紀錄（'+match.history.length+' 手）</summary><div class="history-scroll"><table><thead><tr><th>手</th><th>圈／莊</th><th>結果</th><th>四家累計</th></tr></thead><tbody>'+match.history.map(r=>'<tr><td>'+r.number+'</td><td>'+['東','南','西','北'][r.roundWind]+' '+r.handInRound+' 莊<br>連 '+r.repeats+'</td><td>'+escape(r.kind==='draw'?'流局':NAMES[r.winner]+(r.method==='flower'?'花胡':r.method==='tsumo'?'自摸':r.method==='rob_added_kan'?'搶槓胡':'胡牌'))+'</td><td>'+r.scores.join('／')+'</td></tr>').join('')+'</tbody></table></div></details>';
}
// v0.93 · every new hand opens with the engine's own wall-break dice; the computer waits until they settle.
function startDice(){
 pendingDice=false;clearTimeout(timer);clearTimeout(dealTimer);tsumoShow.preload(PORTRAITS);
 const still=reduced();
 if(!still)dealShow.prepare(game,game.dealer);else dealShow.finish({silent:true});
 diceShow.start({dice:game.deal.dice,text:diceBadgeText(game.deal,NAMES),from:game.dealer,reduced:still,
  onStart:()=>{sound.fade('shuffle',.35);sound.play('dice');},onDone:()=>{if(!dealShow.running)render();}});
 // The deal starts as soon as the dice land, overlapping the total, so the opening stays around three seconds.
 if(!still)dealTimer=setTimeout(()=>dealShow.begin({onDone:()=>{if(!diceShow.running)render();}}),DICE_TIMING.delay+DICE_TIMING.roll+DEAL_START_AFTER_DICE);
 dealShow.apply();
}
function findComputer(){for(let s=1;s<4;s++)if(game.actions(s).length)return s;return null;}
function step(){if(paused())return;const s=findComputer();if(s!==null)perform(s,chooseAction(game.publicView(s)));}
$('computer-resume').onclick=()=>{$('auto').checked=true;$('feedback').textContent='';savePreferences();clearEffects();render();};
$('step').onclick=()=>{if(!portrait()){const s=findComputer();if(s!==null){$('settings-dialog').close();perform(s,chooseAction(game.publicView(s)));}}};$('flower-skin').onchange=()=>{setFlowerSkin($('flower-skin').value);savePreferences();renderFlowerPreview();clearEffects();render();};for(const id of ['auto','speed','motion','confirm-button'])$(id).onchange=()=>{savePreferences();clearEffects();render();};
$('new').onclick=()=>{let n;try{n=newGameSeed($('seed').value,match?.seed??game.seed);}catch(e){$('feedback').textContent=e.message;return;}archiveCurrent();clearEffects();lastEffect=null;resultDismissed=false;newMatch(n);sound.play('shuffle');clearPracticeLink();$('seed').value='';selected=null;selectedIndex=null;declaring=false;saveLocal();$('settings-dialog').close();render();};
document.querySelectorAll('[data-demo]').forEach(b=>b.onclick=()=>enterPractice(trainingGame(b.dataset.demo)));
document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=async()=>{const scene=b.dataset.scene;if(!['normal','chi','ready'].includes(scene))return;b.disabled=true;try{const r=await fetch('./fixtures/'+scene+'.json');if(!r.ok)throw Error('練習牌例暫時無法載入');enterPractice(Game.restore(await r.json()));}catch(e){$('feedback').textContent='保留目前進度：'+e.message;}finally{b.disabled=false;}});
$('resume-match').onclick=resumeMatch;
$('save').onclick=async()=>{const text=JSON.stringify(createBackup(sessionSnapshot(),archives),null,2),status=await offerFile('蜜蜜麻將-牌局'+game.seed+'-步驟'+game.revision+'.json',text);$('feedback').textContent=fileMessage(status,'已存出目前場次與測試紀錄（含暗牌），可讀取續玩。');};
$('load').onchange=async e=>{const input=e.target;try{const f=input.files[0];if(!f)return;if(f.size>10e6)throw Error('紀錄檔過大');const restored=restoreBackup(JSON.parse(await f.text()));let archivesSaved=true;
 if(restored.archives===null)archivesSaved=archiveCurrent();else{archives=restored.archives;try{localStorage.setItem('mimi-tw-archives-5',JSON.stringify(archives));}catch{archivesSaved=false;}}
 adoptSession(restored);clearPracticeLink();lastEffect=null;clearEffects();resultDismissed=false;selected=null;selectedIndex=null;declaring=false;const saved=saveLocal();render();$('feedback').textContent='已恢復牌局'+(restored.archives===null?'':'與 '+archives.length+' 手歷史紀錄')+(saved&&archivesSaved?'':'；無法自動保存，請保留下載的紀錄檔。');}catch(e){$('feedback').textContent='讀取失敗：'+e.message;}finally{input.value='';}};
function orientationChanged(){applyScreenSize();lastPortrait=wantsForcedLandscape();document.documentElement.classList.toggle('force-landscape',lastPortrait);fitPrototypeUI();if(winPresentation)finishWinCinema();clearTimeout(timer);clearEffects();const blocked=portrait();$('rotate-prompt').hidden=!blocked;$('game-shell').inert=blocked;$('settings-dialog').inert=blocked;$('history-dialog').inert=blocked;$('river-dialog').inert=blocked;$('flower-dialog').inert=blocked;$('chow-dialog').inert=blocked;$('meld-dialog').inert=blocked;$('sticker-dialog').inert=blocked;if(blocked||document.hidden){clearTimeout(stickerTimer);$('character-sticker').hidden=true;$('character-sticker').replaceChildren();}document.body.classList.toggle('portrait',blocked);if(blocked||document.hidden)sound.suspend();else sound.resume();render();}
for(const name of ['settings','history','river']){
 $(name+'-toggle').onclick=()=>{clearTimeout(timer);clearEffects();if(name==='river')$('river-detail').innerHTML=game.players.map((p,s)=>'<section class="all-river"><h3>'+FULL_NAMES[s]+' · '+p.river.length+' 張</h3><div>'+p.river.map(r=>tile(r.tile,r.claimed?'claimed':'')).join('')+'</div></section>').join('');if(name!=='settings')$('settings-dialog').close();$(name+'-dialog').showModal();render();};
 $(name+'-close').onclick=()=>$(name+'-dialog').close();
 $(name+'-dialog').addEventListener('close',()=>{if(!presentation&&!winPresentation)render();});
}
$('result-toggle').onclick=()=>{$('settings-dialog').close();resultDismissed=false;render();};
$('result-reopen').onclick=()=>{resultDismissed=false;render();document.querySelector('#next-hand,.close-result')?.focus();};
let lastPortrait=null;
function viewportChanged(force){const changed=applyScreenSize();if(wantsForcedLandscape()!==lastPortrait)orientationChanged();else if(changed||force===true)fitTableUI();}
window.addEventListener('resize',()=>viewportChanged(true));window.visualViewport?.addEventListener('resize',viewportChanged);window.addEventListener('pageshow',viewportChanged);window.addEventListener('focus',viewportChanged);
// iOS can settle the real size without any event (home-screen launch, returning from another app): check once a second.
setInterval(()=>{if(!document.hidden)viewportChanged();},1000);
document.addEventListener('visibilitychange',orientationChanged);
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{if(winPresentation&&reduced())finishWinCinema();clearEffects();render();});
orientationChanged();

for(let s=0;s<4;s++)$('character-'+s).onchange=()=>{const next=$('character-'+s).value,other=nextCharacters.indexOf(next);if(other<0)return;[nextCharacters[s],nextCharacters[other]]=[nextCharacters[other],nextCharacters[s]];for(let i=0;i<4;i++)$('character-'+i).value=nextCharacters[i];$('feedback').textContent='角色設定將在開始新場時生效；本場角色與分數保持配對。';};

// Full-bleed stage: on an iPhone home-screen app the 854×394 stage matches the landscape screen, so it fills edge to edge.
function fitPrototypeUI(){
 const shell=$('game-shell'),f=foregroundFor(game);
 const view=viewSize(),stageScale=Math.min(view.width/854,view.height/394);shell.style.setProperty('--stage-scale',stageScale);document.documentElement.style.setProperty('--stage-scale',stageScale);
 shell.style.setProperty('--base-hand-w',f.unit+'px');shell.style.setProperty('--base-hand-h',f.unit*1.375+'px');
 shell.style.setProperty('--meld-tile-w',f.meldUnit+'px');shell.style.setProperty('--own-meld-span',f.meldSpan+'px');
 shell.style.setProperty('--foreground-left',f.left+'px');shell.style.setProperty('--foreground-span',f.span+'px');
}
function renderPrototypeState(){
 
 const wind=['東','南','西','北'][game.roundWind];
 $('round-wind-token').textContent=wind+'風圈';
 $('round-wind-token').setAttribute('aria-label',wind+'風圈');
 const preview=$('ready-preview'),hint=waitPreview(game,selected),waits=hint.preview;
 preview.hidden=!hint.hasPreview||(!waits.length&&!declaring);
 preview.innerHTML=waits.length?'<span class="wait-heading">聽</span>'+unseenWaitCounts(waits,game).map(w=>'<span class="wait-card" title="'+tileLabel(w.tile)+'，未見'+w.count+'張">'+tile(w.tile)+'<small>未見 '+w.count+'</small></span>').join(''):'<span class="wait-heading">這張牌不能宣告聽牌</span>';
 // While the action band is up, the ready hint rides at its right end instead of a separate box.
 {const side=$('action-band-side'),inBand=!$('action-band').hidden&&!preview.hidden&&!$('action-band').dataset.choice;side.hidden=!inBand;side.innerHTML=inBand?preview.innerHTML:'';if(inBand)preview.hidden=true;}
 document.querySelector('.controls').classList.toggle('waits-only',!preview.hidden&&$('actions').childElementCount===0&&$('play-hint').hidden&&$('computer-resume').hidden);
 $('sticker-image').src=characterSprite(0,'chibi');$('sticker-image').alt=FULL_NAMES[0]+'全身Q版';
 $('sticker-title').textContent=FULL_NAMES[0]+' · 角色貼圖';
}
$('sticker-toggle').onclick=()=>{if(portrait()||winPresentation)return;clearTimeout(timer);clearEffects();$('sticker-dialog').showModal();render();};
$('sticker-close').onclick=()=>$('sticker-dialog').close();
$('sticker-dialog').addEventListener('close',render);
$('send-sticker').onclick=()=>{const el=$('character-sticker');clearTimeout(stickerTimer);el.innerHTML='<img src="'+characterSprite(0,'chibi')+'" alt="'+FULL_NAMES[0]+'貼圖">';el.hidden=false;$('sticker-dialog').close();stickerTimer=setTimeout(()=>{el.hidden=true;el.replaceChildren();},2400);};
document.addEventListener('click',e=>{const b=e.target.closest('[data-flower]');if(!b||portrait()||winPresentation)return;const t=b.dataset.flower;if(!/^[1-8]f$/.test(t))return;clearTimeout(timer);clearEffects();$('flower-title').textContent=tileLabel(t)+' · '+($('flower-skin').value==='character'?'人物花牌':'花景花牌');$('flower-large').src='./assets/flower-art/'+$('flower-skin').value+'/'+t+'.png';$('flower-large').alt=tileLabel(t);$('flower-dialog').showModal();render();});
// The claude.ai viewer cannot switch documents inside its frame, so secondary pages
// (character lab, layout notes) open as an overlay on this page and close back to the table.
async function openOverlay(url,title){
 try{const r=await fetch(url);if(!r.ok)throw Error('頁面暫時無法開啟');const html=await r.text();
  $('settings-dialog').close();clearTimeout(timer);clearEffects();characterActors.stopVoices();
  const frame=$('page-overlay-frame');frame.title=title;frame.srcdoc=html;$('page-overlay').hidden=false;$('game-shell').inert=true;render();
 }catch(e){$('feedback').textContent=e.message;}
}
function closeOverlay(){if(!overlayOpen())return;$('page-overlay').hidden=true;$('page-overlay-frame').srcdoc='';$('game-shell').inert=portrait();render();}
window.__closeOverlay=closeOverlay;
$('page-overlay-close').onclick=closeOverlay;
document.addEventListener('click',e=>{const a=e.target.closest('a[data-overlay]');if(!a)return;e.preventDefault();openOverlay(a.getAttribute('href'),a.textContent.trim());});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlayOpen())closeOverlay();});
// Full screen hides the browser and claude.ai bars where the browser allows it (computers, Android).
// iPhone Safari has no element full screen, so the button stays hidden there.
{const fs=$('fullscreen-toggle'),root=document.documentElement,enabled=document.fullscreenEnabled||document.webkitFullscreenEnabled;
 const active=()=>document.fullscreenElement||document.webkitFullscreenElement;
 const sync=()=>{fs.textContent=active()?'退出全螢幕':'全螢幕遊玩';};
 fs.hidden=!enabled||!(root.requestFullscreen||root.webkitRequestFullscreen);sync();
 fs.onclick=async()=>{try{if(active())await (document.exitFullscreen||document.webkitExitFullscreen).call(document);else{$('settings-dialog').close();await (root.requestFullscreen||root.webkitRequestFullscreen).call(root,{navigationUI:'hide'});try{await screen.orientation?.lock?.('landscape');}catch{}}}catch{$('feedback').textContent='這個瀏覽器目前不允許全螢幕。';}sync();};
 document.addEventListener('fullscreenchange',sync);document.addEventListener('webkitfullscreenchange',sync);}
// Easter egg: tap an opponent's chibi and they react with a line. Never fires through buttons, tiles or dialogs,
// and never while play is paused; a declaration always takes over.
// Taps are read from pointer events, not 'click': iOS Safari does not reliably deliver a click to a document listener
// when the tapped element is not itself clickable, which made some characters feel slow or unresponsive.
let characterTap=null;
document.addEventListener('pointerdown',e=>{characterTap=e.isPrimary===false?null:{id:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now(),target:e.target};},{passive:true});
document.addEventListener('pointercancel',()=>{characterTap=null;},{passive:true});
document.addEventListener('pointerup',e=>{
 const tap=characterTap;characterTap=null;
 if(!tap||tap.id!==e.pointerId||Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>14||performance.now()-tap.t>800)return;
 if(paused()||tap.target.closest?.('button,a,input,select,label,dialog,.tile,.meld,[data-flower],#south,.controls,#action-band,#result,#table-toast,#page-overlay'))return;
 const seat=characterActors.hitSeat(tap.x,tap.y);if(seat===null)return;
 // Give audio a moment to unlock so the first tap is voiced, but never let a stalled resume() swallow the reaction.
 if(sound.enabled&&sound.state!=='running'){const ready=sound.unlock().then(()=>characterActors.prepareVoices());Promise.race([ready,new Promise(r=>setTimeout(r,400))]).then(()=>characterActors.poke(seat));ready.then(syncSound,()=>{});}else characterActors.poke(seat);
});
$('flower-close').onclick=()=>$('flower-dialog').close();$('flower-dialog').addEventListener('close',render);
