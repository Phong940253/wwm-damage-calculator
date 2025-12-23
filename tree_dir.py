import os
from pathlib import Path

# ===== CONFIG =====
ROOT_DIR = Path(".")               # thư mục gốc
IGNORE_DIRS = {
    "node_modules",
    ".next",
    ".git",
    "dist",
    "build",
    ".codesandbox",
    ".devcontainer"
}
# ==================

def print_tree(root: Path, prefix: str = ""):
    try:
        entries = sorted(root.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
    except PermissionError:
        return

    for index, path in enumerate(entries):
        if path.name in IGNORE_DIRS:
            continue

        is_last = index == len(entries) - 1
        connector = "└── " if is_last else "├── "
        print(prefix + connector + path.name)

        if path.is_dir():
            extension = "    " if is_last else "│   "
            print_tree(path, prefix + extension)

if __name__ == "__main__":
    print(root := ROOT_DIR)
    print_tree(root)
