// v0.99 · 胡牌演出 section of the character lab: plays the ordinary-win stamp, the 自摸 animation (Flow clip keyed live)
// and the settlement hand-off for the selected character, so layouts and timing can be judged side by side.
// Preview only: the table is a still backdrop and the settlement is a simplified stand-in for the real panel.
import {CHARACTER_MEDIA} from './character-media.mjs';
import {WIN_ART,WIN_COLORS,WIN_TIMING,WIN_ANIM,ANIM_LAYOUTS,slideCx} from './win-show.mjs';
import {ChromaVideo} from './chroma-video.mjs';
const $=id=>document.getElementById(id);
const ROWS={hu:[['門清',1],['中刻',1]],tsumo:[['門清自摸',3],['花牌',1]]};
let who='ichika',kind='tsumo',timers=[],raf=null,run=0;
const video=$('wl-video-src'),chroma=new ChromaVideo($('wl-video'),video);
const stage=$('wl-stage');

function current(){return document.querySelector('#cast-list [aria-pressed="true"]')?.dataset.character||who;}
function stop(){run++;for(const t of timers)clearTimeout(t);timers=[];if(raf)cancelAnimationFrame(raf);raf=null;video.pause();}
function later(ms,fn){const token=run;timers.push(setTimeout(()=>{if(token===run)fn();},ms));}
function reset(){
 stop();stage.className='';stage.style.setProperty('--wl-color',WIN_COLORS[who]||'#c9963c');
 $('wl-video').hidden=true;chroma.clear();
 const anim=kind==='tsumo'?WIN_ANIM[who]:null,L=ANIM_LAYOUTS[$('wl-layout').value];
 const cx=$('wl-layout').value==='B'&&anim?.handoff?anim.handoff.cx:L.cx,h=L.frameH,w=h*16/9;
 Object.assign($('wl-video').style,{left:(cx-w/2)+'px',width:w+'px',height:h+'px',transform:''});
 stage.style.setProperty('--wl-stamp-x',(anim?L.stampX:427)+'px');
 const word=kind==='tsumo'?'自摸':'胡';$('wl-stamp').classList.toggle('art',word==='胡');$('wl-stamp-text').textContent=word;
 $('wl-caption').textContent=CHARACTER_MEDIA[who].name+(kind==='tsumo'?' 自摸　·　三家各付':' 胡牌　·　放槍：權藤');
 // Settlement stand-in.
 const burst=kind==='tsumo',img=$('wl-portrait');img.src=burst?WIN_ART.burst(who):WIN_ART.portrait(who);
 img.style.height=(burst&&anim?.handoff&&$('wl-layout').value!=='A'?anim.handoff.portraitH:372)+'px';
 $('wl-title').textContent=CHARACTER_MEDIA[who].name+' '+(burst?'自摸':'胡牌');
 const rows=ROWS[kind];$('wl-rows').replaceChildren(...rows.map(([n,t])=>{const r=document.createElement('div');r.className='wl-row';r.innerHTML='<span>'+n+'</span><i></i><b>'+t+' 台</b>';return r;}));
 $('wl-seal-n').textContent=rows.reduce((n,r)=>n+r[1],0);
 $('wl-stamp-ms').disabled=!anim;$('wl-layout').disabled=!anim;
 if(anim&&!$('wl-stamp-ms').dataset.touched)$('wl-stamp-ms').value=anim.stampAt;
 $('wl-state').textContent=kind==='hu'?'一般胡：蓋章 '+WIN_TIMING.ron+' ms → 結算（胡牌立繪）。':anim?'自摸：動畫 → 約 '+$('wl-stamp-ms').value+' ms 蓋「自摸」→ 播完接結算（爆發立繪）。'+(chroma.keyed?'':'此瀏覽器無 WebGL，綠幕未去背。'):'自摸：這個角色的動畫還沒做，目前遊戲用爆發立繪 + 蓋章。';
 for(const b of $('wl-kind').children)b.setAttribute('aria-pressed',String(b.dataset.kind===kind));
 $('wl-who').textContent=CHARACTER_MEDIA[who].name;
 $('wl-hu-img').src=WIN_ART.portrait(who);$('wl-burst-img').src=WIN_ART.burst(who);
 $('wl-anim-note').textContent=WIN_ANIM[who]?'有自摸動畫':'自摸動畫待製作';
}
function showStamp(){stage.classList.add('stamp');}
function showSettlement(){
 stage.classList.add('settle');stage.classList.remove('stamp','dim','anim');$('wl-video').hidden=true;
 const rows=[...$('wl-rows').children];rows.forEach((r,i)=>later(WIN_TIMING.rowFirst+i*WIN_TIMING.rowGap,()=>r.classList.add('on')));
 later(WIN_TIMING.rowFirst+rows.length*WIN_TIMING.rowGap+WIN_TIMING.sealAfter,()=>stage.classList.add('sealed'));
}
function play(){
 who=current();reset();const token=run,anim=kind==='tsumo'?WIN_ANIM[who]:null;
 if(!anim){requestAnimationFrame(()=>{if(token!==run)return;stage.classList.add('dim');later(120,showStamp);later(kind==='tsumo'?WIN_TIMING.tsumo:WIN_TIMING.ron,showSettlement);});return;}
 // play() is called straight from the tap so iPhone allows sound.
 const stampAt=Number($('wl-stamp-ms').value)||anim.stampAt;let stamped=false;
 if(!video.src.endsWith(anim.video.slice(1)))video.src=anim.video;
 video.muted=!$('wl-sound').checked;video.currentTime=0;
 const glide=ANIM_LAYOUTS[$('wl-layout').value].slide;
 const tick=()=>{if(token!==run)return;if(glide)$('wl-video').style.transform='translateX('+(slideCx(anim,video.currentTime*1000)-427).toFixed(1)+'px)';chroma.draw();if(!stamped&&video.currentTime*1000>=stampAt){stamped=true;showStamp();}if(!video.ended)raf=requestAnimationFrame(tick);};
 video.onended=()=>{if(token!==run)return;chroma.draw();later(150,showSettlement);};
 video.play().then(()=>{if(token!==run)return;stage.classList.add('dim','anim');$('wl-video').hidden=false;raf=requestAnimationFrame(tick);}).catch(()=>{if(token!==run)return;$('wl-state').textContent='影片無法自動播放（可能是低耗電模式）；遊戲裡這時會改用爆發立繪 + 蓋章。';stage.classList.add('dim');later(120,showStamp);later(WIN_TIMING.tsumo,showSettlement);});
}
for(const b of $('wl-kind').children)b.onclick=()=>{kind=b.dataset.kind;play();};
$('wl-play').onclick=play;
$('wl-layout').onchange=play;
$('wl-stamp-ms').onchange=()=>{$('wl-stamp-ms').dataset.touched='1';play();};
$('wl-sound').onchange=()=>{video.muted=!$('wl-sound').checked;};
stage.onclick=()=>{if(stage.classList.contains('anim')||stage.classList.contains('stamp')){stop();stage.classList.remove('anim','stamp','dim');showSettlement();}};
document.getElementById('cast-list').addEventListener('click',()=>setTimeout(()=>{const id=current();if(id!==who){who=id;$('wl-stamp-ms').dataset.touched='';reset();}},0));
new ResizeObserver(()=>{const w=$('wl-window').clientWidth;$('wl-window').style.height=w*394/854+'px';stage.style.setProperty('--wl-scale',w/854);}).observe($('wl-window'));
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',stop);
who=current();reset();
