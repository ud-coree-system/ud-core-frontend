# API Management UD - Endpoint Specification

**Base URL:** `http://localhost:3000/api/v1/ud-management`

**Authentication:** JWT Token via header `bearer: <token>`

---

## 🔐 Authentication

### Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "username": "string (required, unique)",
  "email": "string (required, unique)",
  "password": "string (required)",
  "role": "string (optional: 'admin' | 'ud_operator', default: 'ud_operator')",
  "ud_id": "string (optional, ObjectId reference to UD)"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "ObjectId",
      "username": "string",
      "email": "string",
      "role": "string",
      "ud_id": "ObjectId | null",
      "isActive": true,
      "createdAt": "ISO Date",
      "updatedAt": "ISO Date"
    },
    "token": "JWT Token"
  }
}
```

---

### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "username": "string (username or email)",
  "password": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "JWT Token"
  }
}
```

**Error (401):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

---

### Logout
```http
POST /auth/logout
Authorization: bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

### Get Current User
```http
GET /auth/me
Authorization: bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "username": "string",
    "email": "string",
    "role": "admin | ud_operator",
    "ud_id": { "_id": "...", "kode_ud": "...", "nama_ud": "..." },
    "isActive": true,
    "lastLogin": "ISO Date",
    "createdAt": "ISO Date"
  }
}
```

---

## 🏢 UD Management

### List All UD
```http
GET /ud
Authorization: bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10, max: 100) |
| `search` | string | Search by nama_ud, nama_pemilik, or kode_ud |
| `isActive` | boolean | Filter by active status |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "kode_ud": "UD-ASM-001",
      "nama_ud": "UD Amanah Sumber Makmur",
      "alamat": "string",
      "nama_pemilik": "An. Ulul Azmi",
      "bank": "Mandiri",
      "no_rekening": "1610016136421",
      "kbli": ["Sayur", "Buah"],
      "isActive": true,
      "createdAt": "ISO Date"
    }
  ],
  "pagination": {
    "totalDocuments": 50,
    "totalPages": 5,
    "currentPage": 1,
    "limit": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### Get UD Detail
```http
GET /ud/:id
Authorization: bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "kode_ud": "UD-ASM-001",
    "nama_ud": "UD Amanah Sumber Makmur",
    "alamat": "string",
    "nama_pemilik": "An. Ulul Azmi",
    "bank": "Mandiri",
    "no_rekening": "1610016136421",
    "kbli": ["Sayur", "Buah"],
    "isActive": true
  }
}
```

---

### Create UD
```http
POST /ud
Authorization: bearer <token>
Role: admin
```

**Request Body:**
```json
{
  "nama_ud": "string (required)",
  "alamat": "string (optional)",
  "nama_pemilik": "string (optional)",
  "bank": "string (optional)",
  "no_rekening": "string (optional)",
  "kbli": ["string"] // optional array
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "UD created successfully",
  "data": {
    "_id": "ObjectId",
    "kode_ud": "UD-ASM-001", // Auto-generated
    "nama_ud": "UD Amanah Sumber Makmur",
    ...
  }
}
```

---

### Update UD
```http
PUT /ud/:id
Authorization: bearer <token>
Role: admin
```

**Request Body:**
```json
{
  "nama_ud": "string (optional)",
  "alamat": "string (optional)",
  "nama_pemilik": "string (optional)",
  "bank": "string (optional)",
  "no_rekening": "string (optional)",
  "kbli": ["string"],
  "isActive": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "UD updated successfully",
  "data": { ... }
}
```

---

### Delete UD (Soft Delete)
```http
DELETE /ud/:id
Authorization: bearer <token>
Role: admin
```

**Response (200):**
```json
{
  "success": true,
  "message": "UD deleted successfully",
  "data": { ... }
}
```

---

## 📦 Barang Management

### List All Barang
```http
GET /barang
Authorization: bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `ud_id` | string | Filter by UD (ObjectId) |
| `search` | string | Search by nama_barang |
| `isActive` | boolean | Filter by active status |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "nama_barang": "Tempe",
      "satuan": "pcs",
      "harga_jual": 2900,
      "harga_modal": 2500,
      "ud_id": {
        "_id": "ObjectId",
        "kode_ud": "UD-ASM-001",
        "nama_ud": "UD Amanah Sumber Makmur"
      },
      "isActive": true
    }
  ],
  "pagination": { ... }
}
```

---

### Search Barang (Autocomplete)
```http
GET /barang/search
Authorization: bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | **Required.** Search query |
| `ud_id` | string | Filter by UD (optional) |
| `limit` | number | Max results (default: 10) |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "nama_barang": "Tempe",
      "satuan": "pcs",
      "harga_jual": 2900,
      "harga_modal": 2500,
      "ud_id": { ... }
    }
  ]
}
```

---

### Create Barang
```http
POST /barang
Authorization: bearer <token>
```

**Request Body:**
```json
{
  "nama_barang": "string (required)",
  "satuan": "pcs | kg | ltr | dus | tray | gln | unit",
  "harga_jual": 2900, // required
  "harga_modal": 2500, // optional, default: 0
  "ud_id": "ObjectId (required)"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Barang created successfully",
  "data": { ... }
}
```

---

### Update Barang
```http
PUT /barang/:id
Authorization: bearer <token>
```

### Delete Barang (Soft Delete)
```http
DELETE /barang/:id
Authorization: bearer <token>
```

---

## 🍳 Dapur Management

### List All Dapur
```http
GET /dapur
Authorization: bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `search` | string | Search by nama_dapur or kode_dapur |
| `isActive` | boolean | Filter by active status |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "kode_dapur": "DAPUR-SPP-001",
      "nama_dapur": "SPPG Pagutan",
      "alamat": "string",
      "isActive": true
    }
  ],
  "pagination": { ... }
}
```

---

### Create Dapur
```http
POST /dapur
Authorization: bearer <token>
Role: admin
```

**Request Body:**
```json
{
  "nama_dapur": "string (required)",
  "alamat": "string (optional)"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Dapur created successfully",
  "data": {
    "kode_dapur": "DAPUR-SPP-001", // Auto-generated
    ...
  }
}
```

---

### Update Dapur
```http
PUT /dapur/:id
Authorization: bearer <token>
Role: admin
```

### Delete Dapur
```http
DELETE /dapur/:id
Authorization: bearer <token>
Role: admin
```

---

## 📅 Periode Management

### List All Periode
```http
GET /periode
Authorization: bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `isActive` | boolean | Filter by active status |
| `isClosed` | boolean | Filter by closed status |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "nama_periode": "Periode 5",
      "tanggal_mulai": "2026-01-01T00:00:00.000Z",
      "tanggal_selesai": "2026-01-31T23:59:59.000Z",
      "isActive": true,
      "isClosed": false
    }
  ],
  "pagination": { ... }
}
```

---

### Create Periode
```http
POST /periode
Authorization: bearer <token>
Role: admin
```

**Request Body:**
```json
{
  "nama_periode": "Periode 5 (required)",
  "tanggal_mulai": "2026-01-01 (required, ISO Date)",
  "tanggal_selesai": "2026-01-31 (required, ISO Date)"
}
```

---

### Update Periode
```http
PUT /periode/:id
Authorization: bearer <token>
Role: admin
```

> ⚠️ Cannot update a closed periode

---

### Close/Lock Periode
```http
PUT /periode/:id/close
Authorization: bearer <token>
Role: admin
```

**Response (200):**
```json
{
  "success": true,
  "message": "Periode closed successfully",
  "data": {
    "isClosed": true,
    ...
  }
}
```

> ⚠️ Once closed, periode cannot be modified or deleted

---

### Delete Periode
```http
DELETE /periode/:id
Authorization: bearer <token>
Role: admin
```

> ⚠️ Cannot delete a closed periode

---

## 🧾 Transaksi Management

### List All Transaksi
```http
GET /transaksi
Authorization: bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `periode_id` | string | Filter by periode (ObjectId) |
| `dapur_id` | string | Filter by dapur (ObjectId) |
| `status` | string | Filter by status: draft, completed, cancelled |
| `tanggal_mulai` | date | Filter from date |
| `tanggal_selesai` | date | Filter to date |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "kode_transaksi": "TRX-20260111-001",
      "periode_id": { "_id": "...", "nama_periode": "Periode 5" },
      "dapur_id": { "_id": "...", "kode_dapur": "DAPUR-SPP-001", "nama_dapur": "SPPG Pagutan" },
      "tanggal": "2026-01-11T00:00:00.000Z",
      "total_harga_jual": 658300,
      "total_harga_modal": 567500,
      "total_keuntungan": 90800,
      "status": "completed",
      "created_by": { "_id": "...", "username": "admin" },
      "createdAt": "ISO Date"
    }
  ],
  "pagination": { ... }
}
```

---

### Get Transaksi Detail
```http
GET /transaksi/:id
Authorization: bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "kode_transaksi": "TRX-20260111-001",
    "periode_id": { ... },
    "dapur_id": { ... },
    "tanggal": "ISO Date",
    "total_harga_jual": 658300,
    "total_harga_modal": 567500,
    "total_keuntungan": 90800,
    "status": "completed",
    "created_by": { ... },
    "items": [
      {
        "_id": "ObjectId",
        "barang_id": { "_id": "...", "nama_barang": "Tempe", "satuan": "pcs" },
        "ud_id": { "_id": "...", "kode_ud": "UD-ASM-001", "nama_ud": "..." },
        "qty": 227,
        "harga_jual": 2900,
        "harga_modal": 2500,
        "subtotal_jual": 658300,
        "subtotal_modal": 567500,
        "keuntungan": 90800
      }
    ]
  }
}
```

---

### Create Transaksi
```http
POST /transaksi
Authorization: bearer <token>
```

**Request Body:**
```json
{
  "periode_id": "ObjectId (required)",
  "dapur_id": "ObjectId (required)",
  "tanggal": "2026-01-11 (optional, default: now)",
  "items": [
    { "barang_id": "ObjectId", "qty": 227 },
    { "barang_id": "ObjectId", "qty": 10 }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Transaksi created successfully",
  "data": {
    "kode_transaksi": "TRX-20260111-001", // Auto-generated
    "status": "draft",
    ...
  }
}
```

> ⚠️ Cannot create transaksi in a closed periode

---

### Update Transaksi
```http
PUT /transaksi/:id
Authorization: bearer <token>
```

**Request Body:**
```json
{
  "periode_id": "ObjectId (optional)",
  "dapur_id": "ObjectId (optional)",
  "tanggal": "ISO Date (optional)",
  "items": [
    { "barang_id": "ObjectId", "qty": 300 }
  ]
}
```

> ⚠️ Only draft transaksi can be updated

---

### Complete Transaksi
```http
POST /transaksi/:id/complete
Authorization: bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Transaksi completed successfully",
  "data": {
    "status": "completed",
    "total_harga_jual": 658300,
    "total_harga_modal": 567500,
    "total_keuntungan": 90800,
    ...
  }
}
```

> ⚠️ Only draft transaksi can be completed

---

### Cancel Transaksi
```http
DELETE /transaksi/:id
Authorization: bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Transaksi cancelled successfully",
  "data": {
    "status": "cancelled",
    ...
  }
}
```

---

## 📊 Dashboard

### Get Summary Stats
```http
GET /dashboard/summary
Authorization: bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `periode_id` | string | Filter by periode (optional) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalUD": 10,
    "totalBarang": 150,
    "totalDapur": 5,
    "totalPeriode": 12,
    "totalTransaksi": 320,
    "totalPenjualan": 45000000,
    "totalModal": 38000000,
    "totalKeuntungan": 7000000
  }
}
```

---

### Get Recent Transactions
```http
GET /dashboard/recent
Authorization: bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Number of transactions (default: 10) |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "kode_transaksi": "TRX-20260111-001",
      "dapur_id": { ... },
      "tanggal": "ISO Date",
      "total_harga_jual": 658300,
      "status": "completed"
    }
  ]
}
```

---

### Get Sales by UD
```http
GET /dashboard/sales-by-ud
Authorization: bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `periode_id` | string | Filter by periode (optional) |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "kode_ud": "UD-ASM-001",
      "nama_ud": "UD Amanah Sumber Makmur",
      "totalJual": 15000000,
      "totalModal": 12000000,
      "totalKeuntungan": 3000000,
      "totalQty": 5000
    }
  ]
}
```

---

## 📝 Activity Logs

### List All Activity Logs
```http
GET /activity
Authorization: bearer <token>
Role: admin
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `action` | string | CREATE, UPDATE, DELETE, LOGIN, LOGOUT, VIEW |
| `module` | string | USER, UD, BARANG, DAPUR, PERIODE, TRANSAKSI |
| `user_id` | string | Filter by user (ObjectId) |
| `start_date` | date | Filter from date |
| `end_date` | date | Filter to date |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "user_id": { "_id": "...", "username": "admin", "email": "..." },
      "action": "CREATE",
      "module": "TRANSAKSI",
      "description": "CREATE TRANSAKSI: 507f1f77bcf86cd799439011",
      "target_id": "ObjectId",
      "ip_address": "::1",
      "user_agent": "Mozilla/5.0...",
      "createdAt": "ISO Date"
    }
  ],
  "pagination": { ... }
}
```

---

### Get Activity Logs by User
```http
GET /activity/user/:user_id
Authorization: bearer <token>
Role: admin
```

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation Error",
  "errors": ["nama_ud is required", "..."]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid or expired token."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Required role: admin"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "UD not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to create transaksi",
  "error": "Error message details"
}
```

---

## 📋 Enums Reference

### User Roles
- `admin` - Full access to all endpoints
- `ud_operator` - Limited access, assigned to specific UD

### Satuan Barang
- `pcs` - Pieces
- `kg` - Kilogram
- `ltr` - Liter
- `dus` - Box/Carton
- `tray` - Tray
- `gln` - Gallon
- `unit` - Unit

### Transaction Status
- `draft` - Can be edited
- `completed` - Finalized, cannot be edited
- `cancelled` - Cancelled

### Activity Actions
- `CREATE`
- `UPDATE`
- `DELETE`
- `LOGIN`
- `LOGOUT`
- `VIEW`

### Activity Modules
- `USER`
- `UD`
- `BARANG`
- `DAPUR`
- `PERIODE`
- `TRANSAKSI`

---

## 👤 User Management

### List All Users
```http
GET /user
Authorization: bearer <token>
Role: admin
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `search` | string | Search by username or email |
| `role` | string | Filter by role |
| `isActive` | boolean | Filter by active status |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "username": "string",
      "email": "string",
      "role": "admin | ud_operator",
      "ud_id": { ... },
      "isActive": true,
      "createdAt": "ISO Date"
    }
  ],
  "pagination": { ... }
}
```

---

### Get User Detail
```http
GET /user/:id
Authorization: bearer <token>
Role: admin
```

---

### Create User
```http
POST /user
Authorization: bearer <token>
Role: admin
```

**Request Body:**
```json
{
  "username": "string (required, unique)",
  "email": "string (required, unique)",
  "password": "string (required)",
  "role": "admin | ud_operator (default: ud_operator)",
  "ud_id": "ObjectId (optional)"
}
```

---

### Update User
```http
PUT /user/:id
Authorization: bearer <token>
Role: admin
```

**Request Body:**
```json
{
  "username": "string (optional)",
  "email": "string (optional)",
  "password": "string (optional)",
  "role": "string (optional)",
  "ud_id": "ObjectId (optional)",
  "isActive": "boolean (optional)"
}
```

---

### Delete User
```http
DELETE /user/:id
Authorization: bearer <token>
Role: admin
```

---

### Settings
Manage global application settings.

#### 1. Get Settings
```http
GET /setting
```

- **Auth Required**: No (Public)
- **Description**: Fetch all global application settings (e.g., registration status).
- **Response**:
```json
{
  "success": true,
  "data": {
    "_id": "651f...",
    "isRegistrationAllowed": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### 2. Update Settings
```http
PATCH /setting
Authorization: bearer <token>
Role: superuser
```

- **Auth Required**: Yes (SuperUser Only)
- **Description**: Update application settings.
- **Request Body**: Can be a boolean or a JSON object.
  - **Boolean Format**: `true` or `false`
  - **JSON Format**:
  ```json
  {
    "isRegistrationAllowed": false
  }
  ```
- **Response**:
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": { ... }
}
```

### Authentication Notes
- **Register**: `POST /auth/register` will return `403 Forbidden` if `isRegistrationAllowed` is set to `false`.
- **SuperUser Role**: A special role `superuser` has been added. It has the same privileges as `admin` plus the unique ability to manage global settings.
- **Auto-Seeding**: On backend startup, the system automatically checks for the existence of the superuser account (`suport.udrembiga@gmail.com`) and default settings, creating them if they don't exist.
