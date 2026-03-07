class RiskResponse {
  final int score;
  final bool flagged;
  final String message;

  RiskResponse({
    required this.score,
    required this.flagged,
    required this.message,
  });

  factory RiskResponse.fromJson(Map<String, dynamic> json) {
    final r = json["result"] ?? {};
    return RiskResponse(
      score: r["riskScore"] ?? 0,
      flagged: r["flagged"] ?? false,
      message: r["message"] ?? "",
    );
  }
}
