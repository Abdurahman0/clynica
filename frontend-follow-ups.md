# Chat Follow-up Frontend

Chat detail ichida follow-up uchun bitta alohida blok chiqaring. Conversation API ichida `active_follow_up` keladi, shu field orqali follow-up bor-yo'qligini biling.

## Ishlatiladigan endpointlar

- `GET /api/conversations/{conversationId}/follow-up/`
  - active follow-up ni qaytaradi
  - yo'q bo'lsa `follow_up: null`
- `POST /api/conversations/{conversationId}/follow-up/`
  - body:
  ```json
  {
    "scheduled_for": "2026-05-25T18:00:00+05:00",
    "message": "Salom, siz bilan follow-up uchun bog'landik."
  }
  ```
- `PATCH /api/conversations/{conversationId}/follow-up/`
  - pending follow-up ni o'zgartiradi
- `DELETE /api/conversations/{conversationId}/follow-up/`
  - active follow-up ni cancel qiladi

## UI oqimi

- Agar `active_follow_up` bo'lmasa:
  - `Set follow-up` tugmasini ko'rsating
- Agar `active_follow_up` bo'lsa:
  - `scheduled_for`
  - `message`
  - `Edit`
  - `Cancel`

## Validation

- `scheduled_for` timezone bilan yuborilsin
- Instagram chatlarda backend 24 soat limitni tekshiradi
- Agar active follow-up allaqachon bo'lsa, backend `409` qaytaradi
- Agar Instagram uchun vaqt ruxsat etilmasa, backend `409` va tushunarli `detail` qaytaradi

## Muhim holatlar

- Client chatga yangi message yuborsa active follow-up avtomatik cancel bo'ladi
- Follow-up yuborilgandan keyin u endi `active_follow_up` sifatida ko'rinmaydi
- Chat history ichida yuborilgan follow-up `sender_type = "follow_up"` bo'lib keladi

## Tavsiya

- Conversation detail ochilganda `GET follow-up` qiling
- Create/update/delete dan keyin conversation detail ni yoki conversation list ni refresh qiling
- WebSocket `conversation.updated` eventida `active_follow_up` ham yangilanadi
