"use client";

import {
  useRef,
  useEffect,
  memo,
  useMemo,
} from "react";

import { useChatStore } from "@/store/useChatStore";
import ChatMessageItem from "./ChatMessageItem";
import { isSameDay, formatDate } from "@/utils/chat-utils";

import AutoSizer from "react-virtualized-auto-sizer";
import { List, CellMeasurer, CellMeasurerCache } from "react-virtualized";

/* ------------------------ 날짜 구분 ------------------------ */
const DateSeparator = memo(({ ts }: { ts: number }) => {
  const now = new Date();
  const date = new Date(ts);

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const isYesterday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate() - 1;

  // ⭐ formatDate는 string | Date 필요 → new Date(ts) 전달
  const label = isToday
    ? "오늘"
    : isYesterday
    ? "어제"
    : formatDate(new Date(ts));

  return (
    <div className="flex justify-center my-3">
      <span className="text-xs px-3 py-1 rounded-full bg-black/5 text-black/50 backdrop-blur-xl">
        {label}
      </span>
    </div>
  );
});
DateSeparator.displayName = "DateSeparator";

/* ------------------------ MAIN ------------------------ */
export default function ChatContainer() {
  const { getMessages } = useChatStore();
  const messages = getMessages();

  const listRef = useRef<any>(null);

  const cache = useMemo(
    () =>
      new CellMeasurerCache({
        fixedWidth: true,
        defaultHeight: 120,
      }),
    []
  );

  /** 자동 스크롤 */
  useEffect(() => {
    if (!listRef.current) return;
    if (messages.length === 0) return;

    setTimeout(() => {
      listRef.current?.scrollToRow(messages.length - 1);
    }, 10);
  }, [messages]);

  /** 개별 Row 렌더러 */
  const Row = ({ index, parent, style }: any) => {
    const m = messages[index];
    const prev = messages[index - 1];

    // ⭐ 오류 해결: isSameDay는 string|Date만 받는다 → new Date()로 변환
    const showDate =
      !prev || !isSameDay(new Date(prev.createdAt), new Date(m.createdAt));

    return (
      <CellMeasurer
        cache={cache}
        columnIndex={0}
        rowIndex={index}
        parent={parent}
        key={m.id ?? index}
      >
        <div style={style} className="px-6 py-1">
          {showDate && <DateSeparator ts={m.createdAt} />}
          <ChatMessageItem {...m} />
        </div>
      </CellMeasurer>
    );
  };

  /** 메시지 없음 */
  if (messages.length === 0) {
    return (
      <div
        className="
        flex-1 overflow-y-auto px-6 py-6 
        bg-[rgba(255,255,255,0.55)] backdrop-blur-xl
        flex items-center justify-center text-black/40 text-sm
      "
      >
        왼쪽에서 새 채팅을 생성하고, Yua에게 메시지를 입력해 보세요.
      </div>
    );
  }

  /** 메시지 리스트 */
  return (
    <div className="flex-1">
      <AutoSizer>
        {({ width, height }) => (
          <List
            ref={listRef}
            width={width}
            height={height}
            rowCount={messages.length}
            rowHeight={cache.rowHeight}
            rowRenderer={Row}
            deferredMeasurementCache={cache}
            overscanRowCount={10}
            scrollToAlignment="end"
          />
        )}
      </AutoSizer>
    </div>
  );
}
