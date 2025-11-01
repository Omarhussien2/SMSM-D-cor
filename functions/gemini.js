// functions/gemini.js
export async function onRequestPost(context) {
  const { request } = context;
  const data = await request.json();

 const res = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + AIzaSyDqej5ljV_TgZHgZkC6JEEqw-pN08fw7Rk,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }
);


  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + API_KEY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const result = await res.json();
  return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
}
