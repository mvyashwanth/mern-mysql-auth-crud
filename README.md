# MERN Stack Auth + CRUD with MySQL
##M V YASHWANTH
## QUICK START (Do these steps in order)

### Step 1: Setup MySQL tables
```
mysql -u root -p < database.sql
```
Or open MySQL Workbench, open database.sql and run all queries.

### Step 2: Start Backend
```
cd backend
npm install
npm run dev
```
You must see:
- Server running on http://localhost:5000
- MySQL Connected Successfully
- JWT_SECRET loaded: YES

### Step 3: Start Frontend (new terminal)
```
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 in browser.

### Step 4: Register and test
- Go to http://localhost:5173/register
- Fill the form and click Create Account
- You will be redirected to Dashboard
- Verify in MySQL: SELECT * FROM users;

## The .env file (already included - no need to create)
Located at: backend/.env
JWT_SECRET is already set — this was the cause of the previous error.

## API Endpoints
- POST /api/auth/register
- POST /api/auth/login  
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- GET  /api/auth/me
- GET  /api/items
- POST /api/items
- PUT  /api/items/:id
- DELETE /api/items/:id
- GET  /api/items/stats
