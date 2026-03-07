import 'api_service.dart';

class RiskService {
  /// 리스크 분석
  static Future<Map<String, dynamic>> analyze(
      {required String text, required String userId}) async {
    final res = await ApiService.post(
      "/risk",
      {
        "text": text,
        "userId": userId,
      },
    );

    return res;
  }
}
