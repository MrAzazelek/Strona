// sakura.js - simple falling petals using canvas
(function(){
  const canvas = document.getElementById('sakura-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, petals = [];

  function resize(){
    w = canvas.width = innerWidth;
    h = canvas.height = innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function rand(a,b){ return Math.random()*(b-a)+a; }

  function createPetal(){
    return {
      x: rand(0,w),
      y: rand(-h,0),
      r: rand(6,18),
      vx: rand(-0.3,0.6),
      vy: rand(0.3,1.1),
      rot: rand(0,Math.PI*2),
      rotSpeed: rand(-0.02,0.02),
      alpha: rand(0.6,0.95)
    };
  }

  for(let i=0;i<40;i++) petals.push(createPetal());

  function drawPetal(p){
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = '#ff9fc6';
    ctx.beginPath();
    ctx.ellipse(0,0,p.r,p.r*0.6,0,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function step(){
    ctx.clearRect(0,0,w,h);
    petals.forEach(p=>{
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotSpeed;
      drawPetal(p);
      if (p.y > h + 20 || p.x < -50 || p.x > w+50) {
        Object.assign(p, createPetal());
        p.y = -10;
      }
    });
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
})();
