export interface AOSSResult {
safe: boolean;
cleaned: string;
riskScore: number;
}


const threatPatterns = [
/select\s.+\sfrom/gi,
/union\s+select/gi,
/<script>/gi,
/drop\s+table/gi,
/delete\s+from/gi,
/insert\s+into/gi,
];


export function aossLite(input: string): AOSSResult {
let risk = 0;
for (const pattern of threatPatterns) {
if (pattern.test(input)) risk += 0.3;
}


const safe = risk < 0.7;
const cleaned = input
.replace(/\d{3}-\d{4}-\d{4}/g, "***-****-****")
.replace(/password|passwd|비밀번호/gi, "[masked]");


return {
safe,
cleaned,
riskScore: Math.min(risk, 1),
};
}