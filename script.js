/* ============================================================
   CV workbook — Learn, Do, Test, Correct
   Split into: code highlighting, progress, nav, project panel,
   step tests, quality review, live preview.
   ============================================================ */

/* ---------- 1. Code block highlighting + copy ---------- */
document.querySelectorAll("script.code").forEach(function (s) {
  var f = document.createElement("figure");
  var c = document.createElement("figcaption");
  var n = document.createElement("span");
  var b = document.createElement("button");
  var p = document.createElement("pre");
  var k = document.createElement("code");
  f.className = "code";
  n.textContent = s.dataset.file || "";
  b.type = "button";
  b.textContent = "Copy";
  var raw = s.textContent.replace(/^\n/, "").replace(/\s+$/, "");
  var fl = (s.dataset.file || "").toLowerCase();
  var e = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  var isCss = /css/.test(fl);
  var rx = /folder/.test(fl)
    ? null
    : isCss
    ? /(\/\*[\s\S]*?\*\/)|("[^"\n]*")|(--[\w-]+|[\w-]+(?=\s*:\s))|(@[\w-]+)|(#[0-9a-fA-F]{3,8}\b)/g
    : /(&lt;!--[\s\S]*?--&gt;)|("[^"\n]*")|(&lt;\/?[\w!-]+)/g;
  var cl = isCss ? ["c", "s", "p", "a", "h"] : ["c", "s", "t"];
  k.innerHTML = rx
    ? e.replace(rx, function (m) {
        for (var i = 1; i < arguments.length - 2; i++) {
          if (arguments[i] !== undefined) return '<span class="' + cl[i - 1] + '">' + m + "</span>";
        }
        return m;
      })
    : e;
  b.onclick = function () {
    try {
      navigator.clipboard.writeText(k.textContent);
      b.textContent = "Copied";
      setTimeout(function () { b.textContent = "Copy"; }, 1200);
    } catch (err) { /* clipboard unavailable */ }
  };
  c.append(n, b);
  p.append(k);
  f.append(c, p);
  s.replaceWith(f);
});

/* ---------- 2. Progress bar + task persistence ---------- */
var boxes = [].slice.call(document.querySelectorAll(".do input"));
var TICK_KEY = "cv-workbook-ticks";
var saved = [];
try { saved = JSON.parse(localStorage.getItem(TICK_KEY) || "[]"); } catch (err) { /* ignore */ }

function updateProgress() {
  var done = boxes.filter(function (x) { return x.checked; }).length;
  var pc = boxes.length ? Math.round((done / boxes.length) * 100) : 0;
  var bar = document.querySelector(".bar i");
  var barWrap = document.querySelector(".bar");
  if (bar) bar.style.width = pc + "%";
  if (barWrap) barWrap.setAttribute("aria-valuenow", pc);
  var pct = document.getElementById("pct");
  if (pct) pct.textContent = done + " of " + boxes.length + " tasks done";
  document.querySelectorAll("section.step").forEach(function (s) {
    var a = document.querySelector('nav.side a[href="#' + s.id + '"]');
    var i = s.querySelectorAll(".do input");
    if (a && i.length) a.classList.toggle("done", [].every.call(i, function (x) { return x.checked; }));
  });
  try { localStorage.setItem(TICK_KEY, JSON.stringify(boxes.map(function (x) { return x.checked; }))); } catch (err) { /* ignore */ }
}
boxes.forEach(function (x, i) {
  x.checked = !!saved[i];
  x.addEventListener("change", updateProgress);
});

/* ---------- 3. Active step highlight ---------- */
var links = [].slice.call(document.querySelectorAll("nav.side a"));
if ("IntersectionObserver" in window) {
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) {
        links.forEach(function (a) {
          a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id);
        });
      }
    });
  }, { rootMargin: "-30% 0px -60% 0px" });
  document.querySelectorAll("section.step").forEach(function (s) { io.observe(s); });
}

/* ---------- 4. Project panel (HTML / CSS / JS / preview) ---------- */
var H = document.getElementById("lh");
var C = document.getElementById("lc");
var J = document.getElementById("lj");
var pv = document.getElementById("lpv");
var PANEL_KEY = "cv-workbook-lab";
var renderTimer;
try {
  var sv = JSON.parse(localStorage.getItem(PANEL_KEY) || "{}");
  H.value = sv.h || "";
  C.value = sv.c || "";
  J.value = sv.j || "";
} catch (err) { /* ignore */ }

function render() {
  var html = H.value.replace(/<link[^>]*stylesheet[^>]*>/i, "");
  var styleTag = "<style>" + C.value + "</style>";
  var scriptTag = "<script>" + J.value + "<\/script>";
  var withHead = /<\/head>/i.test(html)
    ? html.replace(/<\/head>/i, function () { return styleTag + "</head>"; })
    : styleTag + html;
  pv.srcdoc = withHead.replace(/<\/body>/i, function () { return scriptTag + "</body>"; });
  try {
    localStorage.setItem(PANEL_KEY, JSON.stringify({ h: H.value, c: C.value, j: J.value }));
  } catch (err) { /* ignore */ }
}
[H, C, J].forEach(function (el) {
  el.addEventListener("input", function () {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 300);
  });
});
render();

/* ---------- 5. Accepted stylesheet paths ---------- */
var ACCEPTED_PATHS = ["css/style.css", "static/style.css", "static/styles.css", "styles.css"];
function checkStylesheetPath(d) {
  var lk = d.querySelector('link[rel~="stylesheet"]');
  if (!lk) {
    return {
      ok: false,
      hint:
        'No <link rel="stylesheet"> found. Add one inside <head>, for example: <link rel="stylesheet" href="static/styles.css">',
    };
  }
  var href = lk.getAttribute("href") || "";
  if (ACCEPTED_PATHS.indexOf(href) !== -1) return { ok: true, path: href };
  return {
    ok: false,
    hint:
      'The href "' + href + '" is not accepted. Use one of: ' +
      ACCEPTED_PATHS.join(", ") +
      '. Make sure the CSS file actually sits in that folder (or at the project root for styles.css).',
  };
}

/* ---------- 6. Build a test context from the panel ---------- */
function getContext() {
  return {
    h: H.value,
    c: C.value,
    j: J.value,
    d: new DOMParser().parseFromString(H.value, "text/html"),
    c2: C.value.replace(/\/\*[\s\S]*?\*\//g, ""),
  };
}

/* ---------- 7. Step tests (each returns {pass, msg, fix}) ---------- */
function step1(x) {
  return [
    {
      pass: /\/\*[\s\S]*?static[\s\S]*?because[\s\S]*?\*\//i.test(x.c),
      msg: "styles.css has a file-structure comment mentioning static/ and “because”",
      fix: 'Add to the top of styles.css:\n/* File structure: I used a static/ folder because it separates presentation from content. */',
    },
    {
      pass: !!x.h.trim() && !!x.c.trim(),
      msg: "Both HTML and CSS have content in the project panel",
      fix: "Paste your index.html into the HTML tab and your CSS into the CSS tab, then test again.",
    },
  ];
}
function step2(x) {
  var d = x.d;
  var sp = checkStylesheetPath(d);
  return [
    { pass: /^\s*<!doctype html>/i.test(x.h), msg: "Starts with <!DOCTYPE html>", fix: "Add <!DOCTYPE html> as the very first line." },
    { pass: !!d.documentElement.getAttribute("lang"), msg: "<html> has a lang attribute", fix: 'Add lang="en" to the <html> tag.' },
    { pass: !!d.querySelector("meta[charset]"), msg: "Has <meta charset>", fix: 'Add <meta charset="UTF-8"> inside <head>.' },
    { pass: !!d.querySelector('meta[name="viewport"]'), msg: "Has the viewport meta tag", fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> inside <head>.' },
    { pass: !!d.title.trim(), msg: "Has a descriptive <title>", fix: "Add a <title> inside <head>." },
    { pass: sp.ok, msg: "Links the CSS via an accepted path (" + (sp.path || "none") + ")", fix: sp.hint },
    { pass: !!d.querySelector('script[src="static/script.js"]'), msg: "Links the JavaScript with src=\"static/script.js\"", fix: 'Add <script src="static/script.js" defer></script> before </body>.' },
  ];
}
function step3(x) {
  var d = x.d;
  var hs = [].map.call(d.querySelectorAll("h1,h2,h3,h4,h5,h6"), function (n) { return +n.tagName[1]; });
  var s = d.querySelectorAll("main section");
  var a = d.querySelectorAll('nav a[href^="#"]');
  return [
    { pass: d.querySelectorAll("h1").length === 1, msg: "Exactly one <h1>", fix: "Use exactly one <h1> (your name). Found " + d.querySelectorAll("h1").length + "." },
    {
      pass: hs.length > 0 && hs[0] === 1 && hs.every(function (v, i) { return i === 0 || v <= hs[i - 1] + 1; }),
      msg: "Heading levels never skip",
      fix: "Start at h1 and do not jump levels. Your order is: " + hs.join(", ") + ".",
    },
    {
      pass: ["header", "nav", "main", "footer"].every(function (t) { return d.querySelector(t); }),
      msg: "Has header, nav, main and footer",
      fix: "Add the missing semantic regions (header, nav, main, footer).",
    },
    {
      pass: s.length >= 3 && [].every.call(s, function (e) { return e.id && e.querySelector("h2"); }),
      msg: "Main has at least 3 sections, each with an id and an <h2>",
      fix: "Inside <main>, add at least three <section id=\"...\"><h2>...</h2></section> blocks.",
    },
    {
      pass: a.length > 0 && [].every.call(a, function (e) { return d.getElementById(e.getAttribute("href").slice(1)); }),
      msg: "Every nav #link points at a real section id",
      fix: "Check each nav href matches a section id exactly (case-sensitive).",
    },
  ];
}
function step4(x) {
  var d = x.d;
  return [
    { pass: !!d.querySelector("strong,em"), msg: "Uses <strong> or <em>", fix: "Use <strong> or <em> where the meaning calls for it, not just for looks." },
    { pass: !!d.querySelector('address a[href^="mailto:"]'), msg: "Has an <address> containing a mailto: link", fix: 'Add <address><a href="mailto:you@example.com">you@example.com</a></address> in the footer.' },
    {
      pass: !!d.querySelector('a[href^="http"][target="_blank"][rel~="noopener"]'),
      msg: 'Has an external link with target="_blank" and rel="noopener"',
      fix: 'Add an external link like <a href="https://www.example.ac.uk/" target="_blank" rel="noopener">Your University</a>.',
    },
    {
      pass: /<!--[\s\S]*?because[\s\S]*?-->/i.test(x.h),
      msg: "An HTML comment explains a choice with “because”",
      fix: "Add a comment such as <!-- I used <em> because the stress changes the sentence -->.",
    },
  ];
}
function step5(x) {
  var d = x.d;
  var imgs = [].slice.call(d.querySelectorAll("img"));
  var okImgs = imgs.length > 0 && imgs.every(function (i) {
    return (i.getAttribute("alt") || "").trim() && i.getAttribute("width") && i.getAttribute("height");
  });
  var cssOk = /img\s*\{[^}]*max-width\s*:\s*100%/.test(x.c2);
  return [
    {
      pass: okImgs,
      msg: "Every <img> has alt, width and height",
      fix: 'Add at least one image and give every image alt, width and height. Example:\n<img src="images/profile.jpg" alt="A portrait of the site owner" width="160" height="160">',
    },
    {
      pass: cssOk,
      msg: "CSS has img { max-width: 100%; } so images never overflow",
      fix: "Add to styles.css:\nimg { max-width: 100%; height: auto; border-radius: 8px; }",
    },
    {
      pass: imgs.every(function (i) { return /^images\/[a-z0-9._-]+$/i.test(i.getAttribute("src") || ""); }),
      msg: "Every image src is a relative path into images/",
      fix: "Use relative paths like images/profile.jpg (lowercase, no spaces).",
    },
  ];
}
function step6(x) {
  var d = x.d;
  var th = d.querySelectorAll("table th");
  return [
    { pass: !!d.querySelector("table caption"), msg: "Table has a <caption>", fix: "Add <caption>My education</caption> immediately inside <table>." },
    { pass: !!d.querySelector("table thead") && !!d.querySelector("table tbody"), msg: "Table uses <thead> and <tbody>", fix: "Wrap the header row in <thead> and the data rows in <tbody>." },
    { pass: th.length > 0 && [].every.call(th, function (e) { return e.getAttribute("scope"); }), msg: "Every <th> has a scope", fix: 'Add scope="col" to column headers and scope="row" to row headers.' },
    { pass: d.querySelectorAll("table tbody tr").length >= 1, msg: "Table has at least one data row", fix: "Add at least one <tr> with <td> cells inside <tbody>." },
    { pass: !d.querySelector("table[border]"), msg: "No border attribute (borders belong in CSS)", fix: 'Remove border="1" and style borders with CSS: th, td { border: 1px solid #dde1ee; }' },
  ];
}
function step7(x) {
  var c = x.c2;
  return [
    { pass: /:root\s*\{/.test(c) && (c.match(/--[\w-]+\s*:/g) || []).length >= 4, msg: "At least 4 variables declared in :root", fix: "Declare at least four variables in :root, e.g. --bg, --ink, --accent, --font-body." },
    { pass: /var\(--/.test(c), msg: "Variables used with var(--name)", fix: "Use var(--accent) and similar wherever you need the value." },
    { pass: /box-sizing\s*:\s*border-box/.test(c), msg: "box-sizing: border-box reset", fix: "Add *, *::before, *::after { box-sizing: border-box; }." },
    { pass: /body\s*\{[^}]*font-family/.test(c) && /body\s*\{[^}]*line-height/.test(c), msg: "body sets font-family and line-height", fix: "In the body rule add font-family and a unitless line-height (e.g. 1.6)." },
    { pass: !x.d.querySelector("[style]"), msg: "No inline style attributes", fix: 'Remove style="" attributes and move the rules into styles.css.' },
  ];
}
function step8(x) {
  var c = x.c2;
  return [
    { pass: /main\s*\{[^}]*max-width/.test(c), msg: "main has a max-width", fix: "Add main { max-width: 46rem; margin: 0 auto; padding: 1rem; }." },
    { pass: /nav\s+a|nav\s*>[^{]*\ba\b/.test(c) && /main\s+a/.test(c), msg: "Separate rules for nav a and main a", fix: "Add nav a { text-decoration: none; font-weight: 600; } and main a { color: var(--accent); text-decoration: underline; }." },
    { pass: /h2\s*\+\s*p/.test(c), msg: "An h2 + p rule", fix: "Add h2 + p { font-size: 1.15rem; color: #55607a; }." },
    { pass: /section\s*\+\s*section/.test(c), msg: "A section + section rule", fix: "Add section + section { border-top: 1px solid #dde1ee; padding-top: 1.5rem; }." },
    { pass: /th\[scope/.test(c), msg: "A th[scope=...] rule", fix: 'Add th[scope="row"] { font-weight: 700; }.' },
    { pass: !/:contains\(/.test(c), msg: "No :contains() (not real CSS)", fix: ":contains() is jQuery, not CSS. Select by id or class instead." },
    { pass: (x.c.match(/\/\*[\s\S]*?because[\s\S]*?\*\//gi) || []).length >= 3, msg: "At least 3 CSS comments that explain with “because”", fix: "Above each rule write /* I used ___ because ___ */." },
  ];
}
function step9(x) {
  var c = x.c2;
  return [
    { pass: /transition\s*:/.test(c), msg: "Uses a transition", fix: "Add a transition, e.g. a { transition: color .2s ease; }." },
    { pass: /:hover/.test(c), msg: "Has a :hover state", fix: "Add a hover rule, e.g. a:hover { color: #1b1470; }." },
    { pass: /:focus-visible/.test(c), msg: "Has a :focus-visible style", fix: "Add a:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }." },
    { pass: /@media[^{]*\((min|max)-width/.test(c), msg: "Has a width media query", fix: "Add @media (min-width: 48em) { ... }." },
    { pass: /img\s*\{[^}]*max-width\s*:\s*100%/.test(c), msg: "img { max-width: 100% }", fix: "Add img { max-width: 100%; height: auto; }." },
    { pass: /prefers-reduced-motion/.test(c), msg: "Respects prefers-reduced-motion", fix: "Add @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }." },
  ];
}
function step10() {
  var t = (document.getElementById("lw") || {}).value || "";
  var w = t.trim() ? t.trim().split(/\s+/).length : 0;
  var l = t.toLowerCase();
  var missing = ["semantic", "table", "media query", "variable", "contextual"].filter(function (k) {
    return l.indexOf(k) < 0;
  });
  return [
    { pass: w >= 650 && w <= 850, msg: "Length is 650 to 850 words (now " + w + ")", fix: "Trim or expand the commentary so it falls between 650 and 850 words." },
    { pass: (l.match(/because/g) || []).length >= 8, msg: "Gives reasons: “because” at least 8 times", fix: "Add more “because” justifications — aim for at least eight." },
    { pass: !missing.length, msg: "Mentions semantic HTML, tables, variables, contextual selectors and media queries" + (missing.length ? " (missing: " + missing.join(", ") + ")" : ""), fix: "Add a sentence covering each missing term: " + missing.join(", ") + "." },
    { pass: /source|credit|cited|attribution|bootstrap|google fonts|css-tricks/i.test(l), msg: "Includes attribution (or states what you borrowed)", fix: "Add a sentence naming any borrowed resource and what you changed." },
  ];
}
function stepDeploy(x) {
  var d = x.d;
  var refs = [].slice.call(d.querySelectorAll("[src],[href]"))
    .map(function (n) { return n.getAttribute("src") || n.getAttribute("href") || ""; })
    .filter(function (v) { return !/^(https?:|mailto:|tel:|#|\/\/)/i.test(v); });
  return [
    {
      pass: refs.every(function (v) { return !/^[a-z]:\\|^file:|^\//i.test(v) && v === v.toLowerCase(); }),
      msg: "All local paths are relative and lowercase",
      fix: "Use only relative, lowercase paths. Check: " + refs.join(", "),
    },
    { pass: checkStylesheetPath(d).ok, msg: "Stylesheet path is one of the accepted options", fix: checkStylesheetPath(d).hint },
  ];
}
var STEPS = { 1: step1, 2: step2, 3: step3, 4: step4, 5: step5, 6: step6, 7: step7, 8: step8, 9: step9, 10: step10, deploy: stepDeploy };

/* ---------- 8. Run a step test and fill Test + Correct panels ---------- */
function runStep(key, section) {
  var fn = STEPS[key];
  if (!fn) return;
  var results = fn(getContext());
  var testBox = section.querySelector(".test");
  var correctBox = section.querySelector(".correct");
  var sum = testBox.querySelector(".sum");
  var list = testBox.querySelector(".res");
  var msg = correctBox.querySelector(".correctMsg");
  list.innerHTML = "";
  results.forEach(function (r) {
    var li = document.createElement("li");
    li.className = r.pass ? "pass" : "fail";
    li.textContent = (r.pass ? "✓ " : "✗ ") + r.msg;
    list.appendChild(li);
  });
  var passed = results.filter(function (r) { return r.pass; }).length;
  sum.textContent = passed + " of " + results.length + " checks passed.";
  var fails = results.filter(function (r) { return !r.pass; });
  if (!fails.length) {
    msg.textContent = "All checks passed for this step. Well done — move on to the next step.";
    if (key !== 10 && key !== "deploy") {
      [].forEach.call(section.querySelectorAll(".do input"), function (i) { i.checked = true; });
      updateProgress();
    }
  } else {
    msg.textContent = fails.map(function (r, i) { return (i + 1) + ". " + r.fix; }).join("\n\n");
  }
}
document.querySelectorAll("button[data-step]").forEach(function (btn) {
  btn.addEventListener("click", function () {
    var section = btn.closest("section.step");
    runStep(btn.dataset.step, section);
  });
});

/* ---------- 9. Final check + quality review ---------- */
function finalCheck() {
  var x = getContext();
  var all = [];
  [step2, step3, step4, step5, step6, step7, step8, step9, stepDeploy].forEach(function (fn) {
    fn(x).forEach(function (r) { all.push(r); });
  });
  var list = document.getElementById("lres");
  list.innerHTML = "";
  all.forEach(function (r) {
    var li = document.createElement("li");
    li.className = r.pass ? "pass" : "fail";
    li.textContent = (r.pass ? "✓ " : "✗ ") + r.msg;
    list.appendChild(li);
  });
  var passed = all.filter(function (r) { return r.pass; }).length;
  document.getElementById("lsum").textContent =
    passed + " of " + all.length + " structural checks passed" +
    (passed === all.length ? ". Now review the quality suggestions below." : ". Fix the ✗ items, then check again.");

  /* Quality suggestions */
  var q = [];
  if (!/<!--[\s\S]*?because[\s\S]*?-->/i.test(x.h))
    q.push(["Add HTML comments explaining why you chose a tag (e.g. <!-- I used <em> because the stress changes the sentence -->).", "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/em"]);
  if (!/\/\*[\s\S]*?because[\s\S]*?\*\//i.test(x.c))
    q.push(["Add CSS comments explaining your reasoning (e.g. /* I used h2 + p because it avoids an extra class */).", "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors/Selectors_and_combinators"]);
  if (!/section\s*\+\s*section/.test(x.c2))
    q.push(["Use the sibling combinator section + section to space sections without a class.", "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors/Selectors_and_combinators"]);
  if (!/h2\s*\+\s*p/.test(x.c2))
    q.push(["Use h2 + p to style the paragraph immediately after each heading.", "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors/Selectors_and_combinators"]);
  if (!/min-width/.test(x.c2))
    q.push(["Write mobile-first media queries with min-width rather than max-width.", "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Media_queries"]);
  if (!/@media[^{]*prefers-reduced-motion/.test(x.c2))
    q.push(["Respect users who ask for less motion with @media (prefers-reduced-motion: reduce).", "https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion"]);
  if (!/transition/.test(x.c2))
    q.push(["Add a transition to hover states so changes feel smooth, not abrupt.", "https://developer.mozilla.org/en-US/docs/Web/CSS/transition"]);
  if (!/box-sizing\s*:\s*border-box/.test(x.c2))
    q.push(["Add *, *::before, *::after { box-sizing: border-box; } so widths include padding.", "https://developer.mozilla.org/en-US/docs/Web/CSS/box-sizing"]);
  if (!/line-height/.test(x.c2))
    q.push(["Set a unitless line-height (e.g. 1.6) on body for readable text.", "https://developer.mozilla.org/en-US/docs/Web/CSS/line-height"]);
  if (!/img\s*\{[^}]*max-width\s*:\s*100%/.test(x.c2))
    q.push(["Add img { max-width: 100%; height: auto; } so images never overflow on phones.", "https://developer.mozilla.org/en-US/docs/Web/CSS/max-width"]);
  if (!q.length)
    q.push(["Your structure looks solid. Review the commentary steps to make sure every choice is justified.", "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics"]);

  var wrap = document.getElementById("quality");
  wrap.innerHTML = "";
  var qh = document.createElement("h3");
  qh.textContent = "Quality suggestions";
  var qu = document.createElement("ul");
  qu.className = "res";
  q.forEach(function (item) {
    var li = document.createElement("li");
    li.className = "fail";
    var a = document.createElement("a");
    a.href = item[1];
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "Learn more";
    li.textContent = "→ " + item[0] + " ";
    li.appendChild(a);
    qu.appendChild(li);
  });
  wrap.append(qh, qu);
}
var lgo = document.getElementById("lgo");
if (lgo) lgo.addEventListener("click", finalCheck);

/* ---------- 10. Project panel open/close + tabs ---------- */
var ws = document.getElementById("ws");
var wt = document.getElementById("wst");
var tabs = [].slice.call(ws.querySelectorAll(".tabs button"));
wt.addEventListener("click", function () {
  var open = ws.classList.toggle("open");
  wt.setAttribute("aria-expanded", open);
  wt.textContent = open ? "Close project" : "Open my project";
});
function selectTab(id) {
  tabs.forEach(function (b) {
    var on = b.dataset.t === id;
    b.setAttribute("aria-selected", on);
    document.getElementById(b.dataset.t).hidden = !on;
  });
}
tabs.forEach(function (b) {
  b.addEventListener("click", function () { selectTab(b.dataset.t); });
});

/* ---------- 11. Initial paint ---------- */
updateProgress();
