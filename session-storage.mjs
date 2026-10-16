export const SESSION_KEY='mimi-tw-playtest-5',RECOVERY_KEY=SESSION_KEY+'-recovery';
// Never replace unreadable progress until its exact bytes are durably retained.
export class SessionStorage {
 constructor(storage){this.storage=storage;this.blocked=false;this.raw=null;}
 read(){try{return this.storage.getItem(SESSION_KEY);}catch{this.blocked=true;return null;}}
 preserve(raw){
  this.raw=raw;
  try{const existing=this.storage.getItem(RECOVERY_KEY);if(existing!==null&&existing!==raw)throw Error('Previous recovery exists');
   this.storage.setItem(RECOVERY_KEY,raw);if(this.storage.getItem(RECOVERY_KEY)!==raw)throw Error('Recovery not persisted');
   return true;
  }catch{this.blocked=true;return false;}
 }
 recovery(){try{return this.raw??this.storage.getItem(RECOVERY_KEY);}catch{return this.raw;}}
 write(snapshot){if(this.blocked)return false;try{this.storage.setItem(SESSION_KEY,JSON.stringify(snapshot));return true;}catch{return false;}}
}
