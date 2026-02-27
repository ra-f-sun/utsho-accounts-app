# API Testing Guide

## Get Auth Token

First, login to get a JWT token:

```powershell
$loginResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email":"admin@utsho.com","password":"admin123"}' `
  -UseBasicParsing

$response = $loginResponse.Content | ConvertFrom-Json
$token = $response.data.accessToken
Write-Host "Token: $token"
```

## Test Health Endpoint

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET -UseBasicParsing
```

## Test Auth Endpoints

### Login

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email":"admin@utsho.com","password":"admin123"}' `
  -UseBasicParsing
```

### Get Current User (requires token)

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/auth/me" `
  -Method GET `
  -Headers @{"Authorization"="Bearer $token"} `
  -UseBasicParsing
```

## Test User Management Endpoints (Super Admin only)

### Get All Users

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/users" `
  -Method GET `
  -Headers @{"Authorization"="Bearer $token"} `
  -UseBasicParsing
```

### Create New User

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/users" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer $token"} `
  -Body '{"email":"newuser@utsho.com","password":"password123","fullName":"New User","role":"ACCOUNTANT_UAC"}' `
  -UseBasicParsing
```

### Get Single User (replace USER_ID)

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/users/USER_ID" `
  -Method GET `
  -Headers @{"Authorization"="Bearer $token"} `
  -UseBasicParsing
```

### Update User (replace USER_ID)

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/users/USER_ID" `
  -Method PATCH `
  -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer $token"} `
  -Body '{"fullName":"Updated Name"}' `
  -UseBasicParsing
```

### Delete User (soft delete - replace USER_ID)

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/users/USER_ID" `
  -Method DELETE `
  -Headers @{"Authorization"="Bearer $token"} `
  -UseBasicParsing
```

## Test Role-Based Access Control

Try accessing user endpoints with a non-Super Admin account (should fail):

```powershell
# Login as UAC Accountant
$uacLogin = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email":"uac@utsho.com","password":"admin123"}' `
  -UseBasicParsing

$uacResponse = $uacLogin.Content | ConvertFrom-Json
$uacToken = $uacResponse.data.accessToken

# Try to access users endpoint (should get 403 Forbidden)
Invoke-WebRequest -Uri "http://localhost:3000/api/users" `
  -Method GET `
  -Headers @{"Authorization"="Bearer $uacToken"} `
  -UseBasicParsing
```
