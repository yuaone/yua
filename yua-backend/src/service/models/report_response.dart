class ReportResponse {
  final String id;
  final String aiResult;
  final String type;

  ReportResponse({
    required this.id,
    required this.aiResult,
    required this.type,
  });

  factory ReportResponse.fromJson(Map<String, dynamic> json) {
    final r = json["result"] ?? {};
    return ReportResponse(
      id: r["id"] ?? "",
      aiResult: r["aiResult"] ?? "",
      type: r["reportType"] ?? "",
    );
  }
}
