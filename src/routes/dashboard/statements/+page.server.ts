import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const { data: analyses, error: dbError } = await supabase
		.from('analysis')
		.select(
			`id,valid,created_at,updated_at,valid->status,file_name,summary->evaluation,account_details->customerName`
		)
		.eq('user_id', user.id)
		.order('created_at', { ascending: false })
		.limit(30);

	if (dbError) {
		error(500, dbError.message);
	}

	return { analyses };
};
