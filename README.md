# **pdfcmprs - PDF Compression Tool**  

A **command-line tool** for compressing **PDF files** while maintaining **reasonable quality** using **Ghostscript**.  

---

## **✨ Features**  

✔️ Multiple compression levels (**low, medium, high**)  
✔️ **Cross-platform** compatibility (**macOS, Linux, Windows**)  
✔️ **Efficient file size reduction** while keeping quality  
✔️ **Verbose mode** for detailed compression information  

---

## **⚙️ Requirements**  

- **Ghostscript** must be installed  

### **Installing Ghostscript**  

#### **🍎 macOS**  
```bash
brew install ghostscript
```  

#### **🐧 Linux**  
**Debian/Ubuntu:**  
```bash
sudo apt-get install ghostscript
```  
**RHEL/CentOS:**  
```bash
sudo yum install ghostscript
```  

#### **🖥️ Windows**  
Download and install Ghostscript from the [official website](https://ghostscript.com/releases/gsdnld.html).  

---

## **📥 Installation**  

1️⃣ Download the **`pdfcmprs`** script.  
2️⃣ Make it executable:  
```bash
chmod +x pdfcmprs
```  
3️⃣ (Optional) Move it to a directory in your **PATH**:  
```bash
sudo mv pdfcmprs /usr/local/bin/
```  

---

## **🚀 Usage**  

```bash
pdfcmprs [OPTIONS] <input.pdf>
```  

### **🛠️ Options**  

- `-h, --help` → Show help message  
- `-l, --level <level>` → Set compression level (**low | medium | high**) [default: **medium**]  
- `-v, --verbose` → Enable **detailed output**  

---

## **🎚️ Compression Levels**  

- **Low** → Maximum compression, best for screen viewing  
- **Medium** → **Balanced** quality & size (**default**)  
- **High** → Optimized for **printing**, least compression  

---

## **📌 Examples**  

🔹 Basic compression with default settings:  
```bash
pdfcmprs document.pdf
```  

🔹 High-quality compression:  
```bash
pdfcmprs --level high document.pdf
```  

🔹 Low-quality compression with **verbose output**:  
```bash
pdfcmprs -v -l low input.pdf
```  

---

## **📂 Output**  

The compressed PDF will be saved as:  
**`<original_name>_compressed.pdf`** in the **same directory**.  

The script will display:  
✔️ Output file path  
✔️ Original file size  
✔️ New file size  
✔️ Size reduction percentage  

---

## **⚠️ Notes**  

- **Ghostscript is required**  
- **Only single-file compression** is supported  
- **Original files remain unchanged**  
- **Compression effectiveness depends on PDF content**  

---

## **📜 License**  

This project is **open source** under the **MIT License**. 🚀