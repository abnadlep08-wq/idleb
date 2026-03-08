import { createClient } from '@supabase/supabase-js'

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        }
    }

    try {
        const { action, userId, plan, credits, adminId } = JSON.parse(event.body)

        // التحقق من صلاحية الأدمن
        if (adminId !== 'admin-123') { // غير هذا حسب ما تبي
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'غير مصرح' })
            }
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        )

        switch(action) {
            case 'updateUser':
                // تحديث بيانات المستخدم
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ plan, credits })
                    .eq('id', userId)
                
                if (updateError) throw updateError
                
                return {
                    statusCode: 200,
                    body: JSON.stringify({ success: true, message: 'تم تحديث المستخدم' })
                }
                
            case 'addCredits':
                // إضافة رصيد للمستخدم
                const { data: user, error: fetchError } = await supabase
                    .from('users')
                    .select('credits')
                    .eq('id', userId)
                    .single()
                
                if (fetchError) throw fetchError
                
                const newCredits = user.credits + credits
                
                const { error: creditsError } = await supabase
                    .from('users')
                    .update({ credits: newCredits })
                    .eq('id', userId)
                
                if (creditsError) throw creditsError
                
                return {
                    statusCode: 200,
                    body: JSON.stringify({ success: true, message: 'تم إضافة الرصيد' })
                }
                
            default:
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'إجراء غير معروف' })
                }
        }

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        }
    }
              }
