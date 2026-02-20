import re

path = "/Users/warlet/realmagents/frontend/index.html"
with open(path, "r") as f:
    html = f.read()

# Remove ALL existing injected scripts (everything between last <script> before </body> and </body>)
# Find the last script block before </body>
pattern = r'<script>\s*(?:/\*.*?)?(?:function go|var attempts|[\s\S]*?MutationObserver)[\s\S]*?</script>\s*</body>'
match = re.search(pattern, html)
if match:
    html = html[:match.start()] + """<script>
/* RealmAgents Nav Injection v4 */
(function(){
  var done = {};
  function go(){
    // Add DAO + Agents links to nav
    var navLinks = document.querySelectorAll('nav a, header a, [class*="nav"] a');
    var nav = null;
    for(var i=0;i<navLinks.length;i++){
      var t = navLinks[i].textContent.trim();
      if(t==='Stake'||t==='Explore'||t==='Governance'){
        nav = navLinks[i].parentElement;
        break;
      }
    }
    if(nav && !done.nav){
      done.nav = true;
      var cls = nav.children[0] ? nav.children[0].className : '';
      var d = document.createElement('a');
      d.href='https://realmdao.com'; d.target='_blank'; d.textContent='DAO'; d.className=cls;
      nav.appendChild(d);
      var a = document.createElement('a');
      a.href='/agents.html'; a.textContent='Agents'; a.className=cls;
      a.style.cssText='background:linear-gradient(135deg,#8060f0,#40c080);color:#fff;padding:6px 16px;border-radius:8px;font-weight:700;font-size:13px;';
      nav.appendChild(a);
    }

    // Replace large SVG logos with DAO logo (28px)
    if(!done.logo){
      var svgs = document.querySelectorAll('svg');
      svgs.forEach(function(svg){
        if(svg.closest('button')) return;
        var rect = svg.getBoundingClientRect();
        if(rect.width > 30 && rect.width < 250 && rect.height > 30){
          var img = document.createElement('img');
          img.src='https://realmdao.com/logo.svg';
          img.style.cssText='width:28px;height:28px;border-radius:6px;';
          img.alt='R';
          if(svg.parentElement){
            svg.parentElement.insertBefore(img, svg);
            svg.remove();
            done.logo = true;
          }
        }
      });
    }

    // Add agents banner in explore/launch section
    if(!done.banner){
      var headings = document.querySelectorAll('h2, h3');
      headings.forEach(function(h){
        var t = h.textContent||'';
        if((t.includes('Explore')||t.includes('Launch')||t.includes('Agent')) && !done.banner){
          var b = document.createElement('a');
          b.href='/agents.html';
          b.style.cssText='display:block;margin:16px auto;max-width:600px;padding:14px 24px;background:linear-gradient(135deg,rgba(128,96,240,0.12),rgba(64,192,128,0.12));border:1px solid rgba(128,96,240,0.25);border-radius:12px;text-align:center;text-decoration:none;color:#e0e0e0;font-size:14px;';
          b.innerHTML='<span style="color:#40c080;font-weight:700;">Live AI Agents Dashboard</span> \u2014 View real-time yield, sentiment & whale data \u2192';
          h.parentElement.insertBefore(b, h.nextSibling);
          done.banner = true;
        }
      });
    }
  }
  new MutationObserver(function(){go()}).observe(document.body||document.documentElement,{childList:true,subtree:true});
  setInterval(go,1000);
  setTimeout(go,500);
})();
</script>
</body>""" + html[match.end():]
    print("[OK] Replaced old injection script with v4 (logo 28px)")
else:
    print("[WARN] Could not find old script pattern, trying alternate approach")
    # Just replace before </body>
    new_script = """<script>
/* RealmAgents Nav Injection v4 */
(function(){
  var done = {};
  function go(){
    var navLinks = document.querySelectorAll('nav a, header a, [class*="nav"] a');
    var nav = null;
    for(var i=0;i<navLinks.length;i++){
      var t = navLinks[i].textContent.trim();
      if(t==='Stake'||t==='Explore'||t==='Governance'){nav=navLinks[i].parentElement;break;}
    }
    if(nav && !done.nav){
      done.nav=true;
      var cls=nav.children[0]?nav.children[0].className:'';
      var d=document.createElement('a');d.href='https://realmdao.com';d.target='_blank';d.textContent='DAO';d.className=cls;nav.appendChild(d);
      var a=document.createElement('a');a.href='/agents.html';a.textContent='Agents';a.className=cls;
      a.style.cssText='background:linear-gradient(135deg,#8060f0,#40c080);color:#fff;padding:6px 16px;border-radius:8px;font-weight:700;font-size:13px;';
      nav.appendChild(a);
    }
    if(!done.logo){
      document.querySelectorAll('svg').forEach(function(svg){
        if(svg.closest('button'))return;
        var r=svg.getBoundingClientRect();
        if(r.width>30&&r.width<250&&r.height>30){
          var img=document.createElement('img');img.src='https://realmdao.com/logo.svg';
          img.style.cssText='width:28px;height:28px;border-radius:6px;';img.alt='R';
          if(svg.parentElement){svg.parentElement.insertBefore(img,svg);svg.remove();done.logo=true;}
        }
      });
    }
  }
  new MutationObserver(function(){go()}).observe(document.body||document.documentElement,{childList:true,subtree:true});
  setInterval(go,1000);setTimeout(go,500);
})();
</script>"""
    html = html.replace('</body>', new_script + '\n</body>')
    print("[OK] Added injection script v4 before </body>")

with open(path, "w") as f:
    f.write(html)
print("[OK] Saved index.html")
print("Now run: cd ~/realmagents/frontend && npm run build && npx wrangler pages deploy dist")
