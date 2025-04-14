// Importation de pdf-lib
const script = document.createElement('script');
script.src = 'https://unpkg.com/pdf-lib@1.17.1';
document.head.appendChild(script);

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
    let compressedPdfBytes = null;

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

    // Compression réelle du PDF
    async function compressPDF(file) {
        try {
            // Validation du fichier
            if (!file || !(file instanceof File)) {
                throw new Error('Fichier PDF invalide');
            }

            if (file.size === 0) {
                throw new Error('Le fichier PDF est vide');
            }

            // Lecture du fichier
            const arrayBuffer = await file.arrayBuffer().catch(() => {
                throw new Error('Impossible de lire le fichier PDF');
            });

            // Chargement du PDF avec options de compression
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, {
                updateMetadata: false,
                ignoreEncryption: true
            }).catch(() => {
                throw new Error('Le fichier PDF est corrompu ou invalide');
            });
            
            // Supprimer les métadonnées inutiles
            pdfDoc.setTitle('');
            pdfDoc.setAuthor('');
            pdfDoc.setSubject('');
            pdfDoc.setKeywords([]);
            pdfDoc.setProducer('PDFcmprs');
            pdfDoc.setCreator('PDFcmprs');
            
            // Compression des images dans le PDF
            const pages = pdfDoc.getPages();
            if (pages.length === 0) {
                throw new Error('Le PDF ne contient aucune page');
            }

            let processedPages = 0;
            
            for (const page of pages) {
                try {
                    const { width, height } = page.getSize();
                    const images = await page.getImages();
                    
                    for (const image of images) {
                        try {
                            const imageData = await image.getData();
                            
                            // Créer un blob et une URL pour l'image
                            const blob = new Blob([imageData]);
                            const imageUrl = URL.createObjectURL(blob);
                            
                            // Créer un canvas pour la compression
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            
                            // Charger l'image dans un élément Image
                            const imgElement = new Image();
                            await new Promise((resolve, reject) => {
                                imgElement.onload = resolve;
                                imgElement.onerror = reject;
                                imgElement.src = imageUrl;
                            });
                            
                            // Définir les dimensions réduites plus agressivement
                            const scale = 0.3; // Réduire de 70%
                            const maxDimension = 1200; // Dimension maximale
                            let newWidth = imgElement.width * scale;
                            let newHeight = imgElement.height * scale;
                            
                            // Appliquer une limite maximale aux dimensions
                            if (newWidth > maxDimension || newHeight > maxDimension) {
                                const ratio = Math.min(maxDimension / newWidth, maxDimension / newHeight);
                                newWidth *= ratio;
                                newHeight *= ratio;
                            }
                            
                            canvas.width = newWidth;
                            canvas.height = newHeight;
                            
                            // Appliquer un lissage pour une meilleure qualité
                            ctx.imageSmoothingEnabled = true;
                            ctx.imageSmoothingQuality = 'high';
                            
                            // Dessiner l'image redimensionnée
                            ctx.drawImage(imgElement, 0, 0, newWidth, newHeight);
                            
                            // Obtenir les données compressées avec une qualité plus basse
                            const compressedData = canvas.toDataURL('image/jpeg', 0.3);
                            const base64Data = compressedData.split(',')[1];
                            const compressedImageData = new Uint8Array(atob(base64Data).split('').map(c => c.charCodeAt(0)));
                            
                            // Nettoyer
                            URL.revokeObjectURL(imageUrl);
                            
                            // Embarquer l'image compressée dans le PDF
                            const compressedImg = await pdfDoc.embedJpg(compressedImageData);
                            page.drawImage(compressedImg, {
                                x: 0,
                                y: 0,
                                width: width * 0.8,
                                height: height * 0.8,
                                opacity: 1
                            });
                        } catch (imageError) {
                            console.warn(`Erreur lors du traitement d'une image: ${imageError.message}`);
                            continue; // Continuer avec les autres images
                        }
                    }
                    
                    processedPages++;
                    const progress = (processedPages / pages.length) * 100;
                    progressBarFill.style.width = `${progress}%`;
                } catch (pageError) {
                    console.warn(`Erreur lors du traitement de la page ${processedPages + 1}: ${pageError.message}`);
                    continue; // Continuer avec les autres pages
                }
            }
            
            // Sauvegarder le PDF avec compression maximale
            const compressedPdfBytesTemp = await pdfDoc.save({
                useObjectStreams: true,
                addDefaultPage: false,
                useCompression: true
            }).catch(() => {
                throw new Error('Impossible de sauvegarder le PDF compressé');
            });
            return compressedPdfBytesTemp;
        } catch (error) {
            throw new Error(`Erreur de compression: ${error.message}`);
        }
    }

    compressBtn.addEventListener('click', async () => {
        try {
            progressBar.classList.remove('hidden');
            compressBtn.disabled = true;
            result.classList.add('hidden');
            compressionStats.innerHTML = '';

            for (const file of selectedFiles) {
                progressText.textContent = `Compression de ${file.name}`;
                
                const originalSize = file.size / (1024 * 1024);
                compressedPdfBytes = await compressPDF(file);
                const compressedSize = compressedPdfBytes.length / (1024 * 1024);
                const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);

                const statsDiv = document.createElement('div');
                statsDiv.className = 'mb-2 last:mb-0';
                statsDiv.innerHTML = `
                    <p class="text-sm font-medium text-gray-700 dark:text-gray-300">${file.name}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        ${originalSize.toFixed(2)} MB → ${compressedSize.toFixed(2)} MB (${savings}% de réduction)
                    </p>
                `;
                compressionStats.appendChild(statsDiv);
            }

            progressBar.classList.add('hidden');
            result.classList.remove('hidden');
            compressBtn.disabled = false;
        } catch (error) {
            console.error('Erreur lors de la compression:', error);
            const errorMessage = error.message || 'Une erreur inattendue est survenue';
            alert(`Erreur lors de la compression du PDF: ${errorMessage}`);
            progressBar.classList.add('hidden');
            progressBarFill.style.width = '0%';
            compressBtn.disabled = false;
            result.classList.add('hidden');
        }
    });

    // Téléchargement du PDF compressé
    downloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        if (!compressedPdfBytes) {
            alert('Veuillez d\'abord compresser un fichier PDF.');
            return;
        }
        
        // Créer un blob avec le PDF compressé
        const blob = new Blob([compressedPdfBytes], { type: 'application/pdf' });
        
        // Créer un lien de téléchargement temporaire
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = selectedFiles[0].name.replace('.pdf', '_compresse.pdf');
        
        // Déclencher le téléchargement
        document.body.appendChild(link);
        link.click();
        
        // Nettoyer
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });
});