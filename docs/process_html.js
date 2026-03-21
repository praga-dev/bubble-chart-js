const fs = require("fs");
const path = require("path");

const filesToProcess = {
  "landing_desktop.html": "index.html",
  "examples_desktop.html": "examples.html",
  "docs_desktop.html": "documentation.html",
  "playground_desktop.html": "playground.html",
};

const inputDir = path.join(__dirname, "temp");
const outputDir = path.join(__dirname);

for (const [inFile, outFile] of Object.entries(filesToProcess)) {
  const inPath = path.join(inputDir, inFile);
  const outPath = path.join(outputDir, outFile);

  if (!fs.existsSync(inPath)) {
    console.error(`File not found: ${inPath}`);
    continue;
  }

  let html = fs.readFileSync(inPath, "utf8");

  // Wire up Navigation Links (Header & Footer)
  html = html.replace(
    /href="[^"]*">Docs<\/a>/g,
    'href="documentation.html">Docs</a>'
  );
  html = html.replace(
    /href="[^"]*">Examples<\/a>/g,
    'href="examples.html">Examples</a>'
  );
  html = html.replace(
    /href="[^"]*">Playground<\/a>/g,
    'href="playground.html">Playground</a>'
  );
  html = html.replace(
    /href="[^"]*">GitHub<\/a>/g,
    'href="https://github.com/praga-dev/bubble-chart-js" target="_blank" rel="noopener noreferrer">GitHub</a>'
  );

  // Wire up the Logo to index.html
  html = html.replace(
    /<span class="[^"]*font-black text-\[#72dcff\][^"]*">bubble-chart-js<\/span>/g,
    '<a href="index.html" class="flex items-center gap-2 hover:opacity-80 transition-opacity"><span class="text-xl font-black text-[#72dcff] tracking-tighter font-headline">bubble-chart-js</span></a>'
  );

  // Since 'examples_desktop' logo spans might be a bit different, let's catch standard text
  html = html.replace(
    /<div class="text-lg font-bold text-\[#72dcff\] mb-4 font-headline">bubble-chart-js<\/div>/g,
    '<a href="index.html" class="text-lg font-bold text-[#72dcff] mb-4 font-headline block hover:opacity-80">bubble-chart-js</a>'
  );
  html = html.replace(
    /<span class="text-lg font-bold text-\[#72dcff\] font-headline">bubble-chart-js<\/span>/g,
    '<a href="index.html" class="text-lg font-bold text-[#72dcff] font-headline block hover:opacity-80">bubble-chart-js</a>'
  );

  // Fix buttons that act as links
  html = html.replace(
    /<button[^>]*>[\s]*View Playground[\s]*<\/button>/g,
    '<a href="playground.html" class="px-8 py-4 glass-panel text-on-surface font-bold font-headline rounded-xl hover:bg-surface-variant/40 transition-colors text-center inline-block">View Playground</a>'
  );
  html = html.replace(
    /<button[^>]*>[\s]*View Documentation[\s]*<\/button>/g,
    '<a href="documentation.html" class="px-8 py-4 glass-panel text-on-surface font-bold font-headline rounded-xl hover:bg-surface-variant/40 transition-colors text-center inline-block">View Documentation</a>'
  );

  // Add Mobile Menu Toggle Button and adjust nav container
  if (!html.includes('id="mobile-menu"')) {
    html = html.replace(
      /<div class="hidden md:flex items-center gap-8 font-headline font-bold tracking-tight">/g,
      '<div id="mobile-menu" class="hidden md:flex flex-col md:flex-row absolute md:relative top-16 md:top-0 left-0 w-full md:w-auto bg-[#090e1c]/95 md:bg-transparent p-6 md:p-0 items-center gap-8 font-headline font-bold tracking-tight border-b md:border-none border-outline-variant/15 md:flex-1 md:justify-center">'
    );

    // Add hamburger button to the controls area
    html = html.replace(
      /<div class="flex items-center gap-4">/g,
      '<div class="flex items-center gap-4">\n<button id="menu-btn" class="md:hidden material-symbols-outlined text-[#e1e4fa] hover:text-[#72dcff] transition-colors">menu</button>'
    );

    // Inject script at the end of body
    html = html.replace(
      /<\/body>/g,
      `
<script>
  document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if(menuBtn && mobileMenu) {
      menuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
        mobileMenu.classList.toggle('flex');
      });
    }
  });
</script>
</body>`
    );
  }

  // Write finalized HTML
  fs.writeFileSync(outPath, html, "utf8");
  console.log(`Processed: ${inFile} -> ${outFile}`);
}
