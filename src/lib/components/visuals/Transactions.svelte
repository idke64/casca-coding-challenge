<script lang="ts">
	import type { Transaction } from '$lib/types';
	import { formatCurrency } from '$lib/utils';
	import { onMount } from 'svelte';

	let { transactions, currency } = $props();

	let totalDeposits: number = $state(0);
	let totalWithdrawals: number = $state(0);

	let averageMonthlyDeposits: number = $state(0);
	let averageMonthlyWithdrawals: number = $state(0);

	onMount(() => {
		totalDeposits = transactions
			.filter((t: Transaction) => t.amount > 0)
			.reduce((sum: number, t: Transaction) => sum + t.amount, 0);

		totalWithdrawals = Math.abs(
			transactions
				.filter((t: Transaction) => t.amount < 0)
				.reduce((sum: number, t: Transaction) => sum + t.amount, 0)
		);

		const firstDate = new Date(transactions[0].date);
		const lastDate = new Date(transactions[transactions.length - 1].date);
		const monthsDiff =
			(lastDate.getFullYear() - firstDate.getFullYear()) * 12 +
			(lastDate.getMonth() - firstDate.getMonth()) +
			1;

		// Calculate monthly averages
		averageMonthlyDeposits = totalDeposits / monthsDiff;
		averageMonthlyWithdrawals = totalWithdrawals / monthsDiff;
	});
</script>

<div class="overflow-hidden rounded border bg-bg-2 p-6">
	<div class="flex flex-col gap-3">
		<h5>Transactions</h5>
		<div class="flex h-[488.5px] flex-col gap-y-4 overflow-scroll rounded border">
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
		<div class="flex flex-col gap-y-1">
			<p class="flex justify-between text-right">
				<span class="min-w-[110px] truncate text-left font-medium text-text-2">Total Deposits:</span
				>
				<span class="truncate">{formatCurrency(totalDeposits, currency)}</span>
			</p>
			<p class="flex justify-between text-right">
				<span class="min-w-[110px] truncate text-left font-medium text-text-2"
					>Total Withdrawals:</span
				>
				<span class="truncate">{formatCurrency(totalWithdrawals, currency)}</span>
			</p>
			<p class="flex justify-between text-right">
				<span class="min-w-[110px] truncate text-left font-medium text-text-2"
					>Average Monthly Deposits:</span
				>
				<span class="truncate">{formatCurrency(averageMonthlyDeposits, currency)}</span>
			</p>
			<p class="flex justify-between text-right">
				<span class="min-w-[110px] truncate text-left font-medium text-text-2"
					>Average Monthly Withdrawals:</span
				>
				<span class="truncate">{formatCurrency(averageMonthlyWithdrawals, currency)}</span>
			</p>
		</div>
	</div>
</div>
