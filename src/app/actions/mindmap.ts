'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getMindMaps() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('mind_maps')
        .select('id, title, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching mind maps:', error);
        return [];
    }

    return data;
}

export async function getMindMapById(id: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('mind_maps')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return null;
    return data;
}

export async function saveMindMap({
    id,
    content,
    title
}: {
    id?: string;
    content: any;
    title: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const payload = {
        user_id: user.id,
        content,
        title: title || '未命名导图',
        updated_at: new Date().toISOString(),
    };

    let result;

    if (id) {
        // 更新现有导图
        const { data, error } = await supabase
            .from('mind_maps')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        result = data;
    } else {
        // 创建新导图
        const { data, error } = await supabase
            .from('mind_maps')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        result = data;
    }

    // 刷新页面缓存，确左侧列表更新
    revalidatePath('/');
    return result;
}
