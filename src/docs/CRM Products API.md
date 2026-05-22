# CRM Products API

Bu hujjat CRM frontend uchun product va subsidiya bilan bog'liq oxirgi o'zgarishlarni jamlaydi.

## Subsidy Rule

Hamma joyda bir xil formula ishlaydi:

- `subsidy_amount = min(price * 20%, 20_600_000)`
- `price_after_subsidy = price - subsidy_amount`
- agar `subsidy_enabled = false` bo'lsa:
  - `subsidy_amount = 0`
  - `price_after_subsidy = price`

## Product Fields

`GET /api/products/` va `GET /api/products/{id}/` endi quyidagi yangi fieldlarni qaytaradi:

- `is_recommended`
- `subsidy_enabled`
- `subsidy_amount`
- `price_after_subsidy`

Misol:

```json
{no
  "id": "uuid",
  "name": "Renaissance Clinic Package 20kW",
  "price": "78000000.00",
  "is_promoted": true,
  "is_recommended": true,
  "subsidy_enabled": true,
  "subsidy_amount": "15600000.00",
  "price_after_subsidy": "62400000.00",
  "images": []
}
```

## Product Create / Update

`POST /api/products/` va `PATCH /api/products/{id}/` da endi quyidagi fieldlarni yuborish mumkin:

- `is_recommended`
- `subsidy_enabled`

Misol:

```json
{
  "category": "uuid",
  "name": "Renaissance Clinic Package 20kW",
  "description": "Commercial package",
  "price": "78000000.00",
  "stock_quantity": 4,
  "minimal_stock": 1,
  "is_active": true,
  "is_promoted": true,
  "is_recommended": true,
  "subsidy_enabled": true
}
```

## Product Image Delete

Bitta product ichidagi bitta rasmni alohida o'chirish endpointi qo'shildi:

- `DELETE /api/products/{product_id}/images/{image_id}/`

Response:

```json
{
  "status": "success",
  "data": {
    "deleted_image_id": "uuid"
  }
}
```

## Product Sorting

`GET /api/products/` uchun yangi sort query:

- `?sort=price_asc`
- `?sort=price_desc`

Aliaslar ham ishlaydi:

- `?sort=cheap_first`
- `?sort=expensive_first`

## Public Calculator

Frontend kalkulyator uchun mavjud endpoint:

- `POST /api/common/public/subsidy-calculator/`

Request:

```json
{
  "panel_type": "jinko_ja",
  "inverter_type": "deye",
  "requested_power_kw": 30,
  "audit_power_kw": 15
}
```

Response:

```json
{
  "status": "success",
  "data": {
    "base_price": "111000000.00",
    "subsidy_amount": "11600000.00",
    "customer_amount": "99400000.00",
    "subsidy_reference_power_kw": 15,
    "max_subsidy_amount": "20600000.00"
  }
}
```

## Notes

- `subsidy_amount` va `price_after_subsidy` product unit price bo'yicha qaytadi.
- Contract va public calculator ham shu yangi maximum-cap formula bilan ishlaydi.

