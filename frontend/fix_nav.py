f = open('index.html','r')
html = f.read()
f.close()

# Remove ALL old injected scripts
while True:
    idx = html.find('<script>\n(function')
    if idx < 0:
        idx = html.find('<script>\n// Inject')
    if idx < 0:
        break
    end = html.find('</script>', idx) + len('</script>')
    html = html[:idx] + html[end:]
    print('Removed old script')

script = """<script>
(function(){
  var done={};
  function go(){
    if(!done.nav){
      var nav=document.querySelector('nav');
      if(nav){
        // Add DAO link
        if(!nav.querySelector('.dao-lnk')){
          var d=document.createElement('a');d.href='https://realmdao.com';d.target='_blank';d.className='dao-lnk';d.textContent='DAO';
          d.style.cssText='color:#aaa;font-size:0.95rem;text-decoration:none;margin-left:8px;font-weight:500';
          var first=nav.querySelector('button:not([class*="bg-"])');
          if(first)first.parentNode.insertBefore(d,first);
        }
        // Add Agents link
        if(!nav.querySelector('.agl')){
          var a=document.createElement('a');a.href='/agents.html';a.className='agl';a.textContent='Agents';
          a.style.cssText='color:#a080ff;font-weight:600;font-size:0.95rem;text-decoration:none;padding:8px 14px;border-radius:8px;background:rgba(128,96,240,0.12);border:1px solid rgba(128,96,240,0.3);margin-left:8px';
          var w=nav.querySelector('button');
          if(w&&w.parentNode)w.parentNode.insertBefore(a,w);
        }
        // Replace logo with DAO logo
        var svgs=nav.querySelectorAll('svg');
        svgs.forEach(function(s){
          if(s.closest('a')&&!s.dataset.replaced){
            var img=document.createElement('img');
            img.src='https://realmdao.com/logo.svg';
            img.style.cssText='width:32px;height:32px;border-radius:50%';
            s.parentNode.replaceChild(img,s);
            done.nav=true;
          }
        });
      }
    }
    if(!done.ban){
      var hh=document.querySelectorAll('h2');
      for(var i=0;i<hh.length;i++){
        if(hh[i].textContent.indexOf('Explore')>=0&&!document.querySelector('.agb')){
          var d2=document.createElement('div');d2.className='agb';
          d2.style.cssText='margin:24px auto;max-width:900px;padding:20px 24px;background:linear-gradient(135deg,rgba(128,96,240,0.15),rgba(64,192,128,0.1));border:1px solid rgba(128,96,240,0.3);border-radius:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px';
          d2.innerHTML='<div><div style="font-size:1.1rem;font-weight:700;color:#fff;margin-bottom:4px">Live AI Agents Dashboard</div><div style="font-size:0.85rem;color:#999">3 agents active: Yield Optimizer, Sentiment Analyzer, Whale Tracker</div></div><a href="/agents.html" style="display:inline-flex;align-items:center;gap:8px;padding:10px 24px;background:linear-gradient(135deg,#8060f0,#40c080);border-radius:10px;color:#fff;font-weight:600;font-size:0.9rem;text-decoration:none;box-shadow:0 4px 15px rgba(128,96,240,0.3)">View Dashboard &#8594;</a>';
          var p=hh[i].parentElement;
          if(p&&p.parentElement)p.parentElement.insertBefore(d2,p.nextSibling);
          done.ban=1;
        }
      }
    }
    if(!done.hero){
      var bb=document.querySelectorAll('button');
      for(var j=0;j<bb.length;j++){
        if(bb[j].textContent.trim()==='Explore Agents'){
          var a2=document.createElement('a');a2.href='/agents.html';a2.textContent='Explore Agents';
          a2.className=bb[j].className;
          a2.style.cssText='display:inline-block;padding:14px 32px;border:2px solid rgba(128,96,240,0.5);border-radius:12px;color:#e0e0e0;font-size:1rem;font-weight:600;text-decoration:none;background:transparent;cursor:pointer';
          bb[j].parentNode.replaceChild(a2,bb[j]);
          done.hero=1;
        }
      }
    }
    // Replace hero logo SVG with DAO logo
    if(!done.hlogo){
      var heroSvgs=document.querySelectorAll('section svg, div svg');
      heroSvgs.forEach(function(s){
        if(s.closest('nav'))return;
        var w=parseInt(s.getAttribute('width')||s.style.width)||0;
        if(w>=60||s.querySelector('polygon')){
          if(!s.dataset.rep){
            var img=document.createElement('img');
            img.src='https://realmdao.com/logo.svg';
            img.style.cssText='width:80px;height:80px';
            s.parentNode.replaceChild(img,s);
            done.hlogo=1;
          }
        }
      });
    }
  }
  new MutationObserver(function(){go()}).observe(document.body,{childList:true,subtree:true});
  setInterval(go,800);
})();
</script>"""

html = html.replace('</body>', script + '\n</body>')
f = open('index.html','w')
f.write(html)
f.close()
print('Main site script updated with DAO logo + links')
