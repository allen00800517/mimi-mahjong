import {Game} from './engine.mjs';
import {Match} from './match.mjs';
import {validateCharacters,validateSeating} from './seating.mjs';

function restoreTable(data){
 const cast=validateCharacters(data.characters),match=data.current?.format==='mimi-tw-match-3'?Match.restore(data.current):null;
 const game=match?match.game:Game.restore(data.current);
 if(!match&&data.seating!==null)throw new TypeError('練習牌例不能有抓位紀錄');
 validateSeating(data.seating,cast,match);
 return {match,game,characters:cast,seating:structuredClone(data.seating)};
}
export function tableSnapshot(match,characters,seating,completedMatches=[],suspended=null){
 const data={format:'mimi-tw-table-1',current:match.snapshot(),characters,seating,completedMatches};
 // A match paused for practice travels with the practice table so it can be resumed intact.
 if(suspended)data.suspended=suspended;
 return structuredClone(data);
}
function restoreSuspended(data){
 if(data===undefined||data===null)return null;
 const r=restoreTable(data);if(r.match?.status!=='playing')throw new TypeError('暫停的整場紀錄不正確');
 return tableSnapshot(r.match,r.characters,r.seating,[]);
}

export function restoreCurrent(data){
 if(data?.format==='mimi-tw-table-1'){
  const restored=restoreTable(data);
  if(!Array.isArray(data.completedMatches)||data.completedMatches.length>20)throw new TypeError('整場歷史紀錄格式不正確');
  const completedMatches=data.completedMatches.map(row=>{
   const r=restoreTable(row);if(r.match?.status!=='completed')throw new TypeError('歷史場次尚未完成');
   return {current:r.match.snapshot(),characters:r.characters,seating:r.seating};
  });
  const suspended=restoreSuspended(data.suspended);
  if(suspended&&restored.match)throw new TypeError('進行中的整場不能另有暫停整場');
  return {...restored,completedMatches,suspended};
 }
 const current=data?.format==='mimi-tw-match-3'?Match.restore(data):Game.restore(data);
 return {match:current instanceof Match?current:null,game:current instanceof Match?current.game:current};
}

// Validate the entire backup before the caller replaces any live state.
export function restoreBackup(data){
 const wrapped=['mimi-tw-session-1','mimi-tw-session-3'].includes(data?.format);
 const restored=restoreCurrent(wrapped?data.current:data);
 if(!wrapped||data.previousHands===undefined)return {...restored,archives:null};
 if(!Array.isArray(data.previousHands)||data.previousHands.length>20)throw new TypeError('牌局紀錄格式不正確（最多 20 手）');
 const archives=data.previousHands.map(snapshot=>Game.restore(snapshot).snapshot());
 return {...restored,archives};
}

export function createBackup(current,archives){
 return JSON.parse(JSON.stringify({format:'mimi-tw-session-3',current,previousHands:archives.slice(-20)}));
}
