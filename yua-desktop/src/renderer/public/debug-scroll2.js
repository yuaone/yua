// 스크롤 중 DOM 변경 감지
(function () {
  var s = document.querySelector("[data-chat-scroll]");
  if (!s) { console.error("no scroll"); return; }

  var scrolling = false;
  var mutCount = 0;
  var mutDetails = [];

  // DOM 변경 감시
  var obs = new MutationObserver(function (muts) {
    if (!scrolling) return;
    muts.forEach(function (m) {
      mutCount++;
      if (mutDetails.length < 20) {
        mutDetails.push({
          type: m.type,
          target: m.target.tagName + "." + (m.target.className || "").toString().slice(0, 40),
          added: m.addedNodes.length,
          removed: m.removedNodes.length,
          attr: m.attributeName || ""
        });
      }
    });
  });

  obs.observe(s, { childList: true, subtree: true, attributes: true, characterData: true });

  // 스크롤 이벤트 추적
  var scrollCount = 0;
  s.addEventListener("scroll", function () {
    scrolling = true;
    scrollCount++;
    clearTimeout(window.__st2);
    window.__st2 = setTimeout(function () {
      if (mutCount > 0) {
        console.warn("🔴 스크롤 중 DOM 변경 " + mutCount + "회 (스크롤 " + scrollCount + "회)");
        console.table(mutDetails);
      } else {
        console.log("✅ 스크롤 중 DOM 변경 없음 (스크롤 " + scrollCount + "회)");
      }
      scrolling = false;
      mutCount = 0;
      mutDetails = [];
      scrollCount = 0;
    }, 300);
  });

  // will-change: scroll-position 제거 테스트
  console.log("현재 will-change:", getComputedStyle(s).willChange);
  console.log("---");
  console.log("테스트 명령어:");
  console.log("  스크롤 컨테이너 will-change 제거: document.querySelector('[data-chat-scroll]').style.willChange='auto'");
  console.log("  스크롤 컨테이너 contain 제거: document.querySelector('[data-chat-scroll]').style.contain='none'");
  console.log("  둘 다 제거: document.querySelector('[data-chat-scroll]').style.cssText='will-change:auto;contain:none'");
  console.log("  원복: document.querySelector('[data-chat-scroll]').style.cssText=''");
  console.log("---");
  console.log("스크롤해서 결과 확인하세요");
})();
