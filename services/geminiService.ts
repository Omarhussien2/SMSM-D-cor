/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

// Resizes an image to fit within a square and adds padding, ensuring a consistent
// input size for the AI model, which enhances stability.
const resizeImage = (file: File, targetDimension: number): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("Failed to read file."));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = targetDimension;
                canvas.height = targetDimension;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context.'));
                }

                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, targetDimension, targetDimension);

                const aspectRatio = img.width / img.height;
                let newWidth, newHeight;

                if (aspectRatio > 1) { // Landscape image
                    newWidth = targetDimension;
                    newHeight = targetDimension / aspectRatio;
                } else { // Portrait or square image
                    newHeight = targetDimension;
                    newWidth = targetDimension * aspectRatio;
                }

                const x = (targetDimension - newWidth) / 2;
                const y = (targetDimension - newHeight) / 2;
                
                ctx.drawImage(img, x, y, newWidth, newHeight);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        }));
                    } else {
                        reject(new Error('Canvas to Blob conversion failed.'));
                    }
                }, 'image/jpeg', 0.95);
            };
            img.onerror = (err) => reject(new Error(`Image load error: ${err}`));
        };
        reader.onerror = (err) => reject(new Error(`File reader error: ${err}`));
    });
};

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

/**
 * Generates a single mockup image by placing a product into a scene described by a text prompt.
 * @param productImage The file for the product to be placed.
 * @param scenePrompt A text description of the scene for the mockup.
 * @param widthCm The width of the product in centimeters.
 * @param heightCm The height of the product in centimeters.
 * @returns A promise that resolves to the base64 data URL of the generated mockup image.
 */
export const generateMockup = async (
    productImage: File,
    scenePrompt: string,
    widthCm: number,
    heightCm: number
): Promise<string> => {
    console.log(`Starting mockup generation for prompt: "${scenePrompt}"`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const model = 'gemini-2.5-flash-image';
    
    const MAX_DIMENSION = 1024;
    
    console.log('Resizing product image...');
    const resizedProductImage = await resizeImage(productImage, MAX_DIMENSION);
    
    const productImagePart = await fileToPart(resizedProductImage);
    
    const prompt = `
        **Task:** You are a professional product photographer. Your job is to create a hyper-realistic, professional photoshoot-style mockup image.
        
        **Product:** The product to feature is in the provided image. It is a piece of wall art ('تابلوه'). You must ignore any background or padding in the product image and treat it as transparent.
        
        **Product Dimensions:** The physical dimensions of the wall art are ${widthCm} cm wide and ${heightCm} cm tall. It is crucial that you represent these dimensions and the product's scale accurately and realistically within the scene. For example, if it is on a table, it should look small. If it is on a large wall, it should not fill the entire wall.
        
        **Scene:** Place the product seamlessly into the following scene.
        
        **Scene Description:** "${scenePrompt}"
        
        **Requirements:**
        - Integrate the wall art into the scene with perfect scale, perspective, lighting, and shadows, paying close attention to the provided dimensions.
        - The final image must be high-resolution and look like a real, professional photograph.
        - Do not add any text or overlays. The output must be the image only.
    `;
    
    const textPart = { text: prompt };
    
    console.log('Sending request to Gemini...');
    
    const response: GenerateContentResponse = await ai.models.generateContent({
        model,
        contents: { parts: [productImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    
    console.log('Received response from Gemini.');
    
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const { mimeType, data } = part.inlineData;
            console.log(`Received image data (${mimeType}).`);
            return `data:${mimeType};base64,${data}`;
        }
    }
    
    console.error("Model response did not contain an image part.", response);
    throw new Error("The AI model did not return an image. Please try again.");
};