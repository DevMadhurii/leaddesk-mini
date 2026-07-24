# LeadDesk Mini - Digital Heroes Full Stack Task

## 🚀 Live Demo
🔗 [Live URL Here] (Add after Render deploy)

---

## 📋 Project Overview
LeadDesk Mini is a lead capture and management tool built for the Digital Heroes Full Stack Developer internship task.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js + Express |
| Database | SQLite |
| Frontend | HTML5 + CSS3 + JavaScript |
| Auth | JWT + bcrypt |
| Deployment | Render |

---

## 📊 Data Model

### Lead
```javascript
{
  id: INTEGER,
  name: TEXT,
  email: TEXT,
  budgetRange: TEXT,
  message: TEXT,
  status: TEXT (NEW/CONTACTED/CLOSED),
  createdAt: DATETIME
}
{
  id: INTEGER,
  email: TEXT,
  password: TEXT (hashed)
}