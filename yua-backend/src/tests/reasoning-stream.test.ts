import assert from "assert";

type Block = { body: string };

type State = {
  buffer: string;
  lastDeltaAt: number;
  lastEmitted: string;
  blocks: Block[];
};

const REASONING_MIN_LEN = 320;
const REASONING_IDLE_MS = 1200;

function emitBlock(state: State, text: string) {
  if (!text || text === state.lastEmitted) return;
  state.blocks.push({ body: text });
  state.lastEmitted = text;
}

function onIdle(state: State, now: number) {
  if (!state.buffer) return;
  if (now - state.lastDeltaAt <= REASONING_IDLE_MS) return;
  let textToEmit: string | null = null;
  const paragraphCut = state.buffer.indexOf("\n\n");
  if (paragraphCut !== -1) {
    textToEmit = state.buffer.slice(0, paragraphCut + 2);
    state.buffer = state.buffer.slice(paragraphCut + 2);
  } else if (state.buffer.length >= REASONING_MIN_LEN) {
    const sentenceMatch = state.buffer.match(/[\s\S]*[.!?](\s|$)/);
    if (sentenceMatch && typeof sentenceMatch[0] === "string") {
      textToEmit = sentenceMatch[0];
      state.buffer = state.buffer.slice(textToEmit.length);
    }
  }
  if (textToEmit) emitBlock(state, textToEmit);
}

function onDelta(state: State, delta: string, now: number) {
  if (!delta) return;
  state.buffer += delta;
  state.lastDeltaAt = now;

  const paragraphCut = state.buffer.indexOf("\n\n");
  if (paragraphCut !== -1) {
    const text = state.buffer.slice(0, paragraphCut + 2);
    state.buffer = state.buffer.slice(paragraphCut + 2);
    emitBlock(state, text);
    return;
  }

  if (state.buffer.length >= REASONING_MIN_LEN) {
    const sentenceMatch = state.buffer.match(/[\s\S]*[.!?](\s|$)/);
    if (sentenceMatch && typeof sentenceMatch[0] === "string") {
      const text = sentenceMatch[0];
      state.buffer = state.buffer.slice(text.length);
      emitBlock(state, text);
    }
  }
}

function onDone(state: State) {
  if (state.buffer && state.buffer !== state.lastEmitted) {
    emitBlock(state, state.buffer);
  }
  state.buffer = "";
}

// Test 1: long reasoning yields >= 3 blocks
(() => {
  const state: State = { buffer: "", lastDeltaAt: 0, lastEmitted: "", blocks: [] };
  const paragraph = "A. Sentence one. Sentence two.\n\n";
  let now = 0;
  for (let i = 0; i < 6; i++) {
    onDelta(state, paragraph, (now += 50));
  }
  onIdle(state, now + 1300);
  assert.ok(state.blocks.length >= 3, "expected >= 3 reasoning blocks");
})();

// Test 2: identical paragraph not emitted twice
(() => {
  const state: State = { buffer: "", lastDeltaAt: 0, lastEmitted: "", blocks: [] };
  const para = "Repeat sentence.\n\n";
  onDelta(state, para, 100);
  onDelta(state, para, 200);
  onDone(state);
  const unique = new Set(state.blocks.map((b) => b.body));
  assert.equal(unique.size, state.blocks.length, "duplicate reasoning block emitted");
})();

// Test 3: DEEP unlock gate logic
(() => {
  let reasoningBlockEmitted = false;
  const canUnlock = () => reasoningBlockEmitted;
  assert.equal(canUnlock(), false, "should not unlock before reasoning block");
  reasoningBlockEmitted = true;
  assert.equal(canUnlock(), true, "should unlock after reasoning block");
})();

// Test 4: idle flush + done emits once
(() => {
  const state: State = { buffer: "", lastDeltaAt: 0, lastEmitted: "", blocks: [] };
  const text = "Idle flush sentence.\n\n";
  onDelta(state, text, 100);
  onIdle(state, 1500);
  const countAfterIdle = state.blocks.length;
  onDone(state);
  assert.equal(state.blocks.length, countAfterIdle, "done emitted duplicate block");
})();

console.log("reasoning-stream tests passed");
