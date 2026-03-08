// ============================================
// جلب إحصائيات الموقع العامة
// ============================================

import { createClient } from '@supabase/supabase-js'

export const handler = async () => {
    try {
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        )

        // جلب إجمالي عدد المستخدمين
        const { count: usersCount, error: usersError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })

        // جلب إجمالي عدد الفيديوهات
        const { count: videosCount, error: videosError } = await supabase
            .from('videos')
            .select('*', { count: 'exact', head: true })

        if (usersError || videosError) {
            throw new Error('فشل في جلب الإحصائيات')
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                users: usersCount || 0,
                videos: videosCount || 0,
                satisfaction: 98 // نسبة رضا ثابتة
            })
        }

    } catch (error) {
        console.error('Error in get-stats function:', error)

        return {
            statusCode: 200, // نرجع 200 حتى مع الخطأ (بيانات افتراضية)
            body: JSON.stringify({
                users: 10000,
                videos: 50000,
                satisfaction: 98
            })
        }
    }
}
