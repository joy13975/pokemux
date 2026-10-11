// JSDOM lacks the browser Popover API; emulate its presentation boundary only.
export function installPopover(w){
 let opened,down;
 function change(element,open){const event=new w.Event('beforetoggle');Object.assign(event,{oldState:element.dataset.testPopover==='open'?'open':'closed',newState:open?'open':'closed'});element.dispatchEvent(event);element.dataset.testPopover=open?'open':'closed';opened=open?element:undefined}
 w.HTMLElement.prototype.showPopover=function(){if(this.getAttribute('popover')!=='auto')throw new Error('Expected a native auto popover');change(this,true)};
 w.HTMLElement.prototype.hidePopover=function(){change(this,false)};
 w.HTMLElement.prototype.togglePopover=function(){this.dataset.testPopover==='open'?this.hidePopover():this.showPopover()};
 w.document.addEventListener('pointerdown',e=>{down=opened&&!opened.contains(e.target)});
 w.document.addEventListener('pointerup',e=>{if(down&&opened&&!opened.contains(e.target))opened.hidePopover();down=false});
 w.addEventListener('keydown',e=>{if(e.key==='Escape')opened?.hidePopover()});
}
