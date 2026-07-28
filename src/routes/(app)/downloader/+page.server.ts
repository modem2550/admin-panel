import type { PageServerLoad } from './$types';
import membersData from '$lib/Member.json';

export const load: PageServerLoad = async () => {
	// Map the IAM API data from Member.json to match the frontend autocomplete format
	const members = membersData.map((m: any) => ({
		id: m.id,
		name: m.formalDisplayName || m.displayNameEn || m.codeName,
		real_name: m.subtitle || m.subtitleEn,
		brand: m.brand,
		profile_image_url: m.profileImageUrl
	}));

	return {
		members
	};
};
