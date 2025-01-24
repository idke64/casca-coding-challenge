<script lang="ts">
	import Input from '$lib/components/ui/Input.svelte';
	import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';
	import { getFileExtension, getFileIcon } from '$lib/utils/';
	import Fa from 'svelte-fa';

	let { data } = $props();

	let analyses = $derived(data.analyses);
</script>

<div class="flex flex-col gap-y-6">
	<div class="flex flex-col gap-y-4">
		<h4>Bank Statements</h4>
	</div>

	<div class="flex flex-col gap-y-6 rounded border bg-bg-2 p-6">
		<Input placeholder="Search" />

		<div class="flex h-[660px] flex-col gap-y-4 overflow-hidden rounded border">
			<table class="w-full divide-border">
				<thead>
					<tr>
						<th>Validity</th>
						<th>File Name</th>
						<th>Customer Name</th>
						<th>Evaluation</th>
						<th>Created At</th>
						<th>Updated At</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each analyses as analysis}
						<tr>
							<td
								>{#if analysis.status}
									<span class="rounded bg-green-500/10 p-1 font-bold text-green-500">Valid</span>
								{:else}
									<span class="rounded bg-red-500/10 p-1 font-bold text-red-500">Invalid</span>
								{/if}
							</td>
							<td class="flex items-center"
								><Fa
									icon={getFileIcon(getFileExtension(analysis.file_name))}
								/>{analysis.file_name}</td
							>
							<td class="max-w-60 truncate whitespace-nowrap">{analysis.customerName}</td>
							<td class="font-bold">
								<span
									class={typeof analysis.evaluation === 'number'
										? analysis.evaluation > 66
											? 'rounded bg-green-500/10 p-1 text-green-500'
											: analysis.evaluation > 33
												? 'rounded bg-yellow-500/10 p-1 text-yellow-500'
												: 'rounded bg-red-500/10 p-1 text-red-500'
										: ''}
								>
									{analysis.evaluation}
								</span>
							</td>
							<td>{new Date(analysis.updated_at).toLocaleDateString('en-US')}</td>
							<td>{new Date(analysis.created_at).toLocaleDateString('en-US')}</td>
							<td class="flex justify-end">
								{#if analysis.valid.status}
									<a href="/dashboard/statements/{analysis.id}" class="btn-secondary self-end px-3"
										>View</a
									>
								{:else}
									<button disabled={true} class="btn-secondary self-end px-3">View</button>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="flex gap-x-3 self-end">
			<button class="btn-secondary p-2"><Fa icon={faArrowLeft} /></button>
			<button class="btn-secondary p-2"><Fa icon={faArrowRight} /></button>
		</div>
	</div>
</div>
