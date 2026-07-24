# HRM Full API Documentation

This document provides a comprehensive reference for all backend API endpoints available in the HRM system, including their methods, purpose, and JSON structures.

---

## 1. Authentication & Security

### Login (`POST /api/auth/login`)
**Description:** Authenticates the user and returns a session token.

**Request Payload:**
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "companyCode": "COMP01" (Optional)
}
```

**Response (Success):**
```json
{
  "message": "Login successful",
  "token": "JWT_TOKEN_STRING",
  "user": {
    "id": "6618...",
    "name": "John Doe",
    "role": "employee",
    "companyId": "6617..."
  }
}
```

### Get My Profile (`GET /api/auth/me`)
**Description:** Fetch details of the current authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response (Success):**
```json
{
  "id": "6618...",
  "name": "John Doe",
  "email": "john@company.com",
  "role": "employee",
  "companyId": "6617...",
  "department": "Engineering"
}
```

### QR Token Generation (`POST /api/qr/generate`)
**Description:** Generates a short-lived token for web dashboard login via mobile scan.

**Headers:** `x-user-id`, `x-company-id`

**Response:**
```json
{
  "token": "UUID_RECORD_STRING",
  "expiresAt": "2024-04-21T12:00:00Z"
}
```

### QR Token Verification (`POST /api/qr/verify`)
**Description:** MOBILE APP ONLY. Verifies a scanned QR token to grant session access to the web dashboard.

**Request Payload:**
```json
{
  "token": "SCANNED_UUID_TOKEN",
  "deviceInfo": {
    "deviceId": "unique_id",
    "deviceName": "My iPhone",
    "platform": "iOS",
    "model": "iPhone 15"
  }
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": { "id": "...", "name": "..." },
  "token": "NEW_JWT_TOKEN"
}
```

### Device Sync (`POST /api/device/sync`)
**Description:** Syncs device health and connectivity status.

**Request Payload:**
```json
{
  "batteryLevel": 85,
  "batteryState": "charging",
  "networkType": "wifi",
  "lastActive": "timestamp"
}
```

---

## 2. Organization Management

### Departments (`GET, POST, PATCH, DELETE /api/departments`)
**Description:** Manage company departments and hierarchies.

**LIST (GET):**
- **Query Params:** `companyId` (Required)
- **Response:** `Array<{ id, name, description, companyId, isActive }>`

**CREATE (POST):**
- **Payload:** `{ name, description, companyId }`

**UPDATE (PATCH):**
- **Payload:** `{ id, name, description, ... }`

### Designations (`GET, POST, PATCH, DELETE /api/designations`)
**Description:** Manage job roles/titles within departments.

**LIST (GET):**
- **Query Params:** `companyId`, `department` (Optional)
- **Response:** `Array<{ id, name, department, level, companyId, isActive }>`

### Work Shifts (`GET, POST, PATCH, DELETE /api/shifts`)
**Description:** Configure working hours and shift rotations.

**LIST (GET):**
- **Query Params:** `companyId`
- **Response:** `Array<{ id, name, startTime, endTime, workDays, companyId }>`

---

## 3. Human Resources

### Employees (`GET, POST, PATCH /api/employees`)
**Description:** The heart of the employee database.

**LIST (GET):**
- **Query Params:** `companyId`
- **Response:** `Array<{ id, name, email, role, department, designation, status, phone, joiningDate }>`

**CREATE (POST):**
- **Payload:**
```json
{
  "name": "Jane Smith",
  "email": "jane@company.com",
  "password": "temporary_password",
  "role": "employee",
  "department": "Engineering",
  "designation": "Fullstack Developer",
  "salary": 75000,
  "joiningDate": "2024-04-21"
}
```
- **Response:** `{ message, id }`

**UPDATE (PATCH):**
- **Payload:** `{ id, status, salary, department, designation, ... }`
- **Response:** `{ message, employee }`

### Employee Portfolio (`GET /api/users/profile`)
**Description:** Unified view for an individual employee's data.

**Query Params:** `userId` (Optional - defaults to self)

**Response:**
```json
{
  "personal": { "name", "email", "phone", "avatar" },
  "professional": { "department", "designation", "employeeId", "joiningDate" },
  "system": { "role", "isActive", "lastLogin" }
}
```

---

## 4. Time & Attendance

### Attendance Logging (`POST /api/attendance`)
**Description:** Record check-in or check-out events with GPS telemetry.

**Request Payload:**
```json
{
  "employeeId": "6618...",
  "companyId": "6617...",
  "date": "2024-04-21",
  "checkIn": "09:05", (Optional: pass "checkOut" for checkout)
  "workMode": "office", (office | wfh)
  "location": {
    "lat": 28.6139,
    "lng": 77.2090
  }
}
```

**Response:**
```json
{
  "message": "Attendance updated",
  "status": "Late",
  "lateMinutes": 5
}
```

### Attendance History (`GET /api/attendance`)
**Description:** Fetch logs for a specific employee or company.

**Query Params:** `employeeId`, `date` (YYYY-MM-DD), `companyId`

### Overtime Management (`GET, POST, PATCH /api/attendance/overtime`)
**Description:** Handle overtime claims and approvals.

**LIST (GET):**
- **Query Params:** `companyId`, `month`, `year`, `employeeId`

**REQUEST/LOG (POST):**
- **Payload:** `{ employeeId, companyId, date, hours, note }`

**APPROVE/STATUS (PATCH):**
- **Payload:** `{ id, status: "pending" | "paid" | "comp_off" | "rejected" }`

---

## 5. Compensation & Benefits

### Leave Requests (`GET, POST, PATCH /api/leaves`)
**Description:** Manage employee time-off requests.

**LIST (GET):**
- **Query Params:** `employeeId`, `status`, `companyId`
- **Response:** `Array<{ id, type, startDate, endDate, totalDays, status, reason }>`

**APPLY (POST):**
- **Payload:** `{ employeeId, companyId, type, startDate, endDate, totalDays, reason }`

**APPROVE/REJECT (PATCH):**
- **Payload:** `{ id, status: "Approved" | "Rejected", approvedBy, comment }`

### Salary Structures (`GET, POST, PATCH, DELETE /api/salary`)
**Description:** Define pay components for employees.

**LIST (GET):**
- **Query Params:** `companyId`, `employeeId`

**CREATE (POST):**
- **Payload:** `{ employeeId, companyId, baseSalary, allowances, deductions, effectiveDate }`

### Payroll Processing (`GET, POST, PATCH /api/payroll`)
**Description:** Monthly salary generation and slip management.

**LIST (GET):**
- **Query Params:** `companyId`, `month`, `year`, `employeeId`

**GENERATE (POST):**
- **Payload:** `{ companyId, month, year, employeeId }`

**UPDATE STATUS (PATCH):**
- **Payload:** `{ id, status: "Paid" | "Generated", paymentDate, note }`

---

## 6. Recruitment (ATS)

### Job Positions (`GET, POST, PUT, DELETE /api/job-positions`)
**Description:** Post and manage job openings.

**LIST (GET):**
- **Query Params:** `companyId`, `status`, `public` (true/false)
- **Response:** `Array<{ id, jobId, title, department, type, status, postedAt, closesAt }>`

**CREATE (POST):**
- **Payload:** `{ title, description, department, type, experience, salaryRange, companyId, closesAt }`

### Candidate Applications (`POST /api/apply-job`)
**Description:** Public endpoint for applicants.

**APPLY (POST):**
- **Payload:** `{ jobId, name, email, phone, resumeUrl, coverLetter }`

### Recruitment Workflow (`GET, PATCH /api/job-applications`)
**Description:** Move candidates through the funnel.

**LIST (GET):**
- **Query Params:** `companyId`, `jobId`, `status`

**UPDATE STATUS (PATCH):**
- **Payload:** `{ id, status: "Screening" | "Interviewing" | "Offered" | "Rejected", comment }`

---

## 7. Support & Communication

### Company Notices (`GET, POST, DELETE /api/notices`)
**Description:** Broadcast announcements to all employees.

**LIST (GET):**
- **Query Params:** `companyId`, `category`, `limit`
- **Response:** `Array<{ id, title, content, category, priority, postedBy, expiryDate }>`

**POST (POST):**
- **Payload:** `{ companyId, title, content, category, priority, postedBy, expiryDate }`

### Support Tickets (`GET, POST, PATCH /api/tickets`)
**Description:** Internal grievance and IT support system.

**CREATE (POST):**
- **Payload:** `{ title, description, category, priority, department, attachments }`

**UPDATE (PATCH):**
- **Payload:** `{ id, status: "in_progress" | "resolved", assignedTo, resolutionNotes }`

### File Uploads (`POST /api/upload`)
**Description:** Common service for media and document storage. (Multipart Form Data)

---

## 8. Performance & Analytics

### Dashboard Stats (`GET /api/dashboard/stats`)
**Description:** Consolidated metrics for current user role.

**Response:**
```json
{
  "userRole": "employee",
  "overview": { "hoursThisWeek", "attendanceRate", "todayStatus" },
  "leaveBalance": { "total", "used", "remaining" }
}
```

---

## Error Codes Reference
| Status Code | Description |
| :--- | :--- |
| `200/201` | **Success**: Operation completed/resource created. |
| `400` | **Bad Request**: Missing fields or validation error. |
| `401` | **Unauthorized**: Invalid or missing JWT token. |
| `403` | **Forbidden**: Insufficient permissions for action. |
| `404` | **Not Found**: Resource does not exist. |
| `500` | **Server Error**: Internal system error. |
