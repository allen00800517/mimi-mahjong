// v0.90 · One fixed action band above the hand (吃 碰 槓 聽 胡 + 過), learned from the reference's system layout
// and drawn in our own wood-and-gold style. Every slot keeps its place; slots that cannot be used are dimmed.
// This module is pure: it turns the legal actions into what the band shows. app.mjs draws it and performs actions.
import {tileLabel} from './scoring.mjs';

export const BAND_SLOTS=Object.freeze([
 {key:'chi',text:'吃',tone:'gold'},
 {key:'pon',text:'碰',tone:'gold'},
 {key:'kan',text:'槓',tone:'gold'},
 {key:'ready',text:'聽',tone:'jade'},
 {key:'win',text:'胡',tone:'red'},
]);

const isKanAction=id=>id==='openKan'||id.startsWith('concealedKan:')||id.startsWith('addedKan:');
const PASS_IDS=['pass','passWin','flowerPass'];

// actions: game.actions(0). choice: null | 'chi' | 'kan' (the player opened the combination list).
export function actionBandModel({actions=[],phase,eventTile=null,eventType=null,declaring=false,selected=null,playerState='S0',choice=null}={}){
 const chows=actions.filter(a=>a.id.startsWith('chi:'));
 const kans=actions.filter(a=>isKanAction(a.id));
 const pon=actions.find(a=>a.id==='pon');
 const win=actions.find(a=>a.id==='win'||a.id==='flowerWin');
 const pass=actions.find(a=>PASS_IDS.includes(a.id));
 const declares=actions.filter(a=>a.id.startsWith('declare:'));
 const slots={};
 for(const s of BAND_SLOTS)slots[s.key]={...s,on:false,sub:'',action:null,choices:null,pressed:false,tag:''};
 if(chows.length){Object.assign(slots.chi,{on:true,action:chows.length===1?chows[0].id:null,choices:chows.length>1?chows.map(a=>({id:a.id,label:a.label,tiles:[...a.tiles],called:eventTile})):null});}
 if(pon)Object.assign(slots.pon,{on:true,action:'pon'});
 if(kans.length){
  const choices=kans.map(a=>({id:a.id,label:a.label,tile:a.tile??eventTile,kind:a.id==='openKan'?'明槓':a.id.startsWith('addedKan:')?'加槓':'暗槓'}));
  Object.assign(slots.kan,{on:true,action:kans.length===1?kans[0].id:null,choices:kans.length>1?choices:null,sub:kans.length===1&&phase==='turn'?tileLabel(choices[0].tile):''});
 }
 if(declaring){
  const valid=selected&&declares.some(a=>a.id==='declare:'+selected);
  Object.assign(slots.ready,{on:true,pressed:true,action:valid?'declare:'+selected:null,sub:valid?'打'+tileLabel(selected):'選牌'});
 }else if(declares.length)Object.assign(slots.ready,{on:true,action:'declare-start'});
 else if(playerState!=='S0')slots.ready.tag='已聽';
 if(win)Object.assign(slots.win,{on:true,action:win.id,sub:win.id==='flowerWin'?'花胡':phase==='turn'?'自摸':eventType==='addedKan'?'搶槓':''});
 const any=BAND_SLOTS.some(s=>slots[s.key].on);
 // On your own turn with no engine pass (e.g. only 聽 or 槓 lit), 過 just folds the band away until the next change.
 const right=declaring?{action:'declare-cancel',text:'取消'}:pass?{action:pass.id,text:'過'}:phase==='turn'?{action:'band-dismiss',text:'過'}:null;
 const open=choice&&slots[choice]?.choices?choice:null;
 return {
  visible:any||declaring,
  target:phase==='response'&&eventTile?eventTile:null,
  slots:BAND_SLOTS.map(s=>slots[s.key]),
  right:open?{action:'choice-back',text:'返回'}:right,
  choice:open,
  choices:open?slots[open].choices:null,
 };
}
