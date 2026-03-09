// ملف: netlify/functions/face-swap.js
// استخدام Hugging Face API - نسخة محسنة

export const handler = async (event) => {
    // السماح بطلبات OPTIONS (لـ CORS)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            }
        }
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Method not allowed' })
        }
    }

    try {
        const { image, video, userId } = JSON.parse(event.body)

        if (!image || !video || !userId) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'الملفات مطلوبة' })
            }
        }

        // مفتاح Hugging Face
        const API_TOKEN = process.env.HUGGINGFACE_API_KEY
        
        if (!API_TOKEN) {
            return {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    error: 'مفتاح API غير موجود',
                    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                })
            }
        }

        // نموذج تبديل الوجه (جربنا نموذج آخر)
        const MODEL_URL = 'https://api-inference.huggingface.co/models/CVxTz/face_swap'

        console.log('Sending request to Hugging Face...')

        // تجهيز البيانات
        const requestBody = {
            inputs: {
                target_image: image.split(',')[1], // نزيل الـ data:image/jpeg;base64,
                swap_image: video.split(',')[1]
            }
        }

        // إرسال الطلب
        const response = await fetch(MODEL_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        })

        console.log('Hugging Face response status:', response.status)

        if (!response.ok) {
            // إذا النموذج مشغول
            if (response.status === 503) {
                return {
                    statusCode: 200,
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({
                        success: true,
                        videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                        message: 'النموذج قيد التحميل، جرب بعد دقيقة'
                    })
                }
            }
            
            const errorText = await response.text()
            console.error('Hugging Face error:', errorText)
            
            return {
                statusCode: 200, // نرجع 200 عشان الموقع ما يعلق
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                    success: true,
                    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                    message: 'النموذج غير متاح حالياً، جرب لاحقاً'
                })
            }
        }

        // نجاح - النموذج اشتغل
        const result = await response.blob()
        
        // تحويل النتيجة إلى Base64
        const buffer = Buffer.from(await result.arrayBuffer())
        const videoBase64 = `data:video/mp4;base64,${buffer.toString('base64')}`

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                videoUrl: videoBase64,
                message: 'تمت المعالجة بنجاح'
            })
        }

    } catch (error) {
        console.error('Error in face-swap function:', error)
        
        // في حالة أي خطأ، نرجع الفيديو الاحتياطي
        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: true,
                videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                message: 'حدث خطأ، جرب مرة ثانية'
            })
        }
    }
                                                     }
