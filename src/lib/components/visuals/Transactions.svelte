<script lang="ts">
	import { formatCurrency } from '$lib/utils';

	let { transactions, currency } = $props();
</script>

<div class="overflow-hidden rounded border bg-bg-2 p-6">
	<div class="flex flex-col gap-3">
		<h5>Transactions</h5>
		<div class="flex h-[592.95px] flex-col gap-y-4 overflow-scroll rounded border">
			<table>
				<thead>
					<tr>
						<th>Date</th>
						<th>Description</th>
						<th>Amount</th>
					</tr>
				</thead>
				<tbody>
					{#each transactions as transaction}
						<tr>
							<td>{new Date(transaction.date).toLocaleDateString()}</td>
							<td>{transaction.description}</td>
							<td
								><span
									class="{transaction.amount > 0 ? 'text-green-500' : 'text-red-500'} font-bold"
								>
									{formatCurrency(transaction.amount, currency)}
								</span></td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
