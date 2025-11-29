/*
  Refyned — Mission Control (static)
  - Particle background
  - Draggable widgets with MIXED snapping behavior
  - No libraries, beginner-friendly
*/

// ---------- particle background ----------
(function(){
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');
  let w = canvas.width = window.innerWidth;
  let h = canvas.height = window.innerHeight;
  const particles = [];
  const COUNT = Math.max(30, Math.floor((w*h)/14000));
  for(let i=0;i<COUNT;i++){
    particles.push({
      x: Math.random()*w,
      y: Math.random()*h,
      r: 0.6 + Math.random()*1.6,
      vx: (Math.random()-0.5)*0.2,
      vy: (Math.random()-0.5)*0.2,
      a: 0.06 + Math.random()*0.14
    });
  }
  function resize(){
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);

  function draw(){
    ctx.clearRect(0,0,w,h);
    // subtle vignette gradient
    const g = ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0, 'rgba(0,0,0,0.0)');
    g.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);

    ctx.globalCompositeOperation = 'lighter';
    particles.forEach(p=>{
      p.x += p.vx; p.y += p.vy;
      if(p.x < -10) p.x = w+10;
      if(p.x > w+10) p.x = -10;
      if(p.y < -10) p.y = h+10;
      if(p.y > h+10) p.y = -10;
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle = 'rgba(177,108,255,'+p.a+')';
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(draw);
  }
  draw();
})();

// ---------- helper: create widgets ----------
(function(){
  const stage = document.getElementById('stage');
  const gridSize = 120; // grid cell size
  const snapThreshold = 60; // px distance to snap
  const STORAGE_KEY = 'refyned_widget_positions_v1';

  const defaultWidgets = [
    {id:'w-sales', title:'Sales (24h)', content:'$1,234'},
    {id:'w-orders', title:'Orders', content:'12 new'},
    {id:'w-tasks', title:'Pending Tasks', content:'3 automations to review'},
    {id:'w-shopify', title:'Shopify', content:'Connected'},
    {id:'w-printful', title:'Printful', content:'Not connected'},
    {id:'w-traffic', title:'Traffic', content:'345 visits'},
    {id:'w-activity', title:'Recent Activity', content:'User purchased Tee'}
  ];

  // create overlay grid for visual guidance
  const grid = document.createElement('div');
  grid.className = 'grid-overlay';
  stage.appendChild(grid);

  // load saved positions
  let saved = {};
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) saved = JSON.parse(raw);
  }catch(e){ saved = {}; }

  function createWidget(data, idx){
    const el = document.createElement('div');
    el.className = 'widget glow';
    el.id = data.id;
    el.innerHTML = '<div class="title">'+data.title+'</div><div class="content">'+data.content+'</div>';
    // set initial position: from storage, otherwise scattered
    const start = saved[data.id];
    if(start){
      el.style.left = start.left + 'px';
      el.style.top = start.top + 'px';
    } else {
      // scatter positions
      const margin = 40;
      el.style.left = Math.min(window.innerWidth - 260, margin + (idx%3)*240) + 'px';
      el.style.top = Math.min(window.innerHeight - 160, 80 + Math.floor(idx/3)*140) + 'px';
    }
    makeDraggable(el);
    stage.appendChild(el);
  }

  defaultWidgets.forEach((w,i)=>createWidget(w,i));

  // save positions
  function persist(){
    const state = {};
    document.querySelectorAll('.widget').forEach(w=>{
      state[w.id] = { left: parseInt(w.style.left||0,10), top: parseInt(w.style.top||0,10) };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // DRAG LOGIC with mixed snapping
  function makeDraggable(el){
    el.addEventListener('mousedown', startDrag);
    el.addEventListener('touchstart', startDrag, {passive:false});
    let offsetX=0, offsetY=0, startX=0, startY=0, dragging=false;

    function startDrag(e){
      e.preventDefault();
      dragging = true;
      el.classList.add('grabbing');
      const rect = el.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      offsetX = clientX - rect.left;
      offsetY = clientY - rect.top;
      startX = rect.left; startY = rect.top;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', endDrag);
      document.addEventListener('touchmove', onMove, {passive:false});
      document.addEventListener('touchend', endDrag);
      el.style.transition = 'none';
      el.style.zIndex = 50;
    }

    function onMove(e){
      if(!dragging) return;
      e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      let nx = clientX - offsetX;
      let ny = clientY - offsetY;
      // keep inside stage bounds
      const st = stage.getBoundingClientRect();
      nx = Math.max(st.left + 8, Math.min(nx, st.right - el.offsetWidth - 8));
      ny = Math.max(st.top + 8, Math.min(ny, st.bottom - el.offsetHeight - 8));
      el.style.left = nx + 'px';
      el.style.top = ny + 'px';
    }

    function endDrag(){
      if(!dragging) return;
      dragging = false;
      el.classList.remove('grabbing');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', endDrag);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', endDrag);
      el.style.zIndex = 20;
      // snapping logic: find nearest grid cell (based on stage left/top)
      const st = stage.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      // compute position relative to stage
      const relX = elRect.left - st.left;
      const relY = elRect.top - st.top;
      // nearest grid coords
      const gx = Math.round(relX / gridSize) * gridSize;
      const gy = Math.round(relY / gridSize) * gridSize;
      const dist = Math.hypot(relX - gx, relY - gy);
      if(dist < snapThreshold){
        // animate to snapped position (absolute coordinates)
        const targetLeft = st.left + gx;
        const targetTop = st.top + gy;
        el.style.transition = 'left 150ms ease, top 150ms ease';
        el.style.left = targetLeft + 'px';
        el.style.top = targetTop + 'px';
      } else {
        // small bounce to indicate not snapped
        el.style.transition = 'transform 140ms ease';
        el.style.transform = 'translateY(-6px)';
        setTimeout(()=> el.style.transform = '', 140);
      }
      // store positions (using absolute page coords for simplicity)
      setTimeout(persist, 160);
    }
  }

  // expose a quick reset (double-press 'r' to reset)
  window.addEventListener('keydown', (e)=>{
    if(e.key === 'r'){
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  });

  // friendly status text
  const status = document.getElementById('status-text');
  status.textContent = 'Ready';
})();
