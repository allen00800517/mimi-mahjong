// Offer a generated file to the player. Inside the claude.ai viewer, page-initiated
// downloads are blocked, so use the host's download capability; elsewhere (local QA,
// other static hosts) fall back to an ordinary download link.
export async function offerFile(filename,text,{host=globalThis.window}={}){
 const claude=host?.claude;
 if(typeof claude?.use==='function'){
  let downloads=null;try{downloads=await claude.use('downloads');}catch{}
  if(!downloads)return 'unavailable';
  try{await downloads.save({filename,data:text});return 'saved';}
  catch(error){return error?.code==='declined'?'declined':'unavailable';}
 }
 const doc=host?.document;if(!doc)return 'unavailable';
 const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=doc.createElement('a');
 a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);return 'saved';
}
