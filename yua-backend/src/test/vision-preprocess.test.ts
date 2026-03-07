import assert from "assert";
import { createVisionPreprocessor } from "../ai/vision/vision-orchestrator";

async function run() {
  const preprocess = createVisionPreprocessor({
    ocr: {
      allowStub: true, // stub OCR 활성
    },
    crop: {
      // 테스트에서는 실제 파일 없이 URL만 바꾸는 stub crop
      sharp: null,
    },
    zoom: {
      sharp: null,
    },
  });

  // 1) message가 OCR 의도 없으면 아무 변화 없음
  {
    const res = await preprocess({
      attachments: [{ kind: "image", url: "https://example.com/img.png" }],
      message: "그냥 이거 뭐야?",
    });
    assert.strictEqual(res.processedAttachments[0].url, "https://example.com/img.png");
    assert.strictEqual(res.signals.usedOCR, false);
  }

  // 2) 내부 업로드 URL + message에 OCR 의도 → OCR 시도(allowStub)
  {
    const res = await preprocess({
      attachments: [{ kind: "image", url: "http://localhost/api/assets/uploads/ws/u/file.png" }],
      message: "글씨 읽어줘 (ocr)",
    });
    assert.strictEqual(res.signals.usedOCR, true);
    assert.ok(res.signals.confidence >= 0 && res.signals.confidence <= 1);
  }

  // 3) 절대 throw 안 해야 함
  {
    const res = await preprocess({
      attachments: [{ kind: "image", url: "" as any }],
      message: "ocr",
    });
    assert.ok(res);
  }

  console.log("vision-preprocess tests passed");
}

if (require.main === module) {
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
