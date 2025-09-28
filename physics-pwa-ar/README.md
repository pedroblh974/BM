# منصة الأستاذ ولد يوسف - الفيزياء (PWA)

تطبيق ويب تقدمي لإدارة طلاب الفيزياء (RTL، عربي) مع عمل دون اتصال ودعم للوضع الليلي.

## التشغيل محليًا

1. شغل خادمًا بسيطًا (مثلاً Python):
```bash
python3 -m http.server 8080 -d /workspace/physics-pwa-ar
```
2. افتح المتصفح على: `http://localhost:8080/index.html`

## المزايا

- تسجيل طلاب مع التحقق من الهاتف
- إدارة مجموعات بسعات محددة
- تتبع الدفع شهريًا (✔/✖)
- حضور يومي وتصدير CSV
- لوحة تحكم للمعلم مع إحصاءات وتنبيهات
- تقارير مالية للدخل الشهري والطلاب غير المدفوعين
- وضع ليلي/نهاري، متجاوب للجوال، PWA مع خدمة دون اتصال

## المواصفات المالية والمجموعات

- المجموعة الرئيسية: 25+ طالب، 2500 دج/شهر
- 4 مجموعات مصغرة: كل واحدة 11 طالب، 8000 دج/شهر

## مواصفات API بسيطة (اختيارية للربط لاحقًا)

Base URL: `/api`

- GET `/students` → قائمة الطلاب
- POST `/students` { name, phone, groupId } → إنشاء
- PATCH `/students/:id` { name?, phone?, groupId? }
- DELETE `/students/:id`

- GET `/groups` → قائمة المجموعات

- GET `/payments?month=YYYY-MM` → حالة الدفع
- POST `/payments` { studentId, month, paid }

- GET `/attendance?date=YYYY-MM-DD` → حضور
- POST `/attendance` { studentId, date, present }

- GET `/reports/monthly?month=YYYY-MM` → ملخص دخل/غير مدفوعين

Responses بصيغة JSON. المصادقة يمكن إضافتها لاحقًا حسب الحاجة.

