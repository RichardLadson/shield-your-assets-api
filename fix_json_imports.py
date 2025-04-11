import os
import re

# Configuration
target_filename = 'medicaid_rules_2025.json'
correct_path = 'src/data/medicaid_rules_2025.json'  # where your JSON file is now
project_root = '.'  # change this if running outside root

def calculate_relative_path(from_file, to_file):
    from_dir = os.path.dirname(os.path.abspath(from_file))
    to_abs = os.path.abspath(to_file)
    relative_path = os.path.relpath(to_abs, start=from_dir)
    return relative_path.replace('\\', '/')

def update_file(file_path, correct_json_path):
    with open(file_path, 'r') as f:
        content = f.read()

    pattern = re.compile(
        r"""require\((['"])([^'"]*?)""" + re.escape(target_filename) + r"""(['"])\)"""
    )

    matches = list(pattern.finditer(content))
    if matches:
        new_content = content
        for match in matches:
            old_path = match.group(2)
            new_rel_path = calculate_relative_path(file_path, correct_json_path)
            full_match = match.group(0)
            replacement = f"require('{new_rel_path}')"
            new_content = new_content.replace(full_match, replacement)
            print(f"✔ Updated in: {file_path}\n    ↪ {full_match} → {replacement}")

        with open(file_path, 'w') as f:
            f.write(new_content)
    else:
        print(f"— No match in: {file_path}")

def scan_and_update_files(base_dir, correct_json_path):
    print(f"\n📁 Scanning directory: {os.path.abspath(base_dir)}\n")
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith('.js') or file.endswith('.ts'):
                full_path = os.path.join(root, file)
                update_file(full_path, correct_json_path)

if __name__ == '__main__':
    full_json_path = os.path.abspath(os.path.join(project_root, correct_path))
    scan_and_update_files(project_root, full_json_path)
    print("\n✅ JSON import path check complete.")
