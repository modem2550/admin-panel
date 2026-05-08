<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';

	onMount(async () => {
		const { data: { session } } = await supabase.auth.getSession();
		if (session) {
			goto('/dashboard');
		} else {
			goto('/login');
		}
	});
</script>
