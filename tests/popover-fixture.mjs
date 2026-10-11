// JSDOM lacks the browser Popover API; emulate its presentation boundary only.
export function installPopover(w){
 let opened,down;
 function change(element,open){const event=new w.Event('beforetoggle');Object.assign(event,{oldState:element.dataset.testPopover==='open'?'open':'closed',newState:open?'open':'closed'});element.dispatchEvent(event);element.dataset.testPopover=open?'open':'closed';opened=open?element:undefined}
 w.HTMLElement.prototype.showPopover=function(){if(this.getAttribute('popover')!=='auto')throw new Error('Expected a native auto popover');change(this,true)};
 w.HTMLElement.prototype.hidePopover=function(){change(this,false)};
 w.HTMLElement.prototype.togglePopover=function(){this.dataset.testPopover==='open'?this.hidePopover():this.showPopover()};
 function clicked(target){if(!opened)return null;if(opened.contains(target))return opened;const invoker=target.closest('[popovertarget]');return invoker?.getAttribute('popovertarget')===opened.id?opened:null}
 w.document.addEventListener('pointerdown',e=>{down=clicked(e.target)});
 w.document.addEventListener('pointerup',e=>{if(opened&&clicked(e.target)===down&&!down)opened.hidePopover();down=null});
 w.document.addEventListener('click',e=>{const invoker=e.target.closest('[popovertarget]');if(invoker&&!e.defaultPrevented)w.document.getElementById(invoker.getAttribute('popovertarget')).togglePopover({source:invoker})});
 w.addEventListener('keydown',e=>{if(e.key==='Escape')opened?.hidePopover()});
}
