export function sanitizeLite(output: string, confidence: number): string {
const maxConf = 0.95;
const clipped = Math.min(confidence, maxConf);


let result = output;


if (clipped < 0.5) {
result = "추정컨대, " + result;
}


return result.replace(/너무 확신/gi, "조심스럽게 보면");
}