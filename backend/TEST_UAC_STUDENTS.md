# UAC Students API Testing

## Step 1: Login to get token

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

## Step 2: Create a Student

```powershell
$studentData = @{
  name = "Rakib Ahmed"
  gender = "male"
  dateOfBirth = "2010-01-15"
  class = 10
  group = "science"
  section = "A"
  school = "Dhaka College"
  serialNo = "DC-2024-001"
  guardianName = "Mr. Ahmed"
  contactNumber = "+8801712345678"
  monthlyTuitionFee = 5000
  nationality = "Bangladeshi"
  religion = "Islam"
  fatherName = "Abdul Ahmed"
  fatherMobile = "+8801812345678"
  fatherOccupation = "Business"
  motherName = "Fatima Ahmed"
  motherMobile = "+8801912345678"
  presentAddress = "Dhaka, Bangladesh"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/uac/students" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer $token"} `
  -Body $studentData `
  -UseBasicParsing
```

## Step 3: Get All Students

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/uac/students" `
  -Method GET `
  -Headers @{"Authorization"="Bearer $token"} `
  -UseBasicParsing
```

## Step 4: Filter Students by Class

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/uac/students?class=10" `
  -Method GET `
  -Headers @{"Authorization"="Bearer $token"} `
  -UseBasicParsing
```

## Step 5: Filter by Group

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/uac/students?group=science" `
  -Method GET `
  -Headers @{"Authorization"="Bearer $token"} `
  -UseBasicParsing
```

## Step 6: Search by Name

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/uac/students?search=Rakib" `
  -Method GET `
  -Headers @{"Authorization"="Bearer $token"} `
  -UseBasicParsing
```

## Step 7: Get Single Student (replace STUDENT_ID)

```powershell
# Save student ID from create response
$createResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/uac/students" `
  -Method GET `
  -Headers @{"Authorization"="Bearer $token"} `
  -UseBasicParsing

$students = ($createResponse.Content | ConvertFrom-Json).data
$studentId = $students[0].id

Invoke-WebRequest -Uri "http://localhost:3000/api/uac/students/$studentId" `
  -Method GET `
  -Headers @{"Authorization"="Bearer $token"} `
  -UseBasicParsing
```

## Step 8: Update Student

```powershell
$updateData = @{
  monthlyTuitionFee = 6000
  section = "B"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/uac/students/$studentId" `
  -Method PATCH `
  -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer $token"} `
  -Body $updateData `
  -UseBasicParsing
```

## Step 9: Soft Delete Student

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/uac/students/$studentId" `
  -Method DELETE `
  -Headers @{"Authorization"="Bearer $token"} `
  -UseBasicParsing
```

## Step 10: Verify Student is Hidden (should not appear in list)

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/uac/students" `
  -Method GET `
  -Headers @{"Authorization"="Bearer $token"} `
  -UseBasicParsing
```

## Test Role-Based Access (Should Fail)

Login as MEC accountant and try to access UAC students (should get 403):

```powershell
$mecLogin = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email":"mec@utsho.com","password":"admin123"}' `
  -UseBasicParsing

$mecResponse = $mecLogin.Content | ConvertFrom-Json
$mecToken = $mecResponse.data.accessToken

# Try to access UAC students (should fail with 403)
Invoke-WebRequest -Uri "http://localhost:3000/api/uac/students" `
  -Method GET `
  -Headers @{"Authorization"="Bearer $mecToken"} `
  -UseBasicParsing
```
