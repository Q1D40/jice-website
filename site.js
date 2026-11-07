(() => {
  'use strict';

  const scene = document.querySelector('.scene');
  const image = document.querySelector('.scene__picture img');
  const canvas = document.querySelector('.scene__canvas');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let renderer;
  let frame = 0;
  let elapsed = 0;
  let previous = 0;
  let lastDraw = 0;
  const pointer = { x: 0, y: 0, presence: 0, targetX: 0, targetY: 0, targetPresence: 0 };

  // Keep the approved artwork as the texture and static fallback. The displacement
  // fields move the two surfaces independently without moving the whole scene.
  const vertexSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = vec2(a_position.x * .5 + .5, .5 - a_position.y * .5);
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;
  const fragmentSource = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
    #else
      precision mediump float;
    #endif
    uniform sampler2D u_image;
    uniform vec2 u_cover;
    uniform vec2 u_pointer;
    uniform float u_time;
    uniform float u_presence;
    uniform float u_portrait;
    varying vec2 v_uv;

    float bell(float distance, float width) {
      float d = distance / width;
      return exp(-d * d);
    }

    void main() {
      vec2 uv = (v_uv - .5) * u_cover + .5;
      float breath = .5 - .5 * cos(u_time * .39269908);
      breath = breath * breath * (3.0 - 2.0 * breath);
      float echo = .5 - .5 * cos((u_time - .7) * .39269908);
      echo = echo * echo * (3.0 - 2.0 * echo);
      float opening = breath + u_presence * .65;
      vec2 offset = vec2(0.0);
      float edgeLight;
      float material;

      if (u_portrait < .5) {
        float leftEdge = mix(.802, .519, smoothstep(.0, .86, uv.y));
        float rightEdge = mix(1.075, .735, smoothstep(.07, .62, uv.y));
        rightEdge += .33 * smoothstep(.60, .80, uv.y);
        float leftSurface = bell(uv.x - leftEdge, .15);
        float rightSurface = bell(uv.x - rightEdge, .14);
        float floorEdge = 1.135 - .37 * uv.x;
        float floorSurface = bell(uv.y - floorEdge, .13) * smoothstep(.32, .65, uv.x);

        offset.x = .016 * opening * leftSurface;
        offset.x -= .009 * (echo + u_presence * .65) * rightSurface;
        offset.y = -.003 * opening * floorSurface;
        material = max(leftSurface, rightSurface);
        offset += u_pointer * vec2(.0018, .0022) * material * u_presence;
        edgeLight = max(bell(uv.x - leftEdge, .035), bell(uv.x - rightEdge, .032));
        edgeLight = max(edgeLight, bell(uv.y - floorEdge, .035) * .55);
      } else {
        float upperEdge = .72 - .20 * uv.x * uv.x;
        float lowerEdge = .755 - .065 * uv.x;
        float tip = bell(uv.x - .29, .16) * bell(uv.y - .705, .12);
        float upperSurface = bell(uv.y - upperEdge, .10) * smoothstep(.20, .5, uv.x);
        float lowerSurface = bell(uv.y - lowerEdge, .085) * smoothstep(.44, .72, uv.x);

        offset.y = .009 * opening * upperSurface;
        offset.y -= .007 * (echo + u_presence * .65) * lowerSurface;
        offset.x = .008 * opening * tip;
        material = max(tip, max(upperSurface, lowerSurface));
        offset += u_pointer * vec2(.0012, .0015) * material * u_presence;
        edgeLight = max(bell(uv.y - upperEdge, .022), bell(uv.y - lowerEdge, .022));
        edgeLight *= smoothstep(.24, .55, uv.x);
        edgeLight = max(edgeLight, tip);
      }

      vec3 color = texture2D(u_image, clamp(uv + offset, .001, .999)).rgb;
      float luminance = dot(color, vec3(.2126, .7152, .0722));
      float grazing = bell(uv.y - (.47 + u_pointer.y * .1), .38);
      float illumination = (.035 * breath + .12 * u_presence) * edgeLight;
      illumination += .035 * u_presence * material * grazing;
      color *= 1.0 + illumination * smoothstep(.025, .25, luminance);
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function createRenderer() {
    const gl = canvas.getContext('webgl', {
      alpha: false, antialias: false, depth: false, stencil: false,
      preserveDrawingBuffer: false, powerPreference: 'low-power'
    });
    if (!gl) return null;
    const resources = [];
    try {
      function shader(type, source) {
        const item = gl.createShader(type);
        resources.push(['Shader', item]);
        gl.shaderSource(item, source);
        gl.compileShader(item);
        if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) throw new Error('shader');
        return item;
      }
      const program = gl.createProgram();
      resources.push(['Program', program]);
      gl.attachShader(program, shader(gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('program');
      gl.useProgram(program);
      const buffer = gl.createBuffer();
      resources.push(['Buffer', buffer]);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      const texture = gl.createTexture();
      resources.push(['Texture', texture]);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const uniforms = {};
      for (const name of ['u_image', 'u_cover', 'u_pointer', 'u_time', 'u_presence', 'u_portrait']) {
        uniforms[name] = gl.getUniformLocation(program, name);
      }
      gl.uniform1i(uniforms.u_image, 0);
      const state = { coverX: 1, coverY: 1, portrait: false, imageAspect: 1 };
      function resize() {
        const width = Math.max(1, canvas.clientWidth);
        const height = Math.max(1, canvas.clientHeight);
        const ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2800000 / (width * height)));
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        gl.viewport(0, 0, canvas.width, canvas.height);
        const viewAspect = width / height;
        const imageAspect = state.imageAspect;
        state.coverX = Math.min(1, viewAspect / imageAspect);
        state.coverY = Math.min(1, imageAspect / viewAspect);
        gl.uniform2f(uniforms.u_cover, state.coverX, state.coverY);
      }
      function upload() {
        state.portrait = image.naturalHeight > image.naturalWidth;
        state.imageAspect = image.naturalWidth / image.naturalHeight;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.uniform1f(uniforms.u_portrait, state.portrait ? 1 : 0);
        resize();
      }
      function draw() {
        gl.uniform1f(uniforms.u_time, elapsed);
        gl.uniform1f(uniforms.u_presence, pointer.presence);
        gl.uniform2f(uniforms.u_pointer, pointer.x, pointer.y);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      upload();
      draw();
      if (gl.getError() !== gl.NO_ERROR) throw new Error('draw');
      return { resize, upload, draw, state };
    } catch {
      for (const [kind, resource] of resources.reverse()) gl['delete' + kind](resource);
      return null;
    }
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = lastDraw = 0;
  }
  function relax() {
    pointer.targetX = pointer.targetY = pointer.targetPresence = 0;
  }
  function animate(now) {
    frame = 0;
    if (!renderer || reducedMotion.matches || document.hidden) return;
    const delta = previous ? Math.min((now - previous) / 1000, .05) : 0;
    previous = now;
    elapsed = (elapsed + delta) % 32;
    // Time-based easing stays equally soft at different refresh rates.
    const follow = 1 - Math.exp(-delta / .75);
    pointer.x += (pointer.targetX - pointer.x) * follow;
    pointer.y += (pointer.targetY - pointer.y) * follow;
    pointer.presence += (pointer.targetPresence - pointer.presence) * follow;
    const interval = pointer.presence > .01 || pointer.targetPresence > .01 ? 16 : 32;
    if (now - lastDraw >= interval - .5) {
      renderer.draw();
      lastDraw = now;
    }
    frame = requestAnimationFrame(animate);
  }
  function start() {
    if (!frame && renderer && !reducedMotion.matches && !document.hidden) {
      scene.classList.add('scene--live');
      frame = requestAnimationFrame(animate);
    }
  }
  function boot() {
    if (!image.complete || !image.naturalWidth || reducedMotion.matches || document.hidden) return;
    if (renderer) {
      renderer.upload();
      renderer.draw();
    }
    else renderer = createRenderer();
    start();
  }
  function motionPreference() {
    relax();
    stop();
    pointer.x = pointer.y = pointer.presence = 0;
    scene.classList.remove('scene--live');
    if (!reducedMotion.matches) boot();
  }

  window.addEventListener('pointermove', event => {
    if (!renderer || !finePointer.matches || reducedMotion.matches || event.pointerType === 'touch') return;
    const bounds = canvas.getBoundingClientRect();
    const { coverX, coverY, portrait } = renderer.state;
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    const imageX = (x - .5) * coverX + .5;
    const imageY = (y - .5) * coverY + .5;
    const dx = (imageX - (portrait ? .62 : .77)) / (portrait ? .6 : .35);
    const dy = (imageY - (portrait ? .73 : .48)) / (portrait ? .26 : .58);
    const distance = Math.hypot(dx, dy);
    const proximity = Math.max(0, Math.min(1, (1.12 - distance) / .92));
    pointer.targetPresence = proximity * proximity * (3 - 2 * proximity);
    pointer.targetX = Math.max(-1, Math.min(1, dx));
    pointer.targetY = Math.max(-1, Math.min(1, dy));
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', relax);
  window.addEventListener('blur', relax);
  window.addEventListener('resize', () => {
    relax();
    if (renderer && !reducedMotion.matches) {
      renderer.resize();
      renderer.draw();
    }
  }, { passive: true });
  finePointer.addEventListener('change', relax);
  reducedMotion.addEventListener('change', motionPreference);
  document.addEventListener('visibilitychange', () => {
    relax();
    if (document.hidden) stop();
    else boot();
  });
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', boot);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    stop();
    renderer = null;
    scene.classList.remove('scene--live');
  });
  canvas.addEventListener('webglcontextrestored', boot);
  image.addEventListener('load', boot);
  image.addEventListener('error', () => {
    stop();
    scene.hidden = true;
  });
  if (image.complete && !image.naturalWidth) scene.hidden = true;
  else boot();
})();
