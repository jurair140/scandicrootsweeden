const fs = require('fs');
const path = require('path');

const srcPagesEn = path.join(__dirname, 'src', 'pages', 'en');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if(file.endsWith('.astro')) results.push(file);
        }
    });
    return results;
}

const files = walk(srcPagesEn);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let dirty = false;

    // Replace: isDe ? "/de/about" : "/about" -> isDe ? "/about" : "/en/about"
    // Regex matches: isDe ? "`/de/something`" : "`/something`"
    
    // Pattern 1: with `/de/...`
    const pattern1 = /isDe\s*\?\s*["']\/de([^"']*)["']\s*:\s*["']\/([^"']*)["']/g;
    if(pattern1.test(content)) {
        content = content.replace(pattern1, 'isDe ? "/$1" : "/en/$2"');
        dirty = true;
    }

    // Pattern 2: `href="/de/...`  or similar hardcoded DE links in en files?
    // Wait, english files should just have english links, if they have hardcoded `/de/` it means they are linking to the German site.
    // That should now link to `/`.
    // Let's replace ONLY `href="/de/...` to `href="/...`
    const pattern2 = /href=["']\/de([^"']*)["']/g;
    if (pattern2.test(content)) {
        content = content.replace(pattern2, 'href="/$1"');
        dirty = true;
    }

    if (dirty) {
        fs.writeFileSync(file, content, 'utf8');
        console.log("Fixed links in " + file);
    }
});
