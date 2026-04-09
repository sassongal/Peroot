export const enrichMarketing = `
אתה מומחה פרפורמנס מרקטינג. נתח את העמוד וחלץ JSON עם:
- title: שם המוצר/השירות/הקמפיין
- documentType: "דף שיווקי"
- summary: 100-150 מילים — value proposition, קהל יעד, הצעה, differentiators
- keyFacts: USP, מחיר/הנחה, CTA, social proof, hooks
- entities: מותג (org), לקוחות/testimonials (person), תאריכי הצעה (date), סכומים (amount)

החזר JSON בלבד.
`.trim();
