export const generateMockup = async (
  productImage: File,
  scenePrompt: string,
  widthCm: number,
  heightCm: number
): Promise<any> => {
  // تحويل الصورة إلى base64
  const imageBase64 = await fileToBase64(productImage);

  const payload = {
    imageBase64,           // صورة المنتج بالبايس64
    scenePrompt,           // نص المشهد المطلوب
    widthCm,
    heightCm
  };

  const res = await fetch("/functions/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error("Failed to generate mockup");
  return await res.json(); // ستجد فيها النتيجة من Gemini (صورة ورابط ونص)
};

// دالة تحويل الصورة إلى base64
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // إزالة جزء 'data:image/png;base64,' أو ما شابه
      resolve(result.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
