import { Request, Response } from "express";
import * as fsEngine from "../ai/engines/fs/fs.engine";

export async function list(req: Request, res: Response) {
  const files = await fsEngine.listFiles();
  res.json({ files });
}

export async function tree(req: Request, res: Response) {
  const tree = await fsEngine.buildTree();
  res.json({ success: true, tree });
}

export async function download(req: Request, res: Response) {
  const file = req.query.file as string;
  const data = await fsEngine.readFileStream(file);
  res.setHeader("Content-Disposition", `attachment; filename="${file}"`);
  res.send(data);
}

export async function upload(req: Request, res: Response) {
  const file = req.file!;
  const result = await fsEngine.saveFile(file);
  res.json(result);
}
