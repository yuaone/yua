// 📂 src/ai/capability/code/code-ast-types.ts

export interface CodeASTFeatures {
  nodeCount: number;
  maxDepth: number;

  branchCount: number;
  loopCount: number;
  functionCount: number;

  hasEval: boolean;
  hasFileIO: boolean;
  hasNetwork: boolean;
  hasPrivilegeKeyword: boolean;

  mutationScore: number;
}

export interface CodeASTResult {
  features: CodeASTFeatures;
  confidence: number;
}
