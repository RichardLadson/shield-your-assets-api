import os

def save_structure(startpath, output_file):
    with open(output_file, "w") as f:
        for root, dirs, files in os.walk(startpath):
            level = root.replace(startpath, '').count(os.sep)
            indent = ' ' * 4 * level
            f.write(f"{indent}{os.path.basename(root)}/\n")
            subindent = ' ' * 4 * (level + 1)
            for file in files:
                f.write(f"{subindent}{file}\n")

# Save to file_structure.txt from current directory
save_structure(".", "file_structure.txt")
