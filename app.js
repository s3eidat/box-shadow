/* Box Shadow — layered box-shadow builder, parser and presets. All local. */
(function () {
  "use strict";
  var $ = S3.$, $$ = S3.$$, h = S3.h;
  var BG = { light: ["#eef1f5", "#ffffff"], dark: ["#15171c", "#262a31"] };
  function L(x, y, blur, spread, color, alpha, inset) { return { x: x, y: y, blur: blur, spread: spread, color: color, alpha: alpha, inset: !!inset }; }
  var PRESETS = [
    ["Soft", { layers: [L(0, 10, 30, -6, "#0f1720", .18)] }],
    ["Subtle", { layers: [L(0, 1, 2, 0, "#0f1720", .06), L(0, 1, 3, 0, "#0f1720", .1)] }],
    ["Elevated", { layers: [L(0, 2, 4, 0, "#0f1720", .06), L(0, 12, 24, -4, "#0f1720", .14), L(0, 32, 64, -12, "#0f1720", .2)] }],
    ["Smooth", { layers: [L(0, 1, 1, 0, "#000000", .03), L(0, 2, 2, 0, "#000000", .03), L(0, 4, 4, 0, "#000000", .04), L(0, 8, 8, 0, "#000000", .05), L(0, 16, 16, 0, "#000000", .06), L(0, 32, 32, 0, "#000000", .07)] }],
    ["Floating", { layers: [L(0, 30, 60, -12, "#32325d", .25), L(0, 18, 36, -18, "#000000", .3)] }],
    ["Sharp", { layers: [L(6, 6, 0, 0, "#0f1720", 1)] }],
    ["Glow", { layers: [L(0, 0, 0, 1, "#3dd6d0", .6), L(0, 0, 24, 4, "#3dd6d0", .45)], bg: "dark" }],
    ["Inner", { layers: [L(0, 2, 6, 0, "#0f1720", .18, true)] }],
    ["Neumorphic", { layers: [L(9, 9, 16, 0, "#a3b1c6", .6), L(-9, -9, 16, 0, "#ffffff", .7)], bg: "custom", page: "#e0e5ec", box: "#e0e5ec" }],
    ["Pressed", { layers: [L(6, 6, 12, 0, "#a3b1c6", .6, true), L(-6, -6, 12, 0, "#ffffff", .7, true)], bg: "custom", page: "#e0e5ec", box: "#e0e5ec" }]
  ];

  // ---------- core ----------
  function px(n) { return n === 0 ? "0" : n + "px"; }
  function hexToRgb(hx) { var n = parseInt(hx.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function color(l) { return l.alpha >= 1 ? l.color : "rgba(" + hexToRgb(l.color).join(", ") + ", " + Math.round(l.alpha * 1000) / 1000 + ")"; }
  function layerCss(l) { return (l.inset ? "inset " : "") + px(l.x) + " " + px(l.y) + " " + px(l.blur) + (l.spread ? " " + px(l.spread) : "") + " " + color(l); }
  function value(layers) { return layers.length ? layers.map(layerCss).join(",\n    ") : "none"; }
  function cssText(layers) { return layers.length > 1 ? "box-shadow:\n    " + value(layers) + ";" : "box-shadow: " + value(layers) + ";"; }

  // Colour normalisation through the browser's own CSS parser (canvas fillStyle), no network.
  var cx = document.createElement("canvas").getContext("2d");
  function normColor(str) {
    cx.fillStyle = "#010203"; cx.fillStyle = str;
    var v = cx.fillStyle;
    if (v === "#010203" && str.replace(/\s/g, "").toLowerCase() !== "#010203") return null;
    if (v[0] === "#") return { color: v, alpha: 1 };
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(v);
    if (!m) return null;
    return { color: "#" + [m[1], m[2], m[3]].map(function (x) { return (+x).toString(16).padStart(2, "0"); }).join(""), alpha: m[4] == null ? 1 : +m[4] };
  }
  function splitTop(s) {
    var out = [], depth = 0, cur = "";
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (ch === "(") depth++; else if (ch === ")") depth--;
      if (ch === "," && depth === 0) { out.push(cur); cur = ""; } else cur += ch;
    }
    out.push(cur);
    return out.map(function (x) { return x.trim(); }).filter(Boolean);
  }
  // Parses "box-shadow: …;" or just the value. Lengths must be px or 0. Returns layers or null.
  function parse(text) {
    var s = String(text).trim().replace(/^box-shadow\s*:/i, "").replace(/;\s*$/, "").trim();
    if (!s || s === "none") return s === "none" ? [] : null;
    var layers = [];
    var ok = splitTop(s).every(function (part) {
      var inset = false, col = null, nums = [], bad = false;
      var rest = part.replace(/\binset\b/i, function () { inset = true; return " "; });
      var m = /(#[0-9a-f]{3,8}\b|(?:rgba?|hsla?|hwb|oklch|oklab|lab|lch|color)\([^)]*\))/i.exec(rest);
      if (m) { col = normColor(m[0]); if (!col) return false; rest = rest.slice(0, m.index) + " " + rest.slice(m.index + m[0].length); }
      rest.trim().split(/\s+/).filter(Boolean).forEach(function (t) {
        var n = /^(-?(?:\d+\.?\d*|\.\d+))(px)?$/.exec(t);
        if (n && (n[2] || +n[1] === 0)) nums.push(+n[1]);
        else if (!col && /^[a-z]+$/i.test(t) && (col = normColor(t))) return;
        else bad = true;
      });
      if (bad || nums.length < 2 || nums.length > 4) return false;
      col = col || { color: "#000000", alpha: 1 };
      layers.push(L(nums[0], nums[1], nums[2] || 0, nums[3] || 0, col.color, col.alpha, inset));
      return true;
    });
    return ok ? layers : null;
  }

  // ---------- UI ----------
  var saved = S3.store("bs.state");
  var st = saved && Array.isArray(saved.layers) ? saved : { layers: clone(PRESETS[2][1].layers), sel: 0, bg: "light", page: BG.light[0], box: BG.light[1], radius: 18 };
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function cur() { return st.layers[st.sel]; }

  function render() {
    var page = st.bg === "custom" ? st.page : BG[st.bg][0], boxc = st.bg === "custom" ? st.box : BG[st.bg][1];
    $("#stage").style.background = page;
    var box = $("#box");
    box.style.background = boxc; box.style.borderRadius = st.radius + "px"; box.style.boxShadow = value(st.layers).replace(/\n\s*/g, " ");
    box.style.color = luminance(boxc) > 0.4 ? "#12161b" : "#eceef2";
    $("#page-c").value = page; $("#box-c").value = boxc;
    $$("#bg button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === st.bg)); });
    $("#radius").value = st.radius; $("#radius-v").textContent = st.radius + "px";
    $("#css").textContent = cssText(st.layers);

    var list = $("#layers"); list.textContent = "";
    st.layers.forEach(function (l, i) {
      list.appendChild(h("li", { "class": "layer" + (i === st.sel ? " on" : "") }, [
        h("button", { "class": "pick", "data-i": i, "aria-pressed": String(i === st.sel) }, [
          h("span", { "class": "sw", style: "background:linear-gradient(" + color(l) + "," + color(l) + "),#fff" }), h("span", { "class": "mono", text: layerCss(l) })]),
        h("button", { "class": "x", "data-up": i, "aria-label": "Move layer up", title: "Move up", disabled: i === 0, text: "↑" }),
        h("button", { "class": "x", "data-del": i, "aria-label": "Delete layer", title: "Delete", text: "×" })
      ]));
    });
    if (!st.layers.length) list.appendChild(h("li", { "class": "empty" }, [h("b", { text: "No layers" }), "Add one or pick a preset."]));
    $("#ctl").hidden = !st.layers.length; $("#dup").disabled = !st.layers.length;
    var l = cur();
    if (l) {
      $$("#ctl input[type=range]").forEach(function (r) { var k = r.dataset.k; r.value = k === "alpha" ? Math.round(l.alpha * 100) : l[k]; });
      $$("#ctl .v").forEach(function (v) { var k = v.dataset.v; v.textContent = k === "alpha" ? Math.round(l.alpha * 100) + "%" : l[k] + "px"; });
      $("#l-color").value = l.color; $("#l-inset").checked = l.inset;
    }
    S3.store("bs.state", st);
  }
  function luminance(hx) { return hexToRgb(hx).reduce(function (s, v, i) { v /= 255; v = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0); }

  $("#ctl").addEventListener("input", function (e) {
    var l = cur(); if (!l) return;
    var k = e.target.dataset.k;
    if (k) l[k] = k === "alpha" ? +e.target.value / 100 : +e.target.value;
    else if (e.target.id === "l-color") l.color = e.target.value;
    else if (e.target.id === "l-inset") l.inset = e.target.checked;
    render();
  });
  $("#layers").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.i != null) st.sel = +b.dataset.i;
    else if (b.dataset.del != null) { st.layers.splice(+b.dataset.del, 1); st.sel = Math.max(0, Math.min(st.sel, st.layers.length - 1)); }
    else if (b.dataset.up != null) { var i = +b.dataset.up; st.layers.splice(i - 1, 0, st.layers.splice(i, 1)[0]); st.sel = i - 1; }
    render();
  });
  $("#add").addEventListener("click", function () { st.layers.push(L(0, 8, 24, 0, "#0f1720", .15)); st.sel = st.layers.length - 1; render(); });
  $("#dup").addEventListener("click", function () { if (!cur()) return; st.layers.splice(st.sel + 1, 0, clone(cur())); st.sel++; render(); });
  $$("#bg button").forEach(function (b) { b.addEventListener("click", function () {
    if (b.dataset.v === "custom" && st.bg !== "custom") { var c = BG[st.bg]; st.page = c[0]; st.box = c[1]; }
    st.bg = b.dataset.v; render();
  }); });
  $("#page-c").addEventListener("input", function () { if (st.bg !== "custom") st.box = BG[st.bg][1]; st.bg = "custom"; st.page = this.value; render(); });
  $("#box-c").addEventListener("input", function () { if (st.bg !== "custom") st.page = BG[st.bg][0]; st.bg = "custom"; st.box = this.value; render(); });
  $("#radius").addEventListener("input", function () { st.radius = +this.value; render(); });
  PRESETS.forEach(function (p, i) {
    var pg = p[1].page || BG[p[1].bg || "light"][0], bx = p[1].box || BG[p[1].bg || "light"][1];
    $("#presets").appendChild(h("button", { "class": "preset", "data-i": i, style: "background:" + pg }, [
      h("span", { "class": "pv", style: "background:" + bx + ";box-shadow:" + value(p[1].layers).replace(/\n\s*/g, " ") }), h("span", { "class": "pn", text: p[0], style: "color:" + (luminance(pg) > 0.4 ? "#4f5866" : "#a5adb9") })]));
  });
  $("#presets").addEventListener("click", function (e) {
    var b = e.target.closest(".preset"); if (!b) return;
    var p = PRESETS[+b.dataset.i][1];
    st.layers = clone(p.layers); st.sel = 0;
    if (p.bg === "custom") { st.bg = "custom"; st.page = p.page; st.box = p.box; } else if (p.bg) st.bg = p.bg; else if (st.bg === "custom" && st.page === "#e0e5ec") st.bg = "light";
    render(); S3.done();
  });
  $("#import").addEventListener("input", S3.debounce(function () {
    var v = $("#import").value; if (!v.trim()) { $("#import").removeAttribute("aria-invalid"); return; }
    var layers = parse(v);
    $("#import").setAttribute("aria-invalid", layers ? "false" : "true");
    if (layers) { st.layers = layers; st.sel = 0; render(); S3.toast("Imported " + layers.length + (layers.length === 1 ? " layer" : " layers")); }
  }, 350));
  $("#copy").addEventListener("click", function () { S3.copy(cssText(st.layers), "CSS copied"); S3.done(); });

  if (st.sel >= st.layers.length) st.sel = 0;
  render();

  window.S3_DEMO = function () { st.layers = clone(PRESETS[2][1].layers); st.sel = 1; st.bg = "light"; st.radius = 20; render(); };

  window.S3_SELFTEST = function () {
    var one = cssText([L(0, 4, 12, 0, "#000000", .15)]);
    var two = cssText([L(0, 1, 2, 0, "#000000", 1), L(2, 3, 4, -1, "#ff0000", .5, true)]);
    var p1 = parse("inset 0 0 0 1px red, 2px 2px #fff");
    var p2 = parse("box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 hsl(0 0% 100% / .5);");
    var rt = parse(two);
    var checks = [
      one === "box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);",
      two === "box-shadow:\n    0 1px 2px #000000,\n    inset 2px 3px 4px -1px rgba(255, 0, 0, 0.5);",
      p1,
      p1.length === 2,
      p1[0].inset,
      p1[0].spread === 1,
      p1[0].color === "#ff0000",
      p1[0].alpha === 1,
      p1[1].x === 2,
      p1[1].y === 2,
      p1[1].blur === 0,
      p1[1].color === "#ffffff",
      !p1[1].inset,
      p2,
      p2.length === 2,
      p2[0].blur === 12,
      Math.abs(p2[0].alpha - 0.15) < 0.01,
      p2[1].inset,
      p2[1].color === "#ffffff",
      Math.abs(p2[1].alpha - 0.5) < 0.01,
      JSON.stringify(rt) === JSON.stringify([L(0, 1, 2, 0, "#000000", 1), L(2, 3, 4, -1, "#ff0000", .5, true)]),
      parse("0 4px 1em black") === null,
      parse("0 4px banana") === null,
      parse("4px") === null,
      JSON.stringify(parse("none")) === "[]",
      cssText([]) === "box-shadow: none;",
      splitTop("rgba(0,0,0,.1) 1px, 2px").length === 2
    ];
    var bad = checks.findIndex(function (c) { return !c; });
    return bad < 0 ? true : "check #" + bad;
  };
})();
