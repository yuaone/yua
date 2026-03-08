/**
 * YUA Mobile Adaptive UI Utilities (SSOT)
 *
 * 브레이크포인트 기반 적응형 값 선택.
 * useAdaptive() 훅으로 반응형 레이아웃 구현.
 */

import { useWindowDimensions } from "react-native";
import { useMemo } from "react";
import { MobileTokens } from "./tokens";

const bp = MobileTokens.breakpoint;
const layout = MobileTokens.layout;

export type DeviceClass =
  | "smallPhone"
  | "phone"
  | "largePhone"
  | "tablet"
  | "largeTablet";

export function getDeviceClass(width: number): DeviceClass {
  if (width >= bp.largeTablet) return "largeTablet";
  if (width >= bp.tablet) return "tablet";
  if (width >= bp.largePhone) return "largePhone";
  if (width >= bp.phone) return "phone";
  return "smallPhone";
}

export function adaptive<T>(
  width: number,
  values: { phone: T; largePhone?: T; tablet?: T },
): T {
  if (width >= bp.tablet && values.tablet !== undefined) return values.tablet;
  if (width >= bp.largePhone && values.largePhone !== undefined)
    return values.largePhone;
  return values.phone;
}

export function useAdaptive() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const deviceClass = getDeviceClass(width);
    const isTablet = width >= bp.tablet;
    const isLargePhone = width >= bp.largePhone && !isTablet;

    function pick<T>(values: { phone: T; largePhone?: T; tablet?: T }): T {
      return adaptive(width, values);
    }

    return {
      width,
      height,
      deviceClass,
      isTablet,
      isLargePhone,
      pick,

      // Pre-computed common values
      messagePad: pick({
        phone: layout.messagePadPhone,
        largePhone: layout.messagePadLargePhone,
        tablet: layout.messagePadTablet,
      }),
      inputPad: pick({
        phone: layout.inputPadPhone,
        largePhone: layout.inputPadLargePhone,
        tablet: layout.inputPadTablet,
      }),
      messageGap: pick({ phone: 20, largePhone: 24, tablet: 28 }),
      userBubbleMaxWidth: pick({ phone: 0.85, largePhone: 0.8, tablet: 0.7 }),
      avatarSize: pick({
        phone: layout.avatarSize,
        tablet: layout.avatarSizeTablet,
      }),
      sidebarFixed: isTablet,
      sidebarWidth: isTablet
        ? layout.sidebarWidth
        : Math.round(width * layout.sidebarOverlayPercent),
      codeBlockFontSize: pick({ phone: 12, largePhone: 13, tablet: 14 }),
      imageGridColumns: pick({ phone: 1, largePhone: 2, tablet: 3 }),
    };
  }, [width, height]);
}
