// ============================================
// معالجة رسائل الاتصال
// ============================================

import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        }
    }

    try {
        const { name, email, type, subject, message } = JSON.parse(event.body)

        if (!name || !email || !message) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'جميع الحقول مطلوبة' })
            }
        }

        // حفظ الرسالة في قاعدة البيانات
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        )

        const { error: dbError } = await supabase
            .from('contacts')
            .insert({
                name,
                email,
                type,
                subject,
                message,
                status: 'new',
                created_at: new Date()
            })

        if (dbError) throw dbError

        // إرسال إشعار بالبريد الإلكتروني
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        })

        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: process.env.SUPPORT_EMAIL,
            subject: `رسالة جديدة من ${name}`,
            html: `
                <h3>رسالة جديدة من نموذج الاتصال</h3>
                <p><strong>الاسم:</strong> ${name}</p>
                <p><strong>البريد:</strong> ${email}</p>
                <p><strong>نوع الاستفسار:</strong> ${type}</p>
                <p><strong>الموضوع:</strong> ${subject}</p>
                <p><strong>الرسالة:</strong></p>
                <p>${message}</p>
            `
        })

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                message: 'تم إرسال رسالتك بنجاح'
            })
        }

    } catch (error) {
        console.error('Error in contact function:', error)

        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'فشل في إرسال الرسالة' })
        }
    }
}
