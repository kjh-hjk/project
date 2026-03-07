// ===== DPR固定（全エンジン共通）=====
const FIXED_DPR = 1;   // まずは1推奨（見え方が最安定）
function getFixedDpr() {
  // 念のため変な値を弾く
  return (Number.isFinite(FIXED_DPR) && FIXED_DPR > 0) ? FIXED_DPR : 1;
}


// =====================
// 最小の状態管理
// =====================
let started = false;
let lampOn = true; // 初期はオン
let inputLocked = false;

let scene = "intro"; // "intro" | "desk" | "book" | "radio"

let siteStartAt = null;
let coffeeBusy = false;

let bookPage = 0; // 0=表紙
let bookAnimating = false;
let lastBookPage = 0; // 前回閉じたページを記憶（0=表紙）

let focusReturnEl = null;

let radioOn = false;
let radioChannelDeg = 0; // 0..270
let radioVolumeDeg = 0;  // 0..270

// チューニング結果
let tunedTrack = null;   // 1..10 or null

// 蜘蛛ページ: 「開いたことがある」フラグ（セッション中だけ保持）
let spidersOpenedOnce = false;

let candleTimelineStartAt = null; // 9ページを初めて開いた瞬間の時刻（performance.now）

// 葉と羽：消えた葉をセッション中ずっと保持（ページめくり/閉じるでも戻らない）
const leafWingState = {
  // keyごとに { gone: [bool x9] } を持つ
  byKey: new Map(),
};

function getLeafWingState(key) {
  if (!leafWingState.byKey.has(key)) {
    leafWingState.byKey.set(key, { gone: new Array(9).fill(false) });
  }
  return leafWingState.byKey.get(key);
}

let leafFade = {
  active: false,
  idx: -1,          // ★どの葉をフェードするか
  startAt: 0,
  dur: 450,
};

function startLeafFade(idx) {
  leafFade.active = true;
  leafFade.idx = idx;
  leafFade.startAt = performance.now();
}

let p14RandomIll = null; // "ripple" | "fireworks" | null

let eyehandDraggingViaHit = false;

let oxgameDraggingViaHit = false;

let chipsDraggingViaHit = false;
let chipsDragKind = null;   // "item" | "bag" | null

let chipsDragStartX = 0;
let chipsDragStartY = 0;
let chipsActiveItemIndex = -1;

let moonDraggingViaHit = false;

// =====================
// DOM参照
// =====================
const titleEl = document.getElementById("title");
const sketchEl = document.getElementById("bg-sketch");
const deskEl = document.getElementById("bg-desk");
const fadeBlackEl = document.getElementById("fade-black");
const hitLayer = document.getElementById("hit-layer");
const frame = document.getElementById("frame");

const hitLamp = document.getElementById("hit-lamp");
const hitBook = document.getElementById("hit-book");
const hitRadio = document.getElementById("hit-radio");
const hitCoffee = document.getElementById("hit-coffee");

const bookScene = document.getElementById("book-scene");
const bookBg = document.getElementById("book-bg");
const bookClose = document.getElementById("book-close");
const bookPrev = document.getElementById("book-prev");
const bookNext = document.getElementById("book-next");
const bookBlink = document.getElementById("book-blink");
const bookFadeEl = document.getElementById("book-fade");
const bookPageflip = document.getElementById("book-pageflip");

const poemArea = document.getElementById("poem-area");
const bookTextEl = document.getElementById("book-text");
const illCanvas  = document.getElementById("book-ill-canvas");
const illCanvas2 = document.getElementById("book-ill-canvas2"); // ★追加
const bookIll    = document.getElementById("book-ill");

const coffeeFx = document.getElementById("coffee-fx");
const coffeeSteam = document.getElementById("coffee-steam");
const coffeeBanner = document.getElementById("coffee-banner");
const coffeeBannerImg = document.getElementById("coffee-banner-img");
const coffeeBannerText = document.getElementById("coffee-banner-text");

const radioScene = document.getElementById("radio-scene");
const radioBg = document.getElementById("radio-bg");
const radioScale = document.getElementById("radio-scale");
const radioChannel = document.getElementById("radio-channel");
const radioVolume = document.getElementById("radio-volume");
const radioSwitchBtn = document.getElementById("radio-switch");
const radioClose = document.getElementById("radio-close");
const radioVolLabel = document.getElementById("radio-volume-label");

const audioNoise = document.getElementById("audio-noise");
const audioMusic = document.getElementById("audio-music");

const leafwingHitLayer = document.getElementById("leafwing-hit-layer");
const leafwingHitButtons = Array.from(document.querySelectorAll("#leafwing-hit-layer .leaf-hit"));

const candleHitLayer = document.getElementById("candle-hit-layer");
const candleFlameHit = document.getElementById("candle-flame-hit");

const eyehandHitLayer = document.getElementById("eyehand-hit-layer");
const eyehandHandHit = document.getElementById("eyehand-hand-hit");

const oxgameHitLayer = document.getElementById("oxgame-hit-layer");
const oxgameHitButtons = Array.from(document.querySelectorAll("#oxgame-hit-layer .ox-token-hit"));

const chipsHitLayer = document.getElementById("chips-hit-layer");
const chipsItemHitButtons = Array.from(document.querySelectorAll("#chips-hit-layer .chips-item-hit"));
const chipsBagHit = document.getElementById("chips-bag-hit");
const chipsAdCloseHitButtons = Array.from(document.querySelectorAll("#chips-hit-layer .chips-ad-close-hit"));

const moonHitLayer = document.getElementById("moon-hit-layer");
const moonDragHit = document.getElementById("moon-drag-hit");

// =====================
// 画像を先読み
// =====================
function preload(srcList) {
  for (let i = 0; i < srcList.length; i++) {
    const img = new Image();
    img.src = srcList[i];
  }
}

preload([
  "assets/title.webp",
  "assets/sketch.webp",
  "assets/desk_on.webp",
  "assets/desk_off.webp",

  "assets/book_on_cover.webp",
  "assets/book_off_cover.webp",
  "assets/book_on_open.webp",
  "assets/book_off_open.webp",
  "assets/book_on_back.webp",
  "assets/book_off_back.webp",
  "assets/bookradio_on_cross.webp",
  "assets/bookradio_off_cross.webp",

  "assets/coffee_on_steam_1.webp",
  "assets/coffee_on_steam_2.webp",
  "assets/coffee_on_steam_3.webp",
  "assets/coffee_off_steam_1.webp",
  "assets/coffee_off_steam_2.webp",
  "assets/coffee_off_steam_3.webp",
  "assets/coffee_on_banner.webp",
  "assets/coffee_off_banner.webp",

  "assets/book_on_pageflip_1.webp",
  "assets/book_on_pageflip_2.webp",
  "assets/book_on_pageflip_3.webp",
  "assets/book_on_pageflip_4.webp",
  "assets/book_on_pageflip_5.webp",
  "assets/book_on_pageflip_6.webp",
  "assets/book_on_pageflip_7.webp",
  "assets/book_on_pageflip_8.webp",
  "assets/book_off_pageflip_1.webp",
  "assets/book_off_pageflip_2.webp",
  "assets/book_off_pageflip_3.webp",
  "assets/book_off_pageflip_4.webp",
  "assets/book_off_pageflip_5.webp",
  "assets/book_off_pageflip_6.webp",
  "assets/book_off_pageflip_7.webp",
  "assets/book_off_pageflip_8.webp",

  "assets/radio_on_open.webp",
  "assets/radio_off_open.webp",
  "assets/radio_on_scale.webp",
  "assets/radio_off_scale.webp",
  "assets/radio_on_channel.webp",
  "assets/radio_off_channel.webp",
  "assets/radio_on_volume.webp",
  "assets/radio_off_volume.webp",
  "assets/radio_on_switchoff.webp",
  "assets/radio_off_switchoff.webp",
  "assets/radio_on_switchon.webp",
  "assets/radio_off_switchon.webp",

  "assets/candleplate.webp",
  "assets/candle1.webp",
  "assets/candle2.webp",
  "assets/candle3.webp",
  "assets/candle4.webp",
  "assets/candlelight.webp",

  "assets/stem.webp",
  "assets/leaf1.webp",
  "assets/leaf2.webp",
  "assets/leaf3.webp",
  "assets/leaf4.webp",
  "assets/leaf5.webp",
  "assets/leaf6.webp",
  "assets/leaf7.webp",
  "assets/leaf8.webp",
  "assets/leaf9.webp",

  "assets/chipsbag.webp",
  "assets/chip1.webp",
  "assets/chip2.webp",
  "assets/chip3.webp",
  "assets/chip4.webp",
  "assets/chip5.webp",
  "assets/ad1.webp",
  "assets/ad2.webp",
  "assets/ad3.webp",
  "assets/ad4.webp",
  "assets/ad5.webp",
  "assets/moon.webp",

  "assets/flashlight.webp",
  "assets/bagclose.webp",
  "assets/bagopen.webp",
  "assets/letter.webp",
]);

// =====================
// ユーティリティ
// =====================
function sleep(ms) {
  return new Promise(function (r) {
    setTimeout(r, ms);
  });
}

// inertが使えない環境は pointer-events でフォールバック
function setInertLike(el, disabled) {
  if (!el) return;

  // inert対応
  if ("inert" in el) {
    el.inert = disabled;
  }

  // 念押しで pointer-events も操作（CSSが !important だと負けるので後でCSS確認推奨）
  el.style.pointerEvents = disabled ? "none" : "auto";
}

// フォーカスが中に残ったまま非表示になるのを防ぐ（aria-hidden警告系も回避）
function evacuateFocusFrom(container, fallbackEl) {
  if (!container) return;
  const active = document.activeElement;
  if (active && container.contains(active)) {
    active.blur();
    if (fallbackEl && typeof fallbackEl.focus === "function") {
      fallbackEl.focus();
    } else if (document.body && typeof document.body.focus === "function") {
      document.body.focus();
    }
  }
}

const IllEngine = (function () {
  const cache = new Map(); // key -> ImageBitmap

  let canvas = null;
  let ctx = null;
  let srcImg = null;
  let mode = "raw";
  let currentKey = null;


  function getRenderSize(c) {
    const dpr = getFixedDpr();
    const BASE_W = 1453;
    const BASE_H = 854;
    const w = Math.round(BASE_W * dpr);
    const h = Math.round(BASE_H * dpr);
    return { w, h, dpr };
  }



  function resizeCanvasTo(c, w, h) {
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
  }

  function makeKey(src, mode, w, h, dpr) {
    return `${src}|${mode}|${w}x${h}|dpr${dpr}`;
  }

  // ---- 変換：dither（軽めのBayer 4x4）
  function renderDitherToOffscreen(img, w, h) {
    // ★粗さ（数字が大きいほど荒い）
    // 2: 少し荒い / 3: かなり荒い / 4: さらに荒い
    const COARSE = 8;

    const sw = Math.max(1, Math.floor(w / COARSE));
    const sh = Math.max(1, Math.floor(h / COARSE));

    // 1) いったん小さく描く
    const small = document.createElement("canvas");
    small.width = sw;
    small.height = sh;
    const sctx = small.getContext("2d", { willReadFrequently: true });
    sctx.imageSmoothingEnabled = true;
    sctx.clearRect(0, 0, sw, sh);
    sctx.drawImage(img, 0, 0, sw, sh);

    // 2) 小さい方でディザ
    const im = sctx.getImageData(0, 0, sw, sh);
    const data = im.data;

    const bayer4 = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5],
    ];

    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const i = (y * sw + x) * 4;
        const a = data[i + 3];
        if (a < 10) continue;

        const r = data[i], g = data[i + 1], b = data[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b);

        const t = (bayer4[y & 3][x & 3] / 16) * 255;
        const v = lum > t ? 255 : 0;

        data[i] = data[i + 1] = data[i + 2] = v;
      }
    }

    sctx.putImageData(im, 0, 0);

    // 3) それを元サイズへ最近傍拡大（＝点がデカくなる）
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const octx = off.getContext("2d");
    octx.imageSmoothingEnabled = false;
    octx.clearRect(0, 0, w, h);
    octx.drawImage(small, 0, 0, sw, sh, 0, 0, w, h);

    return off;
  }



  // ---- 変換：ascii（低解像度に落として文字で再構成→描画）
  function renderAsciiToOffscreen(img, w, h) {
    // ✅ 解像度：小さいほど高精細（でも重くなる）
    let cell = 10; // 好きな固定値（例：8〜14くらいで調整）


    // ✅ 重すぎ防止（セル数に上限）
    // 目安：8万〜12万セルくらいが安全圏
    const MAX_CELLS = 90000;

    let cols = Math.max(1, Math.floor(w / cell));
    let rows = Math.max(1, Math.floor(h / cell));
    while (cols * rows > MAX_CELLS) {
      cell += 1;
      cols = Math.max(1, Math.floor(w / cell));
      rows = Math.max(1, Math.floor(h / cell));
    }

    // 小さく描いて輝度を取る
    const tiny = document.createElement("canvas");
    tiny.width = cols;
    tiny.height = rows;
    const tctx = tiny.getContext("2d", { willReadFrequently: true });

    // ✅ ここが超重要：縮小時のボケを消す（黒線が消えるのを防ぐ）
    tctx.imageSmoothingEnabled = false;
    tctx.clearRect(0, 0, cols, rows);
    tctx.drawImage(img, 0, 0, cols, rows);

    const im = tctx.getImageData(0, 0, cols, rows).data;

    const CHARSET = "x+*.:;";

    // 透明背景
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const octx = off.getContext("2d");
    octx.clearRect(0, 0, w, h);

    // 文字見た目（少し大きめ＆太め）
    octx.font = `800 ${Math.floor(cell * 1.2)}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;
    octx.textBaseline = "top";
    octx.fillStyle = "#000";

    // 位置固定乱数（チカチカ防止）
    function hash01(ix, iy) {
      const s = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453;
      return s - Math.floor(s);
    }


    // ✅ 薄い線も拾う設定
    const inkGamma = 0.6;      // 小さいほど薄線を拾いやすい（0.5〜0.8）
    const inkThreshold = 0.02; // 小さいほど拾う（0.01〜0.06）

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const a = im[i + 3];
        if (a < 10) continue;

        const r = im[i], g = im[i + 1], b = im[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; // 0..1

        let ink = 1 - lum;
        ink = Math.pow(ink, inkGamma);

        if (ink < inkThreshold) continue;

        const rr = hash01(x + 19, y + 73);
        const ch = CHARSET[Math.floor(rr * CHARSET.length)];

        octx.fillText(ch, x * cell, y * cell);
      }
    }

    return off;
  }


  async function renderToBitmap(img, w, h, mode) {
    // modeに応じてoffscreen canvasを作る
    let off;
    if (mode === "dither") off = renderDitherToOffscreen(img, w, h);
    else if (mode === "ascii") off = renderAsciiToOffscreen(img, w, h);
    else {
      off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      off.getContext("2d").drawImage(img, 0, 0, w, h);
    }

    // ImageBitmap化（描画が軽くなる）
    const bmp = await createImageBitmap(off);
    return bmp;
  }

  async function renderOnce(force = false) {
    if (!canvas || !ctx || !srcImg) return;

    const { w, h, dpr } = getRenderSize(canvas);
    resizeCanvasTo(canvas, w, h);

    const src = srcImg.currentSrc || srcImg.src || "";
    const key = makeKey(src, mode, w, h, dpr);
    currentKey = key;

    if (!force && cache.has(key)) {
      const bmp = cache.get(key);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(bmp, 0, 0, w, h);
      return;
    }

    // 未ロードならロード待ち
    if (!srcImg.complete) {
      await new Promise((res) => srcImg.addEventListener("load", res, { once: true }));
    }

    const bmp = await renderToBitmap(srcImg, w, h, mode);
    cache.set(key, bmp);

    // 途中でページが変わっていたら描かない（競合防止）
    if (currentKey !== key) return;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
  }

  return {
    start(imgEl, canvasEl, modeName) {
      this.stop();

      srcImg = imgEl;
      canvas = canvasEl;
      ctx = canvas.getContext("2d", { alpha: true });

      mode = modeName || "raw";
      // 初回描画
      renderOnce(true);
    },

    // modeだけ変えて再描画（ランプ切替に使う）
    setMode(modeName) {
      mode = modeName || "raw";
      cache.clear();      // ★追加
      renderOnce(true);   // ★forceで再生成
    },

    // サイズ変化時に再描画（キャッシュキーが変わるので再計算される）
    resize() {
      // ✅ 固定レンダーなので何もしない
    },


    // ページ切替などで「強制更新」したい時
    refresh() {
      renderOnce(true);
    },

    stop() {
      canvas = null;
      ctx = null;
      srcImg = null;
      mode = "raw";
      currentKey = null;
    },

    // 必要ならキャッシュ全消し
    clearCache() {
      cache.clear();
    }
  };
})();

// =====================
// Interactive Illust: Eye + Hand
// - 手をドラッグ
// - 瞳が手（またはポインタ）を追う
// - mode: "dither" | "ascii"
// - 背景は透明、黒線だけ出す想定
// =====================
const EyeHandEngine = (function () {
  let active = false;

  let outCanvas = null;
  let outCtx = null;

  // raw合成用（縮小）
  const rawCanvas = document.createElement("canvas");
  const rawCtx = rawCanvas.getContext("2d", { willReadFrequently: true });

  // 出力用の拡大一時
  const tmpCanvas = document.createElement("canvas");
  const tmpCtx = tmpCanvas.getContext("2d", { willReadFrequently: true });

  // assets
  const imgEye = new Image();
  const imgPupil = new Image();
  const imgHand = new Image();
  let loaded = false;

  let mode = "dither"; // "dither" | "ascii"
  let raf = 0;
  let lastAsciiAt = 0;

  // 負荷調整
  let fxScale = 0.55;
  let asciiFps = 12;

  // Figma layout (1920x1080基準) が来たらそれを使う
  // opts.layout = { eye:{x,y,w,h}, pupil:{x,y,w,h}, hand:{x,y,w,h}, bounds:{x,y,w,h} }
  let designLayout = null;

  // raw空間に変換した結果
  let centerX = 0, centerY = 0;
  let eyeW = 0, eyeH = 0;
  let pupilBaseX = 0, pupilBaseY = 0;
  let handW = 0, handH = 0;
  let dragBoundsRaw = null; // {l,t,r,b} in raw

  // 手の位置は design 座標で保持（安定）
  let handDX = 0, handDY = 0;
  let handGrabOffDX = 0, handGrabOffDY = 0;
  let draggingHand = false;
  let handMoved = false; // ★追加：手が動いたかどうか

  // ポインタ（raw）
  let pointerX = 0, pointerY = 0;
  let pointerBound = false;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function getRenderSize(canvas) {
    const dpr = getFixedDpr();
    const rect = canvas.getBoundingClientRect();
    return {
      w: Math.max(1, Math.round(rect.width * dpr)),
      h: Math.max(1, Math.round(rect.height * dpr)),
      dpr
    };
  }

  function canvasPointFromEvent(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;   // CSS→内部px
    const sy = canvas.height / rect.height; // CSS→内部px
    return {
      x: (e.clientX - rect.left) * sx,
      y: (e.clientY - rect.top) * sy
    };
  }


  const CROP_X = 228, CROP_Y = 129, CROP_W = 1453, CROP_H = 854;

  function rawToDesign(pxRaw, pyRaw) {
    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;

    const lx = pxRaw / sx;
    const ly = pyRaw / sy;

    // 白枠ローカル → ページ全体座標に戻す
    return { xD: lx + CROP_X, yD: ly + CROP_Y };
  }

  function designToRaw(xD, yD) {
    // ページ全体(1920x1080)の座標 → 白枠ローカル → rawへ
    const lx = xD - CROP_X;
    const ly = yD - CROP_Y;

    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;

    return { x: lx * sx, y: ly * sy };
  }


  function resizeCanvases() {
    if (!outCanvas) return;

    const dpr = getFixedDpr();

    // ✅ book-ill-wrap の design サイズで固定
    const BASE_W = 1453;
    const BASE_H = 854;

    const w = Math.round(BASE_W * dpr);
    const h = Math.round(BASE_H * dpr);

    // outCanvas 内部解像度固定
    if (outCanvas.width !== w || outCanvas.height !== h) {
      outCanvas.width = w;
      outCanvas.height = h;
    }

    // rawCanvas も固定（fxScale に応じて）
    const rw = Math.max(1, Math.floor(w * fxScale));
    const rh = Math.max(1, Math.floor(h * fxScale));
    if (rawCanvas.width !== rw || rawCanvas.height !== rh) {
      rawCanvas.width = rw;
      rawCanvas.height = rh;
    }

    // 変換比
    const sx = rw / 1920;
    const sy = rh / 1080;

    if (designLayout) {
      const eye = designLayout.eye;
      const pupil = designLayout.pupil;
      const hand = designLayout.hand;
      const bounds = designLayout.bounds;

      eyeW = eye.w * sx;
      eyeH = eye.h * sy;

      centerX = (eye.x + eye.w / 2) * sx;
      centerY = (eye.y + eye.h / 2) * sy;

      pupilBaseX = (pupil.x + pupil.w / 2) * sx;
      pupilBaseY = (pupil.y + pupil.h / 2) * sy;

      handW = hand.w * sx;
      handH = hand.h * sy;

      // 初期手位置（design）
      if (handDX === 0 && handDY === 0) {
        handDX = hand.x + hand.w / 2;
        handDY = hand.y + hand.h / 2;
      }

      // ポインタ初期
      if (pointerX === 0 && pointerY === 0) {
        pointerX = centerX;
        pointerY = centerY;
      }

      if (bounds) {
        dragBoundsRaw = {
          l: bounds.x * sx,
          t: bounds.y * sy,
          r: (bounds.x + bounds.w) * sx,
          b: (bounds.y + bounds.h) * sy
        };
      } else {
        dragBoundsRaw = null;
      }

      return;
    }

    // layoutが無い場合の簡易配置
    centerX = rw / 2;
    centerY = rh / 2;
    const base = Math.min(rw, rh) * 0.45;
    eyeW = base;
    eyeH = base;

    handW = eyeW * 0.55;
    handH = handW * 1.2;

    if (handDX === 0 && handDY === 0) {
      // design座標に見立てて中央から少しズラす
      handDX = 960 + 220;
      handDY = 540 + 140;
    }
    if (pointerX === 0 && pointerY === 0) {
      pointerX = centerX;
      pointerY = centerY;
    }

    dragBoundsRaw = null;
  }

  function hitTestHand(pxRaw, pyRaw) {
    const handRaw = designToRaw(handDX, handDY);
    const hx = handRaw.x;
    const hy = handRaw.y;
    const pad = Math.max(10, eyeW * 0.18);

    const left = hx - handW / 2;
    const top = hy - handH / 2;

    return (
      pxRaw >= left - pad &&
      pxRaw <= left + handW + pad &&
      pyRaw >= top - pad &&
      pyRaw <= top + handH + pad
    );
  }

  function getHandRectDesign() {
    if (!active || !designLayout) return null;

    const hand = designLayout.hand;
    return {
      x: handDX - hand.w / 2,
      y: handDY - hand.h / 2,
      w: hand.w,
      h: hand.h
    };
  }

  function startExternalDrag(clientX, clientY) {
    if (!active || !outCanvas || !loaded) return false;

    const rect = outCanvas.getBoundingClientRect();
    const sx = outCanvas.width / rect.width;
    const sy = outCanvas.height / rect.height;

    const pxRaw = (clientX - rect.left) * sx * fxScale;
    const pyRaw = (clientY - rect.top) * sy * fxScale;

    if (!hitTestHand(pxRaw, pyRaw)) return false;

    draggingHand = true;

    const d = rawToDesign(pxRaw, pyRaw);
    handGrabOffDX = d.xD - handDX;
    handGrabOffDY = d.yD - handDY;

    pointerX = pxRaw;
    pointerY = pyRaw;

    return true;
  }

  function moveExternalDrag(clientX, clientY) {
    if (!active || !outCanvas) return;
    if (!draggingHand) return;

    const rect = outCanvas.getBoundingClientRect();
    const sx = outCanvas.width / rect.width;
    const sy = outCanvas.height / rect.height;

    const pxRaw = (clientX - rect.left) * sx * fxScale;
    const pyRaw = (clientY - rect.top) * sy * fxScale;

    pointerX = pxRaw;
    pointerY = pyRaw;

    handMoved = true;

    const d = rawToDesign(pxRaw, pyRaw);
    let nxD = d.xD - handGrabOffDX;
    let nyD = d.yD - handGrabOffDY;

    if (designLayout && designLayout.bounds) {
      const b = designLayout.bounds;
      const hwD = designLayout.hand.w / 2;
      const hhD = designLayout.hand.h / 2;

      nxD = clamp(nxD, b.x + hwD, b.x + b.w - hwD);
      nyD = clamp(nyD, b.y + hhD, b.y + b.h - hhD);
    }

    handDX = nxD;
    handDY = nyD;
  }

  function endExternalDrag() {
    draggingHand = false;
  }

  function bindPointer() {
    if (!outCanvas || pointerBound) return;
    pointerBound = true;

    outCanvas.style.touchAction = "pinch-zoom";
    outCanvas.style.pointerEvents = "none";

    function onDown(e) {
      if (!active) return;
      const p = canvasPointFromEvent(e, outCanvas);
      const pxRaw = p.x * fxScale;
      const pyRaw = p.y * fxScale;

      if (!loaded) return;

      if (hitTestHand(pxRaw, pyRaw)) {
        draggingHand = true;

        const d = rawToDesign(pxRaw, pyRaw);
        handGrabOffDX = d.xD - handDX;
        handGrabOffDY = d.yD - handDY;

        try { outCanvas.setPointerCapture(e.pointerId); } catch (_) { }
      }
    }

    function onMove(e) {
      if (!active) return;
      const p = canvasPointFromEvent(e, outCanvas);
      const pxRaw = p.x * fxScale;
      const pyRaw = p.y * fxScale;

      pointerX = pxRaw;
      pointerY = pyRaw;

      if (!draggingHand) return;

      handMoved = true; // ★追加
      const d = rawToDesign(pxRaw, pyRaw);
      let nxD = d.xD - handGrabOffDX;
      let nyD = d.yD - handGrabOffDY;

      // 範囲制限（design bounds がある場合）
      if (designLayout && designLayout.bounds) {
        const b = designLayout.bounds;
        const hwD = designLayout.hand.w / 2;
        const hhD = designLayout.hand.h / 2;

        nxD = clamp(nxD, b.x + hwD, b.x + b.w - hwD);
        nyD = clamp(nyD, b.y + hhD, b.y + b.h - hhD);
      }

      handDX = nxD;
      handDY = nyD;
    }

    function onUp(e) {
      if (!draggingHand) return;
      draggingHand = false;
      try { outCanvas.releasePointerCapture(e.pointerId); } catch (_) { }
    }

    outCanvas.addEventListener("pointerdown", onDown);
    outCanvas.addEventListener("pointermove", onMove);
    outCanvas.addEventListener("pointerup", onUp);
    outCanvas.addEventListener("pointercancel", onUp);

    // stop()で外す用
    bindPointer._onDown = onDown;
    bindPointer._onMove = onMove;
    bindPointer._onUp = onUp;
  }

  function unbindPointer() {
    if (!outCanvas) return;
    if (!bindPointer._onDown) return;

    outCanvas.removeEventListener("pointerdown", bindPointer._onDown);
    outCanvas.removeEventListener("pointermove", bindPointer._onMove);
    outCanvas.removeEventListener("pointerup", bindPointer._onUp);
    outCanvas.removeEventListener("pointercancel", bindPointer._onUp);

    bindPointer._onDown = bindPointer._onMove = bindPointer._onUp = null;
    pointerBound = false;
  }

  // =====================
  // FX: dither / ascii
  // =====================

  function stampDot(data, w, h, x, y, size) {
    const r = Math.floor(size / 2);
    for (let yy = -r; yy <= r; yy++) {
      for (let xx = -r; xx <= r; xx++) {
        const nx = x + xx, ny = y + yy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = (ny * w + nx) * 4;
        data[j] = data[j + 1] = data[j + 2] = 0;
        data[j + 3] = 255;
      }
    }
  }

  function applyCoarseDotDither(ctxSrc, w, h, scale = 3) {
    const im = ctxSrc.getImageData(0, 0, w, h);
    const d = im.data;

    const DOT = 3; // ✅ 2〜3推奨（太くするほど欠けにくい）

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 10) continue;

        const r = d[i], g = d[i + 1], b = d[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

        const bx = Math.floor(x / scale);
        const by = Math.floor(y / scale);

        // ✅ “中心”に打つ（見た目が安定しやすい）
        const px = bx * scale + Math.floor(scale / 2);
        const py = by * scale + Math.floor(scale / 2);
        const isDot = (x === px && y === py);

        const ink = (lum < 0.6);
        if (ink && isDot) {
          stampDot(d, w, h, x, y, DOT);
        } else {
          // 透明化
          d[i + 3] = 0;
        }
      }
    }

    ctxSrc.putImageData(im, 0, 0);
  }


  function hash01(ix, iy) {
    const s = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123;
    return s - Math.floor(s);
  }

  // 穴を減らす ASCII（黒判定だけ、背景透明）
  function renderAsciiInk(ctxSrc, w, h, ctxOut, outW, outH) {
    // 文字を大きくしたいなら cell を大きく
    const cell = 10; // 例：大きめ文字にしたいなら14〜20くらい
    const cols = Math.max(1, Math.floor(outW / cell));
    const rows = Math.max(1, Math.floor(outH / cell));

    const tiny = document.createElement("canvas");
    tiny.width = cols;
    tiny.height = rows;
    const tctx = tiny.getContext("2d", { willReadFrequently: true });

    // 線画は smoothing ON + 軽い blur で穴埋め
    tctx.imageSmoothingEnabled = true;
    tctx.clearRect(0, 0, cols, rows);
    tctx.drawImage(ctxSrc.canvas, 0, 0, w, h, 0, 0, cols, rows);

    tctx.filter = "blur(0.7px)";
    tctx.drawImage(tiny, 0, 0);
    tctx.filter = "none";

    const im = tctx.getImageData(0, 0, cols, rows).data;

    const CHARSET = "x+*.:;-=~#o0&O";
    const inkThreshold = 0.03; // 小さいほど拾う（太りやすい）

    ctxOut.clearRect(0, 0, outW, outH);
    ctxOut.fillStyle = "#000";
    ctxOut.textAlign = "center";
    ctxOut.textBaseline = "middle";

    const fontSize = Math.floor(cell * 1.05);
    ctxOut.font =
      `550 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const a = im[i + 3];
        if (a < 10) continue;

        const r = im[i], g = im[i + 1], b = im[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const ink = 1 - lum;

        if (ink < inkThreshold) continue;

        const rr = hash01(x + 19, y + 73);
        const ch = CHARSET[Math.floor(rr * CHARSET.length)];

        const cx = (x + 0.5) * cell;
        const cy = (y + 0.52) * cell;
        ctxOut.fillText(ch, cx, cy);
      }
    }
  }

  // =====================
  // 描画
  // =====================
  function drawRaw() {
    if (!loaded) return;

    const w = rawCanvas.width;
    const h = rawCanvas.height;

    rawCtx.clearRect(0, 0, w, h);

    // 目
    rawCtx.save();
    rawCtx.translate(centerX, centerY);
    rawCtx.drawImage(imgEye, -eyeW / 2, -eyeH / 2, eyeW, eyeH);
    rawCtx.restore();

    // 手（rawへ）
    const handRaw = designToRaw(handDX, handDY);

    // ✅ここを差し替えた（手が動くまでは追わない）
    let mx = 0, my = 0;

    if (handMoved) {
      const dx = handRaw.x - centerX;
      const dy = handRaw.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const maxMove = eyeW * 0.09;

      mx = (dx / dist) * Math.min(maxMove, dist);
      my = (dy / dist) * Math.min(maxMove, dist);
    }

    // 瞳
    const pupilW = designLayout
      ? (designLayout.pupil.w * (rawCanvas.width / 1920))
      : (eyeW * 0.22);

    const baseX = designLayout ? pupilBaseX : centerX;
    const baseY = designLayout ? pupilBaseY : centerY;

    rawCtx.drawImage(
      imgPupil,
      baseX - pupilW / 2 + mx,
      baseY - pupilW / 2 + my,
      pupilW,
      pupilW
    );

    // 手
    rawCtx.drawImage(
      imgHand,
      handRaw.x - handW / 2,
      handRaw.y - handH / 2,
      handW,
      handH
    );
  }

  function drawFx() {
    if (!outCtx || !outCanvas) return;

    const outW = outCanvas.width;
    const outH = outCanvas.height;

    // tmpCanvas は out サイズで使い回し
    if (tmpCanvas.width !== outW || tmpCanvas.height !== outH) {
      tmpCanvas.width = outW;
      tmpCanvas.height = outH;
    }

    tmpCtx.imageSmoothingEnabled = false;
    tmpCtx.clearRect(0, 0, outW, outH);
    tmpCtx.drawImage(rawCanvas, 0, 0, rawCanvas.width, rawCanvas.height, 0, 0, outW, outH);

    if (mode === "dither") {
      outCtx.clearRect(0, 0, outW, outH);
      applyCoarseDotDither(tmpCtx, outW, outH, 3);
      outCtx.drawImage(tmpCanvas, 0, 0);
      return;
    }

    if (mode === "ascii") {
      const now = performance.now();
      const interval = 1000 / asciiFps;
      if (now - lastAsciiAt < interval) return;
      lastAsciiAt = now;

      renderAsciiInk(tmpCtx, outW, outH, outCtx, outW, outH);
      return;
    }
  }

  function tick() {
    if (!active) return;
    drawRaw();
    drawFx();
    raf = requestAnimationFrame(tick);
  }

  async function loadAll(srcEye, srcPupil, srcHand) {
    loaded = false;

    const p1 = new Promise((res, rej) => {
      imgEye.onload = res;
      imgEye.onerror = () => rej(new Error("eye image failed: " + srcEye));
      imgEye.src = srcEye;
    });
    const p2 = new Promise((res, rej) => {
      imgPupil.onload = res;
      imgPupil.onerror = () => rej(new Error("pupil image failed: " + srcPupil));
      imgPupil.src = srcPupil;
    });
    const p3 = new Promise((res, rej) => {
      imgHand.onload = res;
      imgHand.onerror = () => rej(new Error("hand image failed: " + srcHand));
      imgHand.src = srcHand;
    });

    await Promise.all([p1, p2, p3]);
    loaded = true;
  }

  return {
    async start(canvasEl, opts) {
      this.stop();

      outCanvas = canvasEl;
      outCtx = outCanvas.getContext("2d", { willReadFrequently: true, alpha: true });

      mode = (opts && opts.mode) ? opts.mode : "dither";
      designLayout = (opts && opts.layout) ? opts.layout : null;
      if (opts && typeof opts.fxScale === "number") fxScale = opts.fxScale;
      if (opts && typeof opts.asciiFps === "number") asciiFps = opts.asciiFps;

      const eyeSrc = (opts && opts.eyeSrc) ? opts.eyeSrc : "assets/eyeball.webp";
      const pupilSrc = (opts && opts.pupilSrc) ? opts.pupilSrc : "assets/pupil.webp";
      const handSrc = (opts && opts.handSrc) ? opts.handSrc : "assets/hand.webp";

      // 状態リセット
      handDX = 0; handDY = 0;
      handGrabOffDX = 0; handGrabOffDY = 0;
      draggingHand = false;
      handMoved = false; // ★追加
      pointerX = 0; pointerY = 0;
      lastAsciiAt = 0;

      await loadAll(eyeSrc, pupilSrc, handSrc);

      resizeCanvases();
      bindPointer();

      active = true;
      raf = requestAnimationFrame(tick);
    },

    stop() {
      active = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;

      // 先にイベント解除
      unbindPointer();

      // 描画クリア
      if (outCtx && outCanvas) {
        outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
      }

      loaded = false;
      draggingHand = false;

      outCanvas = null;
      outCtx = null;
      designLayout = null;
      dragBoundsRaw = null;
    },

    beginDragFromClient(clientX, clientY) {
      return startExternalDrag(clientX, clientY);
    },

    moveDragFromClient(clientX, clientY) {
      moveExternalDrag(clientX, clientY);
    },

    endDrag() {
      endExternalDrag();
    },

    getHandRect() {
      return getHandRectDesign();
    },

    setMode(nextMode) {
      mode = nextMode || "dither";
      lastAsciiAt = 0;
    },

    resize() {
      // ✅ 固定レンダーなので何もしない
    },


    get active() { return active; }
  };
})();


// =====================
// Interactive Illust: OX Game (tic-tac-toe tokens)
// - 〇×トークンをドラッグ
// - 格子(3x3)を描く
// - mode: "dither" | "ascii"
// =====================
const OxGameEngine = (function () {
  let active = false;

  let outCanvas = null;
  let outCtx = null;

  // raw合成用（縮小）
  const rawCanvas = document.createElement("canvas");
  const rawCtx = rawCanvas.getContext("2d", { willReadFrequently: true });

  // 出力用の拡大一時
  const tmpCanvas = document.createElement("canvas");
  const tmpCtx = tmpCanvas.getContext("2d", { willReadFrequently: true });

  let mode = "dither";
  let raf = 0;
  let lastAsciiAt = 0;

  let fxScale = 0.55;
  let asciiFps = 12;

  // opts
  let designBounds = null;   // {x,y,w,h} in 1920x1080
  let designGridRect = null; // {x,y,w,h} in 1920x1080
  let gridCfg = { cols: 3, rows: 3, lineWidth: 10 };
  let tokenCfg = { size: 130 }; // 直径（design）

  // tokens: design座標で保持
  // {id, kind:"o"|"x", xD, yD}
  let tokens = [];

  // drag
  let pointerBound = false;
  let draggingId = -1;
  let grabDx = 0, grabDy = 0; // design offset
  let bagGrabDx = 0, bagGrabDy = 0;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function getRenderSize(canvas) {
    const dpr = getFixedDpr();
    const rect = canvas.getBoundingClientRect();
    return {
      w: Math.max(1, Math.round(rect.width * dpr)),
      h: Math.max(1, Math.round(rect.height * dpr)),
      dpr
    };
  }

  function canvasPointFromEvent(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;   // CSS→内部px
    const sy = canvas.height / rect.height; // CSS→内部px
    return {
      x: (e.clientX - rect.left) * sx,
      y: (e.clientY - rect.top) * sy
    };
  }


  const CROP_X = 228, CROP_Y = 129, CROP_W = 1453, CROP_H = 854;

  function rawToDesign(pxRaw, pyRaw) {
    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;

    const lx = pxRaw / sx;
    const ly = pyRaw / sy;

    // 白枠ローカル → ページ全体座標に戻す
    return { xD: lx + CROP_X, yD: ly + CROP_Y };
  }

  function designToRaw(xD, yD) {
    // ページ全体(1920x1080)の座標 → 白枠ローカル → rawへ
    const lx = xD - CROP_X;
    const ly = yD - CROP_Y;

    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;

    return { x: lx * sx, y: ly * sy };
  }

  function resizeCanvases() {
    if (!outCanvas) return;

    const dpr = getFixedDpr();

    // ✅ book-ill-wrap の design サイズで固定
    const BASE_W = 1453;
    const BASE_H = 854;

    const w = Math.round(BASE_W * dpr);
    const h = Math.round(BASE_H * dpr);

    // outCanvas 内部解像度固定
    if (outCanvas.width !== w || outCanvas.height !== h) {
      outCanvas.width = w;
      outCanvas.height = h;
    }

    // rawCanvas も固定（fxScale に応じて）
    const rw = Math.max(1, Math.floor(w * fxScale));
    const rh = Math.max(1, Math.floor(h * fxScale));
    if (rawCanvas.width !== rw || rawCanvas.height !== rh) {
      rawCanvas.width = rw;
      rawCanvas.height = rh;
    }

    // 範囲内にトークンを収める（designで clamp）
    if (designBounds) {
      const rD = tokenCfg.size / 2;
      for (const t of tokens) {
        t.xD = clamp(t.xD, designBounds.x + rD, designBounds.x + designBounds.w - rD);
        t.yD = clamp(t.yD, designBounds.y + rD, designBounds.y + designBounds.h - rD);
      }
    }
  }

  function hash01(ix, iy) {
    const s = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123;
    return s - Math.floor(s);
  }

  function initTokens() {
    tokens = [];
    const N = 10;

    if (!designBounds) {
      // ひとまず中央
      for (let i = 0; i < N; i++) {
        tokens.push({
          id: i,
          kind: (i < 5) ? "o" : "x",
          xD: 960,
          yD: 540
        });
      }
      return;
    }

    const L = designBounds.x;
    const T = designBounds.y;
    const R = designBounds.x + designBounds.w;
    const B = designBounds.y + designBounds.h;
    const rD = tokenCfg.size / 2;

    for (let i = 0; i < N; i++) {
      const kind = (i < 5) ? "o" : "x";
      const rr1 = hash01(i + 11, 77);
      const rr2 = hash01(i + 33, 99);
      const xD = clamp(L + rr1 * (R - L), L + rD, R - rD);
      const yD = clamp(T + rr2 * (B - T), T + rD, B - rD);
      tokens.push({ id: i, kind, xD, yD });
    }
  }

  function pickToken(pxRaw, pyRaw) {
    // raw → design
    const d = rawToDesign(pxRaw, pyRaw);

    const rD = tokenCfg.size / 2;
    for (let i = tokens.length - 1; i >= 0; i--) {
      const t = tokens[i];
      const dx = d.xD - t.xD;
      const dy = d.yD - t.yD;
      if ((dx * dx + dy * dy) <= (rD * rD)) return i;
    }
    return -1;
  }

  function beginExternalDragById(tokenId, clientX, clientY) {
    if (!active || !outCanvas) return false;
    if (tokenId < 0 || tokenId >= tokens.length) return false;

    const rect = outCanvas.getBoundingClientRect();
    const sx = outCanvas.width / rect.width;
    const sy = outCanvas.height / rect.height;

    const pxRaw = (clientX - rect.left) * sx * fxScale;
    const pyRaw = (clientY - rect.top) * sy * fxScale;

    const picked = tokens.splice(tokenId, 1)[0];
    tokens.push(picked);
    draggingId = tokens.length - 1;

    const d = rawToDesign(pxRaw, pyRaw);
    grabDx = d.xD - picked.xD;
    grabDy = d.yD - picked.yD;

    return true;
  }

  function moveExternalDrag(clientX, clientY) {
    if (!active || !outCanvas) return;
    if (draggingId < 0) return;

    const rect = outCanvas.getBoundingClientRect();
    const sx = outCanvas.width / rect.width;
    const sy = outCanvas.height / rect.height;

    const pxRaw = (clientX - rect.left) * sx * fxScale;
    const pyRaw = (clientY - rect.top) * sy * fxScale;

    const d = rawToDesign(pxRaw, pyRaw);

    let nxD = d.xD - grabDx;
    let nyD = d.yD - grabDy;

    if (designBounds) {
      const rD = tokenCfg.size / 2;
      nxD = clamp(nxD, designBounds.x + rD, designBounds.x + designBounds.w - rD);
      nyD = clamp(nyD, designBounds.y + rD, designBounds.y + designBounds.h - rD);
    }

    tokens[draggingId].xD = nxD;
    tokens[draggingId].yD = nyD;
  }

  function endExternalDrag() {
    draggingId = -1;
  }

  function getTokenRects() {
    const rD = tokenCfg.size / 2;
    return tokens.map((t, idx) => ({
      id: idx,
      kind: t.kind,
      x: t.xD - rD,
      y: t.yD - rD,
      w: rD * 2,
      h: rD * 2
    }));
  }

  function bindPointer() {
    if (!outCanvas || pointerBound) return;
    pointerBound = true;

    outCanvas.style.touchAction = "pinch-zoom";
    outCanvas.style.pointerEvents = "none";

    function onDown(e) {
      if (!active) return;
      const p = canvasPointFromEvent(e, outCanvas);
      const pxRaw = p.x * fxScale;
      const pyRaw = p.y * fxScale;

      const id = pickToken(pxRaw, pyRaw);
      if (id < 0) return;

      // 手前へ
      const picked = tokens.splice(id, 1)[0];
      tokens.push(picked);
      draggingId = tokens.length - 1;

      const d = rawToDesign(pxRaw, pyRaw);
      grabDx = d.xD - picked.xD;
      grabDy = d.yD - picked.yD;

      try { outCanvas.setPointerCapture(e.pointerId); } catch (_) { }
    }

    function onMove(e) {
      if (!active) return;
      if (draggingId < 0) return;

      const p = canvasPointFromEvent(e, outCanvas);
      const pxRaw = p.x * fxScale;
      const pyRaw = p.y * fxScale;

      const d = rawToDesign(pxRaw, pyRaw);

      let nxD = d.xD - grabDx;
      let nyD = d.yD - grabDy;

      if (designBounds) {
        const rD = tokenCfg.size / 2;
        nxD = clamp(nxD, designBounds.x + rD, designBounds.x + designBounds.w - rD);
        nyD = clamp(nyD, designBounds.y + rD, designBounds.y + designBounds.h - rD);
      }

      tokens[draggingId].xD = nxD;
      tokens[draggingId].yD = nyD;
    }

    function onUp(e) {
      if (draggingId < 0) return;
      draggingId = -1;
      try { outCanvas.releasePointerCapture(e.pointerId); } catch (_) { }
    }

    outCanvas.addEventListener("pointerdown", onDown);
    outCanvas.addEventListener("pointermove", onMove);
    outCanvas.addEventListener("pointerup", onUp);
    outCanvas.addEventListener("pointercancel", onUp);

    bindPointer._onDown = onDown;
    bindPointer._onMove = onMove;
    bindPointer._onUp = onUp;
  }

  function unbindPointer() {
    if (!outCanvas) return;
    if (!bindPointer._onDown) return;

    outCanvas.removeEventListener("pointerdown", bindPointer._onDown);
    outCanvas.removeEventListener("pointermove", bindPointer._onMove);
    outCanvas.removeEventListener("pointerup", bindPointer._onUp);
    outCanvas.removeEventListener("pointercancel", bindPointer._onUp);

    bindPointer._onDown = bindPointer._onMove = bindPointer._onUp = null;
    pointerBound = false;
  }

  // =====================
  // FX
  // =====================
  function stampDot(data, w, h, x, y, size) {
    const r = Math.floor(size / 2);
    for (let yy = -r; yy <= r; yy++) {
      for (let xx = -r; xx <= r; xx++) {
        const nx = x + xx, ny = y + yy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = (ny * w + nx) * 4;
        data[j] = data[j + 1] = data[j + 2] = 0;
        data[j + 3] = 255;
      }
    }
  }

  function applyCoarseDotDither(ctxSrc, w, h, scale = 3) {
    const im = ctxSrc.getImageData(0, 0, w, h);
    const d = im.data;

    const DOT = 3; // ✅ 2〜3推奨（太くするほど欠けにくい）

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 10) continue;

        const r = d[i], g = d[i + 1], b = d[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

        const bx = Math.floor(x / scale);
        const by = Math.floor(y / scale);

        // ✅ “中心”に打つ（見た目が安定しやすい）
        const px = bx * scale + Math.floor(scale / 2);
        const py = by * scale + Math.floor(scale / 2);
        const isDot = (x === px && y === py);

        const ink = (lum < 0.6);
        if (ink && isDot) {
          stampDot(d, w, h, x, y, DOT);
        } else {
          // 透明化
          d[i + 3] = 0;
        }
      }
    }

    ctxSrc.putImageData(im, 0, 0);
  }


  function renderAsciiInk(ctxSrc, w, h, ctxOut, outW, outH) {
    const cell = 10; // 例：大きめ文字にしたいなら14〜20くらい
    const cols = Math.max(1, Math.floor(outW / cell));
    const rows = Math.max(1, Math.floor(outH / cell));

    const tiny = document.createElement("canvas");
    tiny.width = cols;
    tiny.height = rows;
    const tctx = tiny.getContext("2d", { willReadFrequently: true });

    tctx.imageSmoothingEnabled = true;
    tctx.clearRect(0, 0, cols, rows);
    tctx.drawImage(ctxSrc.canvas, 0, 0, w, h, 0, 0, cols, rows);

    tctx.filter = "blur(0.45px)";
    tctx.drawImage(tiny, 0, 0);
    tctx.filter = "none";

    const im = tctx.getImageData(0, 0, cols, rows).data;

    const CHARSET = "x+*.:;-=~o";
    const inkThreshold = 0.03;

    ctxOut.clearRect(0, 0, outW, outH);
    ctxOut.fillStyle = "#000";
    ctxOut.textAlign = "center";
    ctxOut.textBaseline = "middle";

    const fontSize = Math.floor(cell * 1.05);
    ctxOut.font =
      `550 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const a = im[i + 3];
        if (a < 10) continue;

        const r = im[i], g = im[i + 1], b = im[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const ink = 1 - lum;
        if (ink < inkThreshold) continue;

        const rr = hash01(x + 19, y + 73);
        const ch = CHARSET[Math.floor(rr * CHARSET.length)];

        const cx = (x + 0.5) * cell;
        const cy = (y + 0.52) * cell;
        ctxOut.fillText(ch, cx, cy);
      }
    }
  }

  // =====================
  // 描画
  // =====================
  function snap(v, lw) {
    const off = (Math.round(lw) % 2) ? 0.5 : 0;
    return Math.round(v) + off;
  }

  function drawRaw() {
    const w = rawCanvas.width;
    const h = rawCanvas.height;

    rawCtx.clearRect(0, 0, w, h);

    // 線（黒）
    rawCtx.strokeStyle = "#000";
    rawCtx.lineCap = "round";
    rawCtx.lineJoin = "round";

    // 格子範囲（design -> raw）
    const rectD = designGridRect || designBounds || { x: 261, y: 226, w: 660, h: 660 };
    const L = designToRaw(rectD.x, rectD.y).x;
    const T = designToRaw(rectD.x, rectD.y).y;
    const R = designToRaw(rectD.x + rectD.w, rectD.y).x;
    const B = designToRaw(rectD.x, rectD.y + rectD.h).y;

    const gw = R - L;
    const gh = B - T;

    const lwBase = Math.max(2, Math.round((gridCfg.lineWidth || 10) * (rawCanvas.width / 1920)));
    const lw = (mode === "ascii") ? Math.round(lwBase * 1.25) : lwBase;
    rawCtx.lineWidth = lw;

    // 縦線
    for (let c = 1; c < gridCfg.cols; c++) {
      let x = L + (gw * c / gridCfg.cols);
      x = snap(x, lw);
      rawCtx.beginPath();
      rawCtx.moveTo(x, T);
      rawCtx.lineTo(x, B);
      rawCtx.stroke();
    }

    // 横線
    for (let r = 1; r < gridCfg.rows; r++) {
      let y = T + (gh * r / gridCfg.rows);
      y = snap(y, lw);
      rawCtx.beginPath();
      rawCtx.moveTo(L, y);
      rawCtx.lineTo(R, y);
      rawCtx.stroke();
    }

    // トークン描画（design -> raw）
    const rD = tokenCfg.size / 2;
    const rRaw = designToRaw(rD, 0).x - designToRaw(0, 0).x; // x方向スケールで半径
    const tokenR = Math.max(2, rRaw);

    for (const t of tokens) {
      const pos = designToRaw(t.xD, t.yD);
      const x = pos.x;
      const y = pos.y;

      if (t.kind === "o") {
        rawCtx.beginPath();
        rawCtx.lineWidth = Math.max(2, Math.round(lw * 0.9));
        rawCtx.arc(x, y, tokenR * 0.72, 0, Math.PI * 2);
        rawCtx.stroke();
      } else {
        const s = tokenR * 0.78;
        rawCtx.beginPath();
        rawCtx.lineWidth = Math.max(2, Math.round(lw * 0.9));
        rawCtx.moveTo(x - s, y - s);
        rawCtx.lineTo(x + s, y + s);
        rawCtx.moveTo(x + s, y - s);
        rawCtx.lineTo(x - s, y + s);
        rawCtx.stroke();
      }
    }
  }

  function drawFx() {
    if (!outCtx || !outCanvas) return;

    const outW = outCanvas.width;
    const outH = outCanvas.height;

    if (tmpCanvas.width !== outW || tmpCanvas.height !== outH) {
      tmpCanvas.width = outW;
      tmpCanvas.height = outH;
    }

    tmpCtx.imageSmoothingEnabled = false;
    tmpCtx.clearRect(0, 0, outW, outH);
    tmpCtx.drawImage(rawCanvas, 0, 0, rawCanvas.width, rawCanvas.height, 0, 0, outW, outH);

    if (mode === "dither") {
      outCtx.clearRect(0, 0, outW, outH);
      applyCoarseDotDither(tmpCtx, outW, outH, 3);
      outCtx.drawImage(tmpCanvas, 0, 0);
      return;
    }

    if (mode === "ascii") {
      const now = performance.now();
      const interval = 1000 / asciiFps;
      if (now - lastAsciiAt < interval) return;
      lastAsciiAt = now;

      renderAsciiInk(tmpCtx, outW, outH, outCtx, outW, outH);
      return;
    }
  }

  function tick() {
    if (!active) return;
    drawRaw();
    drawFx();
    raf = requestAnimationFrame(tick);
  }

  return {
    async start(canvasEl, opts) {
      this.stop();

      outCanvas = canvasEl;
      outCtx = outCanvas.getContext("2d", { willReadFrequently: true, alpha: true });

      mode = (opts && opts.mode) ? opts.mode : "dither";
      if (opts && typeof opts.fxScale === "number") fxScale = opts.fxScale;
      if (opts && typeof opts.asciiFps === "number") asciiFps = opts.asciiFps;

      designBounds = (opts && opts.bounds) ? opts.bounds : null;
      designGridRect = (opts && opts.gridRect) ? opts.gridRect : null;
      gridCfg = (opts && opts.grid) ? opts.grid : gridCfg;
      tokenCfg = (opts && opts.token) ? opts.token : tokenCfg;

      draggingId = -1;
      lastAsciiAt = 0;

      resizeCanvases();
      initTokens();
      bindPointer();

      active = true;
      raf = requestAnimationFrame(tick);
    },

    stop() {
      active = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;

      unbindPointer();

      if (outCtx && outCanvas) {
        outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
      }

      draggingId = -1;
      tokens = [];
      designBounds = null;
      designGridRect = null;

      outCanvas = null;
      outCtx = null;
    },

    beginDragById(tokenId, clientX, clientY) {
      return beginExternalDragById(tokenId, clientX, clientY);
    },

    moveDragFromClient(clientX, clientY) {
      moveExternalDrag(clientX, clientY);
    },

    endDrag() {
      endExternalDrag();
    },

    getTokenRects() {
      return getTokenRects();
    },

    setMode(nextMode) {
      mode = nextMode || "dither";
      lastAsciiAt = 0;
    },

    resize() {
      // ✅ 固定レンダーなので何もしない
    },


    get active() { return active; }
  };
})();


const StringBundleEngine = (function () {
  let active = false;
  let outCanvas = null, outCtx = null;

  const rawCanvas = document.createElement("canvas");
  const rawCtx = rawCanvas.getContext("2d", { willReadFrequently: true });

  const tmpCanvas = document.createElement("canvas");
  const tmpCtx = tmpCanvas.getContext("2d", { willReadFrequently: true });

  let mode = "dither";
  let raf = 0;
  let lastAsciiAt = 0;

  let fxScale = 0.55;
  let asciiFps = 12;

  // book-ill-wrap の白枠（1920x1080基準）
  const CROP_X = 228, CROP_Y = 129, CROP_W = 1453, CROP_H = 854;

  // figma 基準
  let designBounds = null; // {x,y,w,h}
  let boundsRaw = null;    // {l,t,r,b}

  let designRect = null;  // 弦束の領域 {x,y,w,h}
  let rectRaw = null;     // {l,t,r,b}

  let pointerBound = false;
  let pointerX = 0, pointerY = 0;
  let prevPX = 0, prevPY = 0;
  let vX = 0, vY = 0;

  // strands state
  // each: {x, sway, vel, seed}
  let strandN = 10;
  let strands = [];

  function rawToDesign(pxRaw, pyRaw) {
    // rawCanvas（fxScale後の内部） → 白枠ローカル → ページ座標(1920x1080)へ
    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;

    const lx = pxRaw / sx;
    const ly = pyRaw / sy;

    return { xD: lx + CROP_X, yD: ly + CROP_Y };
  }


  function getRenderSize(canvas) {
    const dpr = getFixedDpr();
    const rect = canvas.getBoundingClientRect();
    return {
      w: Math.max(1, Math.round(rect.width * dpr)),
      h: Math.max(1, Math.round(rect.height * dpr)),
      dpr
    };
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function hash01(ix, iy) {
    const s = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123;
    return s - Math.floor(s);
  }

  function canvasPointFromEvent(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;   // CSS→内部px
    const sy = canvas.height / rect.height; // CSS→内部px
    return {
      x: (e.clientX - rect.left) * sx,
      y: (e.clientY - rect.top) * sy
    };
  }


  function resizeCanvases() {
    if (!outCanvas) return;

    const dpr = getFixedDpr();

    // ✅ book-ill-wrap の design サイズで固定
    const BASE_W = 1453;
    const BASE_H = 854;

    const w = Math.round(BASE_W * dpr);
    const h = Math.round(BASE_H * dpr);

    // outCanvas 内部解像度固定
    if (outCanvas.width !== w || outCanvas.height !== h) {
      outCanvas.width = w;
      outCanvas.height = h;
    }

    // rawCanvas も固定（fxScale に応じて）
    const rw = Math.max(1, Math.floor(w * fxScale));
    const rh = Math.max(1, Math.floor(h * fxScale));
    if (rawCanvas.width !== rw || rawCanvas.height !== rh) {
      rawCanvas.width = rw;
      rawCanvas.height = rh;
    }

    if (designBounds) {
      const sx = rw / CROP_W, sy = rh / CROP_H;
      boundsRaw = {
        l: (designBounds.x - CROP_X) * sx,
        t: (designBounds.y - CROP_Y) * sy,
        r: (designBounds.x - CROP_X + designBounds.w) * sx,
        b: (designBounds.y - CROP_Y + designBounds.h) * sy,
      };
    }


    if (designRect) {
      const sx = rw / CROP_W, sy = rh / CROP_H;
      rectRaw = {
        l: (designRect.x - CROP_X) * sx,
        t: (designRect.y - CROP_Y) * sy,
        r: (designRect.x - CROP_X + designRect.w) * sx,
        b: (designRect.y - CROP_Y + designRect.h) * sy,
      };
    }


    // 本数再配置
    initStrands();
  }

  function initStrands() {
    strands = [];
    if (!rectRaw) return;

    const L = rectRaw.l, R = rectRaw.r;
    for (let i = 0; i < strandN; i++) {
      const u = (i + 0.5) / strandN;
      const x = L + (R - L) * u;
      const seed = hash01(i + 10, 99);
      strands.push({
        x,
        sway: 0,
        vel: 0,
        seed
      });
    }
  }

  function bindPointer() {
  if (!outCanvas || pointerBound) return;
  pointerBound = true;

  outCanvas.style.touchAction = "none";
  outCanvas.style.pointerEvents = "auto";

  function updatePointer(e) {
    if (!active || !outCanvas) return;

    const p = canvasPointFromEvent(e, outCanvas);
    const x = p.x * fxScale;
    const y = p.y * fxScale;

    prevPX = pointerX;
    prevPY = pointerY;
    pointerX = x;
    pointerY = y;

    vX = (pointerX - prevPX);
    vY = (pointerY - prevPY);
  }

  function onDown(e) {
    if (!active) return;
    updatePointer(e);

    try { outCanvas.setPointerCapture(e.pointerId); } catch (_) {}
  }

  function onMove(e) {
    if (!active) return;
    updatePointer(e);
  }

  function onUp(e) {
    try { outCanvas.releasePointerCapture(e.pointerId); } catch (_) {}
  }

  outCanvas.addEventListener("pointerdown", onDown, { passive: true });
  outCanvas.addEventListener("pointermove", onMove, { passive: true });
  outCanvas.addEventListener("pointerup", onUp, { passive: true });
  outCanvas.addEventListener("pointercancel", onUp, { passive: true });

  bindPointer._onDown = onDown;
  bindPointer._onMove = onMove;
  bindPointer._onUp = onUp;
}

function unbindPointer() {
  if (!outCanvas || !pointerBound) return;

  if (bindPointer._onDown) {
    outCanvas.removeEventListener("pointerdown", bindPointer._onDown);
  }
  if (bindPointer._onMove) {
    outCanvas.removeEventListener("pointermove", bindPointer._onMove);
  }
  if (bindPointer._onUp) {
    outCanvas.removeEventListener("pointerup", bindPointer._onUp);
    outCanvas.removeEventListener("pointercancel", bindPointer._onUp);
  }

  bindPointer._onDown = null;
  bindPointer._onMove = null;
  bindPointer._onUp = null;
  pointerBound = false;
}

  function stampDot(data, w, h, x, y, size) {
    const r = Math.floor(size / 2);
    for (let yy = -r; yy <= r; yy++) {
      for (let xx = -r; xx <= r; xx++) {
        const nx = x + xx, ny = y + yy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = (ny * w + nx) * 4;
        data[j] = data[j + 1] = data[j + 2] = 0;
        data[j + 3] = 255;
      }
    }
  }

  function applyCoarseDotDither(ctxSrc, w, h, scale = 3) {
    const im = ctxSrc.getImageData(0, 0, w, h);
    const d = im.data;

    const DOT = 3; // ✅ 2〜3推奨（太くするほど欠けにくい）

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 10) continue;

        const r = d[i], g = d[i + 1], b = d[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

        const bx = Math.floor(x / scale);
        const by = Math.floor(y / scale);

        // ✅ “中心”に打つ（見た目が安定しやすい）
        const px = bx * scale + Math.floor(scale / 2);
        const py = by * scale + Math.floor(scale / 2);
        const isDot = (x === px && y === py);

        const ink = (lum < 0.6);
        if (ink && isDot) {
          stampDot(d, w, h, x, y, DOT);
        } else {
          // 透明化
          d[i + 3] = 0;
        }
      }
    }

    ctxSrc.putImageData(im, 0, 0);
  }


  // ---- ascii: 濃淡なし（黒判定だけ）でランダム文字（細め設定）
  function renderAsciiInk(ctxSrc, w, h, ctxOut, outW, outH) {
    const cell = 9; // 例：大きめ文字にしたいなら14〜20くらい
    const cols = Math.max(1, Math.floor(outW / cell));
    const rows = Math.max(1, Math.floor(outH / cell));

    const tiny = document.createElement("canvas");
    tiny.width = cols; tiny.height = rows;
    const tctx = tiny.getContext("2d", { willReadFrequently: true });

    tctx.imageSmoothingEnabled = true;
    tctx.clearRect(0, 0, cols, rows);
    tctx.drawImage(ctxSrc.canvas, 0, 0, w, h, 0, 0, cols, rows);

    tctx.filter = "blur(0.7px)";
    tctx.drawImage(tiny, 0, 0);
    tctx.filter = "none";

    const im = tctx.getImageData(0, 0, cols, rows).data;

    const CHARSET = "⋅:;~+=*x○";
    const inkThreshold = 0.01;

    ctxOut.clearRect(0, 0, outW, outH);
    ctxOut.fillStyle = "#000";
    ctxOut.textAlign = "center";
    ctxOut.textBaseline = "middle";

    const fontSize = Math.floor(cell * 1.05);
    ctxOut.font = `520 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const a = im[i + 3];
        if (a < 10) continue;

        const r = im[i], g = im[i + 1], b = im[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const ink = 1 - lum;
        if (ink < inkThreshold) continue;

        const rr = hash01(x + 19, y + 73);
        const ch = CHARSET[Math.floor(rr * CHARSET.length)];

        const cx = (x + 0.5) * cell;
        const cy = (y + 0.52) * cell;
        ctxOut.fillText(ch, cx, cy);
      }
    }
  }

  function stepPhysics() {
    if (!rectRaw) return;

    // “触った場所”に近い弦ほど揺れる
    const L = rectRaw.l, R = rectRaw.r, T = rectRaw.t, B = rectRaw.b;

    // 領域外なら力を弱める（髪の束から離れたら自然に戻る）
    const inside = (pointerX >= L && pointerX <= R && pointerY >= T && pointerY <= B);
    const force = inside ? 1.0 : 0.25;

    // 髪っぽさ：横方向のなびきがメイン、縦速度も少し混ぜる
    let dir = (vX * 1.0 + vY * 0.08) * force;

    // 非線形ブースト：遅いほど増え、速いほど増えにくい
    const boost = 10.0;        // 3〜10
    const ref = 12.0;          // “遅い/速い”の境目（3〜12）
    dir = Math.sign(dir) * Math.pow(Math.abs(dir) / ref, 0.6) * ref * (boost / 6.0);

    for (let i = 0; i < strands.length; i++) {
      const s = strands[i];

      // 距離に応じて影響（近いほど大きい）
      const dx = pointerX - s.x;
      const dist = Math.abs(dx);
      const falloff = Math.exp(-dist / 200); // 120は好みで

      const target = clamp(dir * 1.8 * falloff, -80, 80);

      // ばね（swayが target に追従）
      const k = 0.003 + s.seed * 0.01;    // ばね強さ
      const damp = 0.9 + s.seed * 0.01; // 減衰

      s.vel = (s.vel + (target - s.sway) * k) * damp;
      s.sway += s.vel;

      // 少しだけ戻す（触ってない時でも戻る）
      s.sway *= 0.9999;
    }

    // 速度は毎フレーム減衰（さらさらの余韻）
    vX *= 0.8;
    vY *= 0.8;
  }

  function drawRaw() {
    if (!rectRaw) return;

    stepPhysics();

    const w = rawCanvas.width, h = rawCanvas.height;
    rawCtx.clearRect(0, 0, w, h);

    // 線（黒）
    rawCtx.strokeStyle = "#000";
    rawCtx.lineCap = "round";
    rawCtx.lineJoin = "round";

    // 線幅（ditherでも均一に見えるように少し太めに固定）
    const baseLW = Math.max(2, Math.round(3.0 * (rawCanvas.width / 1920)));
    rawCtx.lineWidth = (mode === "ascii") ? Math.round(baseLW * 1.75) : baseLW;

    const L = rectRaw.l, R = rectRaw.r, T = rectRaw.t, B = rectRaw.b;
    const midY = (T + B) * 0.5;
    const len = (B - T);

    for (let i = 0; i < strands.length; i++) {
      const s = strands[i];

      // “髪”っぽく：真ん中が一番動いて、端は固定
      // ベジェで曲げる
      const x0 = s.x;
      const y0 = T;
      const x3 = s.x;
      const y3 = B;

      const sway = s.sway;

      // 中心付近が膨らむように制御点をずらす
      const x1 = x0 + sway * 0.85;
      const y1 = T + len * 0.33;

      const x2 = x0 + sway * 1.10;
      const y2 = T + len * 0.66;

      rawCtx.beginPath();
      rawCtx.moveTo(x0, y0);
      rawCtx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
      rawCtx.stroke();
    }
  }

  function drawFx() {
    if (!outCtx || !outCanvas) return;

    const outW = outCanvas.width;
    const outH = outCanvas.height;

    if (tmpCanvas.width !== outW || tmpCanvas.height !== outH) {
      tmpCanvas.width = outW;
      tmpCanvas.height = outH;
    }

    tmpCtx.imageSmoothingEnabled = false;
    tmpCtx.clearRect(0, 0, outW, outH);
    tmpCtx.drawImage(rawCanvas, 0, 0, rawCanvas.width, rawCanvas.height, 0, 0, outW, outH);

    if (mode === "dither") {
      outCtx.clearRect(0, 0, outW, outH);
      applyCoarseDotDither(tmpCtx, outW, outH, 3);
      outCtx.drawImage(tmpCanvas, 0, 0);
      return;
    }

    if (mode === "ascii") {
      const now = performance.now();
      const interval = 1000 / asciiFps;
      if (now - lastAsciiAt < interval) return;
      lastAsciiAt = now;

      renderAsciiInk(tmpCtx, outW, outH, outCtx, outW, outH);
      return;
    }
  }

  function tick() {
    if (!active) return;
    drawRaw();
    drawFx();
    raf = requestAnimationFrame(tick);
  }

  return {
    async start(canvasEl, opts) {
      this.stop();

      outCanvas = canvasEl;
      outCtx = outCanvas.getContext("2d", { willReadFrequently: true, alpha: true });

      mode = (opts && opts.mode) ? opts.mode : "dither";
      if (opts && typeof opts.fxScale === "number") fxScale = opts.fxScale;
      if (opts && typeof opts.asciiFps === "number") asciiFps = opts.asciiFps;

      designBounds = (opts && opts.bounds) ? opts.bounds : null;
      designRect = (opts && opts.rect) ? opts.rect : null;
      strandN = (opts && typeof opts.strands === "number") ? opts.strands : 10;

      lastAsciiAt = 0;

      resizeCanvases();
      bindPointer();

      // 初期ポインタ
      pointerX = prevPX = rawCanvas.width * 0.5;
      pointerY = prevPY = rawCanvas.height * 0.5;
      vX = vY = 0;

      active = true;
      raf = requestAnimationFrame(tick);
    },

    stop() {
      active = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;

      unbindPointer();

      if (outCtx && outCanvas) {
        outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
      }

      outCanvas = null;
      outCtx = null;
      designBounds = null;
      boundsRaw = null;
      designRect = null;
      rectRaw = null;
      strands = [];
    },

    setMode(nextMode) {
      mode = nextMode;
      lastAsciiAt = 0;
    },

    resize() {
      resizeCanvases();
    },

    get active() { return active; }
  };
})();

const BoxSpidersEngine = (function () {
  let active = false;
  let outCanvas = null, outCtx = null;
  let notifyOpened = null;

  const rawCanvas = document.createElement("canvas");
  const rawCtx = rawCanvas.getContext("2d", { willReadFrequently: true });

  const tmpCanvas = document.createElement("canvas");
  const tmpCtx = tmpCanvas.getContext("2d", { willReadFrequently: true });

  let mode = "dither";
  let raf = 0;
  let lastAsciiAt = 0;
  let fxScale = 0.55;
  let asciiFps = 12;

  let boxState = "closed";   // "closed" | "opening" | "open"
  let openedOnce = false;
  let designBounds = null;


  // 1920x1080基準→白枠へ変換で使う
  const CROP_X = 228, CROP_Y = 129, CROP_W = 1453, CROP_H = 854;

  // opts
  let boxRectD = null; // ← これを使う（固定の箱土台）


  // 状態
  let isOpen = false;     // 最終的に開いてるか
  let openT = 0;          // 0..1（0=閉, 1=開）
  let openVel = 0;        // 速度（必要なら）
  const OPEN_SPEED = 6.5; // 速さ（好みで調整）

  // 蜘蛛
  const spiders = [];
  const N = 4;

  // pointer
  let pointerInside = false;
  let pointerLastAt = 0; // 最後にcanvas上で動いた時刻(ms)
  let simTime = 0;       // ふらふら用の時間
  let pointerBound = false;
  let pointerX = 0, pointerY = 0;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dist(x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy) || 1; }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(t) { return Math.max(0, Math.min(1, t)); }
  function easeOutCubic(t) { t = clamp01(t); return 1 - Math.pow(1 - t, 3); }

  // ✅ openT(0..1) から「左右」と「前後」の進行度を作る
  // 左右: 先に進む（0..1）
  // 前後: openTが 0.28 を超えたら追いかけて始まる（同時進行）
  function getLidTs(openT) {
    const sideT = easeOutCubic(openT / 0.65);          // 早めに開く
    const fbT = easeOutCubic((openT - 0.28) / 0.72); // 少し遅れて開始（重なる）
    return { sideT, fbT };
  }

  function canvasPointFromEvent(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  function designToRaw(xD, yD) {
    const lx = xD - CROP_X, ly = yD - CROP_Y;
    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;
    return { x: lx * sx, y: ly * sy };
  }

  function rawToDesign(xR, yR) {
    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;
    return { xD: xR / sx + CROP_X, yD: yR / sy + CROP_Y };
  }

  function resizeCanvases() {
    if (!outCanvas) return;
    const dpr = getFixedDpr();

    // 出力は固定（あなたの他のエンジンと同じ）
    const BASE_W = 1453, BASE_H = 854;
    const w = Math.round(BASE_W * dpr), h = Math.round(BASE_H * dpr);
    outCanvas.width = w; outCanvas.height = h;

    const rw = Math.max(1, Math.floor(w * fxScale));
    const rh = Math.max(1, Math.floor(h * fxScale));
    rawCanvas.width = rw; rawCanvas.height = rh;
  }

  function hitBoxClosed(pxRaw, pyRaw) {
    if (!boxRectD) return false;
    const d = rawToDesign(pxRaw, pyRaw);
    const b = boxRectD;
    return d.xD >= b.x && d.xD <= b.x + b.w && d.yD >= b.y && d.yD <= b.y + b.h;
  }

  function initSpiders() {
  spiders.length = 0;

  // ✅ A/B を糸の根元にする（design/page座標）
  const A0 = BOX_POINTS.closed.A;
  const B0 = BOX_POINTS.closed.B;

  // 角そのままだと線が“縁に刺さってる”感が強いので少しだけ下げる（好みで 0〜12px）
  const rootYOffset = 6;

  const leftRoot  = { x: A0.x, y: A0.y + rootYOffset };
  const rightRoot = { x: B0.x, y: B0.y + rootYOffset };

  for (let i = 0; i < N; i++) {
    const isLeft = i < Math.ceil(N / 2);
    const root = isLeft ? leftRoot : rightRoot;

    // 2匹ずつ、根元から少しずらして“糸が束になりすぎない”ようにする
    const spread = (isLeft ? i : i - Math.ceil(N / 2)) - 0.5; // -0.5, +0.5
    const ax = root.x + spread * 18;
    const ay = root.y + spread * 6;

    // ===== 飛び出し先（中央寄せ・近め・等間隔ジグザグ）=====
    const centerX = (A0.x + B0.x) / 2;        // ABの真ん中（page座標）
    const baseY   = A0.y - 165;               // 近さ（数値小さいほど箱に近い）
    // ↑ ここは好みで -140〜-220 くらいで調整OK

    const spacingX = 85;                      // 横の間隔（等間隔）
    const zigY     = 36;                      // ジグザグの上下差

    // i=0..N-1 を -1.5, -0.5, 0.5, 1.5 みたいに中央対称にする
    const k = i - (N - 1) / 2;

    // ほんの少しだけ“扇”っぽくしたいなら、下の curveX を 0.12 くらいに
    const curveX = 0.00;

    // x: 等間隔に左右へ
    const outX = centerX + k * spacingX + k * k * curveX * (k < 0 ? -1 : 1);

    // y: ジグザグ（交互に上下）
    const outY = baseY + ((i % 2) ? zigY : -zigY);

    spiders.push({
      // 初期位置（箱の中に隠しておくならここは ax/ay でOK）
      xD: ax,
      yD: ay,

      // 開いたあとに向かう先
      outX,
      outY,

      // 糸の根元
      axD: ax,
      ayD: ay,

      maxLen: 520,
      phase: Math.random() * Math.PI * 2,

      tAB: (i + 0.5) / N, // 0..1

      idleSeed1: Math.random() * Math.PI * 2,
      idleSeed2: Math.random() * Math.PI * 2,

      // idleで漂う“縄張り中心”（各個体でズラす）
      homeX: outX,   // まずは飛び出し先をベースにするのが自然
      homeY: outY,

    });
  }
}


  function openBox() {
    if (boxState !== "closed") return;
    boxState = "opening";
    openT = 0;
    isOpen = true;

    // 飛び出し開始: 蜘蛛を箱の中からスタートさせる
    for (const s of spiders) {
      s.xD = s.axD;
      s.yD = s.ayD;
    }
  }

  function step(dt) {
  if (boxState === "closed") {
    openT = 0;
    return;
  }

  if (boxState === "opening") {
    openT = clamp(openT + dt * 1.2, 0, 1); // ←これで確実に進む

    const t = openT;
    const c1 = 1.70158, c3 = c1 + 1;
    const ease = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);

    for (const s of spiders) {
      s.xD = s.axD + (s.outX - s.axD) * ease;
      s.yD = s.ayD + (s.outY - s.ayD) * ease;
    }

    if (openT >= 0.999) {
      openT = 1;
      boxState = "open";
      openedOnce = true;
      if (notifyOpened) notifyOpened();
    }
    return;
  }

  // open
openT = 1;

simTime += dt;

// 「最近canvas上で動いてたら追従」判定（leaveが取れない環境でも自然に切れる）
const now = performance.now();
// キャンバス上なら追従し続ける。leaveが取れない時だけタイムアウトで切る保険。
const hasPointer = pointerInside || (now - pointerLastAt) < 1500;


const pd = rawToDesign(pointerX, pointerY);

for (const s of spiders) {
  let tx, ty;

  if (hasPointer) {
    // ===== 追従（今まで通り）=====
    tx = pd.xD;
    ty = pd.yD;
  } else {
  // ===== ふらふら（idle wander）=====
  const rX = 220;   // 横の漂い幅（広げる）
  const rY = 140;   // 縦の漂い幅（広げる）

  // 「homeX/homeY」を中心に漂う（なければ outX/outY を使う）
  const baseX = (s.homeX ?? s.outX ?? s.axD);
  const baseY = (s.homeY ?? s.outY ?? (s.ayD - 210));

  // 超ゆっくりの波（蜘蛛ごとにseedでズレる）
  const w1 = 0.25, w2 = 0.17;
  const nx = Math.cos(simTime * w1 + s.idleSeed1) * rX
           + Math.cos(simTime * (w1 * 2.1) + s.idleSeed2) * (rX * 0.35);

  const ny = Math.sin(simTime * w2 + s.idleSeed2) * rY
           + Math.sin(simTime * (w2 * 2.4) + s.idleSeed1) * (rY * 0.35);

  // まず“目標”を作る
  tx = baseX + nx;
  ty = baseY + ny;

  // ===== 近づきすぎたら反発（ばらける）=====
  const SEP = 160;        // 最低距離（大きいほどバラける）
  const PUSH = 0.7;      // 反発の強さ（強すぎるとガクガク）
  let rx = 0, ry = 0;

  for (const o of spiders) {
    if (o === s) continue;
    const dx = s.xD - o.xD;
    const dy = s.yD - o.yD;
    const d2 = dx*dx + dy*dy;
    if (d2 < 0.0001) continue;

    const d = Math.sqrt(d2);
    if (d < SEP) {
      const k = (SEP - d) / SEP;      // 近いほど強い
      rx += (dx / d) * k;
      ry += (dy / d) * k;
    }
  }

  tx += rx * SEP * PUSH;
  ty += ry * SEP * PUSH;
}

  // 近づき速度（追従は遅く、idleはもっと遅くでもOK）
  const speedFollow = 0.0006; // 追従のゆっくりさ
  const speedIdle   = 0.0008; // idleのゆっくりさ
  const speed = hasPointer ? speedFollow : speedIdle;

  s.xD += (tx - s.xD) * speed;
  s.yD += (ty - s.yD) * speed;

  // 糸制限
  const d = dist(s.axD, s.ayD, s.xD, s.yD);
  if (d > s.maxLen) {
    const k = s.maxLen / d;
    s.xD = s.axD + (s.xD - s.axD) * k;
    s.yD = s.ayD + (s.yD - s.ayD) * k;
  }

  s.phase += 0.05;
}

}


  function drawPoly(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.stroke();
  }

  function drawLine(ctx, a, b) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  function drawBox3D(ctx, bD, state, sideT, fbT) {
    // bD: design座標 {x,y,w,h}
    // 立体感パラメータ（好みで微調整）
    const lidH = bD.h * 0.32;          // 上面の高さ
    const depth = bD.w * 0.22;         // 奥行きっぽいズレ
    const bodyTopY = bD.y + lidH;

    // 天面（閉じている形）の4点（design）
    const A = { x: bD.x, y: bodyTopY };          // 前左（ヒンジ：前フタ基準）
    const B = { x: bD.x + bD.w, y: bodyTopY };          // 前右
    const D = { x: bD.x + depth * 0.55, y: bD.y }; // 奥左
    const C = { x: bD.x + bD.w - depth * 0.55, y: bD.y }; // 奥右

    // design -> raw
    const Ar = designToRaw(A.x, A.y);
    const Br = designToRaw(B.x, B.y);
    const Cr = designToRaw(C.x, C.y);
    const Dr = designToRaw(D.x, D.y);

    // 前面（箱本体）四角（design）
    const F1 = { x: bD.x, y: bodyTopY };
    const F2 = { x: bD.x + bD.w, y: bodyTopY };
    const F3 = { x: bD.x + bD.w, y: bD.y + bD.h };
    const F4 = { x: bD.x, y: bD.y + bD.h };

    const F1r = designToRaw(F1.x, F1.y);
    const F2r = designToRaw(F2.x, F2.y);
    const F3r = designToRaw(F3.x, F3.y);
    const F4r = designToRaw(F4.x, F4.y);

    // 線設定
    ctx.strokeStyle = "#000";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(2, Math.round(3 * (rawCanvas.width / 1920)));

    // ① 本体（前面）
    drawPoly(ctx, [F1r, F2r, F3r, F4r]);

    // ② 天面の輪郭（閉じ形の“台形”）
    drawPoly(ctx, [Dr, Cr, Br, Ar]);

    // ③ 天面の中央の縦線（閉じ時の折り目）
    // 奥の中央→前の中央
    const midBack = { x: (D.x + C.x) / 2, y: (D.y + C.y) / 2 };
    const midFront = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    const midBackR = designToRaw(midBack.x, midBack.y);
    const midFrontR = designToRaw(midFront.x, midFront.y);

    // ④ フタ（opening/open のときだけ “開く” 形を描く）
    if (state === "closed") return;

    // 左右フタ（ヒンジ：D-A と C-B）
    // 外側へ開く量
    const sideOut = bD.w * 0.50 * sideT;
    const sideDown = lidH * 0.10 * sideT;

    // 左フタ: hinge( D->A ) の外側を左へ
    const L1 = { x: D.x - sideOut, y: D.y + sideDown };
    const L2 = { x: A.x - sideOut, y: A.y + sideDown };
    drawPoly(ctx, [
      designToRaw(D.x, D.y),
      designToRaw(A.x, A.y),
      designToRaw(L2.x, L2.y),
      designToRaw(L1.x, L1.y),
    ]);

    // 右フタ: hinge( C->B ) の外側を右へ
    const R1 = { x: C.x + sideOut, y: C.y + sideDown };
    const R2 = { x: B.x + sideOut, y: B.y + sideDown };
    drawPoly(ctx, [
      designToRaw(C.x, C.y),
      designToRaw(B.x, B.y),
      designToRaw(R2.x, R2.y),
      designToRaw(R1.x, R1.y),
    ]);

    // 前後フタ（fbT は sideT より遅れて始まる）
    const frontDrop = lidH * 1.35 * fbT;  // 前へ“落ちる”
    const backRise = lidH * 1.10 * fbT;  // 後ろへ“上がる”（奥側なので上に逃がす）

    // 前フタ: hinge(A-B) から下へ
    const FA = { x: A.x, y: A.y + frontDrop };
    const FB = { x: B.x, y: B.y + frontDrop };
    drawPoly(ctx, [
      designToRaw(A.x, A.y),
      designToRaw(B.x, B.y),
      designToRaw(FB.x, FB.y),
      designToRaw(FA.x, FA.y),
    ]);

    // 後フタ: hinge(D-C) から上へ
    const BD1 = { x: D.x, y: D.y - backRise };
    const BC1 = { x: C.x, y: C.y - backRise };
    drawPoly(ctx, [
      designToRaw(D.x, D.y),
      designToRaw(C.x, C.y),
      designToRaw(BC1.x, BC1.y),
      designToRaw(BD1.x, BD1.y),
    ]);
  }

  // tがある程度進んだら前後も開く（左右→前後を同時寄りに）
  function staged(t) {
    const a = easeOutCubic(t);
    const side = a;                       // 左右は最初から
    const frontBack = easeOutCubic((t - 0.25) / 0.75); // 0.25以降で前後が追いかけ開始
    return { side: clamp01(side), fb: clamp01(frontBack) };
  }

  function poly(ctx, pts, fill = false) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    if (fill) ctx.fill();
    ctx.stroke();
  }

  // =====================
// 箱座標データ
// =====================
const BOX_POINTS = {
  closed: {
    A: {x:403, y:677},
    B: {x:785, y:677},
    C: {x:403, y:898},
    D: {x:785, y:898},
    E: {x:499, y:597},
    F: {x:689, y:597},
    G: {x:594, y:594},
    H: {x:594, y:682},
  },
  open: {
    G1:{x:403, y:543},
    H1:{x:254, y:605},
    G2:{x:755, y:546},
    H2:{x:931, y:608},
  }
};

const ILL_BOUNDS = { x:228, y:129, w:1453, h:854 };

function pageToIll(x, y){
  return {
    x: (x - ILL_BOUNDS.x) * (rawCanvas.width  / ILL_BOUNDS.w),
    y: (y - ILL_BOUNDS.y) * (rawCanvas.height / ILL_BOUNDS.h),
  };
}

function lerp(a,b,t){ return a + (b-a)*t; }

// tでclosed→openへ補間する点
function mixPoint(nameClosed, nameOpen, t){
  const c = BOX_POINTS.closed[nameClosed];
  const o = BOX_POINTS.open[nameOpen];
  return pageToIll(lerp(c.x,o.x,t), lerp(c.y,o.y,t));
}

function quadBezier(p0, p1, p2, t){
  const u = 1 - t;
  return {
    x: u*u*p0.x + 2*u*t*p1.x + t*t*p2.x,
    y: u*u*p0.y + 2*u*t*p1.y + t*t*p2.y
  };
}

// closed(nameClosed) → open(nameOpen) へ「弧」で移動
// bend は弧のふくらみ量（px）。+で上にふくらむ（画面座標はyが下に増えるので注意）
function mixPointArc(nameClosed, nameOpen, t, bendX = 0, bendY = -120){
  const c = BOX_POINTS.closed[nameClosed];
  const o = BOX_POINTS.open[nameOpen];

  // 制御点 = 中点 + オフセット（ここが弧のふくらみ）
  const mid = { x: (c.x + o.x) / 2, y: (c.y + o.y) / 2 };
  const ctrl = { x: mid.x + bendX, y: mid.y + bendY };

  const p = quadBezier(c, ctrl, o, t);
  return pageToIll(p.x, p.y);
}

function P(name, state){
  const p = BOX_POINTS[state][name];
  return pageToIll(p.x, p.y);
}

function strokePath(ctx, pts){
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

function drawRaw(){
  rawCtx.clearRect(0,0,rawCanvas.width, rawCanvas.height);

  rawCtx.lineWidth = 3;
  rawCtx.lineJoin = "round";
  rawCtx.lineCap  = "round";
  rawCtx.strokeStyle = "#000";

  const A = P("A","closed");
  const B = P("B","closed");
  const C = P("C","closed");
  const D = P("D","closed");

  const E = P("E","closed");
  const F = P("F","closed");

  // 本体（固定）
  strokePath(rawCtx, [A,B,D,C,A]);

  // 上の線（固定）
  strokePath(rawCtx, [A,E,F,B]);

  // フタ：closedの(G,H) ↔ openの(G1,H1)/(G2,H2) を補間
  // まず中心のヒンジっぽい点
  const G = P("G","closed");
  const H = P("H","closed");

  const t = easeOutCubic(openT); // 体感が良くなるのでおすすめ（既にあるならそれ使ってOK）

  // 左フタ：左方向に少しふくらませつつ、上に弧
  const G1 = mixPointArc("G","G1", t, -80, -160);
  const H1 = mixPointArc("H","H1", t, -120, -140);

  // 右フタ：右方向にふくらませつつ、上に弧
  const G2 = mixPointArc("G","G2", t, +80, -160);
  const H2 = mixPointArc("H","H2", t, +120, -140);


  // 左フタ（閉: A-E-G… / 開: A-E-G1-H1-A）
  strokePath(rawCtx, [A,E,G1,H1,A]);

  // 右フタ
  strokePath(rawCtx, [B,F,G2,H2,B]);

    // ===== 蜘蛛（糸＋本体＋足）=====
// opening/open の両方で描く（ただし最初は薄く）
if (boxState === "opening" || boxState === "open") {

  // 「出始め」をここで調整（0..1）
  const SHOW_START = 0.06;   // もっと早く→0.03、遅く→0.12
  const SHOW_RAMP  = 0.28;   // ふわっと出る時間（大きいほどゆっくり）

  // 0..1 に正規化
  const a = Math.max(0, Math.min(1, (openT - SHOW_START) / SHOW_RAMP));

  // ふわっと（透明度 + サイズ）
  rawCtx.globalAlpha = a;

  const scale = 0.65 + 0.35 * a; // 0.65→1.0

  rawCtx.lineWidth = Math.max(3, Math.round(4 * (rawCanvas.width / 1920)));

  for (const s of spiders) {
    const pos = designToRaw(s.xD, s.yD);
    const tAB = s.tAB ?? 0.5; // 念のため
    const ax = {
      x: A.x + (B.x - A.x) * tAB,
      y: A.y + (B.y - A.y) * tAB,
    };

    // 糸
    rawCtx.beginPath();
    rawCtx.moveTo(ax.x, ax.y);
    rawCtx.lineTo(pos.x, pos.y);
    rawCtx.stroke();

    // 本体（スケール適用）
    const bodyW = Math.max(18, Math.round(70 * (rawCanvas.width / 1920))) * scale;
    const bodyH = Math.max(14, Math.round(46 * (rawCanvas.width / 1920))) * scale;
    rawCtx.fillRect(pos.x - bodyW / 2, pos.y - bodyH / 2, bodyW, bodyH);

    // 足（スケール適用）
    rawCtx.strokeStyle = "#000";
    rawCtx.lineWidth = Math.max(3, Math.round(4 * (rawCanvas.width / 1920)));

    for (let i = 0; i < 4; i++) {
      const oy = (i - 1.5) * (bodyH * 0.35);
      const wig = Math.sin(s.phase + i) * (bodyW * 0.12);

      rawCtx.beginPath();
      rawCtx.moveTo(pos.x - bodyW / 2, pos.y + oy);
      rawCtx.lineTo(pos.x - bodyW / 2 - bodyW * 0.55, pos.y + oy + wig);
      rawCtx.stroke();

      rawCtx.beginPath();
      rawCtx.moveTo(pos.x + bodyW / 2, pos.y + oy);
      rawCtx.lineTo(pos.x + bodyW / 2 + bodyW * 0.55, pos.y + oy - wig);
      rawCtx.stroke();
    }
  }

  rawCtx.globalAlpha = 1;
}

}

  // ここはあなたの dither/ascii の仕組みを流用（他エンジンと同じ）
  function stampDot(data, w, h, x, y, size) {
    const r = Math.floor(size / 2);
    for (let yy = -r; yy <= r; yy++) {
      for (let xx = -r; xx <= r; xx++) {
        const nx = x + xx, ny = y + yy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = (ny * w + nx) * 4;
        data[j] = data[j + 1] = data[j + 2] = 0;
        data[j + 3] = 255;
      }
    }
  }
  function applyCoarseDotDither(ctxSrc, w, h, scale = 3) {
    const im = ctxSrc.getImageData(0, 0, w, h);
    const d = im.data;
    const DOT = 3;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 10) continue;
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const bx = Math.floor(x / scale), by = Math.floor(y / scale);
        const px = bx * scale + Math.floor(scale / 2);
        const py = by * scale + Math.floor(scale / 2);
        const isDot = (x === px && y === py);
        const ink = (lum < 0.6);
        if (ink && isDot) stampDot(d, w, h, x, y, DOT);
        else d[i + 3] = 0;
      }
    }
    ctxSrc.putImageData(im, 0, 0);
  }
  function hash01(ix, iy) {
    const s = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123;
    return s - Math.floor(s);
  }
  function renderAsciiInk(ctxSrc, w, h, ctxOut, outW, outH) {
    const cell = 10;
    const cols = Math.max(1, Math.floor(outW / cell));
    const rows = Math.max(1, Math.floor(outH / cell));

    const tiny = document.createElement("canvas");
    tiny.width = cols; tiny.height = rows;
    const tctx = tiny.getContext("2d", { willReadFrequently: true });
    tctx.imageSmoothingEnabled = true;
    tctx.clearRect(0, 0, cols, rows);
    tctx.drawImage(ctxSrc.canvas, 0, 0, w, h, 0, 0, cols, rows);

    const im = tctx.getImageData(0, 0, cols, rows).data;
    const CHARSET = "x+*.:;-=~o";
    const inkThreshold = 0.03;

    ctxOut.clearRect(0, 0, outW, outH);
    ctxOut.fillStyle = "#000";
    ctxOut.textAlign = "center";
    ctxOut.textBaseline = "middle";
    const fontSize = Math.floor(cell * 1.05);
    ctxOut.font = `550 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        if (im[i + 3] < 10) continue;
        const r = im[i], g = im[i + 1], b = im[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const ink = 1 - lum;
        if (ink < inkThreshold) continue;
        const rr = hash01(x + 19, y + 73);
        const ch = CHARSET[Math.floor(rr * CHARSET.length)];
        const cx = (x + 0.5) * cell;
        const cy = (y + 0.52) * cell;
        ctxOut.fillText(ch, cx, cy);
      }
    }
  }

  function drawFx() {
    const outW = outCanvas.width, outH = outCanvas.height;
    if (tmpCanvas.width !== outW || tmpCanvas.height !== outH) {
      tmpCanvas.width = outW; tmpCanvas.height = outH;
    }
    tmpCtx.imageSmoothingEnabled = false;
    tmpCtx.clearRect(0, 0, outW, outH);
    tmpCtx.drawImage(rawCanvas, 0, 0, rawCanvas.width, rawCanvas.height, 0, 0, outW, outH);

    if (mode === "dither") {
      outCtx.clearRect(0, 0, outW, outH);
      applyCoarseDotDither(tmpCtx, outW, outH, 3);
      outCtx.drawImage(tmpCanvas, 0, 0);
      return;
    }
    if (mode === "ascii") {
      const now = performance.now();
      const interval = 1000 / asciiFps;
      if (now - lastAsciiAt < interval) return;
      lastAsciiAt = now;
      renderAsciiInk(tmpCtx, outW, outH, outCtx, outW, outH);
      return;
    }
  }

  function bindPointer() {
  if (pointerBound) return;
  pointerBound = true;

  function onMove(e) {
    if (!active || !outCanvas) return;
    pointerInside = true;
    pointerLastAt = performance.now();
    const p = canvasPointFromEvent(e, outCanvas);
    pointerX = p.x * fxScale;
    pointerY = p.y * fxScale;
  }

  function onDown(e) {
    if (!active || !outCanvas) return;
    if (openedOnce) return;

    const p = canvasPointFromEvent(e, outCanvas);
    const px = p.x * fxScale, py = p.y * fxScale;

    if (hitBoxClosed(px, py)) openBox();
  }

  function onEnter() {
    pointerInside = true;
    pointerLastAt = performance.now();
  }

  function onLeave() {
    pointerInside = false;
  }

  outCanvas.addEventListener("pointerenter", onEnter);
  outCanvas.addEventListener("pointerleave", onLeave);

  bindPointer._onEnter = onEnter;
  bindPointer._onLeave = onLeave;

  // ✅ ここに追加！！（move/down の登録）
  outCanvas.addEventListener("pointermove", onMove, { passive: true });
  outCanvas.addEventListener("pointerdown", onDown);

  bindPointer._onMove = onMove;
  bindPointer._onDown = onDown;
}

  function unbindPointer() {
  if (!outCanvas) return;

  if (bindPointer._onEnter) outCanvas.removeEventListener("pointerenter", bindPointer._onEnter);
  if (bindPointer._onLeave) outCanvas.removeEventListener("pointerleave", bindPointer._onLeave);
  if (bindPointer._onMove)  outCanvas.removeEventListener("pointermove", bindPointer._onMove);
  if (bindPointer._onDown)  outCanvas.removeEventListener("pointerdown", bindPointer._onDown);

  bindPointer._onEnter = null;
  bindPointer._onLeave = null;
  bindPointer._onMove  = null;
  bindPointer._onDown  = null;

  pointerBound = false;
}


  let lastT = 0;
  function tick(t) {
    if (!active) return;
    const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0.016;
    lastT = t;

    step(dt);
    drawRaw();
    drawFx();
    raf = requestAnimationFrame(tick);
  }

  return {
    async start(canvasEl, opts) {
      this.stop();

      outCanvas = canvasEl;
      outCtx = outCanvas.getContext("2d", { willReadFrequently: true, alpha: true });

      mode = opts?.mode || "dither";
      fxScale = (typeof opts?.fxScale === "number") ? opts.fxScale : 0.55;
      asciiFps = (typeof opts?.asciiFps === "number") ? opts.asciiFps : 12;

      designBounds = opts?.bounds || null;
      boxRectD = opts?.boxRect || { x: 320, y: 650, w: 420, h: 220 };

      openedOnce = !!opts?.openedOnce;
      boxState = openedOnce ? "open" : "closed";
      openT = openedOnce ? 1 : 0;

      resizeCanvases();
      initSpiders();

      // 既に開いてる扱いなら外に配置
      if (openedOnce) {
        for (const s of spiders) {
          s.xD = s.outX; s.yD = s.outY;
        }
      }

      // 開いた瞬間を親に通知
      notifyOpened = opts?.onOpened || null;

      bindPointer();
      active = true;
      lastT = 0;
      raf = requestAnimationFrame(tick);
    },

    stop() {
      active = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;

      unbindPointer();

      if (outCtx && outCanvas) {
        outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
      }
      outCanvas = null; outCtx = null;
      spiders.length = 0;
    },

    setMode(nextMode) {
      mode = nextMode || "dither";
      lastAsciiAt = 0;
    },

    resize() {
      // 固定レンダーなので何もしない
    }
  };
})();

// =====================
// CandleEngine
// - 5分ごとに candle1→2→3→4
// - 1〜3は炎あり、炎クリックで揺れる
// - mode: "dither" | "ascii"
// =====================
const CandleEngine = (function () {
  let active = false;

  let outCanvas = null;
  let outCtx = null;

  const rawCanvas = document.createElement("canvas");
  const rawCtx = rawCanvas.getContext("2d", { willReadFrequently: true });

  const tmpCanvas = document.createElement("canvas");
  const tmpCtx = tmpCanvas.getContext("2d", { willReadFrequently: true });

  let mode = "dither";
  let raf = 0;
  let lastAsciiAt = 0;

  let fxScale = 0.55;
  let asciiFps = 12;

  // 白枠（ページ座標 1920x1080 の中での位置）
  const CROP_X = 228, CROP_Y = 129, CROP_W = 1453, CROP_H = 854;

  // 5分 = 300000ms
  const STEP_MS = 1 * 60 * 1000;

  // 画像
  const imgPlate = new Image();
  const imgC1 = new Image();
  const imgC2 = new Image();
  const imgC3 = new Image();
  const imgC4 = new Image();
  const imgFlame = new Image();
  let loaded = false;

  // 状態
  let startedAt = 0; // performance.now()
  let stage = 1;     // 1..4

  // 炎揺れ
  let wiggleUntil = 0;
  let wiggleSeed = 0;

  // あなたの座標（ページ座標で保持）
  // ※「キャンバス1980x1080」と書いてあるけど、既存が1920基準なので
  //   いったん 1920x1080 基準として扱います（違ったら一括補正できます）
  const LAYOUT = {
    plate: { x: 387, y: 710, w: 400, h: 100 },

    c1: { x: 487, y: 445, w: 200, h: 350 },
    f1: { x: 533, y: 308, w: 100, h: 200 },

    c2: { x: 492, y: 524, w: 200, h: 300 },
    f2: { x: 533, y: 400, w: 100, h: 200 },

    c3: { x: 492, y: 610, w: 200, h: 200 },
    f3: { x: 533, y: 476, w: 100, h: 200 },

    c4: { x: 496, y: 705, w: 200, h: 100 },
  };

  function clamp01(x) { return Math.max(0, Math.min(1, x)); }

  function designToRaw(xD, yD) {
    const lx = xD - CROP_X;
    const ly = yD - CROP_Y;

    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;

    return { x: lx * sx, y: ly * sy };
  }

  function sizeToRaw(wD, hD) {
    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;
    return { w: wD * sx, h: hD * sy };
  }

  function resizeCanvases() {
    if (!outCanvas) return;
    const dpr = getFixedDpr();

    const BASE_W = 1453;
    const BASE_H = 854;

    const w = Math.round(BASE_W * dpr);
    const h = Math.round(BASE_H * dpr);

    if (outCanvas.width !== w || outCanvas.height !== h) {
      outCanvas.width = w;
      outCanvas.height = h;
    }

    const rw = Math.max(1, Math.floor(w * fxScale));
    const rh = Math.max(1, Math.floor(h * fxScale));
    if (rawCanvas.width !== rw || rawCanvas.height !== rh) {
      rawCanvas.width = rw;
      rawCanvas.height = rh;
    }

    if (tmpCanvas.width !== w || tmpCanvas.height !== h) {
      tmpCanvas.width = w;
      tmpCanvas.height = h;
    }
  }

  function stampDot(data, w, h, x, y, size) {
    const r = Math.floor(size / 2);
    for (let yy = -r; yy <= r; yy++) {
      for (let xx = -r; xx <= r; xx++) {
        const nx = x + xx, ny = y + yy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = (ny * w + nx) * 4;
        data[j] = data[j + 1] = data[j + 2] = 0;
        data[j + 3] = 255;
      }
    }
  }

  function applyCoarseDotDither(ctxSrc, w, h, scale = 3) {
    const im = ctxSrc.getImageData(0, 0, w, h);
    const d = im.data;

    const DOT = 3;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 10) continue;

        const r = d[i], g = d[i + 1], b = d[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

        const bx = Math.floor(x / scale);
        const by = Math.floor(y / scale);
        const px = bx * scale + Math.floor(scale / 2);
        const py = by * scale + Math.floor(scale / 2);
        const isDot = (x === px && y === py);

        const ink = (lum < 0.6);
        if (ink && isDot) stampDot(d, w, h, x, y, DOT);
        else d[i + 3] = 0;
      }
    }
    ctxSrc.putImageData(im, 0, 0);
  }

  function hash01(ix, iy) {
    const s = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123;
    return s - Math.floor(s);
  }

  function renderAsciiInk(ctxSrc, w, h, ctxOut, outW, outH) {
    const cell = 10;
    const cols = Math.max(1, Math.floor(outW / cell));
    const rows = Math.max(1, Math.floor(outH / cell));

    const tiny = document.createElement("canvas");
    tiny.width = cols; tiny.height = rows;
    const tctx = tiny.getContext("2d", { willReadFrequently: true });

    tctx.imageSmoothingEnabled = true;
    tctx.clearRect(0, 0, cols, rows);
    tctx.drawImage(ctxSrc.canvas, 0, 0, w, h, 0, 0, cols, rows);

    tctx.filter = "blur(0.6px)";
    tctx.drawImage(tiny, 0, 0);
    tctx.filter = "none";

    const im = tctx.getImageData(0, 0, cols, rows).data;
    const CHARSET = "x+*.:;-=~o";
    const inkThreshold = 0.03;

    ctxOut.clearRect(0, 0, outW, outH);
    ctxOut.fillStyle = "#000";
    ctxOut.textAlign = "center";
    ctxOut.textBaseline = "middle";

    const fontSize = Math.floor(cell * 1.05);
    ctxOut.font = `550 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        if (im[i + 3] < 10) continue;

        const r = im[i], g = im[i + 1], b = im[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const ink = 1 - lum;
        if (ink < inkThreshold) continue;

        const rr = hash01(x + 19, y + 73);
        const ch = CHARSET[Math.floor(rr * CHARSET.length)];

        const cx = (x + 0.5) * cell;
        const cy = (y + 0.52) * cell;
        ctxOut.fillText(ch, cx, cy);
      }
    }
  }

  function computeStage() {
    const elapsed = performance.now() - startedAt;

    // ✅ 4段階をループ（1分ごとに 1→2→3→4→1→…）
    const idx = Math.floor(elapsed / STEP_MS) % 4; // 0..3
    stage = idx + 1; // 1..4
  }

  function currentCandleAndFlame() {
    if (stage === 1) return { candle: imgC1, c: LAYOUT.c1, flame: imgFlame, f: LAYOUT.f1 };
    if (stage === 2) return { candle: imgC2, c: LAYOUT.c2, flame: imgFlame, f: LAYOUT.f2 };
    if (stage === 3) return { candle: imgC3, c: LAYOUT.c3, flame: imgFlame, f: LAYOUT.f3 };
    return { candle: imgC4, c: LAYOUT.c4, flame: null, f: null };
  }

  function igniteWiggle() {
    wiggleUntil = performance.now() + 650;
    wiggleSeed = Math.random() * Math.PI * 2;
  }

  function drawImageDesign(img, rectD, rotateAroundCenterRad = 0) {
    const p = designToRaw(rectD.x, rectD.y);
    const s = sizeToRaw(rectD.w, rectD.h);

    if (!rotateAroundCenterRad) {
      rawCtx.drawImage(img, p.x, p.y, s.w, s.h);
      return;
    }

    const cx = p.x + s.w / 2;
    const cy = p.y + s.h / 2;

    rawCtx.save();
    rawCtx.translate(cx, cy);
    rawCtx.rotate(rotateAroundCenterRad);
    rawCtx.translate(-cx, -cy);
    rawCtx.drawImage(img, p.x, p.y, s.w, s.h);
    rawCtx.restore();
  }

  function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function drawFlameWarp(img, rectD, wigglePxDesign) {
  // rectD(デザイン座標) -> raw座標
  const p = designToRaw(rectD.x, rectD.y);
  const s = sizeToRaw(rectD.w, rectD.h);

  const slices = 28;               // 20〜40で好み
  const sliceH = s.h / slices;
  const srcSliceH = img.height / slices;

  // 時間（秒）
  const T = performance.now() * 0.001;

  // 炎の“呼吸”（明るさの脈）
  rawCtx.save();
  rawCtx.globalAlpha = 0.92 + 0.08 * Math.sin(T * 2.0 + wiggleSeed * 0.5);

  for (let i = 0; i < slices; i++) {
    // i=0 が画像の上（先端側）、i=slices-1 が下（根元側）
    // u: 先端=1, 根元=0
    const u = 1 - (i / (slices - 1));

    // ✅ 下も少し動かしつつ、上ほどよく動く（最低でも 6% くらい動く）
    const gain = 0.06 + 0.94 * Math.pow(smoothstep(0.12, 1.0, u), 1.35);

    // ✅ 上ほど “時間が遅れる” （根元の動きが伝わる感じ）
    const lagSec = 0.12 * u;  // 0.08〜0.18くらいで好み
    const t = (T - lagSec);

    // ✅ 常時ふわふわ（大波 + 小波）
    const drift = Math.sin(t * 1.2 + wiggleSeed) * 8.0; // ゆっくり大きめ
    const micro =
      Math.sin(t * 6.5 + wiggleSeed * 1.7) * 1.4 +      // 小さめ速め
      Math.sin(t * 9.2 + wiggleSeed * 2.3) * 0.8;

    // ✅ クリック時の追加ブースト（あなたの wigglePxDesign を活かす）
    // wigglePxDesign を「最大ブースト量（デザインpx）」として扱う
    const boost = wigglePxDesign * 0.65;

    // このスライスの最終揺れ（デザイン座標px）
    const wiggleHereDesign = (drift + micro + boost) * gain;

    // dx（raw座標）
    const dx = wiggleHereDesign * (rawCanvas.width / CROP_W);

    // ✅ 先端ほど細くなる（ふわっとした炎の形）
    // 1.0（根元）→ 0.78（先端）くらい
    const thin = 1.0 - 0.22 * Math.pow(u, 1.25);

    // スライスの描画先（細くするので中央合わせ）
    const sy = i * srcSliceH;
    const dy = p.y + i * sliceH;

    const dw = s.w * thin;
    const dxCenter = p.x + (s.w - dw) / 2;

    rawCtx.drawImage(
      img,
      0, sy, img.width, srcSliceH,  // src
      dxCenter + dx, dy, dw, sliceH // dst
    );
  }

  rawCtx.restore();
}

  function drawRaw() {
    if (!loaded) return;

    computeStage();

    rawCtx.clearRect(0, 0, rawCanvas.width, rawCanvas.height);

    // plate (固定)
    drawImageDesign(imgPlate, LAYOUT.plate);

    // candle + flame
    const cur = currentCandleAndFlame();
    drawImageDesign(cur.candle, cur.c);

    if (cur.flame && cur.f) {

      // 揺れ（クリック後しばらく）
      const now = performance.now();
      let wiggle = 0;

      if (now < wiggleUntil) {
        const t = 1 - (wiggleUntil - now) / 650; // 0..1
        const amp = (1 - t) * 18; // ← ここが最大揺れ量（デザイン座標px）
        // サイン波で左右に揺れる
        wiggle = Math.sin((now * 0.012) + wiggleSeed) * amp;
      }

      // ルート固定・上ほど揺れる描画
      drawFlameWarp(cur.flame, cur.f, wiggle);
    }
  }

  function drawFx() {
    if (!outCtx || !outCanvas) return;

    const outW = outCanvas.width;
    const outH = outCanvas.height;

    tmpCtx.imageSmoothingEnabled = false;
    tmpCtx.clearRect(0, 0, outW, outH);
    tmpCtx.drawImage(rawCanvas, 0, 0, rawCanvas.width, rawCanvas.height, 0, 0, outW, outH);

    if (mode === "dither") {
      outCtx.clearRect(0, 0, outW, outH);
      applyCoarseDotDither(tmpCtx, outW, outH, 3);
      outCtx.drawImage(tmpCanvas, 0, 0);
      return;
    }

    if (mode === "ascii") {
      const now = performance.now();
      const interval = 1000 / asciiFps;
      if (now - lastAsciiAt < interval) return;
      lastAsciiAt = now;

      renderAsciiInk(tmpCtx, outW, outH, outCtx, outW, outH);
      return;
    }
  }

  function canvasPointFromEvent(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  function rawToDesign(pxRaw, pyRaw) {
    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;
    return { xD: pxRaw / sx + CROP_X, yD: pyRaw / sy + CROP_Y };
  }

  function hitFlame(pxRaw, pyRaw) {
    if (stage >= 4) return false;
    const cur = currentCandleAndFlame();
    if (!cur.f) return false;

    const d = rawToDesign(pxRaw, pyRaw);
    const r = cur.f;

    // 当たり判定を少し広めに
    const pad = 18;
    return (
      d.xD >= r.x - pad &&
      d.xD <= r.x + r.w + pad &&
      d.yD >= r.y - pad &&
      d.yD <= r.y + r.h + pad
    );
  }

  function bindPointer() {
    if (!outCanvas) return;

    function onDown(e) {
      if (!active) return;
      const p = canvasPointFromEvent(e, outCanvas);
      const px = p.x * fxScale;
      const py = p.y * fxScale;

      if (hitFlame(px, py)) {
        igniteWiggle();
      }
    }

    outCanvas.addEventListener("pointerdown", onDown);
    bindPointer._onDown = onDown;
  }

  function unbindPointer() {
    if (!outCanvas) return;
    if (bindPointer._onDown) {
      outCanvas.removeEventListener("pointerdown", bindPointer._onDown);
      bindPointer._onDown = null;
    }
  }

  async function loadAll() {
    loaded = false;
    const list = [
      [imgPlate, "assets/candleplate.webp"],
      [imgC1, "assets/candle1.webp"],
      [imgC2, "assets/candle2.webp"],
      [imgC3, "assets/candle3.webp"],
      [imgC4, "assets/candle4.webp"],
      [imgFlame, "assets/candlelight.webp"],
    ];

    const ps = list.map(([img, src]) => new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => rej(new Error("candle asset failed: " + src));
      img.src = src;
    }));

    await Promise.all(ps);
    loaded = true;
  }

  function tick() {
    if (!active) return;
    drawRaw();
    drawFx();
    raf = requestAnimationFrame(tick);
  }

  return {
    async start(canvasEl, opts) {
      this.stop();

      outCanvas = canvasEl;
      outCtx = outCanvas.getContext("2d", { willReadFrequently: true, alpha: true });

      mode = opts?.mode || "dither";
      fxScale = (typeof opts?.fxScale === "number") ? opts.fxScale : 0.55;
      asciiFps = (typeof opts?.asciiFps === "number") ? opts.asciiFps : 12;

      startedAt = (typeof opts?.timelineStartAt === "number")
      ? opts.timelineStartAt
      : performance.now();
      stage = 1;
      wiggleUntil = 0;
      wiggleSeed = 0;
      lastAsciiAt = 0;

      resizeCanvases();
      await loadAll();

      bindPointer();

      active = true;
      raf = requestAnimationFrame(tick);
    },

    stop() {
      active = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;

      unbindPointer();

      if (outCtx && outCanvas) {
        outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
      }

      outCanvas = null;
      outCtx = null;
      loaded = false;
    },

    triggerFlame() {
      if (!active) return;

      const cf = currentCandleAndFlame();
      if (!cf.flame || !cf.f) return;   // stage4は炎なし

      igniteWiggle();
    },

    getFlameRect() {
      if (!active) return null;

      const cf = currentCandleAndFlame();
      if (!cf.flame || !cf.f) return null;   // stage4は炎なし

      return { ...cf.f };
    },

    setMode(nextMode) {
      mode = nextMode || "dither";
      lastAsciiAt = 0;
    },

    resize() {
      // 固定レンダーなので何もしない
    },

    get active() { return active; }
  };
})();

// =====================
// WaterRippleEngine
// - クリック位置に水紋を生成（複数同時）
// - mode: "dither" | "ascii"
// =====================
const WaterRippleEngine = (function () {
  let active = false;
  let outCanvas = null, outCtx = null;

  const rawCanvas = document.createElement("canvas");
  const rawCtx = rawCanvas.getContext("2d", { willReadFrequently: true });

  const tmpCanvas = document.createElement("canvas");
  const tmpCtx = tmpCanvas.getContext("2d", { willReadFrequently: true });

  let mode = "dither";
  let raf = 0;
  let lastAsciiAt = 0;

  let fxScale = 0.55;
  let asciiFps = 12;

  // white frame mapping
  const CROP_X = 228, CROP_Y = 129, CROP_W = 1453, CROP_H = 854;

  // ripple list
  // {xD, yD, born, life, r0, r1, rings, seed}
  const ripples = [];

  function clamp01(x){ return Math.max(0, Math.min(1, x)); }

  function designToRaw(xD, yD) {
    const lx = xD - CROP_X;
    const ly = yD - CROP_Y;
    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;
    return { x: lx * sx, y: ly * sy };
  }

  function rawToDesign(pxRaw, pyRaw) {
    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;
    return { xD: pxRaw / sx + CROP_X, yD: pyRaw / sy + CROP_Y };
  }

  function resizeCanvases() {
    if (!outCanvas) return;
    const dpr = getFixedDpr();

    const BASE_W = 1453, BASE_H = 854;
    const w = Math.round(BASE_W * dpr);
    const h = Math.round(BASE_H * dpr);

    if (outCanvas.width !== w || outCanvas.height !== h) {
      outCanvas.width = w; outCanvas.height = h;
    }

    const rw = Math.max(1, Math.floor(w * fxScale));
    const rh = Math.max(1, Math.floor(h * fxScale));
    if (rawCanvas.width !== rw || rawCanvas.height !== rh) {
      rawCanvas.width = rw; rawCanvas.height = rh;
    }

    if (tmpCanvas.width !== w || tmpCanvas.height !== h) {
      tmpCanvas.width = w; tmpCanvas.height = h;
    }
  }

  // ===== FX（あなたの他エンジンと同じ）=====
  function stampDot(data, w, h, x, y, size) {
    const r = Math.floor(size / 2);
    for (let yy = -r; yy <= r; yy++) {
      for (let xx = -r; xx <= r; xx++) {
        const nx = x + xx, ny = y + yy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = (ny * w + nx) * 4;
        data[j] = data[j + 1] = data[j + 2] = 0;
        data[j + 3] = 255;
      }
    }
  }

  function applyCoarseDotDither(ctxSrc, w, h, scale = 3) {
    const im = ctxSrc.getImageData(0, 0, w, h);
    const d = im.data;
    const DOT = 3;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 10) continue;

        const r = d[i], g = d[i + 1], b = d[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

        const bx = Math.floor(x / scale);
        const by = Math.floor(y / scale);
        const px = bx * scale + Math.floor(scale / 2);
        const py = by * scale + Math.floor(scale / 2);
        const isDot = (x === px && y === py);

        const ink = (lum < 0.6);
        if (ink && isDot) stampDot(d, w, h, x, y, DOT);
        else d[i + 3] = 0;
      }
    }
    ctxSrc.putImageData(im, 0, 0);
  }

  function hash01(ix, iy) {
    const s = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123;
    return s - Math.floor(s);
  }

  function renderAsciiInk(ctxSrc, w, h, ctxOut, outW, outH) {
    const cell = 10;
    const cols = Math.max(1, Math.floor(outW / cell));
    const rows = Math.max(1, Math.floor(outH / cell));

    const tiny = document.createElement("canvas");
    tiny.width = cols; tiny.height = rows;
    const tctx = tiny.getContext("2d", { willReadFrequently: true });

    tctx.imageSmoothingEnabled = true;
    tctx.clearRect(0, 0, cols, rows);
    tctx.drawImage(ctxSrc.canvas, 0, 0, w, h, 0, 0, cols, rows);

    tctx.filter = "blur(0.6px)";
    tctx.drawImage(tiny, 0, 0);
    tctx.filter = "none";

    const im = tctx.getImageData(0, 0, cols, rows).data;
    const CHARSET = "⋅:;~+=*x○";
    const inkThreshold = 0.02;

    ctxOut.clearRect(0, 0, outW, outH);
    ctxOut.fillStyle = "#000";
    ctxOut.textAlign = "center";
    ctxOut.textBaseline = "middle";

    const fontSize = Math.floor(cell * 1.05);
    ctxOut.font = `520 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        if (im[i + 3] < 10) continue;

        const r = im[i], g = im[i + 1], b = im[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const ink = 1 - lum;
        if (ink < inkThreshold) continue;

        const rr = hash01(x + 19, y + 73);
        const ch = CHARSET[Math.floor(rr * CHARSET.length)];

        const cx = (x + 0.5) * cell;
        const cy = (y + 0.52) * cell;
        ctxOut.fillText(ch, cx, cy);
      }
    }
  }

  // ===== water ripple drawing =====
  function addRipple(xD, yD) {
    const now = performance.now();
    ripples.push({
      xD, yD,
      born: now,
      life: 1400 + Math.random() * 600, // ms
      r0: 8 + Math.random() * 10,       // start radius (design px)
      r1: 260 + Math.random() * 160,    // end radius (design px)
      rings: 3 + Math.floor(Math.random() * 3), // 3..5
      seed: Math.random() * Math.PI * 2
    });
  }

  function easeOutCubic(t){
    t = clamp01(t);
    return 1 - Math.pow(1 - t, 3);
  }

  function drawRaw() {
    rawCtx.clearRect(0, 0, rawCanvas.width, rawCanvas.height);

    const now = performance.now();

    // 常に少しだけ“水面の呼吸”（うっすら）
    const breathe = 0.12 + 0.08 * Math.sin(now * 0.0012);

    rawCtx.save();
    rawCtx.strokeStyle = "#000";
    rawCtx.lineCap = "round";
    rawCtx.lineJoin = "round";

    // dither/asciiで欠けにくいよう少し太め
    const lw = Math.max(2, Math.round(3.0 * (rawCanvas.width / 1920)));
    rawCtx.lineWidth = lw;

    // 更新 + 描画
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      const t = (now - rp.born) / rp.life;
      if (t >= 1) { ripples.splice(i, 1); continue; }

      const k = easeOutCubic(t);
      const baseR = rp.r0 + (rp.r1 - rp.r0) * k;

      // 波紋の強さ（中心ほど強め→消える）
      const a = (1 - k) * (0.75 + breathe);

      const center = designToRaw(rp.xD, rp.yD);
      const scaleX = rawCanvas.width / CROP_W; // design->raw
      const R = baseR * scaleX;

      // 複数リング（間隔を少し揺らす）
      for (let n = 0; n < rp.rings; n++) {
        const rr = (n / rp.rings);
        const wobble = Math.sin(now * 0.004 + rp.seed + n * 1.3) * (2.0 + rr * 3.0);
        const ringR = R * (0.65 + rr * 0.55) + wobble;

        // リングごとに薄く
        rawCtx.globalAlpha = a * (1 - rr) * 0.9;

        rawCtx.beginPath();
        rawCtx.arc(center.x, center.y, Math.max(1, ringR), 0, Math.PI * 2);
        rawCtx.stroke();
      }
    }

    rawCtx.restore();
    rawCtx.globalAlpha = 1;
  }

  function drawFx() {
    if (!outCtx || !outCanvas) return;

    const outW = outCanvas.width;
    const outH = outCanvas.height;

    tmpCtx.imageSmoothingEnabled = false;
    tmpCtx.clearRect(0, 0, outW, outH);
    tmpCtx.drawImage(rawCanvas, 0, 0, rawCanvas.width, rawCanvas.height, 0, 0, outW, outH);

    if (mode === "dither") {
      outCtx.clearRect(0, 0, outW, outH);
      applyCoarseDotDither(tmpCtx, outW, outH, 3);
      outCtx.drawImage(tmpCanvas, 0, 0);
      return;
    }

    if (mode === "ascii") {
      const now = performance.now();
      const interval = 1000 / asciiFps;
      if (now - lastAsciiAt < interval) return;
      lastAsciiAt = now;
      renderAsciiInk(tmpCtx, outW, outH, outCtx, outW, outH);
      return;
    }
  }

  function tick() {
    if (!active) return;
    drawRaw();
    drawFx();
    raf = requestAnimationFrame(tick);
  }

  function canvasPointFromEvent(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  function bindPointer() {
    if (!outCanvas) return;

    function onDown(e) {
      if (!active) return;
      const p = canvasPointFromEvent(e, outCanvas);
      const px = p.x * fxScale;
      const py = p.y * fxScale;

      const d = rawToDesign(px, py);
      addRipple(d.xD, d.yD);
    }

    outCanvas.addEventListener("pointerdown", onDown);
    bindPointer._onDown = onDown;
  }

  function unbindPointer() {
    if (!outCanvas) return;
    if (bindPointer._onDown) {
      outCanvas.removeEventListener("pointerdown", bindPointer._onDown);
      bindPointer._onDown = null;
    }
  }

  return {
    async start(canvasEl, opts) {
      this.stop();

      outCanvas = canvasEl;
      outCtx = outCanvas.getContext("2d", { willReadFrequently: true, alpha: true });

      mode = opts?.mode || "dither";
      fxScale = (typeof opts?.fxScale === "number") ? opts.fxScale : 0.55;
      asciiFps = (typeof opts?.asciiFps === "number") ? opts.asciiFps : 12;

      ripples.length = 0;
      lastAsciiAt = 0;

      resizeCanvases();
      bindPointer();

      active = true;
      raf = requestAnimationFrame(tick);
    },

    stop() {
      active = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;

      unbindPointer();

      if (outCtx && outCanvas) {
        outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
      }
      ripples.length = 0;

      outCanvas = null; outCtx = null;
    },

    setMode(nextMode) {
      mode = nextMode || "dither";
      lastAsciiAt = 0;
    },

    resize() { /* 固定レンダーなので何もしない */ },

    get active() { return active; }
  };
})();

// =====================
// FireworksEngine
// - クリック位置で花火（複数同時）
// - mode: "dither" | "ascii"
// =====================
const FireworksEngine = (function () {
  let active = false;
  let outCanvas = null, outCtx = null;

  const rawCanvas = document.createElement("canvas");
  const rawCtx = rawCanvas.getContext("2d", { willReadFrequently: true });

  const tmpCanvas = document.createElement("canvas");
  const tmpCtx = tmpCanvas.getContext("2d", { willReadFrequently: true });

  let mode = "dither";
  let raf = 0;
  let lastAsciiAt = 0;

  let fxScale = 0.55;
  let asciiFps = 12;

  const CROP_X = 228, CROP_Y = 129, CROP_W = 1453, CROP_H = 854;

  function clamp01(x){ return Math.max(0, Math.min(1, x)); }

  function designToRaw(xD, yD) {
    const lx = xD - CROP_X;
    const ly = yD - CROP_Y;
    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;
    return { x: lx * sx, y: ly * sy };
  }
  function rawToDesign(pxRaw, pyRaw) {
    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;
    return { xD: pxRaw / sx + CROP_X, yD: pyRaw / sy + CROP_Y };
  }

  function resizeCanvases() {
    if (!outCanvas) return;
    const dpr = getFixedDpr();

    const BASE_W = 1453, BASE_H = 854;
    const w = Math.round(BASE_W * dpr);
    const h = Math.round(BASE_H * dpr);

    if (outCanvas.width !== w || outCanvas.height !== h) {
      outCanvas.width = w; outCanvas.height = h;
    }

    const rw = Math.max(1, Math.floor(w * fxScale));
    const rh = Math.max(1, Math.floor(h * fxScale));
    if (rawCanvas.width !== rw || rawCanvas.height !== rh) {
      rawCanvas.width = rw; rawCanvas.height = rh;
    }

    if (tmpCanvas.width !== w || tmpCanvas.height !== h) {
      tmpCanvas.width = w; tmpCanvas.height = h;
    }
  }

  // ===== FX（あなたの他エンジンと同じ）=====
  function stampDot(data, w, h, x, y, size) {
    const r = Math.floor(size / 2);
    for (let yy = -r; yy <= r; yy++) {
      for (let xx = -r; xx <= r; xx++) {
        const nx = x + xx, ny = y + yy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = (ny * w + nx) * 4;
        data[j] = data[j + 1] = data[j + 2] = 0;
        data[j + 3] = 255;
      }
    }
  }
  function applyCoarseDotDither(ctxSrc, w, h, scale = 3) {
    const im = ctxSrc.getImageData(0, 0, w, h);
    const d = im.data;
    const DOT = 3;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 10) continue;

        const r = d[i], g = d[i + 1], b = d[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

        const bx = Math.floor(x / scale);
        const by = Math.floor(y / scale);
        const px = bx * scale + Math.floor(scale / 2);
        const py = by * scale + Math.floor(scale / 2);
        const isDot = (x === px && y === py);

        const ink = (lum < 0.6);
        if (ink && isDot) stampDot(d, w, h, x, y, DOT);
        else d[i + 3] = 0;
      }
    }
    ctxSrc.putImageData(im, 0, 0);
  }
  function hash01(ix, iy) {
    const s = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123;
    return s - Math.floor(s);
  }
  function renderAsciiInk(ctxSrc, w, h, ctxOut, outW, outH) {
    const cell = 10;
    const cols = Math.max(1, Math.floor(outW / cell));
    const rows = Math.max(1, Math.floor(outH / cell));

    const tiny = document.createElement("canvas");
    tiny.width = cols; tiny.height = rows;
    const tctx = tiny.getContext("2d", { willReadFrequently: true });

    tctx.imageSmoothingEnabled = true;
    tctx.clearRect(0, 0, cols, rows);
    tctx.drawImage(ctxSrc.canvas, 0, 0, w, h, 0, 0, cols, rows);

    tctx.filter = "blur(0.55px)";
    tctx.drawImage(tiny, 0, 0);
    tctx.filter = "none";

    const im = tctx.getImageData(0, 0, cols, rows).data;
    const CHARSET = "x+*.:;-=~o";
    const inkThreshold = 0.02;

    ctxOut.clearRect(0, 0, outW, outH);
    ctxOut.fillStyle = "#000";
    ctxOut.textAlign = "center";
    ctxOut.textBaseline = "middle";

    const fontSize = Math.floor(cell * 1.05);
    ctxOut.font = `550 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        if (im[i + 3] < 10) continue;

        const r = im[i], g = im[i + 1], b = im[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const ink = 1 - lum;
        if (ink < inkThreshold) continue;

        const rr = hash01(x + 19, y + 73);
        const ch = CHARSET[Math.floor(rr * CHARSET.length)];

        const cx = (x + 0.5) * cell;
        const cy = (y + 0.52) * cell;
        ctxOut.fillText(ch, cx, cy);
      }
    }
  }

  // ===== fireworks simulation =====
  const bursts = [];
  // burst: {xD,yD,born,life,parts:[{x,y,vx,vy,ttl,seed}]}

  function addBurst(xD, yD) {
    const now = performance.now();
    const parts = [];
    const N = 48 + Math.floor(Math.random() * 28); // 48..75

    for (let i = 0; i < N; i++) {
      const ang = (i / N) * Math.PI * 2 + (Math.random() * 0.18);
      const sp = 220 + Math.random() * 220; // design px/sec
      parts.push({
        x: xD, y: yD,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        ttl: 900 + Math.random() * 650,
        seed: Math.random() * Math.PI * 2
      });
    }

    bursts.push({
      xD, yD,
      born: now,
      life: 1400 + Math.random() * 500,
      parts
    });
  }

  function drawRaw() {
    rawCtx.clearRect(0, 0, rawCanvas.width, rawCanvas.height);
    const now = performance.now();

    rawCtx.save();
    rawCtx.strokeStyle = "#000";
    rawCtx.lineCap = "round";
    rawCtx.lineJoin = "round";

    // 少し太め（変換で欠けにくい）
    const lw = Math.max(2, Math.round(3.0 * (rawCanvas.width / 1920)));
    rawCtx.lineWidth = lw;

    // dt（固定tickじゃないので、描画内で短時間更新）
    // “軽い見た目”にしたいので 16ms 相当で1回だけ進める
    const dt = 0.016;

    for (let bi = bursts.length - 1; bi >= 0; bi--) {
      const b = bursts[bi];
      const t = (now - b.born) / b.life;
      if (t >= 1) { bursts.splice(bi, 1); continue; }

      // 全体フェード
      const fade = (1 - t);

      // 粒
      for (let pi = b.parts.length - 1; pi >= 0; pi--) {
        const p = b.parts[pi];
        const age = (now - b.born);
        if (age > p.ttl) { b.parts.splice(pi, 1); continue; }

        // physics（design座標で更新）
        const drag = 0.985;
        const g = 420; // design px/sec^2（落下）
        p.vx *= drag;
        p.vy = p.vy * drag + g * dt;

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // sparkle（ちょい瞬き）
        const tw = 0.75 + 0.25 * Math.sin(now * 0.012 + p.seed);

        const a = fade * (1 - age / p.ttl) * tw;
        rawCtx.globalAlpha = a;

        const aR = designToRaw(p.x, p.y);
        // “線花火”っぽく、進行方向に短い線分
        const vx = p.vx, vy = p.vy;
        const vlen = Math.sqrt(vx * vx + vy * vy) || 1;

        const tailD = 10 + 18 * (1 - age / p.ttl); // design px
        const tailRaw = tailD * (rawCanvas.width / CROP_W);

        const tx = aR.x - (vx / vlen) * tailRaw;
        const ty = aR.y - (vy / vlen) * tailRaw;

        rawCtx.beginPath();
        rawCtx.moveTo(tx, ty);
        rawCtx.lineTo(aR.x, aR.y);
        rawCtx.stroke();
      }

      // 破片がなくなったら終わり
      if (b.parts.length === 0) bursts.splice(bi, 1);
    }

    rawCtx.restore();
    rawCtx.globalAlpha = 1;
  }

  function drawFx() {
    if (!outCtx || !outCanvas) return;

    const outW = outCanvas.width;
    const outH = outCanvas.height;

    tmpCtx.imageSmoothingEnabled = false;
    tmpCtx.clearRect(0, 0, outW, outH);
    tmpCtx.drawImage(rawCanvas, 0, 0, rawCanvas.width, rawCanvas.height, 0, 0, outW, outH);

    if (mode === "dither") {
      outCtx.clearRect(0, 0, outW, outH);
      applyCoarseDotDither(tmpCtx, outW, outH, 3);
      outCtx.drawImage(tmpCanvas, 0, 0);
      return;
    }

    if (mode === "ascii") {
      const now = performance.now();
      const interval = 1000 / asciiFps;
      if (now - lastAsciiAt < interval) return;
      lastAsciiAt = now;
      renderAsciiInk(tmpCtx, outW, outH, outCtx, outW, outH);
      return;
    }
  }

  function tick() {
    if (!active) return;
    drawRaw();
    drawFx();
    raf = requestAnimationFrame(tick);
  }

  function canvasPointFromEvent(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  function bindPointer() {
    if (!outCanvas) return;

    function onDown(e) {
      if (!active) return;
      const p = canvasPointFromEvent(e, outCanvas);
      const px = p.x * fxScale;
      const py = p.y * fxScale;

      const d = rawToDesign(px, py);
      addBurst(d.xD, d.yD);
    }

    outCanvas.addEventListener("pointerdown", onDown);
    bindPointer._onDown = onDown;
  }

  function unbindPointer() {
    if (!outCanvas) return;
    if (bindPointer._onDown) {
      outCanvas.removeEventListener("pointerdown", bindPointer._onDown);
      bindPointer._onDown = null;
    }
  }

  return {
    async start(canvasEl, opts) {
      this.stop();

      outCanvas = canvasEl;
      outCtx = outCanvas.getContext("2d", { willReadFrequently: true, alpha: true });

      mode = opts?.mode || "dither";
      fxScale = (typeof opts?.fxScale === "number") ? opts.fxScale : 0.55;
      asciiFps = (typeof opts?.asciiFps === "number") ? opts.asciiFps : 12;

      bursts.length = 0;
      lastAsciiAt = 0;

      resizeCanvases();
      bindPointer();

      active = true;
      raf = requestAnimationFrame(tick);
    },

    stop() {
      active = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;

      unbindPointer();

      if (outCtx && outCanvas) {
        outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
      }
      bursts.length = 0;

      outCanvas = null; outCtx = null;
    },

    setMode(nextMode) {
      mode = nextMode || "dither";
      lastAsciiAt = 0;
    },

    resize() { /* 固定レンダーなので何もしない */ },

    get active() { return active; }
  };
})();

// =====================
// LeafWingEngine
// - stem + leaf1..9 を配置
// - 葉クリックで消える（セッション中ずっと保持）
// - mode: "dither" | "ascii"
// =====================
const LeafWingEngine = (function () {
  let active = false;

  let outCanvas = null;
  let outCtx = null;

  const rawCanvas = document.createElement("canvas");
  const rawCtx = rawCanvas.getContext("2d", { willReadFrequently: true });

  const tmpCanvas = document.createElement("canvas");
  const tmpCtx = tmpCanvas.getContext("2d", { willReadFrequently: true });

  let mode = "dither";
  let raf = 0;
  let lastAsciiAt = 0;

  let fxScale = 0.55;
  let asciiFps = 12;

  // book-ill-wrap の白枠（ページ座標 1920x1080 の中での位置）
  const CROP_X = 228, CROP_Y = 129, CROP_W = 1453, CROP_H = 854;

  // 画像
  const imgStem = new Image();
  const imgLeaves = Array.from({ length: 9 }, () => new Image());
  let loaded = false;

  // 外から渡される “状態キー” と “状態オブジェクト”
  let stateKey = "leafwing_default";
  let stateRef = null;

  // クリック判定のための矩形（design座標）一覧
  const LAYOUT = {
    stem:  { x: 328, y: 258, w: 500, h: 600 },
    leaves: [
      { x: 574, y: 238, w: 200, h: 100 }, // leaf1
      { x: 662, y: 307, w: 200, h: 200 }, // leaf2
      { x: 745, y: 455, w: 200, h: 200 }, // leaf3
      { x: 628, y: 540, w: 200, h: 150 }, // leaf4
      { x: 247, y: 598, w: 200, h: 150 }, // leaf5
      { x: 297, y: 438, w: 100, h: 150 }, // leaf6
      { x: 405, y: 475, w: 150, h: 100 }, // leaf7
      { x: 317, y: 304, w: 200, h: 200 }, // leaf8
      { x: 363, y: 254, w: 200, h: 100 }, // leaf9
    ],
  };

  function designToRaw(xD, yD) {
    const lx = xD - CROP_X;
    const ly = yD - CROP_Y;
    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;
    return { x: lx * sx, y: ly * sy };
  }

  function sizeToRaw(wD, hD) {
    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;
    return { w: wD * sx, h: hD * sy };
  }

  function rawToDesign(pxRaw, pyRaw) {
    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;
    return { xD: pxRaw / sx + CROP_X, yD: pyRaw / sy + CROP_Y };
  }

  function resizeCanvases() {
    if (!outCanvas) return;
    const dpr = getFixedDpr();

    const BASE_W = 1453, BASE_H = 854;
    const w = Math.round(BASE_W * dpr);
    const h = Math.round(BASE_H * dpr);

    if (outCanvas.width !== w || outCanvas.height !== h) {
      outCanvas.width = w;
      outCanvas.height = h;
    }

    const rw = Math.max(1, Math.floor(w * fxScale));
    const rh = Math.max(1, Math.floor(h * fxScale));
    if (rawCanvas.width !== rw || rawCanvas.height !== rh) {
      rawCanvas.width = rw;
      rawCanvas.height = rh;
    }

    if (tmpCanvas.width !== w || tmpCanvas.height !== h) {
      tmpCanvas.width = w;
      tmpCanvas.height = h;
    }
  }

  function drawImageDesign(img, rectD) {
    const p = designToRaw(rectD.x, rectD.y);
    const s = sizeToRaw(rectD.w, rectD.h);
    rawCtx.drawImage(img, p.x, p.y, s.w, s.h);
  }

  // ===== FX（他エンジンと同じ）=====
  function stampDot(data, w, h, x, y, size) {
    const r = Math.floor(size / 2);
    for (let yy = -r; yy <= r; yy++) {
      for (let xx = -r; xx <= r; xx++) {
        const nx = x + xx, ny = y + yy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = (ny * w + nx) * 4;
        data[j] = data[j + 1] = data[j + 2] = 0;
        data[j + 3] = 255;
      }
    }
  }

  function applyCoarseDotDither(ctxSrc, w, h, scale = 3) {
    const im = ctxSrc.getImageData(0, 0, w, h);
    const d = im.data;
    const DOT = 3;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 10) continue;

        const r = d[i], g = d[i + 1], b = d[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

        const bx = Math.floor(x / scale);
        const by = Math.floor(y / scale);
        const px = bx * scale + Math.floor(scale / 2);
        const py = by * scale + Math.floor(scale / 2);
        const isDot = (x === px && y === py);

        const ink = (lum < 0.6);
        if (ink && isDot) stampDot(d, w, h, x, y, DOT);
        else d[i + 3] = 0;
      }
    }
    ctxSrc.putImageData(im, 0, 0);
  }

  function hash01(ix, iy) {
    const s = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123;
    return s - Math.floor(s);
  }

  function renderAsciiInk(ctxSrc, w, h, ctxOut, outW, outH) {
    const cell = 9;
    const cols = Math.max(1, Math.floor(outW / cell));
    const rows = Math.max(1, Math.floor(outH / cell));

    const tiny = document.createElement("canvas");
    tiny.width = cols; tiny.height = rows;
    const tctx = tiny.getContext("2d", { willReadFrequently: true });

    tctx.imageSmoothingEnabled = true;
    tctx.clearRect(0, 0, cols, rows);
    tctx.drawImage(ctxSrc.canvas, 0, 0, w, h, 0, 0, cols, rows);

    tctx.filter = "blur(0.7px)";
    tctx.drawImage(tiny, 0, 0);
    tctx.filter = "none";

    const im = tctx.getImageData(0, 0, cols, rows).data;
    const CHARSET = "x+*✰⋆︎✯~o";
    const inkThreshold = 0.01;

    ctxOut.clearRect(0, 0, outW, outH);
    ctxOut.fillStyle = "#000";
    ctxOut.textAlign = "center";
    ctxOut.textBaseline = "middle";

    const fontSize = Math.floor(cell * 1.05);
    ctxOut.font = `550 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        if (im[i + 3] < 10) continue;

        const r = im[i], g = im[i + 1], b = im[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const ink = 1 - lum;
        if (ink < inkThreshold) continue;

        const rr = hash01(x + 19, y + 73);
        const ch = CHARSET[Math.floor(rr * CHARSET.length)];
        const cx = (x + 0.5) * cell;
        const cy = (y + 0.52) * cell;
        ctxOut.fillText(ch, cx, cy);
      }
    }
  }

  function drawRaw() {
  if (!loaded || !stateRef) return;

  rawCtx.clearRect(0, 0, rawCanvas.width, rawCanvas.height);

  // stem（常に表示）
  drawImageDesign(imgStem, LAYOUT.stem);

  // フェード進行度
  let fadingIdx = -1;
  let fadeAlpha = 1;

  if (leafFade.active) {
    const t = (performance.now() - leafFade.startAt) / leafFade.dur;
    const k = Math.min(1, Math.max(0, t));
    fadingIdx = leafFade.idx;
    fadeAlpha = 1 - k;

    // フェード完了 → 消えた扱いにして固定
    if (k >= 1) {
      if (fadingIdx >= 0) stateRef.gone[fadingIdx] = true;
      leafFade.active = false;
      leafFade.idx = -1;
      fadeAlpha = 1;
      fadingIdx = -1;
    }
  }

  // leaves（通常表示）
  for (let i = 0; i < 9; i++) {
    if (stateRef.gone[i]) continue;
    if (i === fadingIdx) continue; // フェード対象は後で描く
    drawImageDesign(imgLeaves[i], LAYOUT.leaves[i]);
  }

  // フェード対象だけ alpha 付きで描く
  if (fadingIdx >= 0 && !stateRef.gone[fadingIdx]) {
    rawCtx.save();
    rawCtx.globalAlpha = fadeAlpha;
    drawImageDesign(imgLeaves[fadingIdx], LAYOUT.leaves[fadingIdx]);
    rawCtx.restore();
  }
}

  function drawFx() {
    if (!outCtx || !outCanvas) return;

    const outW = outCanvas.width;
    const outH = outCanvas.height;

    tmpCtx.imageSmoothingEnabled = false;
    tmpCtx.clearRect(0, 0, outW, outH);
    tmpCtx.drawImage(rawCanvas, 0, 0, rawCanvas.width, rawCanvas.height, 0, 0, outW, outH);

    if (mode === "dither") {
      outCtx.clearRect(0, 0, outW, outH);
      applyCoarseDotDither(tmpCtx, outW, outH, 3);
      outCtx.drawImage(tmpCanvas, 0, 0);
      return;
    }

    if (mode === "ascii") {
      const now = performance.now();
      const interval = 1000 / asciiFps;
      if (now - lastAsciiAt < interval) return;
      lastAsciiAt = now;
      renderAsciiInk(tmpCtx, outW, outH, outCtx, outW, outH);
      return;
    }
  }

  function tick() {
    if (!active) return;
    drawRaw();
    drawFx();
    raf = requestAnimationFrame(tick);
  }

  // ===== クリック判定 =====
  function canvasPointFromEvent(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  function hitLeafIndex(pxRaw, pyRaw) {
    const d = rawToDesign(pxRaw, pyRaw);
    const pad = 10; // 当たり判定少し広げる

    // 上にある葉が優先されるように逆順で取る（好み）
    for (let i = 8; i >= 0; i--) {
      if (stateRef.gone[i]) continue;
      const r = LAYOUT.leaves[i];
      if (
        d.xD >= r.x - pad &&
        d.xD <= r.x + r.w + pad &&
        d.yD >= r.y - pad &&
        d.yD <= r.y + r.h + pad
      ) return i;
    }
    return -1;
  }

  function bindPointer() {
    if (!outCanvas) return;

    function onDown(e) {
      if (!active || !stateRef) return;

      const p = canvasPointFromEvent(e, outCanvas);
      const px = p.x * fxScale;
      const py = p.y * fxScale;

      const idx = hitLeafIndex(px, py);
      if (idx >= 0) {
      // すでにフェード中なら二重発火しない
      if (!(leafFade.active && leafFade.idx === idx)) {
        startLeafFade(idx);
      }
    }
    }

    outCanvas.addEventListener("pointerdown", onDown);
    bindPointer._onDown = onDown;
  }

  function unbindPointer() {
    if (!outCanvas) return;
    if (bindPointer._onDown) {
      outCanvas.removeEventListener("pointerdown", bindPointer._onDown);
      bindPointer._onDown = null;
    }
  }

  async function loadAll() {
    loaded = false;

    const promises = [];

    promises.push(new Promise((res, rej) => {
      imgStem.onload = res;
      imgStem.onerror = () => rej(new Error("leafwing asset failed: assets/stem.webp"));
      imgStem.src = "assets/stem.webp";
    }));

    for (let i = 0; i < 9; i++) {
      const src = `assets/leaf${i + 1}.webp`;
      promises.push(new Promise((res, rej) => {
        imgLeaves[i].onload = res;
        imgLeaves[i].onerror = () => rej(new Error("leafwing asset failed: " + src));
        imgLeaves[i].src = src;
      }));
    }

    await Promise.all(promises);
    loaded = true;
  }

  return {
  async start(canvasEl, opts) {
    this.stop();

    outCanvas = canvasEl;
    outCtx = outCanvas.getContext("2d", { willReadFrequently: true, alpha: true });

    mode = opts?.mode || "dither";
    fxScale = (typeof opts?.fxScale === "number") ? opts.fxScale : 0.55;
    asciiFps = (typeof opts?.asciiFps === "number") ? opts.asciiFps : 12;

    stateKey = opts?.stateKey || "leafwing_default";
    stateRef = getLeafWingState(stateKey);

    lastAsciiAt = 0;

    resizeCanvases();
    await loadAll();
    bindPointer();

    active = true;
    raf = requestAnimationFrame(tick);
  },

  stop() {
    active = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;

    unbindPointer();

    if (outCtx && outCanvas) {
      outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
    }

    outCanvas = null;
    outCtx = null;
    stateRef = null;
    loaded = false;
  },

  hitLeaf(idx) {
    if (!active || !stateRef) return;
    if (idx < 0 || idx > 8) return;
    if (stateRef.gone[idx]) return;

    if (!(leafFade.active && leafFade.idx === idx)) {
      startLeafFade(idx);
    }
  },

  setMode(nextMode) {
    mode = nextMode || "dither";
    lastAsciiAt = 0;
  },

  resize() {
    // 固定レンダーなので何もしない
  },

  get active() { return active; }
};
})();

const MoonEngine = (function () {
  let active = false;
  let outCanvas = null;
  let outCtx = null;

  const rawCanvas = document.createElement("canvas");
  const rawCtx = rawCanvas.getContext("2d", { willReadFrequently: true });

  const tmpCanvas = document.createElement("canvas");
  const tmpCtx = tmpCanvas.getContext("2d", { willReadFrequently: true });

  const imgMoon = new Image();
  let loaded = false;

  let mode = "dither";
  let raf = 0;
  let lastAsciiAt = 0;

  let fxScale = 0.55;
  let asciiFps = 12;

  const CROP_X = 228, CROP_Y = 129, CROP_W = 1453, CROP_H = 854;

  let moon = {
    cx: 960,
    cy: 540,
    r: 250
  };

  let baseY = 540;
  let verticalRange = 80;

  let dragging = false;
  let grabDx = 0;
  let grabDy = 0;
  let pointerBound = false;

  // ドラッグ開始時のテクスチャー位置を保持
  let dragStartTexOffsetX = 0;
  let dragStartTexOffsetY = 0;

  // テクスチャの見える位置
  let texOffsetX = 0;
  let texOffsetY = 0;

  // 左右端に到達したら永久ロック
  let texLocked = false;

  // 初回だけ中央に初期化するためのフラグ
  let texInitialized = false;

  // テクスチャーサイズ
  let texScale = 2.0;   // 2倍表示
  let texWDesign = 0;
  let texHDesign = 0;

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function getRenderSize(canvas) {
    const dpr = getFixedDpr();
    const BASE_W = 1453;
    const BASE_H = 854;
    return { w: Math.round(BASE_W * dpr), h: Math.round(BASE_H * dpr), dpr };
  }

  function resizeCanvases() {
    if (!outCanvas) return;

    const { w, h } = getRenderSize(outCanvas);

    if (outCanvas.width !== w || outCanvas.height !== h) {
      outCanvas.width = w;
      outCanvas.height = h;
    }

    const rw = Math.max(1, Math.floor(w * fxScale));
    const rh = Math.max(1, Math.floor(h * fxScale));

    if (rawCanvas.width !== rw || rawCanvas.height !== rh) {
      rawCanvas.width = rw;
      rawCanvas.height = rh;
    }

    if (tmpCanvas.width !== w || tmpCanvas.height !== h) {
      tmpCanvas.width = w;
      tmpCanvas.height = h;
    }
  }

  function designToRaw(xD, yD) {
    const lx = xD - CROP_X;
    const ly = yD - CROP_Y;
    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;
    return { x: lx * sx, y: ly * sy };
  }

  function rawToDesign(pxRaw, pyRaw) {
    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;
    return { xD: pxRaw / sx + CROP_X, yD: pyRaw / sy + CROP_Y };
  }

  function sizeToRaw(vD) {
    const sx = rawCanvas.width / CROP_W;
    return vD * sx;
  }

  function canvasPointFromEvent(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * sx,
      y: (e.clientY - rect.top) * sy
    };
  }

  async function loadAll() {
    await new Promise((res, rej) => {
      imgMoon.onload = () => {
        loaded = true;
        res();
      };
      imgMoon.onerror = () => rej(new Error("moon image failed: assets/moon.webp"));
      imgMoon.src = "assets/moon.webp";
    });
  }

  // =================================
  // moon専用 dither: 白 / グレー / 黒
  // 黒 = 高密度
  // 灰 = 低密度
  // 白 = 透明
  // =================================
  function stampDot(data, w, h, x, y, size) {
    const r = Math.floor(size / 2);
    for (let yy = -r; yy <= r; yy++) {
      for (let xx = -r; xx <= r; xx++) {
        const nx = x + xx;
        const ny = y + yy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = (ny * w + nx) * 4;
        data[j] = data[j + 1] = data[j + 2] = 0;
        data[j + 3] = 255;
      }
    }
  }

  function applyMoonDither(ctxSrc, w, h, scale = 3) {
    const im = ctxSrc.getImageData(0, 0, w, h);
    const d = im.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 10) continue;

        const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;

        // グリッド中心判定
        const bx = Math.floor(x / scale);
        const by = Math.floor(y / scale);
        const px = bx * scale + Math.floor(scale / 2);
        const py = by * scale + Math.floor(scale / 2);
        const isDot = (x === px && y === py);

        // 3階調
        // 黒: lum < 0.33
        // 灰: 0.33 <= lum < 0.66
        // 白: 0.66 <= lum
        if (lum < 0.33) {
          // 高密度: 全グリッド
          if (isDot) {
            stampDot(d, w, h, x, y, 3);
          } else {
            d[i + 3] = 0;
          }
        } else if (lum < 0.66) {
          // 低密度: チェッカー状に半分だけ
          const keep = ((bx + by) % 2 === 0);
          if (isDot && keep) {
            stampDot(d, w, h, x, y, 2);
          } else {
            d[i + 3] = 0;
          }
        } else {
          d[i + 3] = 0;
        }
      }
    }

    ctxSrc.putImageData(im, 0, 0);
  }

  function hash01(ix, iy) {
    const s = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123;
    return s - Math.floor(s);
  }

  // =================================
  // moon専用 ascii:
  // 黒 = 大きめ記号
  // 灰 = 小さめ記号
  // 白 = 空白
  // =================================
  function renderMoonAscii(ctxSrc, w, h, ctxOut, outW, outH) {
    const cell = 10;
    const cols = Math.max(1, Math.floor(outW / cell));
    const rows = Math.max(1, Math.floor(outH / cell));

    const tiny = document.createElement("canvas");
    tiny.width = cols;
    tiny.height = rows;
    const tctx = tiny.getContext("2d", { willReadFrequently: true });

    tctx.imageSmoothingEnabled = true;
    tctx.clearRect(0, 0, cols, rows);
    tctx.drawImage(ctxSrc.canvas, 0, 0, w, h, 0, 0, cols, rows);

    tctx.filter = "blur(0.6px)";
    tctx.drawImage(tiny, 0, 0);
    tctx.filter = "none";

    const im = tctx.getImageData(0, 0, cols, rows).data;

    ctxOut.fillStyle = "#000";
    ctxOut.textAlign = "center";
    ctxOut.textBaseline = "middle";

    const DARK_SET = "MOON";
    const MID_SET  = ".:+*";

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const a = im[i + 3];
        if (a < 10) continue;

        const lum = (0.2126 * im[i] + 0.7152 * im[i + 1] + 0.0722 * im[i + 2]) / 255;

        const cx = (x + 0.5) * cell;
        const cy = (y + 0.52) * cell;

        if (lum < 0.33) {
          const rr = hash01(x + 31, y + 97);
          const ch = DARK_SET[Math.floor(rr * DARK_SET.length)];
          ctxOut.font =
            `700 ${Math.floor(cell * 1.08)}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;
          ctxOut.fillText(ch, cx, cy);
        } else if (lum < 0.66) {
          const rr = hash01(x + 57, y + 13);
          const ch = MID_SET[Math.floor(rr * MID_SET.length)];
          ctxOut.font =
            `500 ${Math.floor(cell * 0.72)}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;
          ctxOut.fillText(ch, cx, cy);
        }
      }
    }
  }

  function drawMoonBackingToOut() {
  if (!outCtx || !outCanvas) return;

  // 月中心を outCanvas 座標に変換
  const centerRaw = designToRaw(moon.cx, moon.cy);
  const cx = centerRaw.x * (outCanvas.width / rawCanvas.width);
  const cy = centerRaw.y * (outCanvas.height / rawCanvas.height);

  // 半径を outCanvas 基準に変換
  const edgeRaw = designToRaw(moon.cx + moon.r, moon.cy);
  const rRaw = Math.abs(edgeRaw.x - centerRaw.x);
  const rOut = rRaw * (outCanvas.width / rawCanvas.width);

  // 背景の折り目を隠すための淡い下地
  const grad = outCtx.createRadialGradient(
    cx, cy, 0,
    cx, cy, rOut
  );

  grad.addColorStop(0.0, "rgba(228, 232, 191, 0.98)");
  grad.addColorStop(0.82, "rgba(219, 215, 185, 0.95)");
  grad.addColorStop(1.0, "rgba(205, 201, 174, 0.92)");

  outCtx.save();
  outCtx.beginPath();
  outCtx.arc(cx, cy, rOut, 0, Math.PI * 2);
  outCtx.fillStyle = grad;
  outCtx.fill();
  outCtx.restore();
}

  function drawMoonSphere() {
  if (!loaded) return;

  rawCtx.clearRect(0, 0, rawCanvas.width, rawCanvas.height);

  const p = designToRaw(moon.cx, moon.cy);
  const rRaw = sizeToRaw(moon.r);

  // 月テクスチャー
  rawCtx.save();
  rawCtx.beginPath();
  rawCtx.arc(p.x, p.y, rRaw, 0, Math.PI * 2);
  rawCtx.clip();

  const texW = sizeToRaw(texWDesign);
  const texH = sizeToRaw(texHDesign);

  const dx = p.x - texW / 2 + sizeToRaw(texOffsetX);
  const dy = p.y - texH / 2 + sizeToRaw(texOffsetY);

  rawCtx.drawImage(
    imgMoon,
    dx,
    dy,
    texW,
    texH
  );

  rawCtx.restore();

  // 外側だけの黒グラデーション
  // rawCtxに描くので、このグローも ascii / dither 化される
  const glowOuter = rRaw * 1.10;
  const glowGrad = rawCtx.createRadialGradient(
    p.x, p.y, rRaw * 0.985,
    p.x, p.y, glowOuter
  );

  glowGrad.addColorStop(0.0, "rgba(45, 45, 45, 0.15)");
  glowGrad.addColorStop(0.35, "rgba(108, 108, 108, 0.08)");
  glowGrad.addColorStop(0.7, "rgba(190, 190, 190, 0.02)");
  glowGrad.addColorStop(1.0, "rgba(255, 255, 255, 0)");


  rawCtx.save();
  rawCtx.beginPath();
  rawCtx.arc(p.x, p.y, glowOuter, 0, Math.PI * 2);
  rawCtx.arc(p.x, p.y, rRaw, 0, Math.PI * 2, true);
  rawCtx.fillStyle = glowGrad;
  rawCtx.fill("evenodd");
  rawCtx.restore();

  // 円のフチ
  rawCtx.beginPath();
  rawCtx.arc(p.x, p.y, rRaw, 0, Math.PI * 2);
  rawCtx.lineWidth = Math.max(1, rRaw * 0.02);
  rawCtx.strokeStyle = "#000";
  rawCtx.stroke();
}

  function drawFx() {
  if (!outCtx || !outCanvas) return;

  const outW = outCanvas.width;
  const outH = outCanvas.height;

  tmpCtx.imageSmoothingEnabled = false;
  tmpCtx.clearRect(0, 0, outW, outH);
  tmpCtx.drawImage(rawCanvas, 0, 0, rawCanvas.width, rawCanvas.height, 0, 0, outW, outH);

  if (mode === "dither") {
    outCtx.clearRect(0, 0, outW, outH);

    // 折り目を消すための背景だけは out 側に描く
    // なのでこれは ascii / dither 化されない
    drawMoonBackingToOut();

    // 月本体 + グローは raw 側にあるので、一緒に dither 化される
    applyMoonDither(tmpCtx, outW, outH, 3);
    outCtx.drawImage(tmpCanvas, 0, 0);
    return;
  }

  if (mode === "ascii") {
    const now = performance.now();
    const interval = 1000 / asciiFps;
    if (now - lastAsciiAt < interval) return;
    lastAsciiAt = now;

    outCtx.clearRect(0, 0, outW, outH);

    // 背景だけ非ascii
    drawMoonBackingToOut();

    // 月本体 + グローは ascii 化
    renderMoonAscii(tmpCtx, outW, outH, outCtx, outW, outH);
    return;
  }

  outCtx.clearRect(0, 0, outW, outH);
  drawMoonBackingToOut();
  outCtx.drawImage(tmpCanvas, 0, 0);
}

  function loop() {
    if (!active) return;
    drawMoonSphere();
    drawFx();
    raf = requestAnimationFrame(loop);
  }

  function getMoonRectDesign() {
  return {
    x: moon.cx - moon.r,
    y: moon.cy - moon.r,
    w: moon.r * 2,
    h: moon.r * 2
  };
}

function beginDragFromClient(clientX, clientY) {
  if (!active || !outCanvas || texLocked) return false;

  const rect = outCanvas.getBoundingClientRect();
  const sx = outCanvas.width / rect.width;
  const sy = outCanvas.height / rect.height;

  const pxRaw = (clientX - rect.left) * sx * fxScale;
  const pyRaw = (clientY - rect.top) * sy * fxScale;
  const d = rawToDesign(pxRaw, pyRaw);

  dragging = true;
  grabDx = d.xD;
  grabDy = d.yD;

  dragStartTexOffsetX = texOffsetX;
  dragStartTexOffsetY = texOffsetY;

  return true;
}

function moveDragFromClient(clientX, clientY) {
  if (!active || !outCanvas || !dragging) return;
  if (texLocked) return;

  const rect = outCanvas.getBoundingClientRect();
  const sx = outCanvas.width / rect.width;
  const sy = outCanvas.height / rect.height;

  const pxRaw = (clientX - rect.left) * sx * fxScale;
  const pyRaw = (clientY - rect.top) * sy * fxScale;
  const d = rawToDesign(pxRaw, pyRaw);

  const maxOffsetX = Math.max(0, (texWDesign - moon.r * 2) / 2);
  const maxOffsetY = Math.max(0, (texHDesign - moon.r * 2) / 2);

  const nextOffsetX = dragStartTexOffsetX + (d.xD - grabDx);
  const nextOffsetY = dragStartTexOffsetY + (d.yD - grabDy);

  const clampedX = clamp(nextOffsetX, -maxOffsetX, maxOffsetX);
  const clampedY = clamp(nextOffsetY, -maxOffsetY, maxOffsetY);

  texOffsetX = clampedX;
  texOffsetY = clampedY;

  if (clampedX !== nextOffsetX) {
    texLocked = true;
    dragging = false;
  }
}

function endDrag() {
  dragging = false;
}

  function bindPointer() {
  if (!outCanvas || pointerBound) return;
  pointerBound = true;

  // canvas 自体はジェスチャーを邪魔しない
  outCanvas.style.touchAction = "pinch-zoom";
  outCanvas.style.pointerEvents = "none";

  bindPointer._onDown = null;
  bindPointer._onMove = null;
  bindPointer._onUp = null;
}

  function unbindPointer() {
  if (!outCanvas || !pointerBound) return;

  if (bindPointer._onDown) {
    outCanvas.removeEventListener("pointerdown", bindPointer._onDown);
  }
  if (bindPointer._onMove) {
    outCanvas.removeEventListener("pointermove", bindPointer._onMove);
  }
  if (bindPointer._onUp) {
    outCanvas.removeEventListener("pointerup", bindPointer._onUp);
    outCanvas.removeEventListener("pointercancel", bindPointer._onUp);
  }

  bindPointer._onDown = bindPointer._onMove = bindPointer._onUp = null;
  pointerBound = false;
}

  return {
    async start(canvasEl, opts = {}) {
      this.stop();

      outCanvas = canvasEl;
      outCtx = outCanvas.getContext("2d", { willReadFrequently: true, alpha: true });

      mode = opts.mode || "dither";
      fxScale = (typeof opts.fxScale === "number") ? opts.fxScale : 0.55;
      asciiFps = (typeof opts.asciiFps === "number") ? opts.asciiFps : 12;

      moon.cx = (typeof opts.cx === "number") ? opts.cx : 960;
      moon.cy = (typeof opts.cy === "number") ? opts.cy : 540;
      moon.r  = (typeof opts.r  === "number") ? opts.r  : 250;

      baseY = moon.cy;
      verticalRange = (typeof opts.verticalRange === "number") ? opts.verticalRange : 80;

      texScale = (typeof opts.texScale === "number") ? opts.texScale : 8.0;

      // 月画像を先にロード
      if (!loaded) {
        await loadAll();
      }

      // テクスチャーサイズを design座標で計算
      texWDesign = moon.r * 2 * texScale;
      texHDesign = texWDesign * (imgMoon.height / imgMoon.width);

      // 初回だけ中央ぴったりで初期化
      if (!texInitialized) {
        texOffsetX = 0;
        texOffsetY = 0;
        texInitialized = true;
      }

      // 毎回、現在位置を開始基準にそろえる
      dragStartTexOffsetX = texOffsetX;
      dragStartTexOffsetY = texOffsetY;

      dragging = false;
      lastAsciiAt = 0;

      resizeCanvases();

      bindPointer();
      active = true;
      raf = requestAnimationFrame(loop);
    },

    stop() {
      active = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;

      unbindPointer();

      if (outCtx && outCanvas) {
        outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
      }

      outCanvas = null;
      outCtx = null;
      dragging = false;
      lastAsciiAt = 0;
    },

    beginDragFromClient,
    moveDragFromClient,
    endDrag,
    getMoonRect() {
      return getMoonRectDesign();
    },

    setMode(nextMode) {
      mode = nextMode || "dither";
      lastAsciiAt = 0;
    },

    resize() {},

    get active() { return active; }
  };
})();

// =====================
// LastDoorEngine（page 16）
// - 懐中電灯をドラッグで回転
// - 光が当たっている間だけカバン/扉がクリック可能
// - カバンを開けると手紙が落ちる
// - 扉は左開き
// - 扉を開いたあと、再クリックで全体がふっと消える
// - mode: "dither" | "ascii"
// =====================
const LastDoorEngine = (function () {
  let active = false;
  let outCanvas = null;
  let outCtx = null;

  const rawCanvas = document.createElement("canvas");
  const rawCtx = rawCanvas.getContext("2d", { willReadFrequently: true, alpha: true });

  const tmpCanvas = document.createElement("canvas");
  const tmpCtx = tmpCanvas.getContext("2d", { willReadFrequently: true, alpha: true });

  const darkCanvas = document.createElement("canvas");
  const darkCtx = darkCanvas.getContext("2d", { willReadFrequently: true, alpha: true });

  const featherCanvas = document.createElement("canvas");
  const featherCtx = featherCanvas.getContext("2d", { willReadFrequently: true, alpha: true });

  const featherBlurCanvas = document.createElement("canvas");
  const featherBlurCtx = featherBlurCanvas.getContext("2d", { willReadFrequently: true, alpha: true });

  const imgFlashlight = new Image();
  const imgBagClose = new Image();
  const imgBagOpen = new Image();
  const imgLetter = new Image();

  let loaded = false;

  let mode = "dither";
  let raf = 0;
  let lastAsciiAt = 0;

  let fxScale = 0.55;
  let asciiFps = 12;

  const CROP_X = 228, CROP_Y = 129, CROP_W = 1453, CROP_H = 854;

  // ===== レイアウト（1920x1080 左上基準）=====
  let layout = null;

  const DEFAULT_LAYOUT = {
    flashlight: { x: 960, y: 715, w: 200, h: 250 },
    beamDeg: 40,
    poemSafeStripX: 1640, // 右端の詩エリアを少し暗闇から外す。後で調整しやすいように変数化
    safeLeft: 20,
    safeTop: 20,
    safeBottom: 20,
    bagClosed: { x: 1160, y: 248, w: 200, h: 400 },
    bagOpen:   { x: 1160, y: 248, w: 200, h: 400 },
    letterSpawn: { x: 1210, y: 491, w: 150, h: 100 },
    letterDrop:  { x: 1235, y: 648, w: 150, h: 100 },
    doorOuter: { x: 484, y: 352, w: 225, h: 396 },
    knob: { x: 648, y: 541, w: 27, h: 27 },
    doorPts: {
      A:  { x: 501, y: 369 },
      B:  { x: 501, y: 730 },
      C:  { x: 692, y: 369 },
      D:  { x: 692, y: 730 },
      Cp: { x: 336, y: 448 },
      Dp: { x: 336, y: 810 },
    }
  };

  // ===== 状態 =====
  let draggingAim = false;

  // 初期角度は上向きやや左寄り
  let angleRad = degToRad(-95);
  let targetAngleRad = degToRad(-95);  // 目標角度
  const angleEase = 0.12;              // 0〜1 小さいほどゆっくり
  const MIN_ANGLE = degToRad(-165);
  const MAX_ANGLE = degToRad(-15);

  let bagOpened = false;

  let letterVisible = false;
  let letterDropped = false;
  let letterAnim = {
    active: false,
    startAt: 0,
    dur: 700,
    t: 0
  };

  let doorOpening = false;
  let doorOpened = false;
  let doorOpenT = 0; // 0..1
  const DOOR_OPEN_DUR = 700;

  let vanishing = false;
  let vanished = false;
  let vanishT = 0; // 0..1
  const VANISH_DUR = 320;

  function degToRad(d) { return d * Math.PI / 180; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function pointToSegmentDistance(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;

  const abLenSq = abx * abx + aby * aby;
  if (abLenSq === 0) {
    const dx = px - ax;
    const dy = py - ay;
    return Math.sqrt(dx * dx + dy * dy);
  }

  let t = (apx * abx + apy * aby) / abLenSq;
  t = Math.max(0, Math.min(1, t));

  const cx = ax + abx * t;
  const cy = ay + aby * t;

  const dx = px - cx;
  const dy = py - cy;
  return Math.sqrt(dx * dx + dy * dy);
}

  function normalizeNear(angle, base) {
    while (angle - base > Math.PI) angle -= Math.PI * 2;
    while (angle - base < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  function getRenderSize(canvas) {
    const dpr = getFixedDpr();
    const BASE_W = 1453;
    const BASE_H = 854;
    return {
      w: Math.round(BASE_W * dpr),
      h: Math.round(BASE_H * dpr),
      dpr
    };
  }

  function resizeCanvases() {
    if (!outCanvas) return;

    const { w, h } = getRenderSize(outCanvas);

    if (outCanvas.width !== w || outCanvas.height !== h) {
      outCanvas.width = w;
      outCanvas.height = h;
    }

    const rw = Math.max(1, Math.floor(w * fxScale));
    const rh = Math.max(1, Math.floor(h * fxScale));

    if (rawCanvas.width !== rw || rawCanvas.height !== rh) {
      rawCanvas.width = rw;
      rawCanvas.height = rh;
    }
    if (tmpCanvas.width !== w || tmpCanvas.height !== h) {
      tmpCanvas.width = w;
      tmpCanvas.height = h;
    }
    if (darkCanvas.width !== rw || darkCanvas.height !== rh) {
      darkCanvas.width = rw;
      darkCanvas.height = rh;
    }

    if (featherCanvas.width !== rw || featherCanvas.height !== rh) {
      featherCanvas.width = rw;
      featherCanvas.height = rh;
    }
    if (featherBlurCanvas.width !== rw || featherBlurCanvas.height !== rh) {
      featherBlurCanvas.width = rw;
      featherBlurCanvas.height = rh;
    }
  }

  function designToRaw(xD, yD) {
    const lx = xD - CROP_X;
    const ly = yD - CROP_Y;
    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;
    return { x: lx * sx, y: ly * sy };
  }

  function sizeToRaw(wD, hD) {
    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;
    return { w: wD * sx, h: hD * sy };
  }

  function rawToDesign(pxRaw, pyRaw) {
    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;
    return {
      xD: pxRaw / sx + CROP_X,
      yD: pyRaw / sy + CROP_Y
    };
  }

  function canvasPointFromEvent(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * sx,
      y: (e.clientY - rect.top) * sy
    };
  }

  function getFlashPivotDesign() {
    return {
      x: layout.flashlight.x + layout.flashlight.w / 2,
      y: layout.flashlight.y + layout.flashlight.h / 2
    };
  }

  function getBeamMaxLenDesign() {
    const pivot = getFlashPivotDesign();
    const dx = Math.max(pivot.x - CROP_X, CROP_X + CROP_W - pivot.x);
    const dy = Math.max(pivot.y - CROP_Y, CROP_Y + CROP_H - pivot.y);
    return Math.sqrt(dx * dx + dy * dy) + 80;
  }

  function pointInBeam(xD, yD) {
    if (vanished) return false;

    const pivot = getFlashPivotDesign();
    const dx = xD - pivot.x;
    const dy = yD - pivot.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxLen = getBeamMaxLenDesign();

    if (dist > maxLen) return false;

    const a = Math.atan2(dy, dx);
    let diff = a - angleRad;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    return Math.abs(diff) <= degToRad(layout.beamDeg / 2);
  }

  function rectHitByBeam(rect) {
    const pts = [
      { x: rect.x + rect.w * 0.5, y: rect.y + rect.h * 0.5 },
      { x: rect.x + rect.w * 0.2, y: rect.y + rect.h * 0.2 },
      { x: rect.x + rect.w * 0.8, y: rect.y + rect.h * 0.2 },
      { x: rect.x + rect.w * 0.2, y: rect.y + rect.h * 0.8 },
      { x: rect.x + rect.w * 0.8, y: rect.y + rect.h * 0.8 },
    ];
    for (let i = 0; i < pts.length; i++) {
      if (pointInBeam(pts[i].x, pts[i].y)) return true;
    }
    return false;
  }

  function pointInRectD(xD, yD, rect) {
    return xD >= rect.x && xD <= rect.x + rect.w && yD >= rect.y && yD <= rect.y + rect.h;
  }

    function pointInFlashlightHit(xD, yD) {
    const r = layout.flashlight;

    // まずは少し広めの矩形当たり判定
    const padX = 18;
    const padY = 18;

    return (
      xD >= r.x - padX &&
      xD <= r.x + r.w + padX &&
      yD >= r.y - padY &&
      yD <= r.y + r.h + padY
    );
  }

  function currentLetterRect() {
    if (!letterVisible) return null;

    const t = letterAnim.active ? easeOutCubic(letterAnim.t) : 1;
    return {
      x: lerp(layout.letterSpawn.x, layout.letterDrop.x, t),
      y: lerp(layout.letterSpawn.y, layout.letterDrop.y, t),
      w: lerp(layout.letterSpawn.w, layout.letterDrop.w, t),
      h: lerp(layout.letterSpawn.h, layout.letterDrop.h, t),
    };
  }

  function getDoorPanelPts(t) {
    const P = layout.doorPts;
    return {
      A:  { x: P.A.x, y: P.A.y },
      B:  { x: P.B.x, y: P.B.y },
      C:  { x: lerp(P.C.x,  P.Cp.x, t), y: lerp(P.C.y,  P.Cp.y, t) },
      D:  { x: lerp(P.D.x,  P.Dp.x, t), y: lerp(P.D.y,  P.Dp.y, t) },
    };
  }

  function getKnobCenter(t) {
  const closedCx = layout.knob.x + layout.knob.w / 2;
  const closedCy = layout.knob.y + layout.knob.h / 2;

  // ★ 開いたときの最終位置
  const openCx = 349;
  const openCy = 603;

  return {
    x: lerp(closedCx, openCx, t),
    y: lerp(closedCy, openCy, t)
  };
}

  function drawImageDesign(ctx, img, rectD, rotateRad = 0, rotateCenterD = null) {
    const p = designToRaw(rectD.x, rectD.y);
    const s = sizeToRaw(rectD.w, rectD.h);

    if (!rotateRad) {
      ctx.drawImage(img, p.x, p.y, s.w, s.h);
      return;
    }

    const cxD = rotateCenterD ? rotateCenterD.x : (rectD.x + rectD.w / 2);
    const cyD = rotateCenterD ? rotateCenterD.y : (rectD.y + rectD.h / 2);
    const c = designToRaw(cxD, cyD);

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(rotateRad);
    ctx.translate(-c.x, -c.y);
    ctx.drawImage(img, p.x, p.y, s.w, s.h);
    ctx.restore();
  }

  function drawDoorContent(ctx, alphaMul = 1) {
  const t = easeInOutQuad(doorOpenT);
  const P = layout.doorPts;

  // 固定の黒い四角（奥）
  const A0 = designToRaw(P.A.x, P.A.y);
  const B0 = designToRaw(P.B.x, P.B.y);
  const C0 = designToRaw(P.C.x, P.C.y);
  const D0 = designToRaw(P.D.x, P.D.y);

  // 動く白いドア（手前）
  const movingPts = getDoorPanelPts(t);
  const A1 = designToRaw(movingPts.A.x, movingPts.A.y);
  const B1 = designToRaw(movingPts.B.x, movingPts.B.y);
  const C1 = designToRaw(movingPts.C.x, movingPts.C.y);
  const D1 = designToRaw(movingPts.D.x, movingPts.D.y);

  // 大枠
  const po = designToRaw(layout.doorOuter.x, layout.doorOuter.y);
  const so = sizeToRaw(layout.doorOuter.w, layout.doorOuter.h);

  ctx.save();
  ctx.globalAlpha *= alphaMul;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#000";
  ctx.lineWidth = Math.max(3.0, rawCanvas.width * 0.0045);

  // ===== ドアの大枠 =====
  ctx.strokeRect(po.x, po.y, so.w, so.h);

  // ===== 奥の黒い四角 ABCD =====
  ctx.save();
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.moveTo(A0.x, A0.y);
  ctx.lineTo(C0.x, C0.y);
  ctx.lineTo(D0.x, D0.y);
  ctx.lineTo(B0.x, B0.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // ===== 手前の白いドア ABC'D' =====
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(A1.x, A1.y);
  ctx.lineTo(C1.x, C1.y);
  ctx.lineTo(D1.x, D1.y);
  ctx.lineTo(B1.x, B1.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // ===== ノブ（動くドアの上） =====
  const knob = getKnobCenter(t);
  const rk = designToRaw(knob.x, knob.y);
  const sk = sizeToRaw(layout.knob.w, layout.knob.h);
  const knobR = Math.max(sk.w, sk.h) * 0.5;

  // design座標で判定する
  const knobRadiusD = layout.knob.w * 0.5;
  const abX = layout.doorPts.A.x; // 固定辺ABのx座標

  // ノブの左端がABに当たったら消す
  const knobHitAB = (knob.x - knobRadiusD) <= abX;

  if (!knobHitAB) {
    ctx.beginPath();
    ctx.arc(rk.x, rk.y, knobR, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

  function drawSceneContent(alphaMul = 1) {
    rawCtx.save();
    rawCtx.globalAlpha = alphaMul;

    // カバン
    if (!bagOpened) {
      drawImageDesign(rawCtx, imgBagClose, layout.bagClosed);
    } else {
      drawImageDesign(rawCtx, imgBagOpen, layout.bagOpen);
    }

    // 手紙
    if (letterVisible) {
      drawImageDesign(rawCtx, imgLetter, currentLetterRect());
    }

    // 扉
    drawDoorContent(rawCtx, 1);

    rawCtx.restore();
  }

  function drawDarkMask() {
    darkCtx.clearRect(0, 0, darkCanvas.width, darkCanvas.height);
    darkCtx.fillStyle = "#000";
    darkCtx.fillRect(0, 0, darkCanvas.width, darkCanvas.height);

    // 光コーンと右端の詩エリアだけ抜く
    darkCtx.save();
    darkCtx.globalCompositeOperation = "destination-out";

    // 右端詩エリア
    const safeX = designToRaw(layout.poemSafeStripX, CROP_Y).x;
    darkCtx.fillRect(safeX, 0, darkCanvas.width - safeX, darkCanvas.height);

    // 左・上・下の余白も常に見せる
    const safeLeftX = designToRaw(CROP_X + (layout.safeLeft || 0), CROP_Y).x;
    const safeTopY = designToRaw(CROP_X, CROP_Y + (layout.safeTop || 0)).y;
    const safeBottomY = designToRaw(CROP_X, CROP_Y + CROP_H - (layout.safeBottom || 0)).y;

    // 左余白
    darkCtx.fillRect(0, 0, safeLeftX, darkCanvas.height);

    // 上余白
    darkCtx.fillRect(0, 0, darkCanvas.width, safeTopY);

    // 下余白
    darkCtx.fillRect(0, safeBottomY, darkCanvas.width, darkCanvas.height - safeBottomY);

        // 光コーン
    const pivotD = getFlashPivotDesign();
    const pivot = designToRaw(pivotD.x, pivotD.y);
    const lenD = getBeamMaxLenDesign();

    const half = degToRad(layout.beamDeg / 2);

    // 外側ふち設定
    const featherDeg = 18;
    const featherBlur = 22;
    const featherAlpha = 0.35;
    const outerHalf = degToRad((layout.beamDeg + featherDeg) / 2);

    // ===== まず別キャンバスに「ふち用コーン」を描く =====
    featherCtx.clearRect(0, 0, featherCanvas.width, featherCanvas.height);
    featherCtx.fillStyle = "#000";
    featherCtx.globalAlpha = 1;

    const outerP1D = {
      x: pivotD.x + Math.cos(angleRad - outerHalf) * lenD,
      y: pivotD.y + Math.sin(angleRad - outerHalf) * lenD
    };
    const outerP2D = {
      x: pivotD.x + Math.cos(angleRad + outerHalf) * lenD,
      y: pivotD.y + Math.sin(angleRad + outerHalf) * lenD
    };
    const outerP1 = designToRaw(outerP1D.x, outerP1D.y);
    const outerP2 = designToRaw(outerP2D.x, outerP2D.y);

    featherCtx.beginPath();
    featherCtx.moveTo(pivot.x, pivot.y);
    featherCtx.lineTo(outerP1.x, outerP1.y);
    featherCtx.lineTo(outerP2.x, outerP2.y);
    featherCtx.closePath();
    featherCtx.fill();

    // ===== それを別キャンバスにぼかしてコピー =====
    featherBlurCtx.clearRect(0, 0, featherBlurCanvas.width, featherBlurCanvas.height);
    featherBlurCtx.save();
    featherBlurCtx.filter = `blur(${featherBlur}px)`;
    featherBlurCtx.drawImage(featherCanvas, 0, 0);
    featherBlurCtx.restore();

    // ===== ぼかした外側コーンを darkCtx から少しだけ削る =====
    darkCtx.save();
    darkCtx.globalAlpha = featherAlpha;
    darkCtx.drawImage(featherBlurCanvas, 0, 0);
    darkCtx.restore();

    // ===== 本来の光コーンをくっきり抜く =====
    const p1D = {
      x: pivotD.x + Math.cos(angleRad - half) * lenD,
      y: pivotD.y + Math.sin(angleRad - half) * lenD
    };
    const p2D = {
      x: pivotD.x + Math.cos(angleRad + half) * lenD,
      y: pivotD.y + Math.sin(angleRad + half) * lenD
    };
    const p1 = designToRaw(p1D.x, p1D.y);
    const p2 = designToRaw(p2D.x, p2D.y);

    darkCtx.beginPath();
    darkCtx.moveTo(pivot.x, pivot.y);
    darkCtx.lineTo(p1.x, p1.y);
    darkCtx.lineTo(p2.x, p2.y);
    darkCtx.closePath();
    darkCtx.fill();

    darkCtx.restore();

    rawCtx.drawImage(darkCanvas, 0, 0);
  }

  function drawFlashlight(alphaMul = 1) {
    const pivot = getFlashPivotDesign();
    drawImageDesign(rawCtx, imgFlashlight, layout.flashlight, angleRad + Math.PI / 2, pivot);
  }

  function drawRaw() {
    rawCtx.clearRect(0, 0, rawCanvas.width, rawCanvas.height);

    if (vanished) return;

    const fadeAlpha = vanishing ? (1 - vanishT) : 1;

    drawSceneContent(fadeAlpha);
    drawDarkMask();

    // 懐中電灯は暗闇の上に描く
    rawCtx.save();
    rawCtx.globalAlpha = fadeAlpha;
    drawFlashlight(1);
    rawCtx.restore();
  }

  function stampDot(data, w, h, x, y, size) {
    const r = Math.floor(size / 2);
    for (let yy = -r; yy <= r; yy++) {
      for (let xx = -r; xx <= r; xx++) {
        const nx = x + xx, ny = y + yy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = (ny * w + nx) * 4;
        data[j] = data[j + 1] = data[j + 2] = 0;
        data[j + 3] = 255;
      }
    }
  }

  function applyCoarseDotDither(ctxSrc, w, h, scale = 3) {
    const im = ctxSrc.getImageData(0, 0, w, h);
    const d = im.data;
    const DOT = 3;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 10) continue;

        const r = d[i], g = d[i + 1], b = d[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

        const bx = Math.floor(x / scale);
        const by = Math.floor(y / scale);
        const px = bx * scale + Math.floor(scale / 2);
        const py = by * scale + Math.floor(scale / 2);
        const isDot = (x === px && y === py);

        const ink = (lum < 0.6);
        if (ink && isDot) {
          stampDot(d, w, h, x, y, DOT);
        } else {
          d[i + 3] = 0;
        }
      }
    }

    ctxSrc.putImageData(im, 0, 0);
  }

  function hash01(ix, iy) {
    const s = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123;
    return s - Math.floor(s);
  }

  function renderAsciiInk(ctxSrc, w, h, ctxOut, outW, outH) {
    const cell = 8;
    const cols = Math.max(1, Math.floor(outW / cell));
    const rows = Math.max(1, Math.floor(outH / cell));

    const tiny = document.createElement("canvas");
    tiny.width = cols;
    tiny.height = rows;
    const tctx = tiny.getContext("2d", { willReadFrequently: true });

    tctx.imageSmoothingEnabled = true;
    tctx.clearRect(0, 0, cols, rows);
    tctx.drawImage(ctxSrc.canvas, 0, 0, w, h, 0, 0, cols, rows);

    tctx.filter = "blur(0.45px)";
    tctx.drawImage(tiny, 0, 0);
    tctx.filter = "none";

    const im = tctx.getImageData(0, 0, cols, rows).data;
    const CHARSET = "x+*.:;-=~#o0&O";
    const inkThreshold = 0.002;

    ctxOut.clearRect(0, 0, outW, outH);
    ctxOut.fillStyle = "#000";
    ctxOut.textAlign = "center";
    ctxOut.textBaseline = "middle";

    const fontSize = Math.floor(cell * 1.05);
    ctxOut.font =
      `550 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const a = im[i + 3];
        if (a < 10) continue;

        const r = im[i], g = im[i + 1], b = im[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const ink = 1 - lum;
        if (ink < inkThreshold) continue;

        const rr = hash01(x + 19, y + 73);
        const ch = CHARSET[Math.floor(rr * CHARSET.length)];

        const cx = (x + 0.5) * cell;
        const cy = (y + 0.52) * cell;
        ctxOut.fillText(ch, cx, cy);
      }
    }
  }

  function drawFx() {
    if (!outCtx || !outCanvas) return;

    const outW = outCanvas.width;
    const outH = outCanvas.height;

    tmpCtx.clearRect(0, 0, outW, outH);
    tmpCtx.imageSmoothingEnabled = false;
    tmpCtx.drawImage(rawCanvas, 0, 0, rawCanvas.width, rawCanvas.height, 0, 0, outW, outH);

    if (mode === "dither") {
      outCtx.clearRect(0, 0, outW, outH);
      applyCoarseDotDither(tmpCtx, outW, outH, 3);
      outCtx.drawImage(tmpCanvas, 0, 0);
      return;
    }

    if (mode === "ascii") {
      const now = performance.now();
      const interval = 1000 / asciiFps;
      if (now - lastAsciiAt < interval) return;
      lastAsciiAt = now;

      renderAsciiInk(tmpCtx, outW, outH, outCtx, outW, outH);
    }
  }

  function updateState() {
    const now = performance.now();

    if (letterAnim.active) {
      const t = clamp((now - letterAnim.startAt) / letterAnim.dur, 0, 1);
      letterAnim.t = t;
      if (t >= 1) {
        letterAnim.active = false;
        letterDropped = true;
      }
    }

    if (doorOpening) {
      doorOpenT += 16 / DOOR_OPEN_DUR;
      if (doorOpenT >= 1) {
        doorOpenT = 1;
        doorOpening = false;
        doorOpened = true;
      }
    }

    if (vanishing) {
      vanishT += 16 / VANISH_DUR;
      if (vanishT >= 1) {
        vanishT = 1;
        vanishing = false;
        vanished = true;
      }
    }

    // 角度をゆっくり追従させる
    angleRad += (targetAngleRad - angleRad) * angleEase;

  }

  function startLetterDrop() {
    letterVisible = true;
    letterDropped = false;
    letterAnim.active = true;
    letterAnim.startAt = performance.now();
    letterAnim.t = 0;
  }

  function tick() {
    if (!active) return;
    updateState();
    drawRaw();
    drawFx();
    raf = requestAnimationFrame(tick);
  }

  async function loadAll() {
    loaded = false;

    const jobs = [
      { img: imgFlashlight, src: "assets/flashlight.webp" },
      { img: imgBagClose, src: "assets/bagclose.webp" },
      { img: imgBagOpen, src: "assets/bagopen.webp" },
      { img: imgLetter, src: "assets/letter.webp" },
    ];

    await Promise.all(jobs.map(({ img, src }) => new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => rej(new Error("lastdoor asset failed: " + src));
      img.src = src;
    })));

    loaded = true;
  }

    function setAngleFromPointer(pxRaw, pyRaw) {
    const d = rawToDesign(pxRaw, pyRaw);
    const pivot = getFlashPivotDesign();

    let a = Math.atan2(d.yD - pivot.y, d.xD - pivot.x);

    // 今の角度に近い側へ寄せる
    a = normalizeNear(a, angleRad);

    // そのうえで制限
    targetAngleRad = clamp(a, MIN_ANGLE, MAX_ANGLE);
  }

  function bindPointer() {
    if (!outCanvas) return;

    outCanvas.style.pointerEvents = "auto";
    outCanvas.style.touchAction = "none";

      function onDown(e) {
      if (!active || vanished) return;

      const p = canvasPointFromEvent(e, outCanvas);
      const pxRaw = p.x * fxScale;
      const pyRaw = p.y * fxScale;
      const d = rawToDesign(pxRaw, pyRaw);

      const bagRect = bagOpened ? layout.bagOpen : layout.bagClosed;
      const doorRect = layout.doorOuter;

      // 懐中電灯の上を押した時だけドラッグ開始
      if (pointInFlashlightHit(d.xD, d.yD)) {
        draggingAim = true;
        setAngleFromPointer(pxRaw, pyRaw);
        try { outCanvas.setPointerCapture(e.pointerId); } catch (_) {}
        return;
      }

      // カバン
      if (!bagOpened && pointInRectD(d.xD, d.yD, bagRect) && rectHitByBeam(bagRect)) {
        bagOpened = true;
        startLetterDrop();
        return;
      }

      // 扉
      if (pointInRectD(d.xD, d.yD, doorRect) && rectHitByBeam(doorRect)) {
        if (letterDropped && !doorOpened && !doorOpening) {
          doorOpening = true;
          return;
        } else if (doorOpened && !vanishing) {
          vanishing = true;
          return;
        }
      }
    }

    function onMove(e) {
      if (!active || vanished) return;
      if (!draggingAim) return;

      const p = canvasPointFromEvent(e, outCanvas);
      const pxRaw = p.x * fxScale;
      const pyRaw = p.y * fxScale;
      setAngleFromPointer(pxRaw, pyRaw);
    }

    function onUp(e) {
      draggingAim = false;
      try { outCanvas.releasePointerCapture(e.pointerId); } catch (_) {}
    }

    outCanvas.addEventListener("pointerdown", onDown);
    outCanvas.addEventListener("pointermove", onMove);
    outCanvas.addEventListener("pointerup", onUp);
    outCanvas.addEventListener("pointercancel", onUp);

    bindPointer._onDown = onDown;
    bindPointer._onMove = onMove;
    bindPointer._onUp = onUp;
  }

  function unbindPointer() {
    if (!outCanvas) return;
    if (bindPointer._onDown) outCanvas.removeEventListener("pointerdown", bindPointer._onDown);
    if (bindPointer._onMove) outCanvas.removeEventListener("pointermove", bindPointer._onMove);
    if (bindPointer._onUp) {
      outCanvas.removeEventListener("pointerup", bindPointer._onUp);
      outCanvas.removeEventListener("pointercancel", bindPointer._onUp);
    }
    bindPointer._onDown = null;
    bindPointer._onMove = null;
    bindPointer._onUp = null;
  }

  return {
    async start(canvasEl, opts = {}) {
      this.stop();

      outCanvas = canvasEl;
      outCtx = outCanvas.getContext("2d", { willReadFrequently: true, alpha: true });

      mode = opts.mode || "dither";
      fxScale = (typeof opts.fxScale === "number") ? opts.fxScale : 0.55;
      asciiFps = (typeof opts.asciiFps === "number") ? opts.asciiFps : 12;

      layout = {
        ...DEFAULT_LAYOUT,
        ...opts.layout,
        doorPts: {
          ...DEFAULT_LAYOUT.doorPts,
          ...(opts.layout?.doorPts || {})
        }
      };

      // 状態リセット
      draggingAim = false;
      angleRad = degToRad(-95);

      bagOpened = false;

      letterVisible = false;
      letterDropped = false;
      letterAnim.active = false;
      letterAnim.startAt = 0;
      letterAnim.t = 0;

      doorOpening = false;
      doorOpened = false;
      doorOpenT = 0;

      vanishing = false;
      vanished = false;
      vanishT = 0;

      resizeCanvases();

      if (!loaded) {
        await loadAll();
      }

      bindPointer();
      active = true;
      raf = requestAnimationFrame(tick);
    },

    stop() {
      active = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;

      unbindPointer();

      if (outCtx && outCanvas) {
        outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
      }

      outCanvas = null;
      outCtx = null;
      draggingAim = false;
      lastAsciiAt = 0;
      layout = null;
    },

    setMode(nextMode) {
      mode = nextMode || "dither";
      lastAsciiAt = 0;
    },

    resize() {
      // 固定レンダーなので何もしない
    },

    get active() { return active; }
  };
})();

// =====================
// アセット
// =====================
function getAsset(prefix, suffix) {
  const mode = lampOn ? "on" : "off";
  return "assets/" + prefix + "_" + mode + "_" + suffix + ".webp";
}

function getCoffeeSteamSrc(frameIndex) {
  const mode = lampOn ? "on" : "off";
  return "assets/coffee_" + mode + "_steam_" + frameIndex + ".webp";
}

function getCoffeeBannerSrc() {
  const mode = lampOn ? "on" : "off";
  return "assets/coffee_" + mode + "_banner.webp";
}

function getBlinkSrc(i) {
  return getAsset("book", "blink_" + i);
}

function getPageflipSrc(n) {
  return getAsset("book", "pageflip_" + n);
}

function getRadioAsset(suffix) {
  // assets/radio_on_open.webp みたいな命名想定
  return getAsset("radio", suffix);
}

function applyRadioVisuals() {
  if (!radioScene) return;

  // 背景（open）
  if (radioBg) radioBg.src = getRadioAsset("open");

  // 目盛り
  if (radioScale) radioScale.src = getRadioAsset("scale");

  // ノブ
  if (radioChannel) radioChannel.src = getRadioAsset("channel");
  if (radioVolume) radioVolume.src = getRadioAsset("volume");

  // ×（bookradioのcrossを使う）
  if (radioClose) {
    radioClose.style.backgroundImage = 'url("' + getAsset("bookradio", "cross") + '")';
  }

  // スイッチ（ON/OFFで画像切替）
  if (radioSwitchBtn) {
    const sw = radioOn ? "switchon" : "switchoff";
    radioSwitchBtn.style.backgroundImage = 'url("' + getRadioAsset(sw) + '")';

    // ✅ スイッチの当たり判定位置も切り替え
    const sx = radioOn ? 534 : 505;
    const sy = radioOn ? 347 : 435;
    radioScene.style.setProperty("--radio-switch-x", String(sx));
    radioScene.style.setProperty("--radio-switch-y", String(sy));
  }

  // ノブ角度反映（CSS変数でOK）
  if (radioScene) {
    radioScene.style.setProperty("--radio-channel-deg", radioChannelDeg + "deg");
    radioScene.style.setProperty("--radio-volume-deg", radioVolumeDeg + "deg");
  }

  // 目盛りの上下（＋で上がる＝マイナス方向へ動かす想定）
  // ★rangeは後で調整OK
  const chVal = clamp01(radioChannelDeg / 270);
  const rangePx = 805; // 目盛りの移動幅（仮）
  const y = -rangePx * chVal;     // 0 → -805
  radioScene.style.setProperty("--radio-scale-y", String(y));

  // 音量表示（ONのときだけ）
  if (radioVolLabel) {
    if (radioOn) {
      radioVolLabel.style.display = "flex";
      radioVolLabel.textContent = "音量：" + Math.round(clamp01(radioVolumeDeg / 270) * 100) + "%";
    } else {
      radioVolLabel.style.display = "none";
    }
  }
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

// =====================
// UI制御
// =====================

function setRadioSceneEnabled(enabled) {
  if (!radioScene) return;

  if (!enabled) {
    evacuateFocusFrom(radioScene, focusReturnEl || hitRadio || document.body);
  }
  setInertLike(radioScene, !enabled);

  radioScene.style.pointerEvents = enabled ? "auto" : "none";

  // 触れるUI
  const focusables = [radioClose, radioSwitchBtn];
  for (let i = 0; i < focusables.length; i++) {
    const el = focusables[i];
    if (!el) continue;
    el.tabIndex = enabled ? 0 : -1;
  }
}

function openRadio() {
  if (!started || scene !== "desk") return;
  if (!radioScene || !frame) return;

  focusReturnEl = document.activeElement instanceof HTMLElement ? document.activeElement : hitRadio;

  scene = "radio";
  frame.classList.remove("interactive");
  setDeskHotspotsEnabled(false);

  radioScene.hidden = false;
  setRadioSceneEnabled(true);

  applyRadioVisuals();
  radioClose?.focus?.();
}

function closeRadio() {
  if (scene !== "radio") return;
  if (!radioScene || !frame) return;

  setRadioSceneEnabled(false);
  radioScene.hidden = true;

  scene = "desk";
  frame.classList.add("interactive");
  setDeskHotspotsEnabled(true);

  (focusReturnEl || hitRadio || document.body).focus?.();
  focusReturnEl = null;
}

if (hitRadio) hitRadio.addEventListener("click", openRadio);
if (radioClose) radioClose.addEventListener("click", closeRadio);

function stopAllAudio() {
  if (audioNoise) { audioNoise.pause(); audioNoise.currentTime = 0; }
  if (audioMusic) { audioMusic.pause(); audioMusic.currentTime = 0; audioMusic.src = ""; }
}

function applyVolumeToAudio() {
  const v = clamp01(radioVolumeDeg / 270);
  if (audioNoise) audioNoise.volume = v;
  if (audioMusic) audioMusic.volume = v;
}

function decideTuning() {
  // 0..1 のどこにいるか
  const x = clamp01(radioChannelDeg / 270);

  // 10局：0..1 を 9分割（10点）
  const N = 10;
  const step = 1 / (N - 1);
  let nearest = 0;
  let best = 999;

  for (let i = 0; i < N; i++) {
    const p = i * step;
    const d = Math.abs(x - p);
    if (d < best) { best = d; nearest = i; }
  }

  const tolerance = 0.04; // ★後で調整（小さいほどシビア）
  if (best <= tolerance) {
    return nearest + 1; // 1..10
  }
  return null;
}

let lastPlaying = "none"; // "none" | "noise" | "music"

function playRadioAudio() {
  if (!radioOn) {
    stopAllAudio();
    lastPlaying = "none";
    return;
  }

  applyVolumeToAudio();

  const track = decideTuning();
  tunedTrack = track;

  if (track == null) {
    // 雑音
    if (lastPlaying !== "noise" && audioNoise) {
      audioNoise.currentTime = 0;
    }
    if (audioMusic) audioMusic.pause();
    if (audioNoise) {
      audioNoise.loop = true;
      audioNoise.play().catch(() => { });
    }
    lastPlaying = "noise";
    return;
  }

  // 曲
  if (audioNoise) audioNoise.pause();

  if (audioMusic) {
    audioMusic.loop = true; // ✅ 曲をループ
    const nextSrc = "assets/" + track + ".mp3";
    if (!audioMusic.src.includes(nextSrc)) {
      audioMusic.src = nextSrc;
      audioMusic.currentTime = 0;
    }
    audioMusic.play().catch(() => { });
  }
  lastPlaying = "music";
}

if (radioSwitchBtn) {
  radioSwitchBtn.addEventListener("click", function () {
    radioOn = !radioOn;
    applyRadioVisuals();
    playRadioAudio();
  });
}

function setupKnobDrag(imgEl, getDeg, setDeg, onChange, speed = 1) {
  if (!imgEl) return;

  let dragging = false;
  let lastAngle = 0;
  let currentDeg = 0;

  function angleFromEvent(e) {
    const rect = imgEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    return Math.atan2(dy, dx) * 180 / Math.PI; // -180..180
  }

  function normDelta(d) {
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d;
  }

  imgEl.addEventListener("pointerdown", function (e) {
    dragging = true;
    imgEl.setPointerCapture(e.pointerId);

    lastAngle = angleFromEvent(e);
    currentDeg = getDeg();
  });

  imgEl.addEventListener("pointermove", function (e) {
    if (!dragging) return;

    const a = angleFromEvent(e);

    // ✅ 「前回角度」からの差分だけを足していく
    const delta = normDelta(a - lastAngle) * speed;
    lastAngle = a;

    let next = currentDeg + delta;

    // 0..270でクランプ
    next = Math.max(0, Math.min(270, next));

    currentDeg = next;
    setDeg(next);
    onChange?.();
  });

  function end(e) {
    if (!dragging) return;
    dragging = false;
    try { imgEl.releasePointerCapture(e.pointerId); } catch (_) { }
  }
  imgEl.addEventListener("pointerup", end);
  imgEl.addEventListener("pointercancel", end);
}

// チャンネル：回すと目盛り＋曲/雑音が変わる（OFFでも目盛りは動かす）
setupKnobDrag(
  radioChannel,
  () => radioChannelDeg,
  (v) => { radioChannelDeg = v; },
  () => {
    applyRadioVisuals();
    // ONのときだけ音が変わる
    if (radioOn) playRadioAudio();
  },
  0.45 // ← チャンネルだけゆっくり
);

// 音量：OFFでも回せる。表示はONのときだけ。音量はONのときだけ反映。
setupKnobDrag(
  radioVolume,
  () => radioVolumeDeg,
  (v) => { radioVolumeDeg = v; },
  () => {
    applyRadioVisuals();
    if (radioOn) {
      applyVolumeToAudio();
      // 表示更新は applyRadioVisuals がやる
    }
  }
);


function setBookUiVisible(visible) {
  const v = visible ? "visible" : "hidden";
  if (bookPrev) bookPrev.style.visibility = v;
  if (bookNext) bookNext.style.visibility = v;
  if (bookClose) bookClose.style.visibility = v;
}

// deskホットスポットを確実にON/OFF（inert + pointer-events + disabled + tabindex）
function setDeskHotspotsEnabled(enabled) {
  if (!hitLayer) return;

  if ("inert" in hitLayer) {
    hitLayer.inert = !enabled;
  }
  hitLayer.style.pointerEvents = enabled ? "auto" : "none";

  const buttons = [hitLamp, hitBook, hitRadio, hitCoffee];
  for (let i = 0; i < buttons.length; i++) {
    const b = buttons[i];
    if (!b) continue;
    b.disabled = !enabled;
    b.tabIndex = enabled ? 0 : -1;
  }
}

function setBookSceneEnabled(enabled) {
  if (!bookScene) return;

  if (!enabled) {
    evacuateFocusFrom(bookScene, focusReturnEl || hitBook || document.body);
  }

  setInertLike(bookScene, !enabled);

  const focusables = [bookPrev, bookNext, bookClose];
  for (let i = 0; i < focusables.length; i++) {
    const el = focusables[i];
    if (!el) continue;
    el.tabIndex = enabled ? 0 : -1;
  }
}

// coffee-fx は演出用。フォーカス対象ではないので inert+hidden でOK
function setCoffeeFxVisible(visible) {
  if (!coffeeFx) return;
  if (visible) {
    coffeeFx.hidden = false;
    setInertLike(coffeeFx, false);
  } else {
    setInertLike(coffeeFx, true);
    coffeeFx.hidden = true;
  }
}

// =====================
// 詩テキスト
// =====================

// =====================
// Chips Bag Engine（page 5）
// =====================
const ChipsEngine = (function () {
  let active = false;

  let outCanvas = null;
  let outCtx = null;

  // raw合成用（縮小）
  const rawCanvas = document.createElement("canvas");
  const rawCtx = rawCanvas.getContext("2d", { willReadFrequently: true });

  // 出力用の拡大一時
  const tmpCanvas = document.createElement("canvas");
  const tmpCtx = tmpCanvas.getContext("2d", { willReadFrequently: true });

  let mode = "dither";
  let raf = 0;
  let lastAsciiAt = 0;

  let fxScale = 0.55;
  let asciiFps = 12;

  let chipScale = 1.0; // ★追加：chipの表示スケール（画像px→design）
  let adScale   = 1.3; // ★追加：adの表示スケール

  // design bounds (1920x1080) / crop constants
  const CROP_X = 228, CROP_Y = 129, CROP_W = 1453, CROP_H = 854;

  // assets
  const imgBag = new Image();
  const chipImgs = Array.from({ length: 5 }, () => new Image());
  const adImgs = Array.from({ length: 5 }, () => new Image());

  let loaded = false;

  // in-bag state: 0..9 (0..4 chips, 5..9 ads)
  let inBag = new Array(10).fill(true);

  // items on canvas (design coords)
  // { key, type:"chip"|"ad", idx:1..5, xD,yD,wD,hD }
  let items = [];

  // bag layout (design coords)
  let bagRect = { x: 392, y: 302, w: 400, h: 400 };

  // interaction state
  let pointerBound = false;
  let draggingItem = -1;
  let grabDx = 0, grabDy = 0;     // design offset
  let draggingBag = false;
  let bagGrabDx = 0, bagGrabDy = 0; // ★追加：袋を掴んだオフセット
  let lastBagY = 0;
  let shakeAccum = 0;
  let lastShakeAt = 0;

  let downAt = { xD: 0, yD: 0, t: 0 };
  let moved = false;

  // ad close hitboxes (percent of image)
  // {x,y,w,h} in 0..1
  const adCloseBox = {
    1: { x: 0.70, y: 0.20, w: 0.133, h: 0.22 },
    2: { x: 0.747, y: 0.20, w: 0.147, h: 0.16 },
    3: { x: 0.693, y: 0.267, w: 0.133, h: 0.147 },
    4: { x: 0.70, y: 0.293, w: 0.16, h: 0.167 },
    5: { x: 0.687, y: 0.27, w: 0.147, h: 0.21 },
  };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function getRenderSize(canvas) {
    const dpr = getFixedDpr();
    const BASE_W = 1453;
    const BASE_H = 854;
    return { w: Math.round(BASE_W * dpr), h: Math.round(BASE_H * dpr), dpr };
  }

  function resizeCanvases() {
    if (!outCanvas) return;
    const { w, h } = getRenderSize(outCanvas);

    if (outCanvas.width !== w || outCanvas.height !== h) {
      outCanvas.width = w;
      outCanvas.height = h;
    }

    const rw = Math.max(1, Math.floor(w * fxScale));
    const rh = Math.max(1, Math.floor(h * fxScale));
    if (rawCanvas.width !== rw || rawCanvas.height !== rh) {
      rawCanvas.width = rw;
      rawCanvas.height = rh;
    }
  }

  function designToRaw(xD, yD) {
    const lx = xD - CROP_X;
    const ly = yD - CROP_Y;
    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;
    return { x: lx * sx, y: ly * sy };
  }

  function sizeToRaw(wD, hD) {
    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;
    return { w: wD * sx, h: hD * sy };
  }

  function rawToDesign(pxRaw, pyRaw) {
    const sx = rawCanvas.width / CROP_W;
    const sy = rawCanvas.height / CROP_H;
    return { xD: (pxRaw / sx) + CROP_X, yD: (pyRaw / sy) + CROP_Y };
  }

  function canvasPointFromEvent(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  function hitRect(d, r) {
    return d.xD >= r.x && d.xD <= (r.x + r.w) && d.yD >= r.y && d.yD <= (r.y + r.h);
  }

  function pickItem(pxRaw, pyRaw) {
    const d = rawToDesign(pxRaw, pyRaw);
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (d.xD >= it.xD && d.xD <= it.xD + it.wD && d.yD >= it.yD && d.yD <= it.yD + it.hD) {
        return i;
      }
    }
    return -1;
  }

  function spawnOne() {
    // available keys
    const avail = [];
    for (let k = 0; k < 10; k++) if (inBag[k]) avail.push(k);
    if (avail.length === 0) return false;

    const pick = avail[Math.floor(Math.random() * avail.length)];
    inBag[pick] = false;

    let type, idx;
    if (pick < 5) { type = "chip"; idx = pick + 1; }
    else { type = "ad"; idx = (pick - 5) + 1; }

    // size (design) ★変更：画像から自動取得
    const img = (type === "chip") ? chipImgs[idx - 1] : adImgs[idx - 1];
    const sc  = (type === "chip") ? chipScale : adScale;

    const wD = Math.max(1, img.width  * sc);
    const hD = Math.max(1, img.height * sc);

    // spawn near bag bottom (still inside bounds)
    const jitterX = (Math.random() * 2 - 1) * 60;
    const jitterY = (Math.random() * 2 - 1) * 40;

    let xD = (bagRect.x + bagRect.w * 0.55) - wD / 2 + jitterX;
    let yD = (bagRect.y + bagRect.h * 0.72) - hD / 2 + jitterY;

    // clamp into crop bounds
    xD = clamp(xD, CROP_X, CROP_X + CROP_W - wD);
    yD = clamp(yD, CROP_Y, CROP_Y + CROP_H - hD);

    items.push({ key: pick, type, idx, xD, yD, wD, hD });
    return true;
  }

  function returnToBag(itemIndex) {
    const it = items[itemIndex];
    if (!it) return;
    inBag[it.key] = true;
    items.splice(itemIndex, 1);
  }

  function tryClickRemove(pxRaw, pyRaw) {
    const i = pickItem(pxRaw, pyRaw);
    if (i < 0) return false;

    const it = items[i];
    const d = rawToDesign(pxRaw, pyRaw);

    if (it.type === "chip") {
      returnToBag(i);
      return true;
    }

    if (it.type === "ad") {
      const hb = adCloseBox[it.idx];
      if (!hb) return false;

      const lx = (d.xD - it.xD) / it.wD; // 0..1
      const ly = (d.yD - it.yD) / it.hD;

      if (lx >= hb.x && lx <= hb.x + hb.w && ly >= hb.y && ly <= hb.y + hb.h) {
        returnToBag(i);
        return true;
      }
    }

    return false;
  }

  function clientToDesign(clientX, clientY) {
    if (!outCanvas) return null;

    const rect = outCanvas.getBoundingClientRect();
    const sx = outCanvas.width / rect.width;
    const sy = outCanvas.height / rect.height;

    const x = (clientX - rect.left) * sx;
    const y = (clientY - rect.top) * sy;

    const pxRaw = x * (rawCanvas.width / outCanvas.width);
    const pyRaw = y * (rawCanvas.height / outCanvas.height);

    return {
      pxRaw,
      pyRaw,
      d: rawToDesign(pxRaw, pyRaw)
    };
  }

  function beginExternalItemDragByIndex(itemIndex, clientX, clientY) {
    if (!active || !outCanvas) return false;
    if (itemIndex < 0 || itemIndex >= items.length) return false;

    const pt = clientToDesign(clientX, clientY);
    if (!pt) return false;

    const it = items[itemIndex];
    draggingItem = itemIndex;
    draggingBag = false;

    grabDx = pt.d.xD - it.xD;
    grabDy = pt.d.yD - it.yD;

    downAt = { xD: pt.d.xD, yD: pt.d.yD, t: performance.now() };
    moved = false;

    return true;
  }

  function beginExternalBagDrag(clientX, clientY) {
    if (!active || !outCanvas) return false;

    const pt = clientToDesign(clientX, clientY);
    if (!pt) return false;

    draggingBag = true;
    draggingItem = -1;

    bagGrabDx = pt.d.xD - bagRect.x;
    bagGrabDy = pt.d.yD - bagRect.y;
    lastBagY = pt.d.yD;
    moved = false;

    downAt = { xD: pt.d.xD, yD: pt.d.yD, t: performance.now() };

    return true;
  }

  function moveExternalDrag(clientX, clientY) {
    if (!active || !outCanvas) return;

    const pt = clientToDesign(clientX, clientY);
    if (!pt) return;

    const d = pt.d;

    if (Math.hypot(d.xD - downAt.xD, d.yD - downAt.yD) > 8) {
      moved = true;
    }

    if (draggingBag) {
      let nx = d.xD - bagGrabDx;
      let ny = d.yD - bagGrabDy;

      nx = clamp(nx, CROP_X, CROP_X + CROP_W - bagRect.w);
      ny = clamp(ny, CROP_Y, CROP_Y + CROP_H - bagRect.h);

      const dy = d.yD - lastBagY;
      lastBagY = d.yD;

      shakeAccum += Math.abs(dy);
      const now = performance.now();
      if (shakeAccum > 36 && now - lastShakeAt > 80) {
        spawnOne();
        shakeAccum = 0;
        lastShakeAt = now;
      }

      bagRect.x = nx;
      bagRect.y = ny;
      return;
    }

    if (draggingItem >= 0) {
      const it = items[draggingItem];
      if (!it) return;

      let xD = d.xD - grabDx;
      let yD = d.yD - grabDy;

      xD = clamp(xD, CROP_X, CROP_X + CROP_W - it.wD);
      yD = clamp(yD, CROP_Y, CROP_Y + CROP_H - it.hD);

      it.xD = xD;
      it.yD = yD;
    }
  }

  function endExternalDrag() {
    draggingItem = -1;
    draggingBag = false;
  }

  function removeItemByIndex(itemIndex) {
    if (!active) return;
    if (itemIndex < 0 || itemIndex >= items.length) return;
    returnToBag(itemIndex);
  }

  function removeChipByIndex(itemIndex) {
    if (!active) return;
    if (itemIndex < 0 || itemIndex >= items.length) return;

    const it = items[itemIndex];
    if (!it) return;
    if (it.type !== "chip") return;

    returnToBag(itemIndex);
  }

  function getItemRects() {
    return items.map((it, idx) => ({
      index: idx,
      type: it.type,
      adIdx: it.type === "ad" ? it.idx : null,
      x: it.xD,
      y: it.yD,
      w: it.wD,
      h: it.hD
    }));
  }

  function getBagRect() {
    return { ...bagRect };
  }

  function getAdCloseRects() {
    const list = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it || it.type !== "ad") continue;

      const hb = adCloseBox[it.idx];
      if (!hb) continue;

      list.push({
        itemIndex: i,
        adIdx: it.idx,
        x: it.xD + it.wD * hb.x,
        y: it.yD + it.hD * hb.y,
        w: it.wD * hb.w,
        h: it.hD * hb.h
      });
    }

    return list;
  }

  // =====================
  // FX: dither / ascii
  // =====================
  function stampDot(data, w, h, x, y, size) {
    const r = Math.floor(size / 2);
    for (let yy = -r; yy <= r; yy++) {
      for (let xx = -r; xx <= r; xx++) {
        const nx = x + xx, ny = y + yy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = (ny * w + nx) * 4;
        data[j] = data[j + 1] = data[j + 2] = 0;
        data[j + 3] = 255;
      }
    }
  }

  function applyCoarseDotDither(ctxSrc, w, h, scale = 3) {
    const im = ctxSrc.getImageData(0, 0, w, h);
    const d = im.data;

    const DOT = 3;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 10) continue;

        const r = d[i], g = d[i + 1], b = d[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

        const bx = Math.floor(x / scale);
        const by = Math.floor(y / scale);

        const px = bx * scale + Math.floor(scale / 2);
        const py = by * scale + Math.floor(scale / 2);
        const isDot = (x === px && y === py);

        const ink = (lum < 0.6);
        if (ink && isDot) {
          stampDot(d, w, h, x, y, DOT);
        } else {
          d[i + 3] = 0;
        }
      }
    }

    ctxSrc.putImageData(im, 0, 0);
  }

  function hash01(ix, iy) {
    const s = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123;
    return s - Math.floor(s);
  }

  function renderAsciiInk(ctxSrc, w, h, ctxOut, outW, outH) {
    const cell = 10;
    const cols = Math.max(1, Math.floor(outW / cell));
    const rows = Math.max(1, Math.floor(outH / cell));

    const tiny = document.createElement("canvas");
    tiny.width = cols;
    tiny.height = rows;
    const tctx = tiny.getContext("2d", { willReadFrequently: true });

    tctx.imageSmoothingEnabled = true;
    tctx.clearRect(0, 0, cols, rows);
    tctx.drawImage(ctxSrc.canvas, 0, 0, w, h, 0, 0, cols, rows);

    tctx.filter = "blur(0.7px)";
    tctx.drawImage(tiny, 0, 0);
    tctx.filter = "none";

    const im = tctx.getImageData(0, 0, cols, rows).data;

    const CHARSET = "x+*.:;-=~#o0&O";
    const inkThreshold = 0.03;

    ctxOut.clearRect(0, 0, outW, outH);
    ctxOut.fillStyle = "#000";
    ctxOut.textAlign = "center";
    ctxOut.textBaseline = "middle";

    const fontSize = Math.floor(cell * 1.05);
    ctxOut.font =
      `550 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const a = im[i + 3];
        if (a < 10) continue;

        const r = im[i], g = im[i + 1], b = im[i + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const ink = 1 - lum;

        if (ink < inkThreshold) continue;

        const rr = hash01(x + 19, y + 73);
        const ch = CHARSET[Math.floor(rr * CHARSET.length)];

        const cx = (x + 0.5) * cell;
        const cy = (y + 0.52) * cell;
        ctxOut.fillText(ch, cx, cy);
      }
    }
  }

  // =====================
  // Draw
  // =====================
  function drawRaw() {
    if (!loaded) return;

    const w = rawCanvas.width;
    const h = rawCanvas.height;
    rawCtx.clearRect(0, 0, w, h);

    // items first (behind)
    for (const it of items) {
      const p = designToRaw(it.xD, it.yD);
      const s = sizeToRaw(it.wD, it.hD);
      const img = (it.type === "chip") ? chipImgs[it.idx - 1] : adImgs[it.idx - 1];
      rawCtx.drawImage(img, p.x, p.y, s.w, s.h);
    }

    // bag last (front)
    {
      const p = designToRaw(bagRect.x, bagRect.y);
      const s = sizeToRaw(bagRect.w, bagRect.h);
      rawCtx.drawImage(imgBag, p.x, p.y, s.w, s.h);
    }
  }

  function drawFx() {
    if (!outCtx || !outCanvas) return;

    const outW = outCanvas.width;
    const outH = outCanvas.height;

    if (tmpCanvas.width !== outW || tmpCanvas.height !== outH) {
      tmpCanvas.width = outW;
      tmpCanvas.height = outH;
    }

    tmpCtx.imageSmoothingEnabled = false;
    tmpCtx.clearRect(0, 0, outW, outH);
    tmpCtx.drawImage(rawCanvas, 0, 0, rawCanvas.width, rawCanvas.height, 0, 0, outW, outH);

    if (mode === "dither") {
      outCtx.clearRect(0, 0, outW, outH);
      applyCoarseDotDither(tmpCtx, outW, outH, 3);
      outCtx.drawImage(tmpCanvas, 0, 0);
      return;
    }

    if (mode === "ascii") {
      const now = performance.now();
      const interval = 1000 / asciiFps;
      if (now - lastAsciiAt < interval) return;
      lastAsciiAt = now;

      renderAsciiInk(tmpCtx, outW, outH, outCtx, outW, outH);
      return;
    }

    // fallback
    outCtx.clearRect(0, 0, outW, outH);
    outCtx.drawImage(tmpCanvas, 0, 0);
  }

  function loop() {
    if (!active) return;
    raf = requestAnimationFrame(loop);
    drawRaw();
    drawFx();
  }

  // =====================
  // Pointer
  // =====================
  function bindPointer() {
    if (!outCanvas || pointerBound) return;
    pointerBound = true;

    outCanvas.style.touchAction = "pinch-zoom";
    outCanvas.style.pointerEvents = "none";

    function onDown(e) {
      if (!active) return;
      const p = canvasPointFromEvent(e, outCanvas);

      const d = rawToDesign(p.x * (rawCanvas.width / outCanvas.width), p.y * (rawCanvas.height / outCanvas.height));
      downAt = { xD: d.xD, yD: d.yD, t: performance.now() };
      moved = false;

      // bag first
      if (hitRect(d, bagRect)) {
        draggingBag = true;
        // ★追加：掴んだ位置のオフセット
        bagGrabDx = d.xD - bagRect.x;
        bagGrabDy = d.yD - bagRect.y;
        lastBagY = d.yD;
        shakeAccum = 0;
        outCanvas.setPointerCapture(e.pointerId);
        return;
      }

      const pxRaw = p.x * (rawCanvas.width / outCanvas.width);
      const pyRaw = p.y * (rawCanvas.height / outCanvas.height);
      const idx = pickItem(pxRaw, pyRaw);
      if (idx >= 0) {
        draggingItem = idx;
        // bring to top
        const it = items.splice(idx, 1)[0];
        items.push(it);
        draggingItem = items.length - 1;

        grabDx = d.xD - it.xD;
        grabDy = d.yD - it.yD;

        outCanvas.setPointerCapture(e.pointerId);
      }
    }

    function onMove(e) {
      if (!active) return;
      const p = canvasPointFromEvent(e, outCanvas);
      const pxRaw = p.x * (rawCanvas.width / outCanvas.width);
      const pyRaw = p.y * (rawCanvas.height / outCanvas.height);
      const d = rawToDesign(pxRaw, pyRaw);

      const dx = d.xD - downAt.xD;
      const dy = d.yD - downAt.yD;
      if ((dx * dx + dy * dy) > 25) moved = true; // 5px相当

      // bag shake
      if (draggingBag) {
      // ★追加：袋をドラッグで動かす（crop内にクランプ）
      let newX = d.xD - bagGrabDx;
      let newY = d.yD - bagGrabDy;

      newX = clamp(newX, CROP_X, CROP_X + CROP_W - bagRect.w);
      newY = clamp(newY, CROP_Y, CROP_Y + CROP_H - bagRect.h);

      // 振り判定用：縦移動量は「指の移動」で取る（自然）
      const deltaY = d.yD - lastBagY;
      lastBagY = d.yD;

      // 実際の袋座標を更新
      bagRect.x = newX;
      bagRect.y = newY;

      // 既存の振り判定
      shakeAccum += Math.abs(deltaY);

      const now = performance.now();
      const COOLDOWN = 180;
      const STEP = 95; // design px
      if (shakeAccum >= STEP && (now - lastShakeAt) > COOLDOWN) {
        const ok = spawnOne();
        lastShakeAt = now;
        shakeAccum = 0;
        if (!ok) shakeAccum = 0;
      }
      return;
    }

      // dragging item
      if (draggingItem >= 0) {
        const it = items[draggingItem];
        if (!it) return;

        let xD = d.xD - grabDx;
        let yD = d.yD - grabDy;

        xD = clamp(xD, CROP_X, CROP_X + CROP_W - it.wD);
        yD = clamp(yD, CROP_Y, CROP_Y + CROP_H - it.hD);

        it.xD = xD;
        it.yD = yD;
      }
    }

    function onUp(e) {
      if (!active) return;

      const p = canvasPointFromEvent(e, outCanvas);
      const pxRaw = p.x * (rawCanvas.width / outCanvas.width);
      const pyRaw = p.y * (rawCanvas.height / outCanvas.height);

      // click remove (only if not dragged much)
      if (!moved) {
        tryClickRemove(pxRaw, pyRaw);
      }

      draggingItem = -1;
      draggingBag = false;

      try { outCanvas.releasePointerCapture(e.pointerId); } catch (_) {}
    }

    outCanvas.addEventListener("pointerdown", onDown);
    outCanvas.addEventListener("pointermove", onMove);
    outCanvas.addEventListener("pointerup", onUp);
    outCanvas.addEventListener("pointercancel", onUp);

    bindPointer._onDown = onDown;
    bindPointer._onMove = onMove;
    bindPointer._onUp = onUp;
  }

  function unbindPointer() {
    if (!outCanvas || !pointerBound) return;
    outCanvas.removeEventListener("pointerdown", bindPointer._onDown);
    outCanvas.removeEventListener("pointermove", bindPointer._onMove);
    outCanvas.removeEventListener("pointerup", bindPointer._onUp);
    outCanvas.removeEventListener("pointercancel", bindPointer._onUp);
    bindPointer._onDown = bindPointer._onMove = bindPointer._onUp = null;
    pointerBound = false;
  }

  async function loadAll() {
    const list = [];
    imgBag.src = "assets/chipsbag.webp";
    list.push(new Promise((res, rej) => { imgBag.onload = res; imgBag.onerror = rej; }));

    for (let i = 0; i < 5; i++) {
      chipImgs[i].src = `assets/chip${i + 1}.webp`;
      list.push(new Promise((res, rej) => { chipImgs[i].onload = res; chipImgs[i].onerror = rej; }));
    }
    for (let i = 0; i < 5; i++) {
      adImgs[i].src = `assets/ad${i + 1}.webp`;
      list.push(new Promise((res, rej) => { adImgs[i].onload = res; adImgs[i].onerror = rej; }));
    }

    await Promise.all(list);
    loaded = true;
  }

  async function start(canvas, opts = {}) {
    outCanvas = canvas;
    outCtx = outCanvas.getContext("2d", { willReadFrequently: true });

    mode = opts.mode || mode;
    fxScale = (typeof opts.fxScale === "number") ? opts.fxScale : fxScale;
    asciiFps = (typeof opts.asciiFps === "number") ? opts.asciiFps : asciiFps;

    // reset state on start
    bagRect = { x: 392, y: 302, w: 400, h: 400 }; // ★追加：開始時に初期位置へ戻す
    inBag = new Array(10).fill(true);
    items = [];
    draggingItem = -1;
    draggingBag = false;
    shakeAccum = 0;

    resizeCanvases();

    if (!loaded) {
      await loadAll();
    }

    active = true;
    bindPointer();

    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    active = false;
    cancelAnimationFrame(raf);
    raf = 0;

    unbindPointer();

    if (outCtx && outCanvas) {
      outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
    }

    outCanvas = null;
    outCtx = null;
  }

  function setMode(m) {
    mode = m;
    lastAsciiAt = 0;
    if (outCtx && outCanvas) outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
  }

  // 外からレイアウト調整できるように（必要なら）
  function setBagRect(rect) {
    if (!rect) return;
    bagRect = { ...bagRect, ...rect };
  }

  return {
  get active() { return active; },
  start,
  stop,
  setMode,
  setBagRect,
  removeItemByIndex,
  removeChipByIndex,

  beginItemDragByIndex(itemIndex, clientX, clientY) {
    return beginExternalItemDragByIndex(itemIndex, clientX, clientY);
  },

  beginBagDrag(clientX, clientY) {
    return beginExternalBagDrag(clientX, clientY);
  },

  moveDragFromClient(clientX, clientY) {
    moveExternalDrag(clientX, clientY);
  },

  endDrag() {
    endExternalDrag();
  },

  removeItemByIndex(itemIndex) {
    removeItemByIndex(itemIndex);
  },

  getItemRects() {
    return getItemRects();
  },

  getBagRect() {
    return getBagRect();
  },

  getAdCloseRects() {
    return getAdCloseRects();
  }
};
})();


const PAGES = {
  0: { bg: "cover", text: "" },
  1: {
    bg: "open",
    text: `蜘蛛の上

塔を覆う雲の上
綿とナイロンとスチールウールと
ステロイド軟膏の弦に絡めとられて
体は丸まり首は硬く
けれどしなやかに伸び
私は下を向いている
目線の先には豆電球程の光源と
それを覆い尽くす繊維たちが
使命があるというように
忙しなく動いている

私は腹に圧力を受ける
この惑星は引力を手放したのだ



まもなく闇に飲み込まれる数秒間
私は直向きに目の前の箱を覗き込む
歯車が幾何学的に奏でる明媚な
理性と事実の生産工場は
油分が固まってしまったようで
たわみ隙間を作る
ついに全ての力を放棄し
呆気なく解体された箱の隙間には
私が纏う糸に必死に体を縛り付ける
無数の蜘蛛が冷たくぶら下がっており
しかしそれらは見下ろす私の足の指程もない
見なければよかった！と苛立ち
小さい小さい孤独を味わいながら
口の中から鉄臭さをひとつまみ拾う`
  },
  2: {
    bg: "open",
    ill: "spiders",   // ← 挿絵を出すページ
    text: `けれど一度白く濁った一面は
いつのまにか綻び澄んだ姿を見せ
私の体を囲う糸は次第に解けてゆく
責任を放棄した魂は
安堵と極上の幸せを享受し
体をすり抜け
どこまでも遠くへ飛んで行きました

蜘蛛の巣にかかるその時まで`
  },
  3: {
    bg: "open",
    text: `月の役割

「月の役割ってなんだと思う？」
「なにそれ。」
「いいから答えてよ。月って何の役割を果たしていると思う？」
「そもそも自然に生まれたものに人間が定義する役割を当てはめることが
　ナンセンスなんじゃない？」
「そんなこと言うなよ。主観的になったっていいんだよ。」
「冗談だよ。引力で潮の満ち引きを生み出してるとかじゃなかったっけ。」
「ぶっぶー。正解は人の心を照らしてる、だよ。」
「何それ、真面目に答えた私が馬鹿みたいじゃん！」
「冗談冗談。」
「もー。」
「まあ、実際は潮の満ち引きだけじゃなくて地軸の傾きを安定させて
　今の自転を作ってるらしいよ。



　つまり今の1日の長さとか気候には月が影響してるって訳。」
「へーなんか遠い話みたい。」
「冷たいなあ。ねえ、遠くに行くんでしょ。」
「何言ってるの、こんなに近くにいるのに。」
「でも知ってるんだよ。いなくなっちゃうんでしょ。
　そんなの嫌だよ。君がいない日の暗さを君は知らないんだ。」
「知る訳ないでしょう。貴方は潮の満ち引きも月の満ち欠けも
　月が地球の周りを回っているからだと思っているかもしれないけれど
　月はいつだって輝いているんだよ！いい加減目を覚まして！」

そう言って月は地球の影に隠れてしまいました`
  },
  4: {
    bg: "open",
    ill: "moon",
  },
  5: {
    bg: "open",
    ill: "chips",
    text: `139円

朝からお腹がなっている
腸が動いている感覚は
まるで誰かが空気を注いでいるみたいだ
なのに口は固く閉じてしまって
なんだかどうにもできない
抵抗できぬまま腹が膨らんで行き
ほとんどが空気になってしまったら
詐欺だと売り場で文句を言われてしまいそうだと
ポテトチップスを取る手が引き攣る
それでも、それすら既に忘れて
一枚また一枚と咀嚼しのみこむことを繰り返す`
  },
  6: {
    bg: "open",
    text: `すずめさん

鳥語は相変わらず苦手だ
私に硬く鋭いクチバシは無いし
ドラマチックに紡がれる言葉一つ一つはどうも落ち着かない
肺呼吸には慣れないし
直線的な光にどきどきして
憧れた舞台の上で固まってしまう素人芸みたいに感じている
新しい環境は余りに過酷で
みんなが通り過ぎていくもんだから
私は永続的な個ではなく、瞬間的な現象なのではないかと
仮説を立てていたところだった







貴方に会えてよかった
あなたの羽に僅かに光る青の欠片はとても美しいよ
あなたの生があるだけで
羽ばたく間の幾度もの鼓動に無意味に価値を見出せる
私ののろまな時間にも細やかな未知が降っている
人魚が姫になったように
あなたの側にいることは
憧れの役に選ばれた心地で
泡風呂のような日々でした`
  },
  7: {
    bg: "open",
    ill: "leafwing",
    text: `可愛い囁きをこぼして眠りにつくあなたの羽と
私の鱗を見比べる中で
あなたの美しさは羽の下の柔らかい身が
海から見た月の色をしているからだと知りました
そう気が付いてしまえば気が気ではなくなり
毎夜一枚羽をいただいていました
いつの間にか全ての羽を失ってしまった貴方は
ぐったりと海に落ちてしまいました
とても悲しかったけど
無秩序に飲み込まれていく貴方はより一層美しく
貴方の光の全てを消費し消化し満足したので
新たに旅に出ることにしました
次は運命に抗えるように`
  },
  8: {
    bg: "open",
    ill: "oxgame",
    text: `判決

上段　中央　×
上段　右　⚪︎
中段　中央　×
下段　中央　⚪︎
下段　右　×
上段　左　⚪︎
中段　左　×
中段　右　⚪︎
.
.
.
引き分け`
  },
  9: {
    bg: "open",
    ill: "candle",
    text: `為替

保険会社がつける身体の価値
僕はふわりふわり`
  },
  10: {
    bg: "open",
    ill: "eyehand",
    text: `ゴロゴロ

「猫みたいだ」
よく聞く例えだが
人によって見ている奴は違うのだろう
これはきっと猫の気ままさのおかげだが
神は昼寝が好きだろうか
・私は嫌いだ・`
  },
  11: {
    bg: "open",
    text: `太陽フレアは陽光になれるか？

そこには草木があり
色とりどりの実りがあり
小さい命たちがある
そこには薄く伸びた幸福があり
間を埋めるような極小の悲観がある
おびただしい点の集まりはヴェールのようで
しかし繋がってはおらず
我々を通り抜けてゆく、ふりをしている？
吐息にさえ震える悲しみの原子たちは
慈しみに耐えらないようで反発しあう
その動きが私にはどうしても反射にみえてならない
だって永遠の星は観測者の不在には耐えられない
そう仮定するのは非常に残酷だが



私に棲まう暗く深い湖が
貴方の瞳に輝いて映るのは美しいですから
だから多数の波長が重なり呼応する瞬間が好きです
悲しみも喜びも一つの生地に捏ねられ
膨らんでいく
でもね

でもね、焼けた頃にはどうしてか
より広い空間が私を形取らないことに苛立ってしまう
なんて脆弱な世界かと
やはりここに光源は一つしかなかったのかと
そうしてどちらが先か、私もしくはあなた自身を手放している`
  },
  12: {
    bg: "open",
    ill: "strings",
    text: `そこには草木があり
色とりどりの実りがあり
小さい命たちがある
そこには薄く伸びた幸福があり
間を埋めるような極小の可能性がある
集合的無意識に干渉しようとする
醜悪さを認めたら
太陽フレアは陽光になれるだろうか。`
  },
  13: {
    bg: "open",
    text: `リバーシ

歩け、歩け
足が泥に浸かってるみたいに重い
いつ寝たんだろう
夢の中で歩くみたいに重い

私とはタコだろうか
人が並んでいて
手前は男子トイレ
奥には女子トイレがあります
肌が触れるとチリチリして
目が合うと火花が散るから
私という別種か
それとも個体名があるからなのか




ドキドキして
色んな色になってしまって
目が回って恥ずかしいけど
誰もいないから
反響音がうるさい

宇宙は広がったり縮んだり
波は寄せて返す
生み出される境界に
トグルは反応し続けていて
不規則を心音に変換している`
  },
  14: {
    bg: "open",
    ill: "ripple_fireworks",
    text: `白、黒、白、黒
ここに青を置いてみる
なんて冗談を言って見たりして
白、黒、白、黒
黄色のたんぽぽを咲かせてみる
白、黒、白、黒
まだ飽きないのかいと問いかけてみる
秩序とはそういうものだと
一蹴されてしまえば、また
白、黒、白、黒
右、左、大、小
0、1、0、1`
  },
  15: {
    bg: "open",
    text: `世界の隅で

私は怒っている
私はまだ怒っているよ
もう克服したと思っていたけれど
いつまでも子どもでいる事は恥だと思っていたけれど
私の心の弦を弾く
確かな質量を持って
あなたはまだそこに居たんだね
線路を辿る電車の音
夕焼けの中でも遅くならない雑踏を
風が巻き取るのを聞くあなたが
立ちすくむあなたが
こちらを覗くあなたが
私は変わってしまったと涙を流していて



そうして私には慕う過去も馳せる未来も無い事に気付くが
目が離せない
光を取り込み、一層輝く、その涙が
信仰と名付け、肩を傷めるために十字を着た
激しく波打ち辺りを湿らす私を包む服は
通り過ぎる風によって乾こうとしている
いつの間にやら世界は回り、星々は優しく毛布を広げている
朝日を想うと、より、暖かい
世界は変えられるよ
私の背には翼も人も居ないけど
踏み出す足が生意気で、挑戦的で、億劫でも
歴史は人と共に有り
あなたがここに居たことを、私が必ず紡ぐから`
  },
  16: {
    bg: "open",
    ill: "lastdoor",
    text: `私は怒っている
あなたを愛している`
  },
  17: {
    bg: "open",
    text: `あとがき

私の子供時代は終わってしまったんだと実感して、大人としての区切りの
ような記念のような気持ちでこの詩集を書きました。
私が小さい時から感じていた事から、今になって考えることなど
振り返りながら書いた22年の思い出の本です。
最近友達と昔の話をすることがとても多くなりました。感傷的になることは大好きですがこのまま過去に囚われてしまうのがとても怖いです。
なので夢の話をします。
いつも友達に話す夢は、古城に住んでシカとモルモットと暮らしながら
野菜を栽培することです。
でももう少しだけあります。一つは決済音になることです。
私もぺいぺいって言いたい。
二つ目は痛烈なノスタルジーや恐怖を誘起する作品を作ることです。
特にホラーの映画やゲームに関わりたい。



三つ目は、まだまだ遠いお話ですが私が死んで何千年も経って
石になることです。石はその場所の膨大な量の情報を保有しているのに
所詮石でしかなくて、蹴ったり積み上げたりしても情報の開示を
要求されることはきっとなくて、相対がない世界なんだと思うんです。
そしたらきっと今感じることができる幸せを何倍にも強く感じることが
できて川の綺麗な水なんか浴びてしまうと私は最高に幸せだと思うんです。
こんな未来の想像をすると穏やかな気持ちになれます。
逃げかもしれないけど、今はそれが私の希望です。

最後に、あなたに向けて。
私を生かしてくれているのは紛れもなく愛だけど、
この愛は何に対しての愛なのかまだよくわかりません。
それでもあなたを一辺でも包み暖めることがあればと思います。
読んでくれてありがとう。
これからもよろしくね！　　　　　　　　　　　　　Po 西島史織`
  },
  18: { bg: "back", text: "" } // ← 裏表紙
};

const BOOK_MAX_PAGE = Math.max(...Object.keys(PAGES).map(Number));

function renderPoemText(text) {
  if (!poemArea || !bookTextEl) return;

  poemArea.textContent = text || "";
  bookTextEl.style.display = text ? "block" : "none";
}

// =====================
// Intro
// =====================
function startIntro() {
  if (started) return;
  if (!titleEl || !sketchEl || !deskEl || !frame) return;

  started = true;
  siteStartAt = Date.now();

  // intro中はdesk無効
  setDeskHotspotsEnabled(false);

  titleEl.style.opacity = "0";
  titleEl.style.pointerEvents = "none";
  sketchEl.style.filter = "blur(0px)";

  setTimeout(function () {
    deskEl.style.opacity = "1";
    frame.classList.add("interactive");
    scene = "desk";

    // deskに入ったら有効化（確実に）
    setDeskHotspotsEnabled(true);

    setTimeout(function () {
      sketchEl.style.opacity = "0";
    }, 1800);
  }, 1800);
}

if (titleEl) titleEl.addEventListener("click", startIntro);

// =====================
// ランプ切替
// =====================
async function toggleLamp() {
  if (!started) return;
  if (inputLocked) return;
  if (!fadeBlackEl || !deskEl) return;

  inputLocked = true;

  setDeskHotspotsEnabled(false);
  if (scene === "book") setBookSceneEnabled(false);
  if (scene === "radio") setRadioSceneEnabled(false);

  coffeeBusy = false;
  if (coffeeSteam) coffeeSteam.style.opacity = "0";
  if (coffeeBanner) coffeeBanner.style.display = "none";
  clearTimeout(showCoffeeBanner._t);

  fadeBlackEl.style.opacity = "1";
  await sleep(900);

  lampOn = !lampOn;
  deskEl.src = lampOn ? "assets/desk_on.webp" : "assets/desk_off.webp";

  // ✅ book表示中なら book の見た目を更新
  if (scene === "book") {
    if (bookClose) {
      bookClose.style.backgroundImage = 'url("' + getAsset("bookradio", "cross") + '")';
    }

    renderBookPage(); // ここで挿絵もmode反映される

    const mode = lampOn ? "dither" : "ascii";
    if (EyeHandEngine.active) EyeHandEngine.setMode(mode);
    if (OxGameEngine.active) OxGameEngine.setMode(mode);
    if (StringBundleEngine.active) StringBundleEngine.setMode(mode);
    if (BoxSpidersEngine.active) BoxSpidersEngine.setMode(mode);
    if (CandleEngine.active) CandleEngine.setMode(mode);
    if (ChipsEngine && ChipsEngine.active) ChipsEngine.setMode(mode);

    // IllEngineは active 判定がないので、とりあえず setMode してOK（startしてなければ無視される）
    IllEngine.setMode(mode);
  }

  // ✅ radio表示中なら radio の見た目を更新（bookの外！）
  if (scene === "radio") {
    applyRadioVisuals();
  }

  await sleep(80);
  fadeBlackEl.style.opacity = "0";
  await sleep(900);

  if (scene === "desk") setDeskHotspotsEnabled(true);
  if (scene === "book") setBookSceneEnabled(true);
  if (scene === "radio") setRadioSceneEnabled(true);

  inputLocked = false;
}

if (hitLamp) hitLamp.addEventListener("click", toggleLamp);

// =====================
// 本：開く/閉じる
// =====================
function openBook() {
  if (!started || scene !== "desk") return;
  if (!bookScene || !frame) return;

  focusReturnEl = document.activeElement && document.activeElement instanceof HTMLElement
    ? document.activeElement
    : hitBook;

  scene = "book";
  frame.classList.remove("interactive");

  // desk側停止
  setDeskHotspotsEnabled(false);

  // book scene 表示＆有効化
  bookScene.hidden = false;
  setBookSceneEnabled(true);

  // ボタン見た目
  if (bookClose) {
    bookClose.style.backgroundImage = 'url("' + getAsset("bookradio", "cross") + '")';
    bookClose.style.backgroundRepeat = "no-repeat";
    bookClose.style.backgroundSize = "contain";
    bookClose.style.backgroundPosition = "center";
  }

  if (bookPrev) {
    bookPrev.style.backgroundRepeat = "no-repeat";
    bookPrev.style.backgroundSize = "contain";
    bookPrev.style.backgroundPosition = "center";
  }

  if (bookNext) {
    bookNext.style.backgroundRepeat = "no-repeat";
    bookNext.style.backgroundSize = "contain";
    bookNext.style.backgroundPosition = "center";
  }

  bookPage = lastBookPage;
  renderBookPage();

  if (bookClose && typeof bookClose.focus === "function") {
    bookClose.focus();
  }
}

function closeBook() {
  if (scene !== "book") return;
  lastBookPage = bookPage;
  if (!bookScene || !frame) return;

  // 隠す前にフォーカス退避
  evacuateFocusFrom(bookScene, focusReturnEl || hitBook || document.body);
  EyeHandEngine.stop();
  OxGameEngine.stop();
  StringBundleEngine.stop();
  BoxSpidersEngine.stop();
  CandleEngine.stop();
  LeafWingEngine.stop();
  IllEngine.stop();
  WaterRippleEngine.stop();
  FireworksEngine.stop();
  LastDoorEngine.stop();
  if (typeof ChipsEngine !== "undefined") ChipsEngine.stop();
  IllEngine.stop();
  if (illCanvas) illCanvas.hidden = true;
  if (illCanvas2) illCanvas2.hidden = true;
  if (leafwingHitLayer) leafwingHitLayer.hidden = true;
  if (candleHitLayer) candleHitLayer.hidden = true;
  if (eyehandHitLayer) eyehandHitLayer.hidden = true;
  if (oxgameHitLayer) oxgameHitLayer.hidden = true;
  if (chipsHitLayer) chipsHitLayer.hidden = true;
  if (moonHitLayer) moonHitLayer.hidden = true;
  if (typeof MoonEngine !== "undefined") MoonEngine.stop();
  setBookSceneEnabled(false);
  bookScene.hidden = true;
  scene = "desk";
  frame.classList.add("interactive");

  setDeskHotspotsEnabled(true);

  if (focusReturnEl && typeof focusReturnEl.focus === "function") {
    focusReturnEl.focus();
  } else if (hitBook && typeof hitBook.focus === "function") {
    hitBook.focus();
  }
  focusReturnEl = null;
}

if (hitBook) hitBook.addEventListener("click", openBook);
if (bookClose) bookClose.addEventListener("click", closeBook);

leafwingHitButtons.forEach((btn) => {
  btn.addEventListener("pointerdown", (e) => {
    e.stopPropagation();

    const idx = Number(btn.dataset.leaf);
    LeafWingEngine.hitLeaf(idx);
  });
});

if (candleFlameHit) {
  candleFlameHit.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    CandleEngine.triggerFlame();
  });
}

if (eyehandHandHit) {
  eyehandHandHit.addEventListener("pointerdown", (e) => {
    e.stopPropagation();

    const started = EyeHandEngine.beginDragFromClient(e.clientX, e.clientY);
    if (!started) return;

    eyehandDraggingViaHit = true;
  });
}

oxgameHitButtons.forEach((btn) => {
  btn.addEventListener("pointerdown", (e) => {
    e.stopPropagation();

    const idx = Number(btn.dataset.token);
    const started = OxGameEngine.beginDragById(idx, e.clientX, e.clientY);
    if (!started) return;

    oxgameDraggingViaHit = true;
  });
});

chipsItemHitButtons.forEach((btn) => {
  btn.addEventListener("pointerdown", (e) => {
    e.stopPropagation();

    const idx = Number(btn.dataset.itemIndex);
    if (!Number.isFinite(idx)) return;

    const started = ChipsEngine.beginItemDragByIndex(idx, e.clientX, e.clientY);
    if (!started) return;

    chipsDraggingViaHit = true;
    chipsDragKind = "item";
    chipsActiveItemIndex = idx;
    chipsDragStartX = e.clientX;
    chipsDragStartY = e.clientY;
  });
});

if (moonDragHit) {
  moonDragHit.addEventListener("pointerdown", (e) => {
    e.stopPropagation();

    const started = MoonEngine.beginDragFromClient(e.clientX, e.clientY);
    if (!started) return;

    moonDraggingViaHit = true;
  });
}

window.addEventListener("pointerup", (e) => {
  if (!chipsDraggingViaHit) return;

  const wasItem = (chipsDragKind === "item");
  const movedPx = Math.hypot(e.clientX - chipsDragStartX, e.clientY - chipsDragStartY);

  ChipsEngine.endDrag();

  if (wasItem && movedPx < 10 && chipsActiveItemIndex >= 0) {
    ChipsEngine.removeChipByIndex(chipsActiveItemIndex);
  }

  chipsDraggingViaHit = false;
  chipsDragKind = null;
  chipsActiveItemIndex = -1;
}, { passive: true });

window.addEventListener("pointercancel", () => {
  if (!chipsDraggingViaHit) return;

  ChipsEngine.endDrag();
  chipsDraggingViaHit = false;
  chipsDragKind = null;
  chipsActiveItemIndex = -1;
}, { passive: true });

if (chipsBagHit) {
  chipsBagHit.addEventListener("pointerdown", (e) => {
    e.stopPropagation();

    const started = ChipsEngine.beginBagDrag(e.clientX, e.clientY);
    if (!started) return;

    chipsDraggingViaHit = true;
    chipsDragKind = "bag";
  });
}

chipsAdCloseHitButtons.forEach((btn) => {
  btn.addEventListener("pointerdown", (e) => {
    e.stopPropagation();

    const idx = Number(btn.dataset.itemIndex);
    if (!Number.isFinite(idx)) return;

    ChipsEngine.removeItemByIndex(idx);
  });
});

window.addEventListener("pointermove", (e) => {
  if (!chipsDraggingViaHit) return;
  ChipsEngine.moveDragFromClient(e.clientX, e.clientY);
}, { passive: true });

function endChipsHitDrag() {
  if (!chipsDraggingViaHit) return;
  chipsDraggingViaHit = false;
  chipsDragKind = null;
  ChipsEngine.endDrag();
}

window.addEventListener("pointerup", endChipsHitDrag, { passive: true });
window.addEventListener("pointercancel", endChipsHitDrag, { passive: true });

window.addEventListener("pointermove", (e) => {
  if (!oxgameDraggingViaHit) return;
  OxGameEngine.moveDragFromClient(e.clientX, e.clientY);
}, { passive: true });

window.addEventListener("pointerup", () => {
  if (!oxgameDraggingViaHit) return;
  oxgameDraggingViaHit = false;
  OxGameEngine.endDrag();
}, { passive: true });

window.addEventListener("pointercancel", () => {
  if (!oxgameDraggingViaHit) return;
  oxgameDraggingViaHit = false;
  OxGameEngine.endDrag();
}, { passive: true });

window.addEventListener("pointermove", (e) => {
  if (!eyehandDraggingViaHit) return;
  EyeHandEngine.moveDragFromClient(e.clientX, e.clientY);
}, { passive: true });

window.addEventListener("pointerup", () => {
  if (!eyehandDraggingViaHit) return;
  eyehandDraggingViaHit = false;
  EyeHandEngine.endDrag();
}, { passive: true });

window.addEventListener("pointercancel", () => {
  if (!eyehandDraggingViaHit) return;
  eyehandDraggingViaHit = false;
  EyeHandEngine.endDrag();
}, { passive: true });

if (moonDragHit) {
  moonDragHit.addEventListener("pointerdown", (e) => {
    e.stopPropagation();

    const started = MoonEngine.beginDragFromClient(e.clientX, e.clientY);
    if (!started) return;

    moonDraggingViaHit = true;
  });
}

window.addEventListener("pointermove", (e) => {
  if (!moonDraggingViaHit) return;
  MoonEngine.moveDragFromClient(e.clientX, e.clientY);
  updateMoonHitbox();
}, { passive: true });

window.addEventListener("pointerup", () => {
  if (!moonDraggingViaHit) return;
  moonDraggingViaHit = false;
  MoonEngine.endDrag();
  updateMoonHitbox();
}, { passive: true });

window.addEventListener("pointercancel", () => {
  if (!moonDraggingViaHit) return;
  moonDraggingViaHit = false;
  MoonEngine.endDrag();
  updateMoonHitbox();
}, { passive: true });

// =====================
// まばたき/暗転/ページめくり
// =====================
async function playBlink(type) {
  if (!bookBlink || !bookScene) return;

  const seq = type === "open" ? [3, 2, 1] : [1, 2, 3];
  setBookUiVisible(false);

  bookScene.classList.add("blinking");
  bookBlink.style.opacity = "1";

  try {
    for (let k = 0; k < seq.length; k++) {
      const i = seq[k];
      bookBlink.src = getBlinkSrc(i);
      await sleep(260);
    }
  } finally {
    bookBlink.style.opacity = "0";
    bookScene.classList.remove("blinking");
  }
}

async function bookFadeToBlack(ms) {
  if (!bookFadeEl) return;
  setBookUiVisible(false);
  bookFadeEl.style.transition = "opacity " + ms + "ms ease";
  bookFadeEl.style.opacity = "1";
  await sleep(ms);
}

async function bookFadeFromBlack(ms) {
  if (!bookFadeEl) return;
  bookFadeEl.style.transition = "opacity " + ms + "ms ease";
  bookFadeEl.style.opacity = "0";
  await sleep(ms);
  setBookUiVisible(true);
  renderBookPage();
}

async function bookHardCutBlack(holdMs) {
  if (!bookFadeEl || !bookScene) return;

  const prevTransition = bookFadeEl.style.transition;

  bookScene.classList.add("blinking");
  bookFadeEl.style.transition = "none";
  bookFadeEl.style.opacity = "1";

  await sleep(holdMs);

  bookFadeEl.style.opacity = "0";
  bookFadeEl.style.transition = prevTransition || "";
  bookScene.classList.remove("blinking");
}

async function playPageflip(direction) {
  if (!bookPageflip) return;

  const seq = direction === "back" ? [5, 6, 7, 8] : [1, 2, 3, 4];

  setBookUiVisible(false);
  bookPageflip.style.opacity = "1";

  try {
    for (let k = 0; k < seq.length; k++) {
      const n = seq[k];
      bookPageflip.src = getPageflipSrc(n);
      await sleep(160);
    }
  } finally {
    bookPageflip.style.opacity = "0";
    bookPageflip.src = "";
  }
}

function updateCandleHitbox() {
  if (!candleHitLayer || !candleFlameHit) return;

  if (scene !== "book") {
    candleHitLayer.hidden = true;
    return;
  }

  const page = PAGES[bookPage] || {};
  if (page.ill !== "candle") {
    candleHitLayer.hidden = true;
    return;
  }

  const rect = CandleEngine.getFlameRect();
  if (!rect) {
    candleHitLayer.hidden = true;   // stage4では炎なし
    return;
  }

  const CROP_X = 228;
  const CROP_Y = 129;
  const CROP_W = 1453;
  const CROP_H = 854;

  const padX = 16;
  const padY = 16;

  const left = ((rect.x - CROP_X - padX) / CROP_W) * 100;
  const top = ((rect.y - CROP_Y - padY) / CROP_H) * 100;
  const width = ((rect.w + padX * 2) / CROP_W) * 100;
  const height = ((rect.h + padY * 2) / CROP_H) * 100;

  candleFlameHit.style.left = left + "%";
  candleFlameHit.style.top = top + "%";
  candleFlameHit.style.width = width + "%";
  candleFlameHit.style.height = height + "%";

  candleHitLayer.hidden = false;
}

function pointInRect(x, y, r) {
  return (
    x >= r.x &&
    x <= r.x + r.w &&
    y >= r.y &&
    y <= r.y + r.h
  );
}

function isCloseCoveredByBag(closeRect, bagRect) {
  if (!bagRect) return false;

  const cx = closeRect.x + closeRect.w * 0.5;
  const cy = closeRect.y + closeRect.h * 0.5;

  return pointInRect(cx, cy, bagRect);
}

function isCloseCoveredByFrontItems(closeRect, ownerItemIndex, itemRects) {
  const cx = closeRect.x + closeRect.w * 0.5;
  const cy = closeRect.y + closeRect.h * 0.5;

  for (let i = 0; i < itemRects.length; i++) {
    const it = itemRects[i];
    if (!it) continue;

    // 自分自身は除外
    if (it.index === ownerItemIndex) continue;

    // 自分より前面にあるものだけ判定
    if (it.index <= ownerItemIndex) continue;

    if (pointInRect(cx, cy, it)) {
      return true;
    }
  }

  return false;
}

  function updateChipsHitboxes() {
  if (!chipsHitLayer) return;

  if (scene !== "book") {
    chipsHitLayer.hidden = true;
    return;
  }

  const page = PAGES[bookPage] || {};
  if (page.ill !== "chips") {
    chipsHitLayer.hidden = true;
    return;
  }

  const CROP_X = 228;
  const CROP_Y = 129;
  const CROP_W = 1453;
  const CROP_H = 854;

  // item
  const itemRects = ChipsEngine.getItemRects ? ChipsEngine.getItemRects() : [];
  chipsItemHitButtons.forEach((btn, i) => {
    const r = itemRects[i];
    if (!r) {
      btn.hidden = true;
      btn.removeAttribute("data-item-index");
      return;
    }

    const left = ((r.x - CROP_X) / CROP_W) * 100;
    const top = ((r.y - CROP_Y) / CROP_H) * 100;
    const width = (r.w / CROP_W) * 100;
    const height = (r.h / CROP_H) * 100;

    btn.style.left = left + "%";
    btn.style.top = top + "%";
    btn.style.width = width + "%";
    btn.style.height = height + "%";
    btn.hidden = false;
    btn.dataset.itemIndex = String(r.index);
  });

  // bag
  if (chipsBagHit && ChipsEngine.getBagRect) {
    const b = ChipsEngine.getBagRect();
    const left = ((b.x - CROP_X) / CROP_W) * 100;
    const top = ((b.y - CROP_Y) / CROP_H) * 100;
    const width = (b.w / CROP_W) * 100;
    const height = (b.h / CROP_H) * 100;

    chipsBagHit.style.left = left + "%";
    chipsBagHit.style.top = top + "%";
    chipsBagHit.style.width = width + "%";
    chipsBagHit.style.height = height + "%";
    chipsBagHit.hidden = false;
  }

  // ad close
  const closeRects = ChipsEngine.getAdCloseRects ? ChipsEngine.getAdCloseRects() : [];
  const bagRectForClose = ChipsEngine.getBagRect ? ChipsEngine.getBagRect() : null;

  chipsAdCloseHitButtons.forEach((btn, i) => {
    const r = closeRects[i];
    if (!r) {
      btn.hidden = true;
      btn.removeAttribute("data-item-index");
      return;
    }

    const coveredByBag = isCloseCoveredByBag(r, bagRectForClose);
    const coveredByFrontItems = isCloseCoveredByFrontItems(r, r.itemIndex, itemRects);
    const covered = coveredByBag || coveredByFrontItems;

    if (covered) {
      btn.hidden = true;
      btn.removeAttribute("data-item-index");
      return;
    }

    const left = ((r.x - CROP_X) / CROP_W) * 100;
    const top = ((r.y - CROP_Y) / CROP_H) * 100;
    const width = (r.w / CROP_W) * 100;
    const height = (r.h / CROP_H) * 100;

    btn.style.left = left + "%";
    btn.style.top = top + "%";
    btn.style.width = width + "%";
    btn.style.height = height + "%";
    btn.hidden = false;
    btn.dataset.itemIndex = String(r.itemIndex);
  });

  chipsHitLayer.hidden = false;
}


// =====================
// 本：ページ描画
// =====================
function renderBookPage() {
  if (!bookBg) return;

  const page = PAGES[bookPage] || {};

  // 14ページ以外にいる時は抽選をリセット
  if (bookPage !== 14) {
    p14RandomIll = null;
  }

  // 矢印（今まで通り）
  if (bookPrev) bookPrev.style.backgroundImage = 'url("' + getAsset("book", "left") + '")';
  if (bookNext) bookNext.style.backgroundImage = 'url("' + getAsset("book", "right") + '")';

  if (bookPrev) bookPrev.style.display = "block";
  if (bookNext) bookNext.style.display = "block";

  // 背景
  if (page.bg === "cover") {
    bookBg.src = getAsset("book", "cover");
    if (bookNext) bookNext.style.display = "none";
  } else if (page.bg === "back") {
    bookBg.src = getAsset("book", "back");
    if (bookPrev) bookPrev.style.display = "none";
  } else {
    bookBg.src = getAsset("book", page.bg || "open");
  }

  // 詩（17ページだけランプOFF時に表示）
  if (bookPage === 17) {
    if (!lampOn) {
      renderPoemText(page.text);
    } else {
      renderPoemText("");
    }
  } else {
    renderPoemText(page.text);
  }

  // ✅ 挿絵（renderBookPage の中）
if (illCanvas) {
  // まず止めて消す（残像・他ページ残り防止）
  EyeHandEngine.stop();
  OxGameEngine.stop();
  StringBundleEngine.stop();
  IllEngine.stop();
  BoxSpidersEngine.stop();
  CandleEngine.stop();
  LeafWingEngine.stop();
  WaterRippleEngine.stop();
  FireworksEngine.stop();
  LastDoorEngine.stop();
  if (typeof ChipsEngine !== "undefined") ChipsEngine.stop();
  if (typeof MoonEngine !== "undefined") MoonEngine.stop(); // ★追加

  if (bookIll) bookIll.src = "";

  // 2枚とも隠す
  illCanvas.hidden = true;
  illCanvas.style.pointerEvents = "none";
  if (illCanvas2) {
    illCanvas2.hidden = true;
    illCanvas2.style.pointerEvents = "none";
  }
  
  if (leafwingHitLayer) {
    leafwingHitLayer.hidden = true;
  }

  if (candleHitLayer) {
    candleHitLayer.hidden = true;
  }

  if (eyehandHitLayer) {
    eyehandHitLayer.hidden = true;
  }

  if (oxgameHitLayer) {
    oxgameHitLayer.hidden = true;
  }

  if (chipsHitLayer) {
    chipsHitLayer.hidden = true;
  }

  // 花火→水紋のクリック転送が残ってたら剥がす
  if (illCanvas2 && illCanvas2._forwardToRipple) {
    illCanvas2.removeEventListener("pointerdown", illCanvas2._forwardToRipple);
    illCanvas2._forwardToRipple = null;
  }

    const mode = lampOn ? "dither" : "ascii";

  // -------------------------
  // ★14ページ：水紋 or 花火（ランダムで片方だけ）
  // -------------------------
  if (page.ill === "ripple_fireworks") {

    // 14ページに入った瞬間だけ抽選（開いてる間は固定）
    if (p14RandomIll === null) {
      p14RandomIll = (Math.random() < 0.5) ? "ripple" : "fireworks";
    }

    if (p14RandomIll === "ripple") {
      // 水紋だけ
      illCanvas.hidden = false;
      illCanvas.style.pointerEvents = "auto"; // 水紋クリックしたいならauto

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          WaterRippleEngine.start(illCanvas, { mode, fxScale: 0.55, asciiFps: 12 })
            .catch(console.error);
        });
      });

    } else {
      // 花火だけ（canvas2優先）
      if (illCanvas2) {
        illCanvas2.hidden = false;
        illCanvas2.style.pointerEvents = "auto";

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            FireworksEngine.start(illCanvas2, { mode, fxScale: 0.55, asciiFps: 12 })
              .catch(console.error);
          });
        });

      } else {
        // canvas2 がない場合の保険：illCanvasに花火
        illCanvas.hidden = false;
        illCanvas.style.pointerEvents = "auto";

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            FireworksEngine.start(illCanvas, { mode, fxScale: 0.55, asciiFps: 12 })
              .catch(console.error);
          });
        });
      }
    }

    // ★このページの処理はここで終わり（下の通常分岐に入らない）
    return;
  }

  // -------------------------
  // ↓↓↓ ここから下は「あなたの元の挿絵分岐」を全部そのまま残す ↓↓↓
  // （eyehand / oxgame / strings / boxspiders / candle / leafwing / 画像挿絵 etc）
  // -------------------------


if (page.ill === "chips") {
  illCanvas.hidden = false;
  illCanvas.style.pointerEvents = "none";
  if (chipsHitLayer) chipsHitLayer.hidden = false;

  const mode = lampOn ? "dither" : "ascii";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ChipsEngine.start(illCanvas, {
        mode,
        fxScale: 0.55,
        asciiFps: 12,
        bounds: { x: 228, y: 129, w: 1453, h: 854 }
      }).catch(console.error);
    });
  });

  } else if (page.ill === "moon") {
  illCanvas.hidden = false;
  illCanvas.style.pointerEvents = "none";

  if (moonHitLayer) moonHitLayer.hidden = false;

  if (illCanvas2) {
    illCanvas2.hidden = true;
    illCanvas2.style.pointerEvents = "none";
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      MoonEngine.start(illCanvas, {
        mode,
        fxScale: 0.55,
        asciiFps: 12,

        // 月の初期位置と動ける範囲
        cx: 960,
        cy: 540,
        r: 250,
        verticalRange: 80
      }).then(() => {
        updateMoonHitbox();
      }).catch(console.error);
    });
  });


} else if (page.ill === "eyehand") {

      illCanvas.hidden = false;
      illCanvas.style.pointerEvents = "none";
      if (eyehandHitLayer) eyehandHitLayer.hidden = false;

      const mode = lampOn ? "dither" : "ascii";

      // レイアウト確定してから開始（2段rAF）
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          EyeHandEngine.start(illCanvas, {
            mode,
            eyeSrc: "assets/eyeball.webp",
            pupilSrc: "assets/pupil.webp",
            handSrc: "assets/hand.webp",
            fxScale: 0.55,
            asciiFps: 12,

            layout: {
              eye: { x: 571, y: 357, w: 350, h: 233 },
              pupil: { x: 688, y: 416, w: 116, h: 116 },
              hand: { x: 356, y: 491, w: 300, h: 400 },

              bounds: { x: 228, y: 129, w: 1453, h: 854 }
            }
          }).catch(console.error);
        });
      });

    } else if (page.ill === "oxgame") {
      illCanvas.hidden = false;
      illCanvas.style.pointerEvents = "none";
    
      if (oxgameHitLayer) oxgameHitLayer.hidden = false;

      const mode = lampOn ? "dither" : "ascii";

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          OxGameEngine.start(illCanvas, {
            mode,
            fxScale: 0.55,
            asciiFps: 12,

            // 本の白エリア（前に使ったboundsと同じ）
            bounds: { x: 228, y: 129, w: 1453, h: 854 },

            // ✅ 格子だけ置く範囲（左ページ中央の正方形）
            gridRect: { x: 261, y: 226, w: 660, h: 660 },

            // 格子の設定（3x3）
            grid: { cols: 3, rows: 3, lineWidth: 10 },

            // トークンサイズ（Figma基準の直径）
            token: { size: 130 }
          }).catch(console.error);
        });
      });

    } else if (page.ill === "strings") {
      illCanvas.hidden = false;
      illCanvas.style.pointerEvents = "auto";

      const mode = lampOn ? "dither" : "ascii";

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          StringBundleEngine.start(illCanvas, {
            mode,
            fxScale: 0.55,
            asciiFps: 12,

            // 可動域（本の白いエリア内に収めるならこれ）
            bounds: { x: 228, y: 129, w: 1453, h: 854 },

            // ✅ 弦の“束”を置く矩形（ここだけは Figma で決めた座標に差し替え推奨）
            // 例：左ページ中央あたりに縦長の領域
            rect: { x: 320, y: 170, w: 520, h: 820 },

            // 本数
            strands: 10
          }).catch(console.error);
        });
      });

    } else if (page.ill === "spiders") {
      illCanvas.hidden = false;
      illCanvas.style.pointerEvents = "auto";

      const mode = lampOn ? "dither" : "ascii";

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          BoxSpidersEngine.start(illCanvas, {
            mode,
            fxScale: 0.55,
            asciiFps: 12,

            // 触れる範囲は本の白枠のままでOK
            bounds: { x: 228, y: 129, w: 1453, h: 854 },

            // ✅ ベース箱は固定（サイズ変化しない）
            boxRect: { x: 400, y: 650, w: 420, h: 220 },

            // 「一回だけ開く」を反映
            openedOnce: spidersOpenedOnce,

            // 開いたらフラグ更新
            onOpened: () => { spidersOpenedOnce = true; }
          }).catch(console.error);
        });
      });

      } else if (page.ill === "candle") {
        illCanvas.hidden = false;
        illCanvas.style.pointerEvents = "none";
        if (candleHitLayer) candleHitLayer.hidden = false;

        const mode = lampOn ? "dither" : "ascii";

        if (candleTimelineStartAt == null) {
          candleTimelineStartAt = performance.now();
        }

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            CandleEngine.start(illCanvas, {
              mode,
              fxScale: 0.55,
              asciiFps: 12,
              timelineStartAt: candleTimelineStartAt,
            }).then(() => {
              updateCandleHitbox();
            }).catch(console.error);
          });
        });

     } else if (page.ill === "leafwing") {
    illCanvas.hidden = false;
    illCanvas.style.pointerEvents = "none";   // ← canvas全体では触らせない
    if (leafwingHitLayer) leafwingHitLayer.hidden = false;

    const mode = lampOn ? "dither" : "ascii";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        LeafWingEngine.start(illCanvas, {
          mode,
          fxScale: 0.55,
          asciiFps: 12,
          bounds: { x: 228, y: 129, w: 1453, h: 854 },
          rect: { x: 980, y: 240, w: 650, h: 650 },
        }).catch(console.error);
      });
    });

  // -------------------------
  // ★16ページ：最後の扉
  // -------------------------
  } else if (page.ill === "lastdoor") {
    illCanvas.hidden = false;
    illCanvas.style.pointerEvents = "auto";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        LastDoorEngine.start(illCanvas, {
          mode,
          fxScale: 0.55,
          asciiFps: 12,
          layout: {
            flashlight: { x: 960, y: 715, w: 200, h: 250 },
            beamDeg: 40,

            // 右端だけ暗闇を外す仮値
            // 後でこの数値を右へ動かすと「見える範囲」が狭くなり、
            // 左へ動かすと「見える範囲」が広くなります
            poemSafeStripX: 1520,

            safeLeft: 20,
            safeTop: 20,
            safeBottom: 20,

            bagClosed: { x: 1160, y: 248, w: 200, h: 400 },
            bagOpen:   { x: 1160, y: 248, w: 200, h: 400 },

            letterSpawn: { x: 1210, y: 491, w: 150, h: 100 },
            letterDrop:  { x: 1235, y: 648, w: 150, h: 100 },

            doorOuter: { x: 484, y: 352, w: 225, h: 396 },
            knob: { x: 648, y: 541, w: 27, h: 27 },

            doorPts: {
              A:  { x: 501, y: 369 },
              B:  { x: 501, y: 730 },
              C:  { x: 692, y: 369 },
              D:  { x: 692, y: 730 },
              Cp: { x: 336, y: 448 },
              Dp: { x: 336, y: 810 },
            }
          }
        });
      });
    });

    } else if (page.ill && bookIll) {
      // 通常挿絵（画像をIllEngineに渡す）
      bookIll.src = getAsset("book", page.ill);
      bookIll.style.opacity = "0";
      bookIll.style.pointerEvents = "none";

      illCanvas.hidden = false;
      illCanvas.style.pointerEvents = "none";

      const mode = lampOn ? "dither" : "ascii";
      requestAnimationFrame(() => {
        IllEngine.start(bookIll, illCanvas, mode);
      });
    }
  }
}

function updateOxgameHitboxes() {
  if (!oxgameHitLayer || !oxgameHitButtons.length) return;

  if (scene !== "book") {
    oxgameHitLayer.hidden = true;
    return;
  }

  const page = PAGES[bookPage] || {};
  if (page.ill !== "oxgame") {
    oxgameHitLayer.hidden = true;
    return;
  }

  const rects = OxGameEngine.getTokenRects();
  if (!rects || !rects.length) {
    oxgameHitLayer.hidden = true;
    return;
  }

  const CROP_X = 228;
  const CROP_Y = 129;
  const CROP_W = 1453;
  const CROP_H = 854;

  const padX = 0;
  const padY = 0;

  rects.forEach((r, i) => {
    const btn = oxgameHitButtons[i];
    if (!btn) return;

    const left = ((r.x - CROP_X - padX) / CROP_W) * 100;
    const top = ((r.y - CROP_Y - padY) / CROP_H) * 100;
    const width = ((r.w + padX * 2) / CROP_W) * 100;
    const height = ((r.h + padY * 2) / CROP_H) * 100;

    btn.style.left = left + "%";
    btn.style.top = top + "%";
    btn.style.width = width + "%";
    btn.style.height = height + "%";
    btn.hidden = false;
  });

  for (let i = rects.length; i < oxgameHitButtons.length; i++) {
    oxgameHitButtons[i].hidden = true;
  }

  oxgameHitLayer.hidden = false;
}

function updateEyehandHitbox() {
  if (!eyehandHitLayer || !eyehandHandHit) return;

  if (scene !== "book") {
    eyehandHitLayer.hidden = true;
    return;
  }

  const page = PAGES[bookPage] || {};
  if (page.ill !== "eyehand") {
    eyehandHitLayer.hidden = true;
    return;
  }

  const rect = EyeHandEngine.getHandRect();
  if (!rect) {
    eyehandHitLayer.hidden = true;
    return;
  }

  // book-ill-wrap は「白枠」だけなので、1920全体ではなく白枠基準へ直す
  const CROP_X = 228;
  const CROP_Y = 129;
  const CROP_W = 1453;
  const CROP_H = 854;

  // 開始判定を少しだけ広げたいならここを微調整
  const padX = 0;
  const padY = 0;

  const left = ((rect.x - CROP_X - padX) / CROP_W) * 100;
  const top = ((rect.y - CROP_Y - padY) / CROP_H) * 100;
  const width = ((rect.w + padX * 2) / CROP_W) * 100;
  const height = ((rect.h + padY * 2) / CROP_H) * 100;

  eyehandHandHit.style.left = left + "%";
  eyehandHandHit.style.top = top + "%";
  eyehandHandHit.style.width = width + "%";
  eyehandHandHit.style.height = height + "%";

  eyehandHitLayer.hidden = false;
}

function updateMoonHitbox() {
  if (!moonHitLayer || !moonDragHit) return;

  if (!MoonEngine.active) {
    moonHitLayer.hidden = true;
    return;
  }

  const r = MoonEngine.getMoonRect ? MoonEngine.getMoonRect() : null;
  if (!r) {
    moonHitLayer.hidden = true;
    return;
  }

  moonHitLayer.hidden = false;

  const CROP_X = 228;
  const CROP_Y = 129;
  const CROP_W = 1453;
  const CROP_H = 854;

  const left = ((r.x - CROP_X) / CROP_W) * 100;
  const top = ((r.y - CROP_Y) / CROP_H) * 100;
  const width = (r.w / CROP_W) * 100;
  const height = (r.h / CROP_H) * 100;

  moonDragHit.style.left = left + "%";
  moonDragHit.style.top = top + "%";
  moonDragHit.style.width = width + "%";
  moonDragHit.style.height = height + "%";
}

function tickHotspots() {
  updateCandleHitbox();
  updateEyehandHitbox();
  updateOxgameHitboxes();
  updateChipsHitboxes();
  updateMoonHitbox();
  requestAnimationFrame(tickHotspots);
}
tickHotspots();

function updateCandleHitbox() {
  if (!candleHitLayer || !candleFlameHit) return;

  if (scene !== "book") {
    candleHitLayer.hidden = true;
    return;
  }

  const page = PAGES[bookPage] || {};
  if (page.ill !== "candle") {
    candleHitLayer.hidden = true;
    return;
  }

  const rect = CandleEngine.getFlameRect();
  if (!rect) {
    candleHitLayer.hidden = true;   // stage4は炎なし
    return;
  }

  // bookの白枠基準
  const CROP_X = 228;
  const CROP_Y = 129;
  const CROP_W = 1453;
  const CROP_H = 854;

  // 少し押しやすく広げる
  const padX = 16;
  const padY = 16;

  const left = ((rect.x - CROP_X - padX) / CROP_W) * 100;
  const top = ((rect.y - CROP_Y - padY) / CROP_H) * 100;
  const width = ((rect.w + padX * 2) / CROP_W) * 100;
  const height = ((rect.h + padY * 2) / CROP_H) * 100;

  candleFlameHit.style.left = left + "%";
  candleFlameHit.style.top = top + "%";
  candleFlameHit.style.width = width + "%";
  candleFlameHit.style.height = height + "%";

  candleHitLayer.hidden = false;
}

  // =====================
  // 本：ページ移動
  // =====================
  async function goForward() {
    if (scene !== "book") return;
    if (bookAnimating) return;
    if (bookPage >= BOOK_MAX_PAGE) return;

    bookAnimating = true;

    if (bookPage === 0) {
      await playBlink("close");
      await bookHardCutBlack(300);
      bookPage = 1;
      renderBookPage();
      await bookFadeFromBlack(650);
      setBookUiVisible(true);
      bookAnimating = false;
      return;
    }

    if (bookPage === BOOK_MAX_PAGE - 1) {
      await playBlink("close");
      await bookHardCutBlack(300);
      bookPage = BOOK_MAX_PAGE;
      renderBookPage();
      await bookFadeFromBlack(650);
      setBookUiVisible(true);
      bookAnimating = false;
      return;
    }

    await playPageflip("forward");
    bookPage++;
    renderBookPage();
    setBookUiVisible(true);
    bookAnimating = false;
  }

  async function goBack() {
    if (scene !== "book") return;
    if (bookAnimating) return;
    if (bookPage <= 0) return;

    bookAnimating = true;

    if (bookPage === 1) {
      await bookFadeToBlack(650);

      if (bookFadeEl) {
        bookFadeEl.style.transition = "none";
        bookFadeEl.style.opacity = "1";
      }

      bookPage = 0;
      renderBookPage();

      if (bookFadeEl) bookFadeEl.style.opacity = "0";
      await playBlink("open");

      setBookUiVisible(true);
      bookAnimating = false;
      return;
    }

    if (bookPage === BOOK_MAX_PAGE) {
      await bookFadeToBlack(650);

      if (bookFadeEl) {
        bookFadeEl.style.transition = "none";
        bookFadeEl.style.opacity = "1";
      }

      bookPage = BOOK_MAX_PAGE - 1;
      renderBookPage();

      if (bookFadeEl) bookFadeEl.style.opacity = "0";
      await playBlink("open");

      setBookUiVisible(true);
      bookAnimating = false;
      return;
    }

    await playPageflip("back");
    bookPage--;
    renderBookPage();
    setBookUiVisible(true);
    bookAnimating = false;
  }

  if (bookPrev) bookPrev.addEventListener("click", goForward);
  if (bookNext) bookNext.addEventListener("click", goBack);

  // =====================
  // コーヒー
  // =====================
  if (hitCoffee) hitCoffee.addEventListener("click", onCoffeeClick);

  async function onCoffeeClick() {
    if (!started || scene !== "desk") return;
    if (inputLocked) return;
    if (coffeeBusy) return;

    if (!coffeeSteam || !coffeeBanner || !coffeeBannerImg || !coffeeBannerText) return;

    const elapsedMs = Date.now() - (siteStartAt ? siteStartAt : Date.now());
    const elapsedMin = elapsedMs / 60000;

    if (coffeeBanner) coffeeBanner.style.display = "none";

    // 演出レイヤ表示（hidden inert なら外しておく）
    setCoffeeFxVisible(true);

    if (elapsedMin < 5) {
      await playSteam();
    } else if (elapsedMin < 10) {
      showCoffeeBanner("...");
    } else {
      showCoffeeBanner("...冷めている。");
    }
  }

  async function playSteam() {
    if (!coffeeSteam) return;

    coffeeBusy = true;
    coffeeSteam.style.opacity = "1";

    for (let loop = 0; loop < 2; loop++) {
      for (let i = 1; i <= 3; i++) {
        coffeeSteam.src = getCoffeeSteamSrc(i);
        await sleep(200);
      }
    }

    coffeeSteam.style.opacity = "0";
    coffeeBusy = false;

    // 演出が終わったらレイヤーを消す（任意：残したければ消さない）
    setCoffeeFxVisible(false);
  }

  function showCoffeeBanner(text) {
    if (!coffeeBanner || !coffeeBannerImg || !coffeeBannerText) return;

    coffeeBannerImg.src = getCoffeeBannerSrc();
    coffeeBannerText.textContent = text;
    coffeeBanner.style.display = "block";

    clearTimeout(showCoffeeBanner._t);
    showCoffeeBanner._t = setTimeout(function () {
      coffeeBanner.style.display = "none";
      // バナーだけの時もレイヤーを消す
      setCoffeeFxVisible(false);
    }, 2500);
  }

  // =====================
  // 机上ホットスポット（仮）
  // =====================

  (function () {
    const DESIGN_W = 1920;
    const frame = document.getElementById("frame");
    if (!frame) return;

    let rafId = 0;

    function applyScale() {
      const w = frame.getBoundingClientRect().width;
      const s = w / DESIGN_W;
      document.documentElement.style.setProperty("--s", String(s));
    }

    function onResize() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(applyScale);
    }

    window.addEventListener("resize", onResize);
    applyScale();
  })();
