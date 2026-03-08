(function () {
  var s = document.querySelector("[data-chat-scroll]");
  if (!s) {
    console.error("no scroll container found");
    return;
  }

  var a = s.querySelectorAll("*");
  var r = [];

  a.forEach(function (e) {
    var c = getComputedStyle(e);
    var cn = (e.className || "").toString().slice(0, 60);

    if (c.transform !== "none") {
      r.push({ tag: e.tagName, issue: "transform: " + c.transform, cls: cn });
    }
    if (c.willChange !== "auto") {
      r.push({ tag: e.tagName, issue: "will-change: " + c.willChange, cls: cn });
    }
    if (c.backdropFilter && c.backdropFilter !== "none") {
      r.push({ tag: e.tagName, issue: "backdrop-filter: " + c.backdropFilter, cls: cn });
    }
    if (c.position === "sticky") {
      r.push({ tag: e.tagName, issue: "position: sticky", cls: cn });
    }
  });

  console.table(r);
  console.log("Total suspects:", r.length);

  var cs = getComputedStyle(s);
  console.log("Scroll container CSS:", {
    transform: cs.transform,
    willChange: cs.willChange,
    contain: cs.contain,
    overflow: cs.overflow
  });
})();
