#!/usr/bin/env python3
import os
import glob

research_papers_dir = 'packages/world/src/research-papers'
files = glob.glob(f'{research_papers_dir}/*.ts')

fixed_count = 0

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    # Replace smart quotes
    content = content.replace('\u2018', "'")  # Left single quote
    content = content.replace('\u2019', "'")  # Right single quote
    content = content.replace('\u201C', '"')  # Left double quote
    content = content.replace('\u201D', '"')  # Right double quote

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        fixed_count += 1
        print(f'Fixed: {os.path.basename(filepath)}')

print(f'\nFixed {fixed_count} files')
