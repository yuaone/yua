import 'api_service.dart';

class ReportService {
  /// AI 리포트 생성
  static Future<Map<String, dynamic>> generate({
    required String userId,
    required String reportType,
    required String input,
  }) async {
    final res = await ApiService.post(
      "/report",
      {
        "userId": userId,
        "reportType": reportType,
        "input": input,
      },
    );

    return res;
  }
}
