<script lang="ts">
	import Fa from 'svelte-fa';
	import { faCloudUpload, faTrash } from '@fortawesome/free-solid-svg-icons';
	import { getFileExtension, getFileIcon } from '$lib/utils/';

	let { data } = $props();

	let prevFiles = $state(data.prevFiles);

	let user = $derived(data.user);
	let supabase = $derived(data.supabase);

	let files: FileList | null = $state(null);
	let isDragging = $state(false);

	let processing: boolean = $state(false);

	const MAX_FILE_SIZE = 6 * 1024 * 1024;
	const MAX_FILES = 4;

	const ACCEPTED_MIME_TYPES = [
		'application/pdf',
		'image/png',
		'image/jpeg',
		'image/jpg',
		'text/plain'
	];

	const ACCEPTED_EXTENSIONS = '.pdf,.png,.jpg,.jpeg,.txt';

	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
	}

	function validateFiles(fileList: FileList): { valid: boolean; error?: string } {
		if (fileList.length > MAX_FILES) {
			return {
				valid: false,
				error: `Maximum ${MAX_FILES} files allowed at once`
			};
		}

		const validFiles = Array.from(fileList).every(
			(file) => file.size <= MAX_FILE_SIZE && ACCEPTED_MIME_TYPES.includes(file.type)
		);

		if (!validFiles) {
			return {
				valid: false,
				error: 'Some files are too large or have invalid format'
			};
		}

		return { valid: true };
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		if (isDragging) {
			const droppedFiles = e.dataTransfer?.files;
			if (!droppedFiles) return;

			const { valid, error } = validateFiles(droppedFiles);
			if (valid) {
				files = droppedFiles;
			} else {
				alert(error);
			}
		}
		isDragging = false;
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const selectedFiles = input.files;
		if (!selectedFiles) return;

		const { valid, error } = validateFiles(selectedFiles);
		if (valid) {
			files = selectedFiles;
		} else {
			input.value = '';
			alert(error);
		}
	}

	async function handleUpload() {
		if (!files) return;

		processing = true;

		try {
			const formData = new FormData();
			Array.from(files).forEach((file) => {
				formData.append('files', file);
			});

			const response = await fetch('/dashboard/upload', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Upload failed');
			}

			const results = await response.json();

			const addFiles = results.analyses.map((result: any, i: number) => {
				return {
					id: result.id,
					name: result.fileName,
					size: files![i].size,
					createdAt: result.createdAt
				};
			});

			console.log(results);

			prevFiles = [...addFiles, ...prevFiles];

			files = null;
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Upload failed');
		}
		processing = false;
	}

	function removeFile(index: number) {
		const newFiles = Array.from(files || []);
		newFiles.splice(index, 1);
		const dataTransfer = new DataTransfer();
		newFiles.forEach((file) => dataTransfer.items.add(file));
		files = dataTransfer.files;
		if (files.length === 0) {
			files = null;
		}
	}

	async function getSignedUrl(fileName: string) {
		const filePath = `${user!.id}/${fileName}`;

		const { data, error } = await supabase!.storage
			.from('documents')
			.createSignedUrl(filePath, 1800);

		if (error) {
			return;
		}

		window.open(data!.signedUrl, '_blank');
	}
</script>

<div class="flex flex-col gap-y-6">
	<div class="flex flex-col gap-y-4">
		<h4>Upload Bank Statement</h4>
	</div>

	<div class="flex justify-between gap-x-4">
		<div
			class="relative flex min-h-60 w-1/2 cursor-default items-center justify-center rounded border-2 border-dashed bg-bg-2 p-6 duration-200 {isDragging
				? 'border-blue-400 ring-4 ring-blue-300/20'
				: 'border-border'} {!processing ? 'hover:ring-4 hover:ring-bg-3/40' : ''}"
			ondragenter={handleDragEnter}
			ondragleave={handleDragLeave}
			ondragover={(e) => e.preventDefault()}
			ondrop={handleDrop}
			aria-roledescription="upload zone"
			role="button"
			tabindex="0"
		>
			<div
				class="absolute flex h-full w-full flex-col items-center justify-center gap-y-2 text-center"
			>
				{#if processing}
					<div class="flex flex-col items-center gap-y-2">
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
							class="text-text-3"
							><style>
								.spinner_P7sC {
									transform-origin: center;
									animation: spinner_svv2 0.75s infinite linear;
								}
								@keyframes spinner_svv2 {
									100% {
										transform: rotate(360deg);
									}
								}
							</style><path
								d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z"
								class="spinner_P7sC"
								fill="currentColor"
							/></svg
						>
						<p class="text-text-3">Processing...</p>
					</div>
				{:else}
					<Fa size="lg" icon={faCloudUpload} class="h-12 w-12 text-text-1" />
					<div class="flex flex-col gap-y-1">
						<h6 class="font-semibold text-text-2">Click to upload or drag and drop</h6>
						<div class="flex flex-col gap-y-1">
							<p class="text-xs text-text-3">Supported formats: PDF, PNG, JPG, JPEG, TXT</p>
							<p class="text-xs text-text-3">Max file size: {MAX_FILE_SIZE / (1024 * 1024)}MB</p>
						</div>
					</div>
					<input
						type="file"
						multiple
						class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
						accept={ACCEPTED_EXTENSIONS}
						onchange={handleFileSelect}
					/>
				{/if}
			</div>
		</div>
		<div class="flex w-1/2 flex-col items-center gap-y-2 rounded border bg-bg-2 px-2 py-2">
			{#if files}
				{#each Array.from(files) as file, i}
					<div
						class="flex h-[calc(25%-6px)] w-full items-center justify-between rounded bg-bg-2 px-4 text-start"
					>
						<div class="flex items-center gap-x-2">
							<Fa icon={getFileIcon(file.type)} class="text-text-3" />
							<div class="flex flex-col">
								<p class="text-text-2">{file.name}</p>
								<p class="text-xs text-text-3">
									{Math.round((file.size * 100) / (1024 * 1024)) / 100}MB
								</p>
							</div>
						</div>

						<button disabled={processing} onclick={() => removeFile(i)}>
							<Fa icon={faTrash} class="text-text-3 hover:text-text-1" />
						</button>
					</div>
				{/each}
			{:else}
				<p class="mt-3 text-text-3">No files uploaded</p>
			{/if}
		</div>
	</div>
	<button
		onclick={handleUpload}
		disabled={!files || processing}
		class="btn-primary h-8 self-end px-3">Process</button
	>

	<h5>Uploaded files</h5>

	{#if prevFiles.length > 0}
		<div class="flex flex-col gap-y-3">
			{#each prevFiles as file}
				<div
					class="flex h-16 w-full items-center justify-between rounded border bg-bg-2 px-4 text-start"
				>
					<div class="flex w-full items-center justify-between">
						<div class="flex items-center gap-x-2">
							<Fa icon={getFileIcon(getFileExtension(file.name))} class="text-text-3" />
							<div class="flex flex-col">
								<p class="text-text-2">{file.name.slice(37)}</p>
								<p class="text-xs text-text-3">
									{Math.round((file.size * 100) / (1024 * 1024)) / 100}MB |
									{new Date(file.createdAt).toLocaleDateString()}
								</p>
							</div>
						</div>
						<div class="flex gap-x-3">
							<button onclick={() => getSignedUrl(file.name)} class="btn-secondary h-8 px-3">
								File
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-text-3">No files uploaded</p>
	{/if}
</div>
