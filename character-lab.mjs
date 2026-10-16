import {CHARACTER_MEDIA,loadCharacterMotion,paintCharacterPose} from './character-media.mjs';
import {MotionPreview} from './motion-preview.mjs';
import {VoicePlayer} from './voice-player.mjs';
import {TableSound} from './sound.mjs';
import {TileRenderer} from './tile-renderer.mjs';
import {tableLayout} from './table-layout.mjs';
import {Game} from './engine.mjs';
const $=id=>document.getElementById(id),names={idle:'待機',chi:'吃',pon:'碰',kan:'槓',ready:'聽',tap:'點一下'};
const preview=new MotionPreview(),sound=new TableSound();sound.enabled=true;
const cache=new Map(),voices=new Map();let selected='ichika',seat=2,assets=null,canvas=null,stageImage=null,loading=true,request=0,eventToken=0,queue=[],replayAt=null,replayEnabled=false,frame=null;
for(const [id,media] of Object.entries(CHARACTER_MEDIA)){
 const b=document.createElement('button');b.className='cast-card';b.dataset.character=id;b.innerHTML='<img src="'+media.image+'" alt=""><span><strong>'+media.name+'</strong><small>'+(media.motion?'動作與語音已接入':'靜態圖 · 動作待製作')+'</small></span>';b.onclick=()=>selectCharacter(id);$('cast-list').append(b);
}
for(const [kind,name]of Object.entries(names)){
 const b=document.createElement('button');b.textContent=name;b.dataset.kind=kind;b.onclick=()=>{queue=[];chooseAction(kind,true);};$('action-list').append(b);
}
document.querySelector('.lab-main .panel-heading').after($('action-list'));$('action-list').after($('idle-options'));
function idleButtons(){
 $('idle-options').replaceChildren();
 for(const [kind,label] of [['auto','自然隨機'],...Object.entries(preview.profile.idleVariants).map(([kind,spec])=>[kind,spec.label])]){
  const b=document.createElement('button');b.dataset.idle=kind;b.textContent=label;b.onclick=()=>{queue=[];$('mode').value='live';chooseAction('idle');if(kind!=='auto')preview.selectIdle(kind);syncControls();play();};$('idle-options').append(b);
 }
}
idleButtons();
document.querySelector('.lab-settings h2').textContent='播放設定';
function stopVoices(){eventToken++;for(const voice of voices.values())voice.stop();}
function stage(){
 const cast=['mimi','gondo','ichika','harumi'],other=cast.indexOf(selected);[cast[seat],cast[other]]=[cast[other],cast[seat]];
 for(const [s,id]of [[2,'north'],[3,'west'],[1,'east']]){
  const media=CHARACTER_MEDIA[cast[s]],el=$(id);el.replaceChildren();const actor=document.createElement('div');actor.className='character-stage';actor.dataset.character=cast[s];
  const image=new Image();image.src=media.image;image.alt=media.name+'Q版';actor.append(image);el.append(actor);
  const label=document.createElement('div');label.className='profile';label.textContent=media.name;el.append(label);
  if(s===seat){stageImage=image;canvas=document.createElement('canvas');canvas.className='character-animation';canvas.style.cssText='position:absolute;inset:0;pointer-events:none';canvas.width=270;canvas.height=336;canvas.setAttribute('aria-label',media.name+'演出預覽');actor.append(canvas);}
 }
 paint();
}
async function selectCharacter(id){
 const token=++request;selected=id;loading=true;assets=null;queue=[];replayAt=null;stopVoices();preview.setProfile(CHARACTER_MEDIA[id].motion?.profile);preview.select('idle',$('mode').value);idleButtons();$('solo-image').src=CHARACTER_MEDIA[id].image;stage();syncControls();$('asset-state').textContent='正在載入 '+CHARACTER_MEDIA[id].name+'…';
 try{
  // Keep only the selected character's atlases decoded (each is tens of MB on a phone).
  for(const [key,pending] of cache)if(key!==id){cache.delete(key);pending.then(a=>{for(const image of Object.values(a?.images||{}))image.src='';}).catch(()=>{});}
  if(!cache.has(id))cache.set(id,loadCharacterMotion(id));const loaded=await cache.get(id);if(token!==request)return;assets=loaded;
  if(assets&&!voices.has(id)){const voice=new VoicePlayer({context:()=>sound.context,enabled:()=>sound.enabled&&!document.hidden});voices.set(id,voice);voice.preload(assets.motion.base,assets.motion.voices).then(syncAssetState);}
  loading=false;if(assets)preview.play(performance.now());syncControls();syncAssetState();paint();
 }catch(error){if(token!==request)return;cache.delete(id);loading=false;assets=null;syncControls();paint();$('asset-state').textContent='動作素材載入失敗，保留靜態圖。可重新點選角色重試。';}
}
function syncAssetState(){const voice=voices.get(selected);$('asset-state').textContent=assets?'動作已載入 · 語音 '+(voice?.buffers.size||0)+'/'+assets.motion.voices.length+' 已解碼；首次播放時啟用音訊。':'目前為靜態圖；吃、碰、槓、聽的動作與語音尚待製作。';}
function syncControls(){
 for(const b of $('cast-list').children)b.setAttribute('aria-pressed',String(b.dataset.character===selected));
 for(const b of $('action-list').children){b.disabled=loading||!assets&&b.dataset.kind!=='idle';b.setAttribute('aria-pressed',String(b.dataset.kind===preview.kind));}
 for(const id of ['play','pause','previous','next','timeline','duration','mode','speed','repeat','sequence'])$(id).disabled=loading||!assets;
 $('voice-only').disabled=loading||!assets||preview.kind==='idle';$('duration').value=Math.round(preview.duration);$('duration').disabled=loading||!assets||preview.naturalIdle;$('duration').parentElement.firstChild.textContent=preview.naturalIdle?'觀察時窗（ms） ':'動作長度（ms） ';
 $('idle-options').hidden=preview.kind!=='idle'||!assets;for(const b of $('idle-options').children){b.disabled=loading||!assets||b.dataset.idle!=='auto'&&!preview.profile.idleVariants[b.dataset.idle];b.setAttribute('aria-pressed',String(b.dataset.idle===preview.idleVariant));}
 $('action-note').textContent=!loading&&!assets?'此角色目前為靜態圖，動作尚待製作。':preview.profile.notes[preview.kind]||preview.profile.idleNote;
}
async function playVoice(force=false){
 const kind=preview.kind,id=selected,token=++eventToken,voice=voices.get(id);if(!voice||kind==='idle'||!force&&!$('voice').checked)return;
 try{await sound.unlock();await voice.prepare();if(token!==eventToken||selected!==id||document.hidden||!force&&!$('voice').checked)return;voice.play(kind);$('playback-state').dataset.voicePlayed=voice.played;syncAssetState();}catch{$('asset-state').textContent='語音暫時無法播放，動作仍可預覽。';}
}
function play(restart=true){if(!assets)return;replayEnabled=true;replayAt=null;stopVoices();preview.play(performance.now(),restart);playVoice();paint();}
function chooseAction(kind,autoplay=false){replayEnabled=false;stopVoices();replayAt=null;preview.select(kind,$('mode').value);syncControls();if(autoplay&&assets)play();else paint();}
function paint(){
 const pose=preview.pose(),show=!!assets;
 $('solo-canvas').hidden=!show;$('solo-image').hidden=show;if(canvas)canvas.hidden=!show;if(stageImage)stageImage.style.visibility=show?'hidden':'';
 if(show){for(const target of [canvas,$('solo-canvas')])if(target){if(target.width!==assets.motion.width||target.height!==assets.motion.height){target.width=assets.motion.width;target.height=assets.motion.height;}paintCharacterPose(target.getContext('2d'),assets.images,pose,assets.motion);target.dataset.clip=pose.clip;target.dataset.frame=pose.frame;target.dataset.idleVariant=pose.idleVariant||'';}}
 $('timeline').value=Math.round(preview.position/preview.duration*1000);$('time').textContent=Math.round(preview.position)+' / '+Math.round(preview.duration)+' ms';
 $('pause').textContent=preview.playing?'暫停':'繼續';
 $('playback-state').textContent=loading?'載入中':!assets?'靜態預覽':(preview.naturalIdle?'自然隨機待機':preview.kind==='idle'&&preview.idleVariant!=='auto'?preview.profile.idleVariants[preview.idleVariant].label:names[preview.kind])+' · '+(preview.playing?'播放中':preview.finished?'已完成':'已暫停')+' · '+pose.clip+' 第 '+(pose.frame+1)+'/'+preview.profile.clips[pose.clip].frames+' 格 · '+preview.speed+'×'+(preview.naturalIdle?' · 持續待機':' · 實播 '+Math.round(preview.duration/preview.speed)+' ms')+(preview.naturalIdle?' · '+(preview.profile.idleVariants[pose.idleVariant]?.label||'安靜呼吸')+' · 下次變化約 '+Math.ceil(pose.nextIdle/1000)+' 秒':'');
 $('playback-state').dataset.state=preview.playing?'playing':preview.finished?'finished':'paused';
}
function loop(now){frame=null;preview.tick(now);
 if(replayEnabled&&preview.finished&&(queue.length||$('repeat').checked)&&assets){if(replayAt===null)replayAt=now+1000;if(now>=replayAt){if(queue.length){const next=queue.shift();chooseAction(next,true);}else play();}}
 paint();if(!document.hidden)frame=requestAnimationFrame(loop);
}
$('seat').onchange=()=>{seat=Number($('seat').value);stage();};
$('backdrop').onchange=()=>$('solo').dataset.background=$('backdrop').value;
$('play').onclick=()=>{queue=[];play();};
$('pause').onclick=()=>{queue=[];replayAt=null;replayEnabled=false;if(preview.playing){preview.pause(performance.now());stopVoices();}else{replayEnabled=true;preview.play(performance.now());}paint();};
$('reset').onclick=()=>{queue=[];chooseAction('idle',!!assets);};
for(const [id,direction]of [['previous',-1],['next',1]])$(id).onclick=()=>{queue=[];replayAt=null;replayEnabled=false;stopVoices();preview.step(direction);paint();};
$('timeline').oninput=()=>{queue=[];replayAt=null;replayEnabled=false;stopVoices();preview.seek(Number($('timeline').value)/1000*preview.duration);paint();};
$('speed').onchange=()=>{preview.tick(performance.now());preview.speed=Number($('speed').value);paint();};
$('duration').onchange=()=>{const n=Number($('duration').value);if(!Number.isFinite(n)||n<250||n>8000){$('duration').value=Math.round(preview.duration);return;}const fraction=preview.elapsed/preview.duration;preview.duration=n;preview.seek(fraction*n);stopVoices();queue=[];replayAt=null;replayEnabled=false;paint();};
$('mode').onchange=()=>{queue=[];if(preview.kind==='idle'&&preview.idleVariant!=='auto'){const variant=preview.idleVariant;stopVoices();replayAt=null;replayEnabled=false;preview.selectIdle(variant,$('mode').value);syncControls();if(assets)play();else paint();}else chooseAction(preview.kind,!!assets);};
$('voice').onchange=()=>{if(!$('voice').checked)stopVoices();};
$('repeat').onchange=()=>{replayAt=null;};
$('voice-only').onclick=()=>playVoice(true);
$('sequence').onclick=()=>{$('repeat').checked=false;chooseAction('chi',true);queue=['pon','kan','ready'];};
$('defaults').onclick=()=>{$('mode').value='live';$('speed').value='1';preview.speed=1;$('repeat').checked=false;queue=[];chooseAction(preview.kind,!!assets);};
document.addEventListener('visibilitychange',()=>{if(document.hidden){preview.pause(performance.now());stopVoices();queue=[];replayAt=null;replayEnabled=false;if(frame)cancelAnimationFrame(frame);frame=null;paint();}else if(!frame){preview.last=performance.now();frame=requestAnimationFrame(loop);}});
// Inside the game's overlay, "返回正式牌桌" closes the overlay instead of navigating.
document.querySelector('.lab-header a')?.addEventListener('click',e=>{if(window.parent!==window&&typeof window.parent.__closeOverlay==='function'){e.preventDefault();window.parent.__closeOverlay();}});
const resize=()=>{const w=$('stage-window').clientWidth;$('stage-window').style.height=w*394/854+'px';$('game-shell').style.setProperty('--lab-scale',w/854);if(tableReady)renderer.draw(tableObjects);};
// Without WebGL the table backdrop is skipped; the character preview still works.
let renderer=null;try{renderer=new TileRenderer($('table-canvas'));}catch{}
const game=new Game({seed:303521536,dealer:2}),tableObjects=tableLayout(game,'character');let tableReady=false;
new ResizeObserver(resize).observe($('stage-window'));resize();
(renderer?renderer.load():Promise.reject(Error('WebGL unavailable'))).then(async()=>{const images=await renderer.faceImages();for(const tile of game.players[0].hand){const img=new Image();img.src=images.get(tile);img.alt=tile;$('lab-hand').append(img);}tableReady=true;$('table').classList.add('table-3d-ready');$('stage-loading').hidden=true;resize();}).catch(()=>{$('stage-loading').textContent='牌桌未能載入；右側放大預覽仍可使用。';});
selectCharacter(selected);frame=requestAnimationFrame(loop);
window.addEventListener('pagehide',()=>{stopVoices();if(frame)cancelAnimationFrame(frame);renderer?.dispose();});
