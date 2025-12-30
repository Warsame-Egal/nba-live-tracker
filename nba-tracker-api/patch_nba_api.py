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
    
    # Add PROXY_LIST after imports (before first class)
    if 'PROXY_LIST =' not in content:
        class_match = re.search(r'^(class\s+\w+)', content, re.MULTILINE)
        if class_match:
            insert_pos = class_match.start()
            content = content[:insert_pos] + f'\nPROXY_LIST = {proxy_list_str}\n\n' + content[insert_pos:]
    
    # Patch the proxy logic: replace "if proxy is None: request_proxy = PROXY"
    # Try flexible whitespace matching
    pattern = r'(if\s+proxy\s+is\s+None:\s*\n\s+request_proxy\s*=\s*PROXY)'
    replacement = '''if proxy is None:
            if PROXY_LIST:
                request_proxy = random.choice(PROXY_LIST)
            else:
                request_proxy = PROXY'''
    
    if re.search(pattern, content):
        content = re.sub(pattern, replacement, content)
        print("   Successfully patched proxy logic")
    else:
        # Try line-by-line approach as fallback
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'if proxy is None:' in line and i + 1 < len(lines):
                if 'request_proxy = PROXY' in lines[i + 1]:
                    # Get indentation from the if line
                    indent = len(line) - len(line.lstrip())
                    # Replace the next line with our logic
                    lines[i + 1] = ' ' * (indent + 4) + 'if PROXY_LIST:'
                    lines.insert(i + 2, ' ' * (indent + 8) + 'request_proxy = random.choice(PROXY_LIST)')
                    lines.insert(i + 3, ' ' * (indent + 4) + 'else:')
                    lines.insert(i + 4, ' ' * (indent + 8) + 'request_proxy = PROXY')
                    content = '\n'.join(lines)
                    print("   Successfully patched proxy logic (line-by-line method)")
                    break
        else:
            print("Error: Could not find proxy pattern to patch")
            sys.exit(1)
    
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
