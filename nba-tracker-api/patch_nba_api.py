#!/usr/bin/env python3
"""
Simple patch script to modify nba_api library's http.py file to use proxies.
"""
import os
import sys
import re
from pathlib import Path

def find_nba_api_http_file():
    """Find the http.py file in the installed nba_api package."""
    import nba_api
    nba_api_path = Path(nba_api.__file__).parent
    http_file = nba_api_path / "library" / "http.py"
    
    if not http_file.exists():
        raise FileNotFoundError(f"Could not find nba_api/library/http.py at {http_file}")
    
    return http_file

def patch_http_file(http_file_path: Path, proxy_list: list):
    """Patch the http.py file to add proxy support."""
    print(f"Patching {http_file_path}...")
    
    with open(http_file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Create PROXY_LIST
    proxy_list_str = "[\n" + "".join(f'    "{proxy}",\n' for proxy in proxy_list) + "]"
    
    # Add import random if not present
    if 'import random' not in content and 'from random import' not in content:
        # Insert after first import
        first_import = re.search(r'^(import|from)\s+', content, re.MULTILINE)
        if first_import:
            insert_pos = content.find('\n', first_import.end())
            content = content[:insert_pos+1] + 'import random\n' + content[insert_pos+1:]
    
    # Add PROXY_LIST after imports (before first class)
    if 'PROXY_LIST =' not in content:
        class_match = re.search(r'^(class\s+\w+)', content, re.MULTILINE)
        if class_match:
            insert_pos = class_match.start()
            content = content[:insert_pos] + f'\nPROXY_LIST = {proxy_list_str}\n\n' + content[insert_pos:]
    
    # Modify proxy logic: find "if proxy is None:" and replace
    proxy_pattern = r'if\s+proxy\s+is\s+None:\s*\n\s*proxy\s*=\s*[^\n]+'
    replacement = '''if proxy is None:
            if PROXY_LIST:
                proxy = random.choice(PROXY_LIST)'''
    
    if re.search(proxy_pattern, content):
        content = re.sub(proxy_pattern, replacement, content)
    else:
        print("Warning: Could not find proxy pattern to replace")
    
    # Write patched content
    with open(http_file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Successfully patched nba_api http.py file!")

def main():
    """Main function."""
    proxy_env = os.getenv("NBA_API_PROXY", "")
    
    if not proxy_env:
        print("NBA_API_PROXY not set. Skipping patch.")
        return
    
    proxy_list = [p.strip() for p in proxy_env.split(",") if p.strip()]
    
    if not proxy_list:
        print("No valid proxies found. Skipping patch.")
        return
    
    print(f"Patching with {len(proxy_list)} proxy/proxies...")
    
    try:
        http_file = find_nba_api_http_file()
        patch_http_file(http_file, proxy_list)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
