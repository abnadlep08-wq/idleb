import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'
import FormData from 'form-data'
import { randomUUID } from 'crypto'

export const handler = async (event) => {
    // التحقق من طريقة الطلب
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: 'طريقة الطلب غير مسموحة',
                code: 'METHOD_NOT_ALLOWED'
            })
        }
    }

    try {
        // استخراج البيانات من الطلب
        let body
        try {
            body = JSON.parse(event.body)
        } catch (e) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    error: 'بيانات الطلب غير صالحة',
                    code: 'INVALID_JSON'
                })
            }
        }

        const { image, video, options = {}, userId } = body

        // التحقق من الحقول المطلوبة
        const missingFields = []
        if (!image) missingFields.push('image')
        if (!video) missingFields.push('video')
        if (!userId) missingFields.push('userId')

        if (missingFields.length > 0) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    error: `الحقول التالية مطلوبة: ${missingFields.join(', ')}`,
                    code: 'MISSING_FIELDS',
                    missingFields
                })
            }
        }

        // التحقق من صحة Base64
        const validateBase64 = (str) => {
            try {
                return str.match(/^data:([a-z]+\/[a-z0-9-+.]+);base64,([a-zA-Z0-9+/=]+)$/)
            } catch {
                return null
            }
        }

        const imageValid = validateBase64(image)
        const videoValid = validateBase64(video)

        if (!imageValid) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    error: 'صيغة الصورة غير صالحة',
                    code: 'INVALID_IMAGE_FORMAT'
                })
            }
        }

        if (!videoValid) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    error: 'صيغة الفيديو غير صالحة',
                    code: 'INVALID_VIDEO_FORMAT'
                })
            }
        }

        // التحقق من المتغيرات البيئية
        const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'MAGIC_HOUR_API_KEY']
        const missingEnvVars = requiredEnvVars.filter(env => !process.env[env])

        if (missingEnvVars.length > 0) {
            console.error('Missing environment variables:', missingEnvVars)
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    error: 'خطأ في إعدادات الخادم',
                    code: 'MISSING_ENV_VARS',
                    details: missingEnvVars
                })
            }
        }

        // تهيئة Supabase
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // التحقق من وجود المستخدم
        const { data: userExists, error: userCheckError } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .single()

        if (userCheckError || !userExists) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    error: 'المستخدم غير موجود',
                    code: 'USER_NOT_FOUND'
                })
            }
        }

        // التحقق من رصيد المستخدم
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('credits, plan, full_name, email')
            .eq('id', userId)
            .single()

        if (userError) {
            console.error('Error fetching user:', userError)
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    error: 'خطأ في جلب بيانات المستخدم',
                    code: 'USER_FETCH_ERROR'
                })
            }
        }

        // التحقق من الرصيد (إذا كانت الباقة غير محدودة، تخطى التحقق)
        const isUnlimited = userData.plan === 'unlimited'
        if (!isUnlimited && userData.credits <= 0) {
            return {
                statusCode: 402, // Payment Required
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    error: 'رصيدك غير كافٍ. الرجاء شحن الرصيد',
                    code: 'INSUFFICIENT_CREDITS',
                    credits: userData.credits,
                    plan: userData.plan
                })
            }
        }

        // إرسال الملفات إلى Magic Hour API
        console.log('Sending request to Magic Hour API...')
        
        const API_KEY = process.env.MAGIC_HOUR_API_KEY
        const API_URL = 'https://api.magichour.ai/v1/face-swap'
        
        // تحويل Base64 إلى Buffer
        const imageBuffer = Buffer.from(imageValid[2], 'base64')
        const videoBuffer = Buffer.from(videoValid[2], 'base64')
        
        // إنشاء FormData
        const formData = new FormData()
        
        // إضافة الملفات
        formData.append('image', imageBuffer, {
            filename: `image-${randomUUID()}.${imageValid[1].split('/')[1]}`,
            contentType: imageValid[1]
        })
        
        formData.append('video', videoBuffer, {
            filename: `video-${randomUUID()}.${videoValid[1].split('/')[1]}`,
            contentType: videoValid[1]
        })
        
        // إضافة الخيارات
        const processedOptions = {
            enhance: options.enhance ?? true,
            stabilize: options.stabilize ?? true,
            upscale: options.upscale ?? false,
            removeWatermark: options.removeWatermark ?? false,
            smooth: options.smooth ?? true,
            colorMatch: options.colorMatch ?? true,
            priority: userData.plan === 'unlimited' ? 'high' : 'normal',
            webhook_url: `${process.env.URL}/.netlify/functions/webhook-face-swap`,
            request_id: randomUUID()
        }
        
        formData.append('options', JSON.stringify(processedOptions))
        formData.append('webhook_data', JSON.stringify({ userId, requestId: randomUUID() }))

        // إرسال الطلب إلى Magic Hour API
        const startTime = Date.now()
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'X-Request-ID': randomUUID(),
                'X-Source': 'idleb-x-ia',
                ...formData.getHeaders()
            },
            body: formData,
            timeout: 30000 // 30 ثانية
        })

        const responseTime = Date.now() - startTime
        console.log(`Magic Hour API responded in ${responseTime}ms`)

        if (!response.ok) {
            let errorData
            try {
                errorData = await response.json()
            } catch {
                errorData = await response.text()
            }
            
            console.error('Magic Hour API Error:', {
                status: response.status,
                statusText: response.statusText,
                data: errorData
            })

            return {
                statusCode: response.status,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    error: 'فشل في معالجة الفيديو بواسطة الذكاء الاصطناعي',
                    code: 'API_ERROR',
                    details: errorData,
                    apiStatus: response.status
                })
            }
        }

        const result = await response.json()
        console.log('Magic Hour API Success:', result)

        // التحقق من نتيجة المعالجة
        if (!result.output_url) {
            throw new Error('API response missing output_url')
        }

        // خصم رصيد من المستخدم (إذا لم تكن الباقة غير محدودة)
        if (!isUnlimited) {
            const { error: updateError } = await supabase
                .from('users')
                .update({ 
                    credits: userData.credits - 1,
                    updated_at: new Date()
                })
                .eq('id', userId)

            if (updateError) {
                console.error('Error updating user credits:', updateError)
                // لا نوقف العملية إذا فشل خصم الرصيد
            }
        }

        // حفظ الفيديو في قاعدة البيانات
        const videoId = randomUUID()
        const { error: dbError } = await supabase
            .from('videos')
            .insert({
                id: videoId,
                user_id: userId,
                video_url: result.output_url,
                thumbnail_url: result.thumbnail_url,
                title: options.title || `تبديل وجه ${new Date().toLocaleDateString('ar')}`,
                duration: result.duration || 0,
                size: result.size || 0,
                options: processedOptions,
                status: 'completed',
                created_at: new Date(),
                updated_at: new Date(),
                views: 0,
                likes: 0
            })

        if (dbError) {
            console.error('Error saving to database:', dbError)
        }

        // تسجيل المعاملة
        await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                type: 'video_processing',
                amount: 1,
                description: 'معالجة فيديو بتبديل الوجه',
                video_id: videoId,
                created_at: new Date()
            })

        // إرجاع النتيجة مع تفاصيل إضافية
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'X-Response-Time': `${responseTime}ms`,
                'X-Request-ID': processedOptions.request_id
            },
            body: JSON.stringify({
                success: true,
                videoUrl: result.output_url,
                thumbnailUrl: result.thumbnail_url,
                videoId: videoId,
                credits: isUnlimited ? 'غير محدود' : (userData.credits - 1),
                message: 'تمت المعالجة بنجاح',
                processingTime: responseTime,
                options: processedOptions
            })
        }

    } catch (error) {
        console.error('Critical error in face-swap function:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        })

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'حدث خطأ داخلي في الخادم',
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message,
                requestId: randomUUID()
            })
        }
    }
                }
