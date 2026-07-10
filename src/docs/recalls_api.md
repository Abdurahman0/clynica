# Recalls API

## List all recalls

If `page` is not provided, the API returns all recalls as an array.

```http
GET /api/crm/recalls/
GET /api/crm/recalls/?is_active=true
GET /api/crm/recalls/?is_active=false
```

Response:

```json
[
  {
    "id": 1,
    "client": {
      "id": 124,
      "full_name": "Malika",
      "phone": "+998901234567"
    },
    "scheduled_for": "2026-07-10T15:00:00+05:00",
    "remind_at": "2026-07-10T14:55:00+05:00",
    "is_active": true,
    "reminder_sent_at": null,
    "created_by": 2,
    "created_by_name": "developer",
    "created_at": "2026-07-10T10:00:00+05:00",
    "updated_at": "2026-07-10T10:00:00+05:00"
  }
]
```

## Paginated list

If `page` is provided, the API keeps the standard pagination response.

```http
GET /api/crm/recalls/?page=1
```

Response:

```json
{
  "count": 30,
  "next": "http://.../api/crm/recalls/?page=2",
  "previous": null,
  "results": []
}
```

## Recalls by client

Use this endpoint to get recalls for one client by client ID.

```http
GET /api/crm/recalls/by-client/{client_id}/
GET /api/crm/recalls/by-client/{client_id}/?is_active=true
GET /api/crm/recalls/by-client/{client_id}/?is_active=false
```

Response is always an array and is not paginated:

```json
[
  {
    "id": 1,
    "client": {
      "id": 124,
      "full_name": "Malika",
      "phone": "+998901234567"
    },
    "scheduled_for": "2026-07-10T15:00:00+05:00",
    "remind_at": "2026-07-10T14:55:00+05:00",
    "is_active": true,
    "reminder_sent_at": null,
    "created_by": 2,
    "created_by_name": "developer",
    "created_at": "2026-07-10T10:00:00+05:00",
    "updated_at": "2026-07-10T10:00:00+05:00"
  }
]
```

`note` field no longer exists in recall API.
