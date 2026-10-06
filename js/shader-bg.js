/* mykin.ai-style paper light/shadow shader background */
(function () {
  'use strict';

  const wrap = document.getElementById('heroShader');
  const canvas = wrap ? wrap.querySelector('canvas') : null;
  if (!wrap || !canvas) return;

  const paperFallback =
    'radial-gradient(ellipse at 30% 50%, #f0e4d8 0%, #F4EDE9 50%, #e8ddd4 100%)';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isNarrow = window.innerWidth < 768;

  if (reduceMotion || isNarrow) {
    wrap.style.background = paperFallback;
    return;
  }

  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  if (!gl) {
    wrap.style.background = paperFallback;
    return;
  }

  const E = {
    backgroundColor: [0.957, 0.933, 0.914],
    vignetteColor: [0.256, 0.192, 0.15],
    outputColor: [0.957, 0.933, 0.914],
    noiseImage: window.ZOEY_NOISE_URL || 'assets/bluenoise.webp',
  };

  const O = gl.getExtension('EXT_color_buffer_half_float');
  const internalFormat = O ? gl.RGBA16F : gl.RGBA;
  const texType = O ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;

  let cw = 0;
  let ch = 0;

  function resize() {
    const w = Math.round(canvas.clientWidth);
    const h = Math.round(canvas.clientHeight);
    if (w === cw && h === ch) return false;
    canvas.width = cw = w;
    canvas.height = ch = h;
    gl.viewport(0, 0, w, h);
    return true;
  }

  const onWindowResize = () => {
    if (resize()) recreateTargets();
  };
  window.addEventListener('resize', onWindowResize);
  resize();

  let pointer = [0.05, 0.5];
  let target = [0.05, 0.5];
  let lastMove = 0;

  function onPointer(e) {
    const now = performance.now();
    if (now - lastMove < 32) return;
    lastMove = now;
    const rect = canvas.getBoundingClientRect();
    pointer[0] = (e.clientX - rect.left) / rect.width;
    pointer[1] = 1 - (e.clientY - rect.top) / rect.height;
  }

  const startPointerTracking = () => {
    window.addEventListener('pointermove', onPointer, { passive: true });
  };
  window.addEventListener('kin:cursor-unlock', startPointerTracking, { once: true });

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('shader compile error', gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  function link(vs, fs) {
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('program link error', gl.getProgramInfoLog(program));
    }
    return program;
  }

  function makeTarget(w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, gl.RGBA, texType, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fb };
  }

  function makeNoise(url) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([227, 179, 77, 255])
    );
    const img = new Image();
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    };
    img.onerror = () => {};
    img.src = url;
    return tex;
  }

  const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

  const vertexSrc = `#version 300 es
precision highp float;
in vec2 position;
out vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

  const clearFrag = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 fragColor;
uniform vec3 uBgColor;
void main() { fragColor = vec4(uBgColor, 1.0); }`;

  const vignetteFrag = `#version 300 es
precision highp float;
#define TWO_PI 6.28318530718
in vec2 vUv; out vec4 fragColor;
uniform float uRadius, uFalloff, uSkew, uAngle;
uniform vec3 uVignetteColor, uClearColor;
uniform vec2 uPos, uResolution;
mat2 rot(float a) { return mat2(cos(a),-sin(a),sin(a),cos(a)); }
void main() {
  vec2 ar = vec2(uResolution.x/uResolution.y, 1.0);
  vec2 sk = vec2(uSkew, 1.0-uSkew);
  float hr = uRadius*0.5;
  float inner = hr - uFalloff*hr*0.5, outer = hr + uFalloff*hr*0.5;
  vec2 sUV = vUv*ar*rot(uAngle*TWO_PI)*sk;
  vec2 sP = uPos*ar*rot(uAngle*TWO_PI)*sk;
  float f = smoothstep(inner, outer, distance(sUV, sP));
  fragColor = mix(vec4(uClearColor,0.0), vec4(uVignetteColor,1.0), f);
}`;

  const waveFrag = `#version 300 es
precision mediump float;
#define PI 3.141592
#define PI3 1.04709283144
in vec2 vUv; out vec4 fragColor;
uniform sampler2D tInput;
uniform float uMixRadius, uFrequency, uAmplitude, uRotation, uTime;
uniform vec2 uPos, uResolution;
void main() {
  vec2 uv = vUv, wc = vUv*2.0-1.0;
  float t = uTime*0.25, freq = 20.0*uFrequency, amp = uAmplitude*0.2;
  float wX = sin((wc.y+uPos.y)*freq + t*PI3)*amp;
  float wY = sin((wc.x-uPos.x)*freq + t*PI3)*amp;
  wc.xy += vec2(mix(wX,0.0,uRotation), mix(0.0,wY,uRotation));
  vec2 fUV = wc*0.5+0.5;
  float ar = uResolution.x/uResolution.y;
  float d = max(0.0, 1.0-distance(uv*vec2(ar,1), uPos*vec2(ar,1))*4.0*(1.0-uMixRadius));
  fragColor = texture(tInput, mix(uv, fUV, d));
}`;

  const waterFrag = `#version 300 es
precision mediump float;
#define PI 3.14159265359
in vec2 vUv; out vec4 fragColor;
uniform sampler2D tInput;
uniform float uAmount, uSpread, uAngle, uTime, uSkew, uMixRadius;
uniform vec2 uPos, uResolution;
vec2 random2(vec2 p) { return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453); }
mat2 rot(float a) { return mat2(cos(a),-sin(a),sin(a),cos(a)); }
void main() {
  vec2 uv = vUv;
  float ar = uResolution.x/uResolution.y;
  vec2 sk = mix(vec2(1), vec2(1,0), uSkew);
  vec2 st = (uv-uPos)*vec2(ar,1.0)*50.0*uAmount;
  st = st*rot(uAngle*2.0*PI)*sk;
  vec2 ist = floor(st), fst = fract(st);
  float md = 15.0; vec2 mp;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++) {
    vec2 nb = vec2(float(i),float(j));
    vec2 pt = random2(ist+nb);
    pt = 0.5+0.5*sin(5.0+uTime*0.2+6.2831*pt);
    float d = length(nb+pt-fst);
    if(d<md){md=d;mp=pt;}
  }
  vec2 off = (mp*0.2*uSpread*2.0)-(uSpread*0.2);
  float d = max(0.0, 1.0-distance(uv*vec2(ar,1),uPos*vec2(ar,1))*4.0*(1.0-uMixRadius));
  fragColor = texture(tInput, uv+off*d);
}`;

  const bokehFrag = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 fragColor;
#define PI2 6.28318530718
#define ITERATIONS 30.0
#define GOLDEN_ANGLE 2.39996323
uniform sampler2D tInput, tBlueNoise;
uniform float uAmount, uTilt;
uniform vec2 uPos, uResolution, uBlueNoiseResolution;
vec2 Sample(in float theta, inout float r) { r+=1.0/r; return (r-1.0)*vec2(cos(theta),sin(theta)); }
float getBlueNoiseOffset(vec2 st) {
  ivec2 ts = ivec2(uBlueNoiseResolution);
  vec4 bn = texelFetch(tBlueNoise, ivec2(fract(st*uResolution/vec2(ts)*vec2(float(ts.x)/float(ts.y),1.0))*vec2(ts))%ts, 0);
  return mod((bn.r-0.5)*PI2, PI2);
}
vec4 Bokeh(sampler2D tex, vec2 uv, float br) {
  vec3 c=vec3(0), w=vec3(0); float a=0.0;
  float ar = uResolution.x/uResolution.y;
  vec2 ps = vec2(1.0/ar,1.0)*0.04*0.075;
  float r=1.0, no=getBlueNoiseOffset(uv)*PI2;
  mat2 rt = mat2(cos(no),-sin(no),sin(no),cos(no));
  for(float j=0.0;j<GOLDEN_ANGLE*ITERATIONS;j+=GOLDEN_ANGLE) {
    vec2 o=Sample(j,r)*ps;
    o*=1.0+0.05*(sin(j*0.1)*0.5+0.5)*sin(j*0.7+no*0.0001);
    vec4 s=texture(tex,uv+rt*o);
    vec3 wt=vec3(5.0)+pow(s.rgb,vec3(9.0))*150.0;
    a+=s.a; c+=s.rgb*wt; w+=wt;
  }
  return vec4(c/w, a/ITERATIONS);
}
void main() {
  if(uAmount==0.0){fragColor=vec4(0);return;}
  float d=distance(vUv,uPos)*1000.0;
  float t=mix(1.0-d*0.001,d*0.001,uTilt);
  fragColor=Bokeh(tInput,vUv,uAmount*t);
}`;

  const grainFrag = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 fragColor;
uniform vec3 uBgColor, uOutputColor;
uniform sampler2D tInput, tBlueNoise;
uniform vec2 uResolution;
uniform float uMixStrength;
float grain(vec2 uv, float i) {
  vec2 pc = uv*uResolution/256.0;
  vec4 n = texture(tBlueNoise, fract(pc));
  return mix(1.0, n.r, i);
}
void main() {
  vec3 bl = mix(uOutputColor, texture(tInput,vUv).rgb, texture(tInput,vUv).a);
  vec3 f = mix(uBgColor, bl, uMixStrength);
  fragColor = vec4(f * grain(vUv, 0.03), 1.0);
}`;

  const clearProgram = link(vertexSrc, clearFrag);
  const vignetteProgram = link(vertexSrc, vignetteFrag);
  const waveProgram = link(vertexSrc, waveFrag);
  const waterProgram = link(vertexSrc, waterFrag);
  const bokehProgram = link(vertexSrc, bokehFrag);
  const grainProgram = link(vertexSrc, grainFrag);
  const noiseTex = makeNoise(E.noiseImage);

  let h = makeTarget(cw, ch);
  let x = makeTarget(cw, ch);
  let y = makeTarget(cw, ch);

  function swapBuffers() {
    const tmp = h;
    h = x;
    x = tmp;
  }

  function recreateTargets() {
    h = makeTarget(cw, ch);
    x = makeTarget(cw, ch);
    y = makeTarget(cw, ch);
  }

  function useProgram(program) {
    gl.useProgram(program);
    const loc = gl.getAttribLocation(program, 'position');
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    return program;
  }

  function u1f(program, name, value) {
    gl.uniform1f(gl.getUniformLocation(program, name), value);
  }

  function u2f(program, name, a, b) {
    gl.uniform2f(gl.getUniformLocation(program, name), a, b);
  }

  function u3f(program, name, a, b, c) {
    gl.uniform3f(gl.getUniformLocation(program, name), a, b, c);
  }

  function bindTex(program, name, texture, unit) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(program, name), unit);
  }

  function drawTo(fb) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  const startTime = performance.now();
  let lastFrameTime = performance.now();
  let running = true;
  let raf = null;

  function render() {
    raf = null;
    if (!running) return;
    const now = performance.now();
    const frameDt = Math.min(0.1, Math.max(0, (now - lastFrameTime) / 1000));
    lastFrameTime = now;
    const follow = 1 - Math.pow(1 - 0.1, frameDt * 60); // 0.1/frame at 60fps
    const time = ((now - startTime) / 1000) * 2;
    target[0] += (pointer[0] - target[0]) * follow;
    target[1] += (pointer[1] - target[1]) * follow;

    const bg = E.backgroundColor;
    const vig = E.vignetteColor;
    const out = E.outputColor;
    const res = [cw, ch];

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let p = useProgram(clearProgram);
    u3f(p, 'uBgColor', bg[0], bg[1], bg[2]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, y.fb);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawTo(y.fb);
    gl.bindFramebuffer(gl.FRAMEBUFFER, h.fb);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawTo(h.fb);
    swapBuffers();

    p = useProgram(vignetteProgram);
    bindTex(p, 'tInput', h.tex, 0);
    u3f(p, 'uVignetteColor', vig[0], vig[1], vig[2]);
    u3f(p, 'uClearColor', bg[0], bg[1], bg[2]);
    u2f(p, 'uPos', target[0], target[1]);
    u2f(p, 'uResolution', res[0], res[1]);
    u1f(p, 'uRadius', 0.354);
    u1f(p, 'uFalloff', 1);
    u1f(p, 'uSkew', 0.54);
    u1f(p, 'uAngle', 0);
    drawTo(x.fb);
    swapBuffers();

    p = useProgram(waveProgram);
    bindTex(p, 'tInput', h.tex, 0);
    u2f(p, 'uPos', 0.5, 0.5);
    u2f(p, 'uResolution', res[0], res[1]);
    u1f(p, 'uTime', time);
    u1f(p, 'uFrequency', 0.35);
    u1f(p, 'uAmplitude', 1.18);
    u1f(p, 'uRotation', 0);
    u1f(p, 'uMixRadius', 1);
    drawTo(x.fb);
    swapBuffers();

    p = useProgram(waterProgram);
    bindTex(p, 'tInput', h.tex, 0);
    u2f(p, 'uPos', 0.5, 0.5);
    u2f(p, 'uResolution', res[0], res[1]);
    u1f(p, 'uTime', time);
    u1f(p, 'uAmount', 0.534);
    u1f(p, 'uSpread', 1);
    u1f(p, 'uAngle', 0.122);
    u1f(p, 'uSkew', 0.84);
    u1f(p, 'uMixRadius', 1);
    drawTo(x.fb);
    swapBuffers();

    p = useProgram(bokehProgram);
    bindTex(p, 'tInput', h.tex, 0);
    bindTex(p, 'tBlueNoise', noiseTex, 1);
    u2f(p, 'uPos', 0.5, 0.5);
    u2f(p, 'uResolution', res[0], res[1]);
    u2f(p, 'uBlueNoiseResolution', 256, 256);
    u1f(p, 'uAmount', 0.3);
    u1f(p, 'uTilt', 0);
    u1f(p, 'uTime', time);
    drawTo(x.fb);
    swapBuffers();

    p = useProgram(grainProgram);
    bindTex(p, 'tInput', h.tex, 0);
    bindTex(p, 'tBlueNoise', noiseTex, 2);
    u3f(p, 'uBgColor', bg[0], bg[1], bg[2]);
    u3f(p, 'uOutputColor', out[0], out[1], out[2]);
    u2f(p, 'uResolution', res[0], res[1]);
    u1f(p, 'uMixStrength', 0.25);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(bg[0], bg[1], bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawTo(null);

    raf = requestAnimationFrame(render);
  }

  function onScroll() {
    // Original keeps the shader tied to the first viewport only.
    const maxOpacity = Math.max(0, 1 - window.scrollY / window.innerHeight);
    wrap.style.opacity = String(maxOpacity);
    running = maxOpacity > 0;
    if (running && !raf) raf = requestAnimationFrame(render);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const onVisible = () => {
    running = !document.hidden;
    if (running && !raf) raf = requestAnimationFrame(render);
  };
  document.addEventListener('visibilitychange', onVisible);

  render();
})();
