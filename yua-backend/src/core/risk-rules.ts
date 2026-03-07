export const RiskRules = {
  detect(text: string) {
    if (!text) return 0;

    let score = 0;

    const high = ["가공", "뒷돈", "면세탈세", "현금영수증 미발행"];
    const mid = ["내부거래", "과다지출", "부적절한 송금"];

    for (const h of high) {
      if (text.includes(h)) score += 5;
    }

    for (const m of mid) {
      if (text.includes(m)) score += 2;
    }

    return score;
  }
};
