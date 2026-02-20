import re

f = open('src/App.jsx', 'r')
code = f.read()
f.close()

changes = 0

# 1. Add "Agents" nav link after Explore in the navbar
# Find the Explore nav button and add Agents Dashboard link after Stake
old_nav = 'onClick={() => setActive("stake")}>Stake</button>'
new_nav = '''onClick={() => setActive("stake")}>Stake</button>
              <a href="/agents.html" style={{color:"#a080ff",fontWeight:600,fontSize:"0.95rem",textDecoration:"none",padding:"8px 16px",borderRadius:"8px",background:"rgba(128,96,240,0.12)",border:"1px solid rgba(128,96,240,0.3)",transition:"all 0.2s"}}>Agents Dashboard</a>'''
if old_nav in code:
    code = code.replace(old_nav, new_nav, 1)
    changes += 1
    print("1. Added Agents Dashboard nav link")
else:
    print("1. SKIP: nav pattern not found, trying alternative...")
    # Try alternative pattern
    old_nav2 = "Stake</button>"
    if old_nav2 in code:
        idx = code.index(old_nav2) + len(old_nav2)
        insert = '\n              <a href="/agents.html" style={{color:"#a080ff",fontWeight:600,fontSize:"0.95rem",textDecoration:"none",padding:"8px 16px",borderRadius:"8px",background:"rgba(128,96,240,0.12)",border:"1px solid rgba(128,96,240,0.3)"}}>Agents Dashboard</a>'
        code = code[:idx] + insert + code[idx:]
        changes += 1
        print("1. Added Agents Dashboard nav link (alt pattern)")

# 2. Make "Explore Agents" hero button link to /agents.html
old_explore_btn = 'Explore Agents</button>'
new_explore_btn = 'Explore Agents</a>'
if old_explore_btn in code:
    # Find the button and its opening tag
    btn_idx = code.index(old_explore_btn)
    # Search backwards for the button opening tag
    search_start = max(0, btn_idx - 500)
    chunk = code[search_start:btn_idx]
    # Find the last <button before Explore Agents
    last_btn = chunk.rfind('<button')
    if last_btn >= 0:
        abs_btn_start = search_start + last_btn
        old_full = code[abs_btn_start:btn_idx + len(old_explore_btn)]
        new_full = '<a href="/agents.html" style={{display:"inline-block",padding:"14px 32px",background:"transparent",border:"2px solid rgba(128,96,240,0.5)",borderRadius:"12px",color:"#e0e0e0",fontSize:"1rem",fontWeight:600,cursor:"pointer",textDecoration:"none",transition:"all 0.3s"}}>Explore Agents</a>'
        code = code.replace(old_full, new_full, 1)
        changes += 1
        print("2. Changed Explore Agents button to link to /agents.html")
else:
    print("2. SKIP: Explore Agents button not found")

# 3. Add a prominent "View Live Dashboard" section in ExploreSection when empty
# Find the ExploreSection or the "No agents registered yet" / empty state
# Add a card linking to /agents.html in the explore area
old_explore_empty = 'No agents registered yet'
if old_explore_empty in code:
    code = code.replace(old_explore_empty, 'No agents registered on-chain yet. View our live AI agents on the dashboard')
    changes += 1
    print("3. Updated empty state text")

# Also try to add a link in the explore section
old_no_agents = 'No agents found'
if old_no_agents in code:
    code = code.replace(old_no_agents, 'No agents found on-chain yet')
    changes += 1

# 4. Add a "View Live Agents Dashboard" button/banner in the Explore section
# Find ExploreSection function
explore_match = re.search(r'(function ExploreSection|const ExploreSection)', code)
if explore_match:
    # Find the return statement inside ExploreSection
    ret_idx = code.index('return', explore_match.start())
    # Find the opening ( after return
    paren_idx = code.index('(', ret_idx)
    # Find first > after the opening div
    first_div_close = code.index('>', paren_idx + 1)
    # Insert a live dashboard banner after the first child
    banner = '''
        <div style={{marginBottom:"32px",padding:"20px 24px",background:"linear-gradient(135deg, rgba(128,96,240,0.15), rgba(64,192,128,0.1))",border:"1px solid rgba(128,96,240,0.3)",borderRadius:"16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"16px"}}>
          <div>
            <div style={{fontSize:"1.1rem",fontWeight:700,color:"#fff",marginBottom:"4px"}}>Live AI Agents Dashboard</div>
            <div style={{fontSize:"0.85rem",color:"#999"}}>3 agents running: Yield Optimizer, Sentiment Analyzer, Whale Tracker — with real-time data</div>
          </div>
          <a href="/agents.html" style={{display:"inline-flex",alignItems:"center",gap:"8px",padding:"10px 24px",background:"linear-gradient(135deg,#8060f0,#40c080)",borderRadius:"10px",color:"#fff",fontWeight:600,fontSize:"0.9rem",textDecoration:"none",transition:"transform 0.2s",boxShadow:"0 4px 15px rgba(128,96,240,0.3)"}}>View Dashboard →</a>
        </div>'''
    
    # Find the section title "Explore Agents" and insert banner after
    explore_title_idx = code.find('Explore Agents', explore_match.start())
    if explore_title_idx > 0:
        # Find the closing tag of the title element
        close_after_title = code.index('>', explore_title_idx)
        # Find the next closing tag pair
        next_close = code.index('</', close_after_title)
        end_of_title_tag = code.index('>', next_close) + 1
        code = code[:end_of_title_tag] + banner + code[end_of_title_tag:]
        changes += 1
        print("4. Added Live Dashboard banner in Explore section")
    else:
        print("4. SKIP: Could not find Explore Agents title")
else:
    print("4. SKIP: ExploreSection not found")

f = open('src/App.jsx', 'w')
f.write(code)
f.close()

print(f"\nTotal changes: {changes}")
if changes > 0:
    print("App.jsx updated! Run: npm run build && wrangler pages deploy dist --project-name=realmagents")
else:
    print("WARNING: No changes made - check App.jsx structure")
