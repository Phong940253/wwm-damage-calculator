import argparse
from pathlib import Path
import pyperclip

# ===== DEFAULT CONFIG =====
DEFAULT_EXTENSIONS = {".ts", ".tsx"}
DEFAULT_IGNORE_DIRS = {"node_modules", ".next", ".git", "dist", "build", ".codesandbox", ".devcontainer"}
# ==========================


def should_ignore(path: Path, ignore_dirs: set) -> bool:
    return any(part in ignore_dirs for part in path.parts)


def collect_ts_files(root: Path, extensions: set, ignore_dirs: set):
    files = []

    for ext in extensions:
        for p in root.glob(f"**/*{ext}"):
            if p.is_file() and not should_ignore(p, ignore_dirs):
                files.append(p)

    return sorted(files)



def merge_to_string(files, root: Path) -> str:
    parts = []

    for file in files:
        try:
            relative_path = file.relative_to(root)
            header = relative_path.as_posix()
        except ValueError:
            header = file.as_posix()

        parts.append(f"// {header}")

        try:
            content = file.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            content = file.read_text(encoding="utf-8", errors="ignore")

        parts.append(content.rstrip())
        parts.append("")  # newline

    return "\n".join(parts)


def main():
    parser = argparse.ArgumentParser(
        description="Merge TS/TSX files and copy result to clipboard"
    )

    parser.add_argument(
        "path",
        nargs="?",
        default=".",
        help="Root directory to scan (ignored if --files is used)",
    )

    parser.add_argument(
        "--files",
        nargs="*",
        help="Specific files to merge",
    )

    parser.add_argument(
        "--ignore",
        nargs="*",
        default=list(DEFAULT_IGNORE_DIRS),
        help="Folders to ignore",
    )

    parser.add_argument(
        "--ext",
        nargs="*",
        default=list(DEFAULT_EXTENSIONS),
        help="File extensions to include",
    )

    args = parser.parse_args()

    ignore_dirs = set(args.ignore)
    print("Ignoring directories:", ignore_dirs)
    extensions = set(args.ext)

    # ===== MODE: SPECIFIC FILES =====
    if args.files:
        files = []
        for f in args.files:
            p = Path(f).resolve()
            if not p.exists():
                raise FileNotFoundError(f"File not found: {p}")
            if p.suffix not in extensions:
                raise ValueError(f"Invalid extension: {p}")
            files.append(p)

        root_dir = Path(".").resolve()
        print("Mode: specific files")

    # ===== MODE: SCAN FOLDER =====
    else:
        root_dir = Path(args.path).resolve()
        print(f"Scanning folder: {root_dir}")
        if not root_dir.exists():
            raise FileNotFoundError(f"Path not found: {root_dir}")

        files = collect_ts_files(root_dir, extensions, ignore_dirs)
        print("Mode: scan folder")

    result = merge_to_string(files, root_dir)

    # 👉 COPY TO CLIPBOARD
    pyperclip.copy(result)

    print(f"✅ Copied {len(files)} files to clipboard")
    print(f"📋 Clipboard size: {len(result)} characters")


if __name__ == "__main__":
    main()
