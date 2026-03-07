// 🎮 Control Stream Event — Enterprise 3D UI Version
// ----------------------------------------------------------
// ✔ 제스처 / 회전 / 선택 / 확대 / 시스템 이벤트
// ✔ 3D 좌표(x,y,z) 지원
// ✔ 손동작(pinch / palm / fist 등)
// ✔ depth 기반 push/pull
// ✔ 위험도(risk) 포함
// ✔ 센서/카메라 소스ID
// ✔ AI 분석 결과(meta)까지 포함 가능
// ----------------------------------------------------------

export interface ControlStreamEvent {
  type:
    | "gesture"     // 손동작 (palm, pinch, swipe, push 등)
    | "rotation"    // 손목/손 회전
    | "select"      // 공중 선택(AirClick)
    | "zoom"        // pinch zoom
    | "drag"        // 드래그
    | "swipe"       // 좌/우/상/하 스와이프
    | "pointer"     // 공중 포인터 위치
    | "system";     // 연결/오류/준비 상태

  // 3D 좌표 및 손 위치 정보
  coordinates?: {
    x: number;      // 0~1 normalized
    y: number;
    z?: number;     // depth info (필요한 경우)
  };

  // 제스처 종류
  gesture?:
    | "palm_open"
    | "palm_close"
    | "pinch"
    | "fist"
    | "swipe_left"
    | "swipe_right"
    | "swipe_up"
    | "swipe_down"
    | "push"
    | "pull"
    | "rotate_clockwise"
    | "rotate_ccw";

  // 선택/확대/회전 값
  value?: number;

  // 위험도
  risk?: number; // 0~100

  // 카메라/센서 소스
  cameraId?: string;
  sensorId?: string;

  // 스트림 데이터
  data?: any;

  // 추가 메타 정보(AI 추론 포함 가능)
  meta?: any;

  // timestamp
  timestamp?: string;
}
