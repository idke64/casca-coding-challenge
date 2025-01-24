import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, user } }) => {
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const { analysisId } = params;

	const { data: analysis, error: dbError } = await supabase
		.from('analysis')
		.select('*')
		.eq('id', analysisId)
		.eq('user_id', user.id)
		.single();

	if (dbError) {
		throw error(500, dbError.message);
	}

	if (!analysis) {
		throw error(404, 'Analysis not found');
	}

	if (!analysis.valid.status) {
		throw error(400, analysis.valid.error);
	}

	return { analysis };
};
