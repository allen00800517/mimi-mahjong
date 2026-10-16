// Display slots never change the four logical tiles stored by the engine.
export const isKan=m=>m.tiles.length===4&&['openKan','concealedKan'].includes(m.kind);
export const meldWidth=m=>isKan(m)?3:m.tiles.length;
export function meldDisplay(m,seat){
 return m.tiles.map((face,index)=>({index,slot:isKan(m)&&index===3?1:index,raised:isKan(m)&&index===3,
  back:m.kind==='concealedKan'&&(seat!==0||index<3),
  face:m.kind==='concealedKan'&&seat!==0?null:face}));
}
