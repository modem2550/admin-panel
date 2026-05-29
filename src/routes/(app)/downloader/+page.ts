import memberData from '../members/Member.json';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const members = [...memberData]
		.map((m: any) => ({
			id: m.id,
			name: m.codeName,
			brand: m.brand,
		}))
		.sort((a, b) => a.id - b.id);

	return { members };
};
