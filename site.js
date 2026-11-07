(() => {
  'use strict';
  const scene = document.querySelector('.scene');
  const plane = document.querySelector('.scene__motion');
  const image = document.querySelector('.scene__picture img');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let currentX = 0;
  let currentY = 0;
  let targetX = 0;
  let targetY = 0;
  const enabled = () => finePointer.matches && !reducedMotion.matches && !document.hidden;
  function paint() {
    plane.style.setProperty('--pointer-x', currentX.toFixed(3) + 'px');
    plane.style.setProperty('--pointer-y', currentY.toFixed(3) + 'px');
  }
  function update() {
    frame = 0;
    currentX += (targetX - currentX) * .095;
    currentY += (targetY - currentY) * .095;
    if (Math.abs(targetX - currentX) < .01 && Math.abs(targetY - currentY) < .01) {
      currentX = targetX;
      currentY = targetY;
      paint();
      plane.style.removeProperty('will-change');
      return;
    }
    paint();
    frame = requestAnimationFrame(update);
  }
  function schedule() {
    if (!frame) {
      plane.style.willChange = 'transform';
      frame = requestAnimationFrame(update);
    }
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    currentX = currentY = targetX = targetY = 0;
    paint();
    plane.style.removeProperty('will-change');
  }
  function returnToCenter() {
    targetX = targetY = 0;
    if (enabled()) schedule();
    else stop();
  }
  window.addEventListener('pointermove', event => {
    if (!enabled() || event.pointerType === 'touch') return;
    targetX = (.5 - event.clientX / innerWidth) * 14;
    targetY = (.5 - event.clientY / innerHeight) * 10;
    schedule();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', returnToCenter);
  window.addEventListener('blur', returnToCenter);
  window.addEventListener('resize', returnToCenter, { passive: true });
  reducedMotion.addEventListener('change', stop);
  finePointer.addEventListener('change', stop);
  document.addEventListener('visibilitychange', stop);
  // A failed decorative image must not hide the identity.
  image.addEventListener('error', () => { scene.hidden = true; });
  if (image.complete && !image.naturalWidth) scene.hidden = true;
})();
