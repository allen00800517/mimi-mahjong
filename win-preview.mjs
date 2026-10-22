// v1.64 · The lab's 胡牌演出 panel: the shows themselves run on the real table (index.html?show=<id>), so what is
// reviewed here is exactly what the game plays; this panel only links to it and shows the two win portraits.
import {CHARACTER_MEDIA} from './character-media.mjs';
import {WIN_ART} from './win-show.mjs';
const $=id=>document.getElementById(id);
function current(){return document.querySelector('#cast-list [aria-pressed="true"]')?.dataset.character||new URLSearchParams(location.search).get('c')||'ichika';}
function update(){const id=current(),m=CHARACTER_MEDIA[id];if(!m)return;$('wl-who').textContent=m.name;$('wl-open').href='./index.html?show='+encodeURIComponent(id);$('wl-open').textContent='在正式牌桌開啟 '+m.name+' 的胡牌演出';$('wl-hu-img').src=WIN_ART.portrait(id);$('wl-burst-img').src=WIN_ART.burst(id);}
$('cast-list').addEventListener('click',()=>setTimeout(update,0));
update();setTimeout(update,300);
