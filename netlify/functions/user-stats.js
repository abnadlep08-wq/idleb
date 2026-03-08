// ============================================
// جلب إحصائيات المستخدم
// ============================================

import { createClient } from '@supabase/supabase-js'

export const handler = async (event) => {
    const userId = event.queryStringParameters?.userId

    if (!userId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'معرف المستخدم مطلوب' })
        }
    }

    try {
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        )

        // جلب بيانات المستخدم
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single()

        // جلب فيديوهات المستخدم
        const { data: videos, error: videosError } = await supabase
            .from('videos')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (userError && userError.code !== 'PGRST116') {
            throw userError
        }

        // حساب الإحصائيات
        const videosCount = videos?.length || 0
        const totalMinutes = videos?.reduce((acc, v) => acc + (v.duration || 0), 0) || 0
        const storageUsed = videos?.reduce((acc, v) => acc + (v.size || 0), 0) || 0
        const usedCredits = videosCount

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                videosCount,
                totalMinutes: Math.round(totalMinutes / 60),
                credits: user?.credits || 3,
                usedCredits,
                totalCredits: user?.totalCredits || 3,
                storageUsed,
                videos: videos || []
            })
        }

    } catch (error) {
        console.error('Error in user-stats function:', error)

        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'فشل في جلب الإحصائيات' })
        }
    }
}
