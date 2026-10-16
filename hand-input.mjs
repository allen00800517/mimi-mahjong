// Pointer coordinates and the visible tile rectangle share viewport CSS pixels.
export function handGesture(start,end,rect){
 const dx=end.x-start.x,up=start.y-end.y;
 if(up>=Math.max(12,rect.height*.45)&&Math.abs(dx)<rect.width*1.3)return 'discard';
 return Math.abs(dx)+Math.abs(up)>12?'cancel':'tap';
}

export function bindHandInput(button,{isCurrent,select,commit}){
 let pointer=null,suppressClick=false;
 button.onclick=e=>{
  const suppressed=suppressClick&&e.detail!==0;suppressClick=false;
  if(suppressed||!isCurrent())return;
  select();
 };
 button.onpointerdown=e=>{
  if(pointer||!isCurrent()||e.button!==0||e.isPrimary===false)return;
  suppressClick=false;
  const {width,height}=button.getBoundingClientRect();
  pointer={x:e.clientX,y:e.clientY,id:e.pointerId,rect:{width,height}};
  button.setPointerCapture(e.pointerId);
 };
 button.onpointercancel=button.onlostpointercapture=e=>{
  if(pointer?.id===e.pointerId){pointer=null;suppressClick=true;}
 };
 button.onpointerup=e=>{
  if(!pointer||pointer.id!==e.pointerId)return;
  const start=pointer;pointer=null;
  if(!isCurrent()){suppressClick=true;return;}
  const gesture=handGesture(start,{x:e.clientX,y:e.clientY},start.rect);
  suppressClick=gesture!=='tap';
  if(gesture==='discard')commit();
 };
}
