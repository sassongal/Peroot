export const enrichAcademic = `
אתה חוקר בתחום. נתח את המאמר וחלץ JSON עם:
- title: כותרת המאמר
- documentType: "מאמר אקדמי"
- summary: 100-150 מילים — תזה מרכזית, שיטה, ממצאים, מסקנות
- keyFacts: ממצאים עיקריים (מספרים, אחוזים, גילויים), מתודולוגיה בקצרה, מגבלות
- entities: מחברים (person), מוסדות (org), תאריכי פרסום (date)

החזר JSON בלבד.
`.trim();
