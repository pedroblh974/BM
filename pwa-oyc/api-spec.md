# API Specification (Simple REST)

Base URL: `/api`

## Authentication
- Optional (to be added later). For now assume trusted local use.

## Resources

### Groups
- GET `/groups`
  - 200 OK: `[ { id, name, price, capacity } ]`

### Students
- GET `/students?groupId=main|mini1|...&search=QUERY`
  - 200 OK: `[ Student ]`
- POST `/students`
  - Body:
    ```json
    {"name":"","phone":"","guardianPhone":"","groupId":"main","joinMonth":"YYYY-MM"}
    ```
  - 201 Created: `Student`
- PUT `/students/{id}`
  - Body: partial `Student`
  - 200 OK: `Student`
- DELETE `/students/{id}`
  - 204 No Content

Student object:
```json
{
  "id": "s_123",
  "name": "string",
  "phone": "+2136xxxxxxxx",
  "guardianPhone": "string",
  "groupId": "main|mini1|mini2|mini3|mini4",
  "joinMonth": "YYYY-MM"
}
```

### Payments
- GET `/payments?month=YYYY-MM&groupId=...`
  - 200 OK: `[ { studentId, month, paid } ]`
- POST `/payments`
  - Body:
    ```json
    {"studentId":"s_123","month":"YYYY-MM","paid":true}
    ```
  - 200 OK

### Attendance
- GET `/attendance?date=YYYY-MM-DD&groupId=...`
  - 200 OK: `[ { studentId, date, present } ]`
- POST `/attendance`
  - Body:
    ```json
    {"studentId":"s_123","date":"YYYY-MM-DD","present":true}
    ```
  - 200 OK

### Reports
- GET `/reports/monthly?month=YYYY-MM`
  - 200 OK:
    ```json
    {
      "month":"YYYY-MM",
      "totalIncome": 0,
      "expectedIncome": 0,
      "unpaid": [ {"studentId":"s_123","groupId":"main"} ],
      "counts": {"main":0,"mini1":0,"mini2":0,"mini3":0,"mini4":0}
    }
    ```

### Error format
```json
{ "error": "message" }
```