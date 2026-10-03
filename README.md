# Lumera – Patient / Doctor / Admin portal
Open `index.html` in a browser (no build step). Data is stored in browser localStorage.

Demo logins: admin@clinic.com / admin123 · doctor@clinic.com / doctor123 · patients register themselves.

- Patient: full health profile (demographics, allergies, chronic conditions, meds, surgeries, family history, lifestyle) and visit history with prescriptions.
- Doctor: patient search, profile review, symptom picker → ranked condition prediction, medicine suggestions with allergy blocking and caution flags, saved consultations.
- Admin: stats, user management, doctor approval, create doctors.

Extend: edit `js/knowledge.js` to add conditions/medicines.
Important: the prediction engine is a simple rule-based demo, not medical advice. For real use, add a backend with proper authentication (hashing is a placeholder here), encryption, audit logs and regulatory compliance (e.g. HIPAA/GDPR), and have clinicians validate all clinical content.

## v2 additions (js/features.js)
Appointments (slot booking with conflict checks, doctor confirm/decline/complete) · Vitals logging with SVG trend charts and normal-range flags · Vitals-aware prediction and triage banner (Routine / Urgent / Emergency) · Drug–drug interaction warnings · Printable prescriptions · Profile completeness and BMI · Admin audit log, analytics, JSON backup/restore.
