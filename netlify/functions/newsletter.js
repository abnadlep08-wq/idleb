// ============================================
// الاشتراك في النشرة البريدية
// ============================================

import { createClient } from '@supabase/supabase-js'

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        }
    }

    try {
        const { email } = JSON.parse(event.body)

        if (!email) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'البريد الإلكتروني مطلوب' })
            }
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        )

        // التحقق من عدم تكرار الاشتراك
        const { data: existing, error: checkError } = await supabase
            .from('newsletter')
            .select('email')
            .eq('email', email)
            .single()

        if (existing) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'البريد مشترك بالفعل' })
            }
        }

        // حفظ الاشتراك
        const { error: insertError } = await supabase
            .from('newsletter')
            .insert({
                email,
                subscribed_at: new Date()
            })

        if (insertError) throw insertError

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                message: 'تم الاشتراك في النشرة البريدية'
            })
        }

    } catch (error) {
        console.error('Error in newsletter function:', error)

        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'فشل في الاشتراك' })
        }
    }
}
