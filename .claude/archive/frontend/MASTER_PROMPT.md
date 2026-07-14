# Pocket Mint — Session Task Prompt

Read `.claude/skills/` before doing anything. Follow every rule there.

---

## 0. Fix Backend Port Conflict (EADDRINUSE :::5001)

Kill whatever is holding port 5001, then restart dev server.

```bash
# Windows
netstat -ano | findstr :5001
taskkill /PID <PID> /F

# Then restart
npm run dev
```

If `ts-node-dev` is hanging from a previous crash, kill the process by name:
```bash
taskkill /IM node.exe /F
```

Then restart backend. Confirm server starts clean before touching any other task.

---

## 1. Fix Wallet CRUD

Backend must fully support:
- `POST /wallets` — create wallet (ASSET or DEBT)
- `GET /wallets` — list all wallets for user
- `PUT /wallets/:id` — update name, balance, limit
- `DELETE /wallets/:id` — soft delete or hard delete with transaction check

Rules:
- Net worth must be recalculated after every wallet mutation
- DEBT wallet requires `creditLimit` field
- Response always returns updated wallet + new net worth

---

## 2. Fix Active Installments on Dashboard

Dashboard must show installments where `paidMonths < totalMonths`.

Backend endpoint (if missing): `GET /installments?status=active`

Frontend:
- Query this endpoint on dashboard load
- Display: name, paidMonths/totalMonths, next payment date, progress bar
- Do NOT hardcode or mock — must come from live DB

---

## 3. Monthly P&L Reset

P&L = income minus expenses, scoped to current calendar month.

Backend:
- `GET /transactions/summary?month=YYYY-MM` returns:
  ```json
  { "income": 0, "expenses": 0, "netSavings": 0 }
  ```
- Filter transactions by `createdAt` within the given month range
- Default to current month if no param

Frontend:
- Dashboard Monthly P&L widget calls this endpoint
- Recalculates automatically when month changes (use `new Date()` to derive current month)
- No static/hardcoded values

---

## 4. Implementation Order

1. Fix port conflict → confirm backend starts
2. Wallet CRUD fixes → test each endpoint
3. Active installments query → dashboard render
4. P&L summary endpoint → dashboard widget

After each step, confirm: API returns correct data, no TypeScript errors, no regressions.
