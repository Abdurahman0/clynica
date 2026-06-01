# CRM Tasks Frontend Integration

Backendda operator zadachalari uchun Kanban-style API qo'shildi. Frontend faqat API integratsiya qiladi.

## Permissions

User payloaddagi permissions orqali page va actionlarni ko'rsating:

- `tasks.view`: tasks page va board ko'rish
- `tasks.manage`: task yaratish, edit/delete, move
- `task_statuses.view`: task status columnlarini ko'rish
- `task_statuses.manage`: status yaratish, edit/delete

Role defaultlari:

- `developer`: hammasi
- `admin`: task/status view/manage
- `operator`: task view/manage va task status view

Operator task yaratish/edit/delete qila olmaydi, lekin `/move/` orqali statusdan statusga o'tkaza oladi. Admin/developer qo'lda task qo'sha oladi.

## Task Statuses

Endpoint:

```http
GET /api/crm/task-statuses/
POST /api/crm/task-statuses/
PATCH /api/crm/task-statuses/{id}/
DELETE /api/crm/task-statuses/{id}/
```

Default statuslar migration bilan yaratiladi:

- `Yangi`
- `Jarayonda`
- `Bajarildi`
- `Bekor qilindi`

Response item:

```json
{
  "id": 1,
  "name": "Yangi",
  "color": "#2563eb",
  "position": 0,
  "is_active": true,
  "task_count": 4,
  "created_by": null,
  "created_at": "2026-06-01T09:00:00+05:00",
  "updated_at": "2026-06-01T09:00:00+05:00"
}
```

Create payload:

```json
{
  "name": "Qo'ng'iroq qilindi",
  "color": "#16a34a",
  "position": 2,
  "is_active": true
}
```

## Tasks

Endpoint:

```http
GET /api/crm/tasks/
POST /api/crm/tasks/
GET /api/crm/tasks/{id}/
PATCH /api/crm/tasks/{id}/
DELETE /api/crm/tasks/{id}/
POST /api/crm/tasks/{id}/move/
```

List query params:

- `status`: status id
- `client`: client id
- `booking`: booking id
- `assigned_to`: user id
- `kind`: `manual`, `booking_two_days`, `booking_today`
- `priority`: `low`, `medium`, `high`
- `search`: title, description, client name, phone
- `ordering`: `due_at`, `-due_at`, `created_at`, `-created_at`, `updated_at`, `-updated_at`, `status__position`

Task response item:

```json
{
  "id": 12,
  "title": "Madina Karimova bilan aloqa qiling: bugun konsultatsiya",
  "description": "Madina Karimova bugun 14:00 da konsultatsiyaga yozilgan. Mijoz bilan bog'lanib, bugungi konsultatsiyani eslatish kerak.",
  "status": 1,
  "status_name": "Yangi",
  "status_color": "#2563eb",
  "priority": "high",
  "due_at": "2026-06-01T15:00:00+05:00",
  "client": 45,
  "client_name": "Madina Karimova",
  "client_phone": "+998901112233",
  "booking": 88,
  "booking_scheduled_for": "2026-06-01T14:00:00+05:00",
  "assigned_to": null,
  "assigned_to_name": null,
  "created_by": null,
  "created_by_name": null,
  "kind": "booking_today",
  "automation_key": "booking_today:88:2026-06-01",
  "created_at": "2026-06-01T09:00:00+05:00",
  "updated_at": "2026-06-01T09:00:00+05:00"
}
```

Manual create payload:

```json
{
  "title": "Mijoz bilan qayta bog'lanish",
  "description": "Narx bo'yicha savoli bor, operator qayta yozadi.",
  "status": 1,
  "priority": "medium",
  "due_at": "2026-06-01T18:00:00+05:00",
  "client": 45,
  "booking": 88,
  "assigned_to": null
}
```

`assigned_to` null bo'lsa task hamma operatorlarga umumiy ko'rinadi.

## Kanban Board

Tavsiya qilingan flow:

1. `GET /api/crm/task-statuses/?page_size=200`
2. `GET /api/crm/tasks/?page_size=200&ordering=status__position`
3. Frontend tasklarni `status` bo'yicha columnlarga group qiladi.
4. Drag-and-drop qilinganda `/move/` chaqiriladi.

Move payload:

```http
POST /api/crm/tasks/12/move/
Content-Type: application/json
```

```json
{
  "status": 2
}
```

Move response to'liq task item qaytaradi. Frontend optimistic update qilishi mumkin, lekin response bilan state ni sync qilib qo'yish yaxshi.

## Auto Tasks

Backend Celery Beat orqali har kuni `09:00 Asia/Tashkent` da yaratadi.

Auto task turlari:

- `booking_two_days`: konsultatsiyaga 2 kun qolganda yaratiladi
- `booking_today`: shu kungi konsultatsiyalar uchun yaratiladi

Qoidalar:

- Har bir booking uchun alohida task yaratiladi.
- Bir booking uchun duplicate yaratilmaydi.
- `booking_today` tasklarida `due_at` shu kundagi oxirgi konsultatsiya vaqtiga teng bo'ladi.
- Auto tasklar ham Kanban boardda oddiy task kabi ko'rinadi va `/move/` bilan statusi o'zgaradi.

## Frontend UI Minimum

Tasks page uchun kerakli qismlar:

- Status columns: `task-statuses` dan keladi.
- Task cards: title, client name/phone, due_at, priority, kind.
- Drag-and-drop: `/move/`.
- Admin/developer uchun manual create/edit/delete modal.
- Admin/developer uchun status manage modal yoki settings panel.
- Operator uchun create/edit/delete yashiriladi, move qoladi.

## Notes

CRM client detailda tasklarni ko'rsatish kerak bo'lsa:

```http
GET /api/crm/tasks/?client={client_id}
```

Booking detail yonida tasklarni ko'rsatish kerak bo'lsa:

```http
GET /api/crm/tasks/?booking={booking_id}
```
