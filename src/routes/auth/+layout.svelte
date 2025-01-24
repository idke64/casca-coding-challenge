<script>
	import { goto } from '$app/navigation';

	let { data, children } = $props();
	let { user } = $derived(data);

	$effect(() => {
		if (user) {
			goto('/dashboard/home');
		}
	});
</script>

{@render children()}
