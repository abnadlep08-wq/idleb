// ============================================
// ترقية باقة المستخدم
// ============================================

import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        }
    }

    try {
        const { userId, plan, isYearly, paymentMethod } = JSON.parse(event.body)

        if (!userId || !plan) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'البيانات المطلوبة ناقصة' })
            }
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        )

        // تحديد الرصيد حسب الباقة
        const planCredits = {
            free: 3,
            pro: 50,
            unlimited: -1 // غير محدود
        }

        const planLimits = {
            free: {
                maxDuration: 180,
                maxSize: 100 * 1024 * 1024
            },
            pro: {
                maxDuration: 900,
                maxSize: 500 * 1024 * 1024
            },
            unlimited: {
                maxDuration: 3600,
                maxSize: 2 * 1024 * 1024 * 1024
            }
        }

        // تحديث باقة المستخدم
        const { error: updateError } = await supabase
            .from('users')
            .update({
                plan: plan,
                credits: planCredits[plan],
                max_duration: planLimits[plan].maxDuration,
                max_size: planLimits[plan].maxSize,
                updated_at: new Date()
            })
            .eq('id', userId)

        if (updateError) throw updateError

        // تسجيل المعاملة إذا كانت مدفوعة
        if (plan !== 'free' && paymentMethod) {
            const amount = isYearly ? 
                (plan === 'pro' ? 180 : 468) : 
                (plan === 'pro' ? 19 : 49)

            await supabase
                .from('transactions')
                .insert({
                    user_id: userId,
                    plan: plan,
                    amount: amount,
                    is_yearly: isYearly,
                    payment_method: paymentMethod,
                    status: 'completed',
                    created_at: new Date()
                })
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                message: 'تم تحديث الباقة بنجاح'
            })
        }

    } catch (error) {
        console.error('Error in upgrade-plan function:', error)

        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'فشل في تحديث الباقة' })
        }
    }
                  }
