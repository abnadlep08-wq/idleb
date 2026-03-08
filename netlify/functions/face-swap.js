// ============================================
// دالة تبديل الوجه - الاتصال بـ Magic Hour API
// ============================================

import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'
import FormData from 'form-data'

export const handler = async (event) => {
    // السماح فقط بطلبات POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        }
    }

    try {
        // استخراج البيانات من الطلب
        const formData = new FormData()
        const body = JSON.parse(event.body)
        
        const { image, video, options, userId } = body

        if (!image || !video || !userId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'الملفات مطلوبة' })
            }
        }

        // التحقق من رصيد المستخدم
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        )

        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('credits')
            .eq('id', userId)
            .single()

        if (userError || !userData) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'المستخدم غير موجود' })
            }
        }

        if (userData.credits <= 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'رصيدك غير كافٍ' })
            }
        }

        // الاتصال بـ Magic Hour API
        const API_KEY = process.env.MAGIC_HOUR_API_KEY
        const API_URL = 'https://api.magichour.ai/v1/face-swap'

        // تحضير البيانات للإرسال
        const apiFormData = new FormData()
        apiFormData.append('image', image)
        apiFormData.append('video', video)
        apiFormData.append('options', JSON.stringify(options))

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                ...apiFormData.getHeaders()
            },
            body: apiFormData
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`API Error: ${error}`)
        }

        const result = await response.json()

        // خصم رصيد من المستخدم
        await supabase
            .from('users')
            .update({ credits: userData.credits - 1 })
            .eq('id', userId)

        // حفظ الفيديو في قاعدة البيانات
        const { error: dbError } = await supabase
            .from('videos')
            .insert({
                user_id: userId,
                video_url: result.output_url,
                title: result.title || 'فيديو بدون عنوان',
                duration: result.duration || 0,
                size: result.size || 0,
                created_at: new Date()
            })

        if (dbError) {
            console.error('Error saving to database:', dbError)
        }

        // إرجاع النتيجة
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                videoUrl: result.output_url,
                message: 'تمت المعالجة بنجاح'
            })
        }

    } catch (error) {
        console.error('Error in face-swap function:', error)

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'فشل في معالجة الفيديو',
                details: error.message
            })
        }
    }
    }
