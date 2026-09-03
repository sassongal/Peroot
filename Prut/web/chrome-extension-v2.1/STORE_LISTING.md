# Peroot Chrome extension: store listing (v3.0.0)

Everything below is ready to paste into the Chrome Web Store developer
dashboard. Screenshots: take them from the popup (390 px wide) in dark mode
on ChatGPT, one of the gold button beside the composer, one of the preview
card while streaming, one of the options page.

## Name
Peroot: שדרוג פרומפטים

## Summary (132 chars max)
פרומפט מקצועי מכל משפט, ישירות בתוך ChatGPT, Claude ו-Gemini. עברית, אנגלית, ערבית ורוסית.

## Description
Peroot הופך משפט אחד לפרומפט מקצועי, בלי לצאת מהצ'אט.

מה התוסף עושה:
- כפתור זהב ליד תיבת הכתיבה ב-ChatGPT, Claude ו-Gemini. לחיצה אחת, והטקסט שכתבתם הופך לפרומפט מסודר: תפקיד, משימה, קהל, פורמט והגבלות. התוצאה זורמת מול העיניים ונכנסת לתיבה כשהיא מוכנה.
- שאלות המשך חכמות: אחרי כל שדרוג, שתיים או שלוש שאלות שמדייקות את הפרומפט בלחיצה.
- ארבע שפות פלט: עברית, אנגלית, ערבית ורוסית, או זיהוי אוטומטי לפי מה שכתבתם.
- מותאם למודל: הפרומפט נבנה לפי המודל שמולו אתם יושבים.
- בכל אתר אחר: סמנו טקסט, לחיצה ימנית, Peroot. שדרוג, תיקון, קיצור, הרחבה, תרגום, סיכום.
- הספרייה שלכם: הפרומפטים ששמרתם באתר זמינים בתוך הצ'אט ובחלון התוסף, עם חיפוש.
- מסונכרן לחשבון: אותם קרדיטים, אותה שפת פלט, אותה היסטוריה כמו ב-peroot.space.
- מצבים מתקדמים למנויי Pro: מחקר מעמיק, יצירת תמונות, וידאו ובניית סוכנים.

ממשק בעברית, מימין לשמאל, במצב כהה ובהיר.

## Category
Productivity

## Language
Hebrew

## Permissions justification
- storage: preferences and the login session.
- identity: sign in with Google.
- contextMenus, activeTab, scripting: the right-click actions and the floating button on the page you invoke them on.
- tabs: read the address of the active tab to detect ChatGPT, Claude or Gemini.
- alarms: refresh the login session and the selector configuration in the background.
- host permissions: peroot.space (the service), the Supabase auth endpoint, and the three chat sites the button is injected into.

## Privacy
The extension sends the text you ask it to enhance to peroot.space and nothing
else. No browsing history, no page content beyond the field you enhance.
Policy: https://www.peroot.space/privacy

## Single purpose
Enhance the prompt a person is writing to an AI model.
