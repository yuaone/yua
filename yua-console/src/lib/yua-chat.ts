export async function sendYuaChat(
  message: string,
  userType: string = "individual"
) {
  const apiKey = localStorage.getItem("YUA_API_KEY");
  if (!apiKey) {
    throw new Error("YUA API Key not found");
  }

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      message,
      userType,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "Chat request failed");
  }

  return res.json();
}
