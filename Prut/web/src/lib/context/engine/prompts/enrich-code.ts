export const enrichCode = `
אתה מהנדס תוכנה בכיר. נתח את הקוד וחלץ JSON עם:
- title: שם הקובץ או המודול המרכזי
- documentType: "קוד מקור"
- summary: 100-150 מילים — שפה, מה הקוד עושה, ארכיטקטורה, תלויות עיקריות
- keyFacts: שפה · פונקציות/מחלקות מרכזיות · imports חיצוניים · באגים/ריחות אפשריים
- entities: libraries (org), authors אם יש (person), תאריכי שינוי (date)

החזר JSON בלבד.
`.trim();
