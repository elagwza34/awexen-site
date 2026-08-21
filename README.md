# Awexen

المشروع منظم إلى جزأين مستقلين:

```text
.
├── frontend/                  # React + Vite + Supabase browser client
│   ├── src/
│   ├── public/
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
├── backend/                   # Django/Python backend
│   ├── sql/
│   │   └── contact_messages_table.sql
│   └── README.md
└── .gitignore
```

## تشغيل الواجهة

```bash
cd frontend
npm install
npm run dev
```

## بناء نسخة الإنتاج

```bash
cd frontend
npm run build
```

إعدادات Supabase الخاصة بالواجهة محفوظة في `frontend/.env`. لا تضع مفتاح
`service_role` أو مفتاح Supabase السري في الواجهة؛ هذه القيم تخص Django فقط.

## قاعدة البيانات

نفّذ `backend/sql/contact_messages_table.sql` من Supabase SQL Editor لإنشاء جدول
رسائل التواصل وسياسات RLS الآمنة.
