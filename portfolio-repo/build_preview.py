import re, base64, os

ROOT = '/tmp/portfolio'

def read(path):
    with open(os.path.join(ROOT, path), 'r', encoding='utf-8') as f:
        return f.read()

def extract_main(html):
    m = re.search(r'<main class="wrap">(.*?)</main>', html, re.S)
    return m.group(1)

def rewrite_links(inner, project_slugs):
    # internal page links -> hash routes; leave http(s) links untouched
    inner = inner.replace('href="index.html"', 'href="#/"')
    inner = inner.replace('href="fun.html"', 'href="#/fun"')
    inner = inner.replace('href="about.html"', 'href="#/about"')
    inner = re.sub(r'href="Amalie_Judd_Resume\.pdf"', 'href="#" data-route-link="resume"', inner)
    for slug in project_slugs:
        inner = inner.replace(f'href="projects/{slug}.html"', f'href="#/projects/{slug}"')
    return inner

def rewrite_project_links(inner):
    inner = inner.replace('href="../index.html"', 'href="#/"')
    inner = inner.replace('href="../fun.html"', 'href="#/fun"')
    inner = inner.replace('href="../about.html"', 'href="#/about"')
    inner = re.sub(r'href="\.\./Amalie_Judd_Resume\.pdf"', 'href="#" data-route-link="resume"', inner)
    return inner

def namespace_ids(inner, slug):
    # namespace case-section ids and their matching TOC anchors so ids
    # don't collide once every project's markup lives in one DOM.
    inner = re.sub(r'id="([a-z]+)"', lambda m: f'id="{slug}-{m.group(1)}"', inner)
    def toc_sub(m):
        frag = m.group(1)
        return f'data-scroll="{slug}-{frag}" href="#{slug}-{frag}"'
    inner = re.sub(r'href="#([a-z]+)"', toc_sub, inner)
    return inner

project_slugs = ['woolies-core', 'woolies-design-system', 'woolies-todos', 'airnz-member-portal', 'origin-energy', 'sydney-water', 'sydney-water-prototype', 'woolies-food-safety']

def data_uri(rel_path):
    with open(os.path.join(ROOT, rel_path), 'rb') as f:
        b64 = base64.b64encode(f.read()).decode('ascii')
    return f"data:image/jpeg;base64,{b64}"

REAL_PHOTOS = ['woolies-platform.jpg', 'woolies-todos.jpg', 'meW-problem.jpg', 'meW_todo_today.jpg', 'instore-research.jpg', 'airnz-koru.jpg', 'sigiriya.jpg', 'niseko.jpg']

def inline_real_photos(html):
    for name in REAL_PHOTOS:
        uri = data_uri(f'assets/{name}')
        html = html.replace(f"../assets/{name}", uri)
        html = html.replace(f"assets/{name}", uri)
    return html

# ---- styles ----
css = read('styles.css')
with open(os.path.join(ROOT, 'assets/gradient.jpg'), 'rb') as f:
    gradient_b64 = base64.b64encode(f.read()).decode('ascii')
gradient_uri = f"data:image/jpeg;base64,{gradient_b64}"
css = css.replace("url('assets/gradient.jpg')", f"url('{gradient_uri}')")

# ---- shared script.js ----
script_js = read('script.js')

# ---- route sections ----
sections = []

for route, page in [('/', 'index.html'), ('/fun', 'fun.html'), ('/about', 'about.html')]:
    inner = extract_main(read(page))
    inner = rewrite_links(inner, project_slugs)
    inner = inline_real_photos(inner)
    sections.append(f'<section class="route-section" data-route="{route}">\n{inner}\n</section>')

for slug in project_slugs:
    inner = extract_main(read(f'projects/{slug}.html'))
    inner = inline_real_photos(inner)
    inner = rewrite_project_links(inner)
    inner = namespace_ids(inner, slug)
    sections.append(f'<section class="route-section" data-route="/projects/{slug}">\n{inner}\n</section>')

route_html = '\n'.join(sections)

router_js = """
let _caseScrollHandler = null;
let _currentRoute = null;
function normalizeRoute(hash) {
  let r = (hash || '').replace(/^#/, '');
  if (!r) r = '/';
  return r;
}
function goToRoute(route) {
  _currentRoute = route;
  try { history.replaceState(null, '', '#' + route); } catch (e) {}
  showRoute();
}
function initRouteLinks() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    if (a.dataset.routeBound) return;
    if (a.hasAttribute('data-scroll')) return;
    a.dataset.routeBound = "1";
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = a.getAttribute('href');
      if (!target || target === '#') return;
      goToRoute(normalizeRoute(target));
    });
  });
}
function showRoute() {
  const route = _currentRoute || normalizeRoute(location.hash);
  _currentRoute = route;
  document.querySelectorAll('.route-section').forEach(sec => {
    sec.hidden = sec.dataset.route !== route;
  });
  document.querySelectorAll('#main-nav a').forEach(a => {
    const target = a.dataset.routeLink;
    a.classList.toggle('active', target === route);
  });
  window.scrollTo({top: 0, behavior: 'instant'});
  initReveal();
  initScrollLinks();
  initCaseScrollspy();
  initRouteLinks();
}
function initReveal() {
  const revealEls = document.querySelectorAll('.route-section:not([hidden]) [data-reveal]');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
  }, { threshold: 0.1 });
  revealEls.forEach(el => { el.classList.remove('in'); io.observe(el); });
}
function initScrollLinks() {
  document.querySelectorAll('.route-section:not([hidden]) [data-scroll]').forEach(a => {
    if (a.dataset.bound) return;
    a.dataset.bound = "1";
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const id = a.dataset.scroll;
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({behavior:'smooth', block:'start'});
    });
  });
}
function initCaseScrollspy() {
  if (_caseScrollHandler) { document.removeEventListener('scroll', _caseScrollHandler); _caseScrollHandler = null; }
  const activeSection = document.querySelector('.route-section:not([hidden])');
  if (!activeSection) return;
  const tocLinks = activeSection.querySelectorAll('.case-toc a[data-scroll]');
  const sections = Array.from(activeSection.querySelectorAll('.case-section[id]'));
  if (!tocLinks.length || !sections.length) return;
  const TRIGGER = 160;
  const setActive = () => {
    let current = sections[0];
    for (const sec of sections) {
      if (sec.getBoundingClientRect().top - TRIGGER <= 0) current = sec;
    }
    const _doc = document.documentElement;
    if (window.innerHeight + window.scrollY >= _doc.scrollHeight - 2) {
      current = sections[sections.length - 1];
    }
    tocLinks.forEach(l => { l.classList.toggle('active', l.dataset.scroll === current.id); });
  };
  _caseScrollHandler = setActive;
  document.addEventListener('scroll', setActive, { passive: true });
  window.addEventListener('resize', setActive);
  setActive();
}
window.addEventListener('hashchange', () => { _currentRoute = null; showRoute(); });
document.addEventListener('DOMContentLoaded', showRoute);
"""

doc = f"""<title>Amalie Judd | Senior UX Designer</title>
<style>
{css}
</style>

<nav class="site-nav" id="main-nav">
  <a href="#/" class="nav-item" data-route-link="/">Work</a>
  <a href="#/fun" class="nav-item" data-route-link="/fun">Fun</a>
  <a href="#/about" class="nav-item" data-route-link="/about">About</a>
  <a href="#" class="nav-item nav-resume" data-route-link="resume">Resume</a>
</nav>
<div class="status-chip"><span class="dot">✦</span> AMALIEJUDD</div>

<main class="wrap">
{route_html}
</main>

<footer class="site-footer">
  <div class="wrap">
    <div class="footer-links">
      <a href="https://www.linkedin.com/in/amalie-judd-a41129177/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
      <a href="mailto:amaliejudd@outlook.com">Email</a>
      <a href="#" data-route-link="resume">CV</a>
    </div>
    <div class="footer-note">© 2026 Amalie Judd</div>
  </div>
</footer>

<script>
{script_js}
</script>
<script>
{router_js}
</script>
<!-- head-spin.js drives the About page's floating head canvas. It's kept as a
     sibling file (not inlined like script.js) because it fetches 24 image
     frames from assets/head-spin/ at runtime — those aren't base64-inlined
     either, so this preview.html must stay next to head-spin.js and
     assets/head-spin/ for the head to work here. -->
<script src="head-spin.js" defer></script>
"""

with open(os.path.join(ROOT, 'preview.html'), 'w', encoding='utf-8') as f:
    f.write(doc)

print("wrote preview.html", len(doc), "bytes")
