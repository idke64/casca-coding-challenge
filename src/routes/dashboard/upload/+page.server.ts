import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

interface FileData {
	id: string;
	name: string;
	size: number;
	publicUrl: string;
	createdAt: Date;
}

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const { data: files, error: storageError } = await supabase.storage
		.from('documents')
		.list(user.id, {
			limit: 5,
			offset: 0,
			sortBy: { column: 'created_at', order: 'desc' }
		});

	if (storageError) {
		error(500, storageError.message);
	}

	const formattedFiles: FileData[] = await Promise.all(
		files.map(async (file) => {
			const {
				data: { publicUrl }
			} = supabase.storage.from('documents').getPublicUrl(`${user.id}/${file.name}`);

			return {
				id: file.id,
				name: file.name,
				size: file.metadata.size,
				publicUrl: publicUrl,
				createdAt: new Date(file.created_at)
			};
		})
	);

	return {
		prevFiles: formattedFiles
	};
};
