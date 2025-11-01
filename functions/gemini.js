export async function onRequestPost(context) {
  const { request } = context;
  const data = await request.json();

  // جلب مفتاح API من متغيرات البيئة في Cloudflare Pages
  const API_KEY = process.env.GEMINI_API_KEY;

  // إرسال البيانات إلى Google Gemini API
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + API_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }
  );

  // استيراد نتيجة الرد من API
  const result = await res.json();

  // إعادة الاستجابة للعميل
  return new Response(JSON.stringify(result), {
    headers: { "content-type": "application/json" }
  });
}
