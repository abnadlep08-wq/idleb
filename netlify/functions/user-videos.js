// ============================================
// جلب فيديوهات المستخدم
// ============================================

import { createClient } from '@supabase/supabase-js'

export const handler = async (event) => {
    const userId = event.queryStringParameters?.userId
    const page = parseInt(event.queryStringParameters?.page) || 1
    const limit = parseInt(event.queryStringParameters?.limit) || 10
    const offset = (page - 1) * limit

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

        // جلب إجمالي عدد الفيديوهات
        const { count, error: countError } = await supabase
            .from('videos')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)

        // جلب الفيديوهات مع التقسيم
        const { data: videos, error: videosError } = await supabase
            .from('videos')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (videosError) throw videosError

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                videos: videos || [],
                pagination: {
                    page,
                    limit,
                    total: count || 0,
                    pages: Math.ceil((count || 0) / limit)
                }
            })
        }

    } catch (error) {
        console.error('Error in user-videos function:', error)

        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'فشل في جلب الفيديوهات' })
        }
    }
              }
