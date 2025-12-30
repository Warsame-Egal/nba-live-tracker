#!/usr/bin/env python3
"""
Patch script to modify nba_api library's http.py file to use proxies.
This script modifies the nba_api library after installation to add proxy support.
"""
import os
import sys
import re
from pathlib import Path

def find_nba_api_http_file():
    """Find the http.py file in the installed nba_api package."""
    # Try to find nba_api installation
    import nba_api
    nba_api_path = Path(nba_api.__file__).parent
    
    # Look for library/http.py
    http_file = nba_api_path / "library" / "http.py"
    
    if not http_file.exists():
        # Try alternative locations
        possible_paths = [
            Path("/usr/local/lib/python3.10/site-packages/nba_api/library/http.py"),
            Path("/usr/lib/python3.10/site-packages/nba_api/library/http.py"),
            Path(f"{sys.prefix}/lib/python{sys.version_info.major}.{sys.version_info.minor}/site-packages/nba_api/library/http.py"),
        ]
        
        for path in possible_paths:
            if path.exists():
                http_file = path
                break
        else:
            raise FileNotFoundError(f"Could not find nba_api/library/http.py. Searched: {nba_api_path}")
    
    return http_file

def patch_http_file(http_file_path: Path, proxy_list: list):
    """Patch the http.py file to add proxy support."""
    print(f"Reading {http_file_path}...")
    
    with open(http_file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Create PROXY_LIST string
    proxy_list_str = "[\n"
    for proxy in proxy_list:
        proxy_list_str += f'    "{proxy}",\n'
    proxy_list_str += "]"
    
    # Check if already patched
    if "PROXY_LIST = [" in content:
        print("File already patched. Updating proxy list...")
        # Update existing PROXY_LIST
        pattern = r'PROXY_LIST = \[.*?\]'
        replacement = f'PROXY_LIST = {proxy_list_str}'
        content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    else:
        print("Patching file with proxy support...")
        
        # Ensure random is imported first
        if 'import random' not in content and 'from random import' not in content:
            # Find the last import statement
            import_lines = []
            lines = content.split('\n')
            last_import_idx = -1
            for i, line in enumerate(lines):
                if line.strip().startswith(('import ', 'from ')):
                    last_import_idx = i
            
            if last_import_idx >= 0:
                lines.insert(last_import_idx + 1, 'import random')
            else:
                # No imports found, add at the beginning
                lines.insert(0, 'import random')
            content = '\n'.join(lines)
        
        # Find where to insert PROXY_LIST (after imports, before class definition)
        # Look for class definition
        class_match = re.search(r'^(class\s+\w+.*?:)', content, re.MULTILINE)
        if class_match:
            insert_pos = class_match.start()
            # Find the line before the class (look for blank line or end of imports)
            lines_before = content[:insert_pos].split('\n')
            # Insert PROXY_LIST before the class
            insert_line = len(lines_before)
            lines_before.append('')
            lines_before.append(f'PROXY_LIST = {proxy_list_str}')
            lines_before.append('')
            content = '\n'.join(lines_before) + '\n' + content[insert_pos:]
        else:
            # Fallback: insert after imports
            import_end = content.find('\n\n')
            if import_end == -1:
                import_end = content.find('\nclass')
            if import_end == -1:
                import_end = len(content) // 2  # Middle of file as last resort
            content = content[:import_end] + f'\n\nPROXY_LIST = {proxy_list_str}\n' + content[import_end:]
        
        # Modify the proxy logic - find where proxy is used in request methods
        # Look for patterns like "if proxy is None:" followed by proxy assignment
        # Pattern 1: if proxy is None: proxy = something
        proxy_pattern1 = r'if\s+proxy\s+is\s+None:\s*\n\s*proxy\s*=\s*[^\n]+'
        replacement1 = '''if proxy is None:
            if PROXY_LIST:
                proxy = random.choice(PROXY_LIST)'''
        
        if re.search(proxy_pattern1, content):
            content = re.sub(proxy_pattern1, replacement1, content)
        else:
            # Pattern 2: Look for proxy assignment in proxies dict creation
            # Find where proxies dict is created: proxies = {"http": proxy, "https": proxy}
            proxies_pattern = r'proxies\s*=\s*\{[^}]*"http"[^}]*"https"[^}]*\}'
            proxies_match = re.search(proxies_pattern, content)
            
            if proxies_match:
                # Insert proxy selection before proxies dict
                before_proxies = content[:proxies_match.start()]
                after_proxies = content[proxies_match.end():]
                
                # Check if there's already proxy handling
                if 'if proxy is None' not in before_proxies[-500:]:  # Check last 500 chars
                    proxy_selection = '''
        if proxy is None:
            if PROXY_LIST:
                proxy = random.choice(PROXY_LIST)
'''
                    content = before_proxies + proxy_selection + content[proxies_match.start():]
    
    # Write the patched content
    print(f"Writing patched content to {http_file_path}...")
    # Create backup first
    backup_path = http_file_path.with_suffix('.py.bak')
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(open(http_file_path, 'r', encoding='utf-8').read())
    print(f"   Created backup: {backup_path}")
    
    with open(http_file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Successfully patched nba_api http.py file!")

def main():
    """Main function."""
    # Get proxy list from environment variable
    proxy_env = os.getenv("NBA_API_PROXY", "")
    
    if not proxy_env:
        print("⚠️  NBA_API_PROXY environment variable not set. Skipping patch.")
        print("   Set NBA_API_PROXY to a comma-separated list of proxies to enable patching.")
        return
    
    # Parse proxy list
    proxy_list = [p.strip() for p in proxy_env.split(",") if p.strip()]
    
    if not proxy_list:
        print("⚠️  No valid proxies found in NBA_API_PROXY. Skipping patch.")
        return
    
    print(f"📝 Patching nba_api with {len(proxy_list)} proxy/proxies...")
    print(f"   Proxies: {', '.join(proxy_list)}")
    
    try:
        http_file = find_nba_api_http_file()
        print(f"✅ Found nba_api http.py at: {http_file}")
        
        patch_http_file(http_file, proxy_list)
        
    except Exception as e:
        print(f"❌ Error patching nba_api: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

