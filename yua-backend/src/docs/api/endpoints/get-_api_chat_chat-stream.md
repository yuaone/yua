# GET /api/chat/chat-stream
(Generated from Swagger — YUA ONE API)

---

## 📌 Summary
YUA ONE Chat Stream

## 🧩 Description
RoutingEngine → ChatEngine.streamResponse 기반 스트림

---

## 🔐 Parameters
- **message** (query) — string  
        사용자 입력 메시지
- **x-openai-key** (header) — string  
        OpenAI API Key (옵션, 서버 기본 키 사용 가능)

---

## 📤 Responses
### 200
SSE stream of tokens

---

Generated automatically by YUA ONE Swagger Doc Generator.
