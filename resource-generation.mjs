// Resources from obsolete asynchronous starts must never become live.
export class ResourceGeneration {
 constructor(){this.version=0;this.resources=[];}
 invalidate(){this.version++;for(const r of this.resources)r.dispose();this.resources=[];}
 begin(){this.invalidate();return this.version;}
 own(version,resource){if(!this.current(version)){resource.dispose();return false;}this.resources.push(resource);return true;}
 current(version){return version===this.version;}
}
