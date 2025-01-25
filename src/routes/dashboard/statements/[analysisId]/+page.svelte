<script lang="ts">
	import { AnalysisDetails, LoanPayments } from '$lib/components';
	import { Evaluation } from '$lib/components';
	import { BillsByCategory } from '$lib/components';
	import { BalanceHistory } from '$lib/components';
	import { TransactionHistory } from '$lib/components';
	import { TotalCard } from '$lib/components';
	import { Transactions } from '$lib/components';
	import { BillsByProvider } from '$lib/components';

	let { data } = $props();
	let analysis = $derived(data.analysis);
</script>

<div class="flex flex-col gap-y-6">
	<div class="flex flex-col gap-y-4">
		<h4>Bank Statement</h4>
	</div>

	<div class="flex flex-col gap-4">
		<div class="grid grid-cols-3 gap-4">
			<div class="flex h-full flex-col justify-between gap-4">
				<AnalysisDetails
					valid={analysis.valid.status}
					accountDetails={analysis.account_details}
					fileName={analysis.file_name}
				/>
				<div class="grid h-full grid-cols-3 gap-4">
					<TotalCard
						color="green"
						amount={analysis.summary.deposits}
						message="Deposits"
						currency={analysis.account_details.currency}
					/>
					<TotalCard
						color="red"
						amount={analysis.summary.withdrawals}
						message="Withdrawals"
						currency={analysis.account_details.currency}
					/>
					<TotalCard
						color="blue"
						amount={analysis.outstanding_loans.totalEmi}
						message="EMIs"
						currency={analysis.account_details.currency}
					/>
				</div>
			</div>
			<Evaluation overview={analysis.summary.overview} evaluation={analysis.summary.evaluation} />
			<BillsByCategory
				currency={analysis.account_details.currency}
				billInsights={analysis.bill_insights}
			/>
		</div>
		<div class="grid h-full grid-cols-3 gap-4">
			<div class="col-span-2 flex h-full flex-col gap-4">
				<BalanceHistory
					transactions={analysis.transactions}
					currency={analysis.account_details.currency}
				/>
				<TransactionHistory
					transactions={analysis.transactions}
					currency={analysis.account_details.currency}
				/>
			</div>
			<div class="col-span-1 h-full">
				<Transactions
					transactions={analysis.transactions}
					currency={analysis.account_details.currency}
				/>
			</div>
		</div>
		<div class="grid h-full grid-cols-3 gap-4">
			<div class="col-span-2 h-full gap-4">
				<LoanPayments
					loanPayments={analysis.outstanding_loans.loanPayments}
					currency={analysis.account_details.currency}
				/>
			</div>
			<div class="col-span-1 h-full">
				<BillsByProvider
					billInsights={analysis.bill_insights}
					currency={analysis.account_details.currency}
				/>
			</div>
		</div>
	</div>
</div>
