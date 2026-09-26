/* ========================================================================
   FEEL IT CHARACTER PRELOADER — DOWIE + SNOWIE
   2D motion only: transform/opacity/filter. No layout animation.
   ======================================================================== */
.page-loader{
  position:fixed;inset:0;z-index:9999;overflow:hidden;
  display:flex;align-items:center;justify-content:center;
  background:
    radial-gradient(circle at 50% 18%,rgba(34,211,238,.10),transparent 28%),
    radial-gradient(circle at 25% 75%,rgba(255,190,210,.10),transparent 34%),
    linear-gradient(145deg,#070b13 0%,#0f172a 52%,#16243b 100%);
  isolation:isolate;
  animation:fiLoaderFailsafe .5s ease 6s forwards;
}
.page-loader.loader-done{opacity:0;visibility:hidden;pointer-events:none;transition:opacity .55s ease,visibility .55s ease;}
@keyframes fiLoaderFailsafe{to{opacity:0;visibility:hidden;pointer-events:none;}}

.loader-sky{position:absolute;inset:0;pointer-events:none;overflow:hidden;}
.loader-moon{
  position:absolute;top:9%;left:50%;width:90px;height:90px;border-radius:50%;
  transform:translateX(-50%);
  background:radial-gradient(circle at 38% 34%,#fffdf0 0 22%,#dff8ff 54%,rgba(190,235,255,.12) 72%,transparent 74%);
  box-shadow:0 0 45px rgba(184,236,255,.22),0 0 110px rgba(184,236,255,.10);
  opacity:.85;
}
.loader-star{position:absolute;width:4px;height:4px;border-radius:50%;background:#e9fbff;box-shadow:0 0 9px rgba(185,240,255,.9);animation:fiTwinkle 2.4s ease-in-out infinite;}
.loader-star-1{top:20%;left:18%;}.loader-star-2{top:28%;right:20%;animation-delay:.7s}.loader-star-3{top:12%;right:34%;animation-delay:1.25s}
@keyframes fiTwinkle{0%,100%{opacity:.2;transform:scale(.7)}50%{opacity:1;transform:scale(1.35)}}
.loader-snow{position:absolute;color:rgba(255,255,255,.75);font-size:18px;animation:fiSnowDrift 5s linear infinite;}
.loader-snow-1{left:9%;top:-5%;animation-duration:7s}.loader-snow-2{left:32%;top:-8%;animation-duration:6s;animation-delay:-2s}.loader-snow-3{right:15%;top:-10%;animation-duration:8s;animation-delay:-3s}.loader-snow-4{right:35%;top:-4%;animation-duration:6.5s;animation-delay:-1s}
@keyframes fiSnowDrift{to{transform:translate3d(35px,115vh,0) rotate(180deg)}}

.loader-character-stage{position:relative;width:min(620px,94vw);height:min(690px,82vh);display:flex;flex-direction:column;justify-content:flex-end;align-items:center;text-align:center;}
.loader-characters{position:absolute;left:50%;bottom:108px;width:min(570px,94vw);height:min(555px,65vh);transform:translateX(-50%);}
.loader-character{position:absolute;bottom:0;will-change:transform;filter:drop-shadow(0 18px 22px rgba(0,0,0,.28));}
.loader-character img{display:block;width:auto;height:min(505px,61vh);max-width:46vw;object-fit:contain;user-select:none;-webkit-user-drag:none;}
.loader-snowie{left:1%;animation:fiSnowieBob 2.1s ease-in-out infinite;transform-origin:50% 92%;}
.loader-dowie{right:1%;animation:fiDowieBob 2.35s ease-in-out infinite .15s;transform-origin:50% 92%;}
@keyframes fiSnowieBob{0%,100%{transform:translate3d(0,0,0) rotate(-1deg)}50%{transform:translate3d(-2px,-11px,0) rotate(1.2deg)}}
@keyframes fiDowieBob{0%,100%{transform:translate3d(0,0,0) rotate(1deg)}50%{transform:translate3d(2px,-9px,0) rotate(-1deg)}}
.loader-character-glow{position:absolute;left:20%;right:20%;bottom:3%;height:28%;border-radius:50%;background:radial-gradient(ellipse,rgba(34,211,238,.15),transparent 70%);filter:blur(13px);z-index:-1;animation:fiGlowPulse 2.2s ease-in-out infinite alternate;}
.loader-snowie .loader-character-glow{background:radial-gradient(ellipse,rgba(255,181,204,.22),transparent 70%)}
@keyframes fiGlowPulse{from{opacity:.45;transform:scale(.85)}to{opacity:.9;transform:scale(1.1)}}

.loader-route-glow{position:absolute;left:9%;right:9%;bottom:92px;height:130px;border-bottom:2px dashed rgba(34,211,238,.34);border-radius:0 0 50% 50%;filter:drop-shadow(0 0 7px rgba(34,211,238,.18));}
.loader-route-glow::after{content:"";position:absolute;right:11%;bottom:-5px;width:11px;height:11px;border-radius:50%;background:#22d3ee;box-shadow:0 0 20px rgba(34,211,238,.9);animation:fiRouteDot 2.7s ease-in-out infinite;}
@keyframes fiRouteDot{0%,100%{transform:translateX(0);opacity:.45}50%{transform:translateX(-260px);opacity:1}}

.loader-ground{position:absolute;left:6%;right:6%;bottom:85px;height:2px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.28),rgba(34,211,238,.65),rgba(255,255,255,.28),transparent);box-shadow:0 0 18px rgba(34,211,238,.18);}
.loader-ground span{position:absolute;left:12%;right:12%;top:-1px;height:4px;background:repeating-linear-gradient(90deg,transparent 0 26px,rgba(255,255,255,.28) 26px 38px);animation:fiGroundRun 1.4s linear infinite;}
@keyframes fiGroundRun{to{transform:translateX(-64px)}}

.loader-copy{position:absolute;bottom:5px;left:0;right:0;z-index:4;text-shadow:0 3px 18px rgba(0,0,0,.65);}
.loader-word{font-family:'Bebas Neue',sans-serif;font-size:clamp(40px,8vw,62px);color:#22d3ee;letter-spacing:5px;line-height:1;}
.loader-names{display:flex;justify-content:center;align-items:center;gap:10px;margin-top:7px;font-family:'Bebas Neue',sans-serif;font-size:15px;letter-spacing:2px;color:#fff;}
.loader-names i{font-family:'Work Sans',sans-serif;color:#22d3ee;font-style:normal;font-size:12px;}
.loader-sub{font-size:12px;color:#cbd5e1;letter-spacing:1.15px;margin-top:6px;min-height:18px;}

@media(max-width:600px){
  .loader-moon{width:62px;height:62px;top:7%;}
  .loader-character-stage{height:600px;width:100vw;}
  .loader-characters{bottom:112px;width:98vw;height:410px;}
  .loader-character img{height:min(370px,51vh);max-width:49vw;}
  .loader-snowie{left:0}.loader-dowie{right:0}
  .loader-route-glow{bottom:96px;left:5%;right:5%;height:100px;}
  .loader-ground{bottom:89px;}
  .loader-copy{bottom:12px;}
  .loader-word{font-size:42px;letter-spacing:4px;}
  .loader-names{font-size:13px;}
  .loader-sub{font-size:10.5px;letter-spacing:.7px;}
}

@media(prefers-reduced-motion:reduce){
  .page-loader{animation:none;}
  .loader-character,.loader-character-glow,.loader-route-glow::after,.loader-ground span,.loader-star,.loader-snow{animation:none!important;}
}
