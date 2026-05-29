# AI Default Follow-Ups

## Qayerga qo'shilgan

3-step follow-up `AI settings` ichiga qo'shilgan.

Key:

`default_follow_ups`

Backend ishlatadigan joy:

- `GET /api/settings/ai/`
- `POST /api/settings/ai/`
- `PATCH /api/settings/ai/{id}/`

## Value formati

```json
{
  "key": "default_follow_ups",
  "value": {
    "items": [
      {
        "enabled": true,
        "delay_hours": 3,
        "message": "Opa, savollarizga javob berdimmi? Konsultatsiyaga yozib qo'yishimni xohlasangiz, qaysi kun qulayligini ayting."
      },
      {
        "enabled": true,
        "delay_days": 1,
        "message": "Opa, Nilufar Rahmatovnaning jadvalida bu hafta bo'sh vaqtlar bor. Konsultatsiyaga yozilishni istaysizmi?"
      },
      {
        "enabled": true,
        "delay_days": 3,
        "message": "Opa, yana bir bor eslatib o'taman, konsultatsiya uchun vaqtlar cheklangan. Bugun yozib qo'yishingiz mumkin."
      }
    ]
  }
}
```

## Frontend oqimi

1. `GET /api/settings/ai/` qiling.
2. `key = default_follow_ups` bo'lgan settingni toping.
3. Shu setting `id` sini saqlang.
4. O'zgartirish uchun `PATCH /api/settings/ai/{id}/` yuboring.

## PATCH misol

```json
{
  "value": {
    "items": [
      {
        "enabled": true,
        "delay_hours": 2,
        "message": "Opa, konsultatsiyaga yozilishni xohlaysizmi?"
      },
      {
        "enabled": false,
        "delay_days": 1,
        "message": "Ikkinchi follow-up"
      },
      {
        "enabled": true,
        "delay_days": 2,
        "message": "Uchinchi follow-up"
      }
    ]
  }
}
```

## Qanday ishlaydi

- Faqat `client`ga aylanmagan chatlar uchun ishlaydi.
- User yangi xabar yozsa active auto follow-up cancel bo'ladi.
- Agar chat `client`ga aylansa auto follow-up cancel bo'ladi.
- `enabled = false` bo'lsa o'sha step umuman ishlamaydi.
- Bir step yuborilgach keyingi enabled step avtomatik schedule qilinadi.
- Bir vaqtning o'zida bitta active follow-up bo'ladi.

## Conversation API bilan ko'rish

Auto follow-up ham oddiy follow-up kabi conversation ichida ko'rinadi:

- `GET /api/conversations/{conversation_id}/`
- `GET /api/conversations/{conversation_id}/follow-up/`

`active_follow_up` ichida hozirgi active auto follow-up ko'rinadi.
