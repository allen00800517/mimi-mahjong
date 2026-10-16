import {MOTION,FLIGHT} from './motion-timeline.mjs';
// Presentation-only timing. Final tile geometry and game rules are independent.
export function actionSequence({discard=false,meldTiles=0,calledIndex=-1,flowers=0}={}){
 const meldLead=meldTiles?140:0;
 // The claimed river tile leads; concealed hand tiles join after it is in flight.
 const claimed=calledIndex>=0&&calledIndex<meldTiles;
 const meldDelays=Array.from({length:meldTiles},(_,i)=>i===calledIndex?0:claimed?130+(i-(i>calledIndex?1:0))*MOTION.meldStagger:i*MOTION.meldStagger);
 const lastMeldDelay=meldTiles?Math.max(...meldDelays):0;
 const meldEnd=meldTiles?meldLead+MOTION.meld+lastMeldDelay:0;
 const handDelay=discard?Math.ceil(MOTION.discard*FLIGHT.play.contact):meldTiles?Math.ceil(meldLead+lastMeldDelay+MOTION.meld*FLIGHT.meld.contact):0;
 const flowerDelay=discard?MOTION.discard+MOTION.readPause:meldTiles?Math.max(meldEnd+MOTION.readPause,handDelay+MOTION.settle):0;
 const flowerStep=MOTION.flower+60,drawDelay=flowerDelay+flowers*flowerStep;
 return {meldLead,meldDelays,handDelay,flowerDelay,flowerStep,drawDelay,hold:Math.max(discard?Math.max(MOTION.discard+MOTION.readPause,handDelay+MOTION.settle):meldTiles?Math.max(MOTION.call,handDelay+MOTION.settle):0,flowers?drawDelay:0)};
}

// A pass has no visible action to watch. Keep the selected pace for real decisions.
export function computerDelay({id,speed=750}={}){
 return id==='pass'||id==='flowerPass'?Math.max(80,Math.round(speed*.2)):speed;
}
