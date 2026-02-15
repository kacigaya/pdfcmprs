# pdfcmprs

A command-line tool for compressing PDF files while maintaining reasonable quality using Ghostscript.

## Features

- Multiple compression levels (low, medium, high)
- Cross-platform compatibility (macOS, Linux, Windows)
- Efficient file size reduction while keeping quality
- Verbose mode for detailed compression information

## Requirements

- [Ghostscript](https://ghostscript.com/) must be installed

### Installing Ghostscript

#### macOS

```bash
brew install ghostscript
```

#### Linux

Debian/Ubuntu:

```bash
sudo apt-get install ghostscript
```

RHEL/CentOS:

```bash
sudo yum install ghostscript
```

#### Windows

Download and install Ghostscript from the [official website](https://ghostscript.com/releases/gsdnld.html).

## Installation

1. Download the `pdfcmprs` script.
2. Make it executable:

```bash
chmod +x pdfcmprs
```

3. (Optional) Move it to a directory in your `PATH`:

```bash
sudo mv pdfcmprs /usr/local/bin/
```

## Usage

```bash
pdfcmprs [OPTIONS] <input.pdf>
```

### Options

| Option | Description |
|---|---|
| `-h`, `--help` | Show help message |
| `-l`, `--level <level>` | Set compression level: `low`, `medium`, or `high` (default: `medium`) |
| `-v`, `--verbose` | Enable detailed output |

## Compression Levels

| Level | Ghostscript Setting | Description |
|---|---|---|
| `low` | `/screen` | Maximum compression, best for screen viewing |
| `medium` | `/ebook` | Balanced quality and size (default) |
| `high` | `/printer` | Optimized for printing, least compression |

## Examples

Basic compression with default settings:

```bash
pdfcmprs document.pdf
```

High-quality compression:

```bash
pdfcmprs --level high document.pdf
```

Low compression with verbose output:

```bash
pdfcmprs -v -l low input.pdf
```

## Output

The compressed PDF is saved as `<original_name>_compressed.pdf` in the same directory.

The script displays:

- Output file path
- Original file size
- New file size
- Size reduction percentage

## Notes

- Ghostscript is required
- Only single-file compression is supported
- Original files remain unchanged
- Compression effectiveness depends on PDF content

## License

This project is open source under the MIT License.
