import os

def print_tree(startpath, max_depth=6, output_file='structure.txt'):
    with open(output_file, 'w') as f:
        for root, dirs, files in os.walk(startpath):
            depth = root[len(startpath):].count(os.sep)
            if depth < max_depth:
                indent = '│   ' * depth + '├── '
                f.write(f"{indent}{os.path.basename(root)}/\n")
                subindent = '│   ' * (depth + 1)
                for file in files:
                    f.write(f"{subindent}{file}\n")
            else:
                # Don't descend further
                dirs[:] = []

if __name__ == "__main__":
    base_path = "."  # You can change this to your project directory
    print_tree(base_path)
