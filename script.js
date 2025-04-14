document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    let selectedFiles = [];
    const compressBtn = document.getElementById('compressBtn');
    const progressBar = document.getElementById('progressBar');
    const progressBarFill = progressBar.querySelector('div');
    const progressText = document.getElementById('progressText');
    const result = document.getElementById('result');
    const compressionStats = document.getElementById('compressionStats');
    const downloadBtn = document.getElementById('downloadBtn');
    const themeToggle = document.getElementById('themeToggle');
    const lightIcon = document.getElementById('lightIcon');
    const darkIcon = document.getElementById('darkIcon');

    // Gestion du thème
    function updateThemeIcons() {
        const isDark = document.documentElement.classList.contains('dark');
        lightIcon.classList.toggle('hidden', isDark);
        darkIcon.classList.toggle('hidden', !isDark);
    }

    // Initialiser le thème
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
    }
    updateThemeIcons();

    themeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        updateThemeIcons();
    });

    // Gestion du drag & drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('border-primary-400', 'scale-105', 'shadow-lg', 'shadow-primary-500/20');
        dropzone.style.transition = 'all 0.3s ease';
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('border-primary-400', 'scale-105', 'shadow-lg', 'shadow-primary-500/20');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-primary-400', 'scale-105', 'shadow-lg', 'shadow-primary-500/20');
        Array.from(e.dataTransfer.files).forEach(file => {
            if (file.type === 'application/pdf') {
                handleFile(file);
            }
        });
    });

    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.setAttribute('multiple', '');
    fileInput.addEventListener('change', (e) => {
        Array.from(e.target.files).forEach(file => {
            if (file.type === 'application/pdf') {
                handleFile(file);
            }
        });
    });

    function handleFile(file) {
        if (!file) return;
        
        if (file.type !== 'application/pdf') {
            alert('Veuillez sélectionner un fichier PDF.');
            return;
        }

        selectedFiles.push(file);
        updateFileInfo();
        fileInfo.classList.remove('hidden');
        result.classList.add('hidden');
    }

    function updateFileInfo() {
        if (selectedFiles.length === 0) {
            fileInfo.classList.add('hidden');
            return;
        }

        const totalSize = selectedFiles.reduce((acc, file) => acc + file.size, 0);
        fileName.textContent = selectedFiles.length === 1 
            ? selectedFiles[0].name 
            : `${selectedFiles.length} fichiers sélectionnés`;
        fileSize.textContent = formatFileSize(totalSize);
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Simulation de la compression
    compressBtn.addEventListener('click', () => {
        progressBar.classList.remove('hidden');
        compressBtn.disabled = true;
        let progress = 0;
        let currentFileIndex = 0;

        const processNextFile = () => {
            if (currentFileIndex >= selectedFiles.length) {
                progressBar.classList.add('hidden');
                result.classList.remove('hidden');
                compressBtn.disabled = false;
                return;
            }

            const file = selectedFiles[currentFileIndex];
            progress = 0;
            progressText.textContent = `Compression de ${file.name} (${currentFileIndex + 1}/${selectedFiles.length})`;

            const interval = setInterval(() => {
                progress += 2;
                progressBarFill.style.width = `${progress}%`;

                if (progress >= 100) {
                    clearInterval(interval);
                    const originalSize = file.size / (1024 * 1024);
                    const compressedSize = (originalSize * 0.4).toFixed(2);
                    const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);

                    const statsDiv = document.createElement('div');
                    statsDiv.className = 'mb-2 last:mb-0';
                    statsDiv.innerHTML = `
                        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">${file.name}</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                            ${originalSize.toFixed(2)} MB → ${compressedSize} MB (${savings}% de réduction)
                        </p>
                    `;
                    compressionStats.appendChild(statsDiv);

                    currentFileIndex++;
                    setTimeout(processNextFile, 500);
                }
            }, 50);
        };

        compressionStats.innerHTML = '';
        processNextFile();
    });

    // Simulation du téléchargement
    downloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Dans une version réelle, le fichier compressé serait téléchargé ici.');
    });
});