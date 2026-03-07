import 'api_service.dart';

class ChatService {
  /// AI 채팅
  static Future<String> sendMessage({
    required String message,
    required String userType,
  }) async {
    final res = await ApiService.post(
      "/chat",
      {
        "message": message,
        "userType": userType,
      },
    );

    if (res["ok"] == true) {
      return res["result"]["message"] ?? "";
    }

    return "AI 오류가 발생했습니다.";
  }
}
