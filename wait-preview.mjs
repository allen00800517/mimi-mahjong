import {waitingTiles} from './rules-core.mjs';

// UI hints are only meaningful during ordinary play, never settlement or flower resolution.
// Do not alter the rule kernel's strict 16-tile input contract.
export function waitPreview(game,selected=null,seat=0){
 const p=game.players[seat],empty={current:[],preview:[],hasPreview:false,afterDiscard:false};
 if(!['turn','response'].includes(game.phase))return empty;
 const size=p.hand.length+3*p.melds.length;
 const current=size===16?waitingTiles(p.hand,p.melds):[];
 const ownTurn=game.phase==='turn'&&game.turn===seat;
 const discard=ownTurn&&size===17&&p.hand.includes(selected)?selected:null;
 let hand=null;
 if(discard){hand=[...p.hand];hand.splice(hand.indexOf(discard),1);}
 else if(p.state!=='S0'){
  if(size===16)hand=[...p.hand];
  else if(ownTurn&&size===17&&p.hand.includes(game.drawn)){
   hand=[...p.hand];hand.splice(hand.indexOf(game.drawn),1);
  }
 }
 return {current,preview:hand?waitingTiles(hand,p.melds):[],hasPreview:hand!==null,afterDiscard:discard!==null};
}
