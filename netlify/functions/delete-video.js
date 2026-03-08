// ============================================
// حذف فيديو
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
        const { videoId, userId } = JSON.parse(event.body)

        if (!videoId || !userId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'معرف الفيديو والمستخدم مطلوب' })
            }
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        )

        // التحقق من ملكية الفيديو
        const { data: video, error: checkError } = await supabase
            .from('videos')
            .select('user_id')
            .eq('id', videoId)
            .single()

        if (checkError || video.user_id !== userId) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'غير مصرح بحذف هذا الفيديو' })
            }
        }

        // حذف الفيديو من قاعدة البيانات
        const { error: deleteError } = await supabase
            .from('videos')
            .delete()
            .eq('id', videoId)

        if (deleteError) throw deleteError

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                message: 'تم حذف الفيديو بنجاح'
            })
        }

    } catch (error) {
        console.error('Error in delete-video function:', error)

        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'فشل في حذف الفيديو' })
        }
    }
}
