import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/user-model";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ ok: false, message: "필수 값 누락" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ ok: false, message: "이미 존재하는 이메일" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashed,
      name,
      role: role ?? "user",
    });

    return res.json({ ok: true, user });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "회원가입 오류", error: e });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ ok: false, message: "이메일 또는 비밀번호 오류" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ ok: false, message: "이메일 또는 비밀번호 오류" });
    }

    const token = jwt.sign(
      { uid: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return res.json({
      ok: true,
      token,
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "로그인 오류", error: e });
  }
};
