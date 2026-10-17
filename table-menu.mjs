// Reparent existing controls so their handlers, values and saved preferences survive.
export function organizeTableMenu(){
 const $=id=>document.getElementById(id),dialog=$('settings-dialog'),old=dialog.querySelector('.menu-options'),currentSeed=$('current-seed');
 const newGame=$('new').closest('details'),practice=dialog.querySelector('.prototype-scenes').closest('details'),rules=dialog.querySelector('[data-demo]').closest('details'),log=$('log').closest('details');
 function section(title,folded=false){const el=document.createElement(folded?'details':'section');el.className='menu-section';const heading=document.createElement(folded?'summary':'h3');heading.textContent=title;el.append(heading);const body=document.createElement('div');body.className='menu-section-body';el.append(body);dialog.insertBefore(el,old);return body;}
 const play=section('對局功能'),settings=section('遊戲設定',true),appearance=section('角色與外觀',true),advanced=section('練習與進階工具',true);
 const shortcuts=document.createElement('div');shortcuts.className='menu-shortcuts';shortcuts.append($('river-toggle'),$('result-toggle'),$('history-toggle'));
 const situation=document.createElement('details');situation.id='table-situation';situation.innerHTML='<summary>四家戰況</summary><table id="table-scores" aria-label="四家分數與門風"></table>';play.append($('resume-match'),$('fullscreen-toggle'),shortcuts,situation,newGame,$('table-status'));
 $('river-toggle').textContent='放大查看棄牌';
 for(const id of ['music-choice','speed','confirm-button','motion'])settings.append($(id).closest('label'));
 const help=document.createElement('p');help.className='menu-help';help.textContent='出牌：點一下選牌，再點同張或向上滑。宣告聽牌時，選擇金框牌打出。';settings.append(help);
 appearance.append(dialog.querySelector('.cast-picker'),$('flower-skin').closest('label'),$('flower-preview'));
 for(const id of ['auto'])advanced.append($(id).closest('label'));
 const pauseHelp=document.createElement('p');pauseHelp.className='menu-help';pauseHelp.textContent='關閉電腦行動僅供本次練習；重新開啟網頁或開始新場時會恢復。';advanced.append(pauseHelp);
 advanced.append($('step'),$('save'),$('load').closest('label'));
 const lab=document.createElement('a');lab.href='./character-lab.html';lab.dataset.overlay='';lab.className='character-lab-link';lab.textContent='角色演出測試台';advanced.prepend(lab);
 const seedLabel=$('seed').closest('label'),seedHelp=document.createElement('p');seedHelp.className='menu-help';seedHelp.textContent='指定編號只用於下次開局重現牌局；一般遊玩請留白。';advanced.append(seedLabel,seedHelp,practice,rules,log);
 rules.querySelector('summary').textContent='練習與規則說明';
 newGame.querySelector('p').textContent='開始新場會重新抓位與發牌。未完成的場次如需保留，可先在進階工具下載紀錄。';
 // Keep the current seed available to the renderer without occupying the play menu.
 const seedInfo=document.createElement('p');seedInfo.className='menu-help';seedInfo.append('目前場次編號：',currentSeed);advanced.append(seedInfo);
 old.remove();
}
