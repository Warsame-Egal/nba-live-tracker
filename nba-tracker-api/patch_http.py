#!/usr/bin/env python3
"""
Patches nba_api/library/http.py for custom configuration.
"""
import os
import sys
import re
from pathlib import Path

def find_nba_api_http_file():
    """Locate nba_api's http.py file."""
    import nba_api
    nba_api_path = Path(nba_api.__file__).parent
    http_file = nba_api_path / "library" / "http.py"
    
    if not http_file.exists():
        raise FileNotFoundError(f"Could not find nba_api/library/http.py at {http_file}")
    
    return http_file

def patch_http_file(http_file_path: Path, proxy_list: list):
    """Modify http.py for custom configuration."""
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
    
    # Try to patch the proxy logic - use first method that works
    patched = False
    
    # Method 1: Regex pattern match
    pattern1 = r'(if\s+proxy\s+is\s+None:\s*\n\s+request_proxy\s*=\s*PROXY)'
    replacement1 = '''if proxy is None:
            if PROXY_LIST:
                request_proxy = random.choice(PROXY_LIST)
            else:
                request_proxy = PROXY'''
    
    if re.search(pattern1, content):
        content = re.sub(pattern1, replacement1, content)
        patched = True
        print("   Patched proxy logic")
    
    # Method 2: Line-by-line parsing
    if not patched:
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'if proxy is None:' in line and i + 1 < len(lines):
                if 'request_proxy = PROXY' in lines[i + 1]:
                    indent = len(line) - len(line.lstrip())
                    lines[i + 1] = ' ' * (indent + 4) + 'if PROXY_LIST:'
                    lines.insert(i + 2, ' ' * (indent + 8) + 'request_proxy = random.choice(PROXY_LIST)')
                    lines.insert(i + 3, ' ' * indent + 'else:')
                    lines.insert(i + 4, ' ' * (indent + 8) + 'request_proxy = PROXY')
                    content = '\n'.join(lines)
                    patched = True
                    print("   Patched proxy logic")
                    break
    
    # Method 3: Fallback - inject before proxies dict
    if not patched:
        proxies_pattern = r'proxies\s*=\s*\{[^}]*"http"[^}]*"https"[^}]*\}'
        proxies_match = re.search(proxies_pattern, content)
        
        if proxies_match:
            before_proxies = content[:proxies_match.start()]
            # Check if there's already proxy handling
            if 'if proxy is None' not in before_proxies[-500:]:
                proxy_selection = '''
        if proxy is None:
            if PROXY_LIST:
                request_proxy = random.choice(PROXY_LIST)
            else:
                request_proxy = PROXY
        elif not proxy:
            request_proxy = None
        else:
            request_proxy = proxy
'''
                content = before_proxies + proxy_selection + content[proxies_match.start():]
                patched = True
                print("   Patched proxy logic")
    
    if not patched:
        print("Failed: Could not find proxy pattern")
        sys.exit(1)
    
    # Write patched content
    with open(http_file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Patch complete")

def main():
    """Main function."""
    proxy_env = os.getenv("NBA_API_PROXY", "")
    
    if not proxy_env:
        print("NBA_API_PROXY not set. Skipping patch.")
        return
    
    proxy_list = [p.strip() for p in proxy_env.split(",") if p.strip()]
    
    if not proxy_list:
        print("No configuration found. Skipping patch.")
        return
    
    print(f"Applying configuration...")
    
    try:
        http_file = find_nba_api_http_file()
        patch_http_file(http_file, proxy_list)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
