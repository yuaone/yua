import path from "path";
import fs from "fs";
import { AssetVersionsRepo } from "../../repo/asset-versions.repo";

export class VideoScriptEngine {
  async execute(params: {
    assetId: string;
    version: number;
    script: any; // VIDEO_SCRIPT canonical
  }): Promise<{ scriptPath: string }> {
    const { assetId, version, script } = params;

    const scriptPath = path.resolve(
      "storage",
      "assets",
      assetId,
      `v${version}.script.json`
    );

    fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
    fs.writeFileSync(
      scriptPath,
      JSON.stringify(script, null, 2),
      "utf-8"
    );

    await AssetVersionsRepo.attachRenderedRef({
      assetId,
      version,
      key: "script",
      value: scriptPath,
    });

    return { scriptPath };
  }
}
