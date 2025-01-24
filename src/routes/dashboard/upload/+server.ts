import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { v4 as uuidv4 } from 'uuid';
import scribe from 'scribe.js-ocr';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_KEY } from '$env/static/private';
import type { Analysis, Valid } from '$lib/types';

const genAI = new GoogleGenerativeAI(GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

const ANALYSIS_PROMPT = `
You are a bank statement data analyzer. Analyze the provided bank statement and return data in this JSON format:

Expected JSON Format:
{"valid":{"status":boolean,"error":string},"accountDetails":["customerName":string,"accountNumber","period":{"from":"MM-DD-YYYY","to":"MM-DD-YYYY"},"openingDate":"MM-DD-YYYY","currency":string],"summary":{"evaluation":number,"overview":string,"openingBalance":number,"closingBalance":number,"deposits":number,"withdrawals":number},"outstandingLoans":{"loanPayments":[["lender","emiAmount","lastPaidDate","frequency","totalPaid"],"..."],"totalEmi":number},"billInsights":[["type","frequency","averageAmount","provider","description","totalAmount"],"..."],"transactions":[["date","description","amount","balance"],"..."]}

Pattern Recognition Rules:
1. EMI Detection: Look for regular monthly payments to financial institutions
2. Bill Categories: Classify transactions using keywords (e.g., "ELECTRICITY", "RENT")
3. Salary Credits: Identify regular large deposits with consistent amounts
4. Recurring Payments: Group transactions with similar amounts and frequencies

Processing Rules:
1. Return raw Array string without extra whitespace, line breaks, comments, formatting or indentation 
2. All amounts should be numbers with 2 decimal places
3. All dates must be in MM-DD-YYYY format
4. Remove all currency symbols from amounts
5. Group similar transactions by amount and description
6. Calculate averages only for 3 or more similar transactions
7. Format transaction descriptions by:
   - Limiting to maximum 25 characters
   - Removing special characters, emojis, and non-alphanumeric characters
   - Removing common words like "payment to", "transfer from", "transaction"
   - Using standard merchant names (e.g., "AMZN" for Amazon, "WLMT" for Walmart, "TAGT" for Target)
   - Shortening common words like "electricity" to "elec", "rent" to "rnt"
   - Removing transaction IDs, reference numbers, and unnecessary details or formatting
   - Removing dates from descriptions
   - Abbreviating names and titles (e.g., "Mr. John Doe" to "JD")
   - Converting to uppercase
8. If critical data is missing or there are major errors, set valid.status false, include error details in valid.error, and fill in the JSON will nullish values. Otherwise, set valid.status true.
9. For the evaluation field (1-100), indicate how likely a loan for the account holder would be approved where 0 is the lowest and 100 is the highest based on these specific criteria:
	Income Pattern (30 pts):
	- 30 pts: Regular deposits of similar amounts on consistent dates
	- 22 pts: Regular deposits with amount variations
	- 15 pts: Multiple irregular deposits
	- 7 pts: Few sporadic deposits
	- 0 pts: No significant deposits
	Balance Management (25 pts):
	- 25 pts: Growing balance trend
	- 19 pts: Stable balance above average monthly deposits
	- 12 pts: Balance fluctuates but stays positive
	- 6 pts: Multiple low balance incidents
	- 0 pts: Frequent near-zero or negative balance
	Spending Behavior (20 pts):
	- 20 pts: Structured spending pattern, regular bill payments
	- 15 pts: Mostly regular spending with occasional spikes
	- 10 pts: Irregular spending but within means
	- 5 pts: Frequent large withdrawals
	- 0 pts: Erratic spending pattern
	Cash Flow (15 pts):
	- 15 pts: Inflows consistently exceed outflows
	- 11 pts: Positive monthly net flow
	- 7 pts: Break-even cash flow
	- 3 pts: Occasional negative months
	- 0 pts: Consistently negative flow
	Transaction Stability (10 pts):
	- 10 pts: Regular transaction patterns
	- 7 pts: Mostly consistent with few anomalies
	- 4 pts: Variable transaction patterns
	- 2 pts: Highly irregular activity
	- 0 pts: Erratic or minimal activity
10. Currency should be in ISO 4217 format (e.g., "USD", "EUR", "INR")
11. For summary.overview, provide a brief analysis of the overall financial health of the account holder in max 3 sentences.
12. For billInsights.description, provide a 1 sentence overview of the bill details.
13. For loanPayments.lastPaidDate, use the date of the last EMI payment.
14. For transaction amounts and transactions balances, use positive numbers for credit/deposits and negative numbers for debit/withdrawals.
15. BillInsights should include only bills that occur at least 3 times and not one-time payments.
16. For the frequency field in loanPayments and billInsights, use the following values: "Weekly", "Monthly", "Quarterly", "Half-yearly", "Yearly"
17. For the type field in billInsights, use the following values: "Electricity", "Water", "Gas", "Internet", "Phone", "Credit Card", "Rent", "Salary", "Subscription", "Other"
18. The date of a transaction is often found before the description. If the date of a transaction is not provided or cannot be determined, use the date of the previous transaction but never leave it null.
19. A bill is a recurring payment that appears at regular intervals (typically every 30-45 days) with similar negative amounts (within 20% variance) and matching descriptions, occurring at least 3 times in the transaction history to establish a pattern.

Bank Statement Text:
`;

const SUPPORTED_MIME_TYPES = [
	'application/pdf',
	'image/png',
	'image/jpeg',
	'image/jpg',
	'image/tiff',
	'image/bmp'
];

interface Output {
	valid: Valid;
	accountDetails: {
		customerName: string;
		accountNumber: string;
		period: {
			from: Date;
			to: Date;
		};
		openingDate: Date;
		currency: string;
	};
	summary: {
		evaluation: number;
		overview: string;
		openingBalance: number;
		closingBalance: number;
		deposits: number;
		withdrawals: number;
	};
	outstandingLoans: {
		loanPayments: [string, number, string, string, number][];
		totalEmi: number;
	};
	billInsights: [string, string, number, string, string, number][];
	transactions: [string, string, number, number][];
}

export const POST: RequestHandler = async ({ request, locals: { supabase, user } }) => {
	try {
		if (!user) {
			error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const files = formData.getAll('files') as File[];

		if (files.length == 0) {
			error(400, 'No file provided');
		}

		const invalidFile = files.find((file) => !SUPPORTED_MIME_TYPES.includes(file.type));
		if (invalidFile) {
			error(400, `Unsupported file type: ${invalidFile.type}`);
		}

		const uploadPromises = files.map(async (file) => {
			const uniqueId = uuidv4();

			const text = await scribe.extractText([file]);

			const generationConfig = {
				maxOutputTokens: 8192,
				temperature: 0.2
			};

			const result = await model.generateContent({
				contents: [
					{
						role: 'user',
						parts: [
							{
								text: ANALYSIS_PROMPT + text
							}
						]
					}
				],
				generationConfig
			});

			const cleanedText = result.response
				.text()
				.replace(/```json\s*/, '')
				.replace(/\s*```\s*$/, '')
				.trim();

			const output: Output = JSON.parse(cleanedText);

			const { valid, statement }: Analysis = outputToJson(output);

			statement.transactions = statement.transactions.sort(
				(a, b) => a.date.getTime() - b.date.getTime()
			);

			statement.billInsights = statement.billInsights.sort((a, b) =>
				a.type.localeCompare(b.type, 'en')
			);

			const { data: savedAnalysis, error: dbError } = await supabase
				.from('analysis')
				.insert({
					user_id: user.id,
					file_name: file.name,
					raw_text: text,
					valid: valid,
					transactions: statement.transactions,
					account_details: statement.accountDetails,
					summary: statement.summary,
					outstanding_loans: statement.outstandingLoans,
					bill_insights: statement.billInsights
				})
				.select()
				.single();

			const filePath = `${user.id}/${savedAnalysis.id}:${file.name}`;

			const { data: uploadData, error: uploadError } = await supabase.storage
				.from('documents')
				.upload(filePath, file);

			if (uploadError) {
				throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
			}

			if (dbError) {
				throw new Error(`Failed to save analysis: ${dbError.message}`);
			}

			return {
				success: true,
				id: savedAnalysis.id,
				filePath,
				fileName: uniqueId + ':' + file.name,
				createdAt: new Date(savedAnalysis.created_at),
				text
			};
		});

		await scribe.terminate();

		const results = await Promise.all(uploadPromises);
		return json({ success: true, analyses: results });
	} catch (err) {
		console.error(err);
		error(500, error instanceof Error ? error.message : 'Unknown error');
	}
};

function outputToJson(output: Output): Analysis {
	return {
		valid: {
			status: output.valid.status,
			error: output.valid.error
		},
		statement: {
			accountDetails: output.accountDetails,
			summary: output.summary,
			outstandingLoans: {
				loanPayments: output.outstandingLoans.loanPayments.map((loan) => ({
					lender: loan[0],
					emiAmount: loan[1],
					lastPaidDate: new Date(loan[2]),
					frequency: loan[3] as 'Weekly' | 'Monthly' | 'Quarterly' | 'Half-yearly' | 'Yearly',
					totalPaid: loan[4]
				})),
				totalEmi: output.outstandingLoans.totalEmi
			},
			billInsights: output.billInsights.map((bill) => ({
				type: bill[0] as
					| 'Electricity'
					| 'Water'
					| 'Gas'
					| 'Internet'
					| 'Phone'
					| 'Credit Card'
					| 'Rent'
					| 'Employee Salary'
					| 'Subscription'
					| 'Other',
				frequency: bill[1] as 'Weekly' | 'Monthly' | 'Quarterly' | 'Half-yearly' | 'Yearly',
				averageAmount: bill[2],
				provider: bill[3],
				description: bill[4],
				totalAmount: bill[5]
			})),
			transactions: output.transactions.map((transaction) => ({
				date: new Date(transaction[0]),
				description: transaction[1],
				amount: transaction[2],
				balance: transaction[3]
			}))
		}
	};
}
