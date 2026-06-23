# Instagram Media In CRM Chat

Bu hujjat frontend uchun.

Maqsad:
- Instagramdan kelgan `voice`
- Instagramdan kelgan `reels`
- Instagramdan kelgan boshqa `video/image/file`

ni CRM chat ichida to'g'ri ko'rsatish.

Muhim:
- Bu faqat `instagram` channel uchun
- Media kelganda backend `content` ichiga link yozadi
- Qo'shimcha ma'lumot `metadata` ichida keladi

## Qaysi API ishlatiladi

Chat list:

`GET /api/conversations/`

Bitta chat ichidagi xabarlar:

`GET /api/conversations/{id}/messages/`

Frontend media render qilish uchun asosan mana shu endpoint kerak:

`GET /api/conversations/{id}/messages/`

## Message response formati

Har bir message ichida quyidagi fieldlar bor:

- `id`
- `conversation`
- `sender_type`
- `content`
- `metadata`
- `created_at`

Instagram media uchun eng muhim fieldlar:

- `content`
- `metadata.media_url`
- `metadata.media_type`
- `metadata.is_non_text_media`

## Oddiy text message

Misol:

```json
{
  "id": 1,
  "conversation": "e0bc8914-cc9c-4215-99b4-0990e2900ba4",
  "sender_type": "client",
  "content": "Salom",
  "channel_message_id": "",
  "metadata": {},
  "created_at": "2026-06-22T20:03:04+05:00"
}
```

Bunda frontend oddiy text bubble chiqaradi.

## Instagram voice message

Misol:

```json
{
  "id": 2,
  "conversation": "e0bc8914-cc9c-4215-99b4-0990e2900ba4",
  "sender_type": "client",
  "content": "https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=1055219036937757&signature=...",
  "channel_message_id": "",
  "metadata": {
    "media_url": "https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=1055219036937757&signature=...",
    "media_type": "audio",
    "is_non_text_media": true
  },
  "created_at": "2026-06-22T20:03:14+05:00"
}
```

Frontend qoidasi:

- agar `metadata.is_non_text_media === true`
- va `metadata.media_type === "audio"`

unda audio player chiqaring.

Frontend uchun ishlatish kerak bo'lgan link:

1. `metadata.media_url`
2. agar u bo'sh bo'lsa, fallback sifatida `content`

Tavsiya:

- Instagram uslubiga yaqin ko'rinish qiling
- kichik rounded player
- play/pause button
- progress bar
- vaqt ko'rsatkichi

Oddiy HTML varianti:

```html
<audio controls preload="metadata" src="{message.metadata.media_url || message.content}"></audio>
```

Frontend uslubiy tavsiya:

- bubble ichida player bo'lsin
- `sender_type === "client"` bo'lsa chap tomonda
- dark-light kontrastli audio pill qiling
- default browser audio ham ishlaydi, keyin custom playerga almashtirish mumkin

## Instagram reels

Misol:

```json
{
  "id": 4,
  "conversation": "e0bc8914-cc9c-4215-99b4-0990e2900ba4",
  "sender_type": "client",
  "content": "https://www.instagram.com/reel/DZ5DXzjIQoN/",
  "channel_message_id": "",
  "metadata": {
    "media_url": "https://www.instagram.com/reel/DZ5DXzjIQoN/",
    "media_type": "ig_reel",
    "is_non_text_media": true
  },
  "created_at": "2026-06-22T20:03:43+05:00"
}
```

Bu holatda backend sizga Instagram reel page linkini beradi.

Frontend qoidasi:

- agar `metadata.media_type === "ig_reel"`
- `metadata.media_url` ni ishlating

Render variantlari:

1. CRM ichida preview card ko'rsatish
2. `Open reel` button qo'yish
3. `iframe` bilan urinish mumkin, lekin Instagram ko'p holatda embed cheklaydi

Shuning uchun eng ishonchli variant:

- preview card
- thumbnail bo'lsa ko'rsatish
- linkni yangi oynada ochish

Minimal variant:

```html
<a href="{message.metadata.media_url || message.content}" target="_blank" rel="noreferrer">
  Instagram reelni ko'rish
</a>
```

## Instagram video

Agar webhook to'g'ridan-to'g'ri video URL bersa, response shu ko'rinishda bo'ladi:

```json
{
  "content": "https://cdn.example.com/video.mp4",
  "metadata": {
    "media_url": "https://cdn.example.com/video.mp4",
    "media_type": "video",
    "is_non_text_media": true
  }
}
```

Bu holatda frontend CRM ichida o'zidan video ko'rsata oladi.

Ishlatiladigan link:

1. `metadata.media_url`
2. fallback `content`

Render:

```html
<video controls preload="metadata" src="{message.metadata.media_url || message.content}"></video>
```

Frontend tavsiya:

- `max-width` cheklang
- `border-radius` bering
- chat bubble ichida joylashtiring

## Instagram image

Image uchun ham shu qoida:

```json
{
  "content": "https://cdn.example.com/image.jpg",
  "metadata": {
    "media_url": "https://cdn.example.com/image.jpg",
    "media_type": "image",
    "is_non_text_media": true
  }
}
```

Render:

```html
<img src="{message.metadata.media_url || message.content}" alt="Instagram media" />
```

## Frontendda qanday aniqlash kerak

Tavsiya etilgan tartib:

1. `message.metadata?.is_non_text_media === true` bo'lsa media deb oling
2. `const mediaUrl = message.metadata?.media_url || message.content`
3. `const mediaType = message.metadata?.media_type`

Keyin:

- `audio` bo'lsa audio player
- `video` bo'lsa video player
- `image` bo'lsa image preview
- `ig_reel` bo'lsa reel card yoki open-link button
- noma'lum bo'lsa oddiy link ko'rsating

## Tavsiya etilgan frontend pseudo-code

```ts
const isInstagramMedia = message.metadata?.is_non_text_media === true
const mediaType = message.metadata?.media_type
const mediaUrl = message.metadata?.media_url || message.content

if (!isInstagramMedia) {
  return <TextBubble text={message.content} />
}

if (mediaType === 'audio') {
  return <audio controls src={mediaUrl} />
}

if (mediaType === 'video') {
  return <video controls src={mediaUrl} />
}

if (mediaType === 'image') {
  return <img src={mediaUrl} alt="Instagram media" />
}

if (mediaType === 'ig_reel') {
  return <a href={mediaUrl} target="_blank" rel="noreferrer">Instagram reelni ko'rish</a>
}

return <a href={mediaUrl} target="_blank" rel="noreferrer">Media faylni ochish</a>
```

## Muhim cheklov

Instagram har doim to'g'ridan-to'g'ri playable video URL bermaydi.

2 xil holat bo'ladi:

1. To'g'ridan-to'g'ri CDN link keladi
   Bu holda CRM ichida audio/video ni o'zidan ijro qilish mumkin.

2. Faqat Instagram reel page link keladi
   Bu holda CRM ichida to'liq native player qilish qiyin bo'lishi mumkin.
   Eng ishonchli usul:
   - preview card
   - open in new tab

Hozir testda ko'rilgan real holat:

- voice: to'g'ridan-to'g'ri CDN link keldi
- reel: Instagram reel page link keldi

## Backenddan kutiladigan amaliy natija

Frontend shuni bilib ishlasin:

- voice uchun CRM ichida eshittirish mumkin
- reels uchun kamida link yoki preview ko'rsatish mumkin
- to'g'ridan-to'g'ri `video` link kelsa CRM ichida ko'rsatish mumkin

