let grid=document.getElementById('grid');
document.getElementById('addBtn').onclick=addCard;

function addCard(){
  const c=document.createElement('div');
  c.className='card';
  c.draggable=true;
  c.textContent='New Card';
  setup(c);
  grid.appendChild(c);
}

function setup(c){
  c.addEventListener('dragstart',()=>c.classList.add('dragging'));
  c.addEventListener('dragend',()=>c.classList.remove('dragging'));
}

grid.addEventListener('dragover', e=>{
  e.preventDefault();
  const dragging=document.querySelector('.dragging');
  const after=getAfter(grid, e.clientY);
  if(!after) grid.append(dragging);
  else grid.insertBefore(dragging, after);
});

function getAfter(container,y){
  const items=[...container.querySelectorAll('.card:not(.dragging)')];
  return items.reduce((closest,child)=>{
    const box=child.getBoundingClientRect();
    const offset=y - box.top - box.height/2;
    if(offset<0 && offset>closest.offset) return {offset,element:child};
    return closest;
  },{offset:-Infinity}).element;
}

// starter cards
['Sales','Orders','Products'].forEach(t=>{
  const c=document.createElement('div');
  c.className='card';
  c.draggable=true;
  c.textContent=t;
  setup(c);
  grid.appendChild(c);
});
