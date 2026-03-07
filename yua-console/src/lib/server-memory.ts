// 📂 src/lib/server-memory.ts
// 🔥 Next.js App Router - Global Server Memory SSOT

if (!(global as any)._yua_users) {
  (global as any)._yua_users = [];
}

export const usersMemory = (global as any)._yua_users as {
  id: number;
  email: string;
  password: string;
  createdAt: number;
}[];
