const fs = require('fs');
const path = require('path');

const srcPages = path.join(__dirname, 'src', 'pages');

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

const files = walk(srcPages);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let dirty = false;

    // determine where file lives relative to src/pages
    const rel = path.relative(srcPages, file).split(path.sep).join('/');
    
    if (rel.startsWith('en/')) {
        // Paths that were originally in src/pages/ now in src/pages/en/
        // Need to add an extra '../' to imports OUT of the pages dir.
        // Let's use a safe method: look for references that should be deeper.
        
        // Wait, if it has 1 folder depth inside pages (e.g. `en/index.astro`), imports to components were `../components`.
        // Now they should be `../../components`.
        if (rel.split('/').length === 2) { // e.g. en/index.astro -> [en, index.astro]
            if(content.includes('from "../')) {
                // Not already fixed? If we see `from "../components`, replace with `from "../../components`
                // But avoid modifying already fixed `from "../../components`
                // Also handle `import img from "../assets`
                // We shouldn't replace `from "../../` if it already has it.
                // It's safer to just do regex that only matches exactly 1 `../`
                content = content.replace(/from\s+["'](?:\.\.\/)(?!\.\.\/)([^"']*)["']/g, 'from "../../$1"');
                dirty = true;
            }
        } else if (rel.split('/').length === 3) { // e.g. en/services/ausbildung.astro -> [en, services, ausbildung.astro]
             // originally `../../components`, now `../../../components`
             if(content.includes('from "../../')) {
                // Avoid matching `../../../`
                content = content.replace(/from\s+["'](?:\.\.\/\.\.\/)(?!\.\.\/)([^"']*)["']/g, 'from "../../../$1"');
                dirty = true;
             }
        }
    } else {
        // These are German pages moved UP one directory
        if (rel.split('/').length === 1) { // e.g. index.astro
            // originally `../../components`, now `../components`
            if(content.includes('from "../../')) {
                content = content.replace(/from\s+["'](?:\.\.\/\.\.\/)(?!\.\.\/)([^"']*)["']/g, 'from "../$1"');
                dirty = true;
            }
        } else if (rel.split('/').length === 2 && rel.startsWith('services/')) { // e.g. services/ausbildung.astro
            // originally `../../../components`, now `../../components`
            if(content.includes('from "../../../')) {
                content = content.replace(/from\s+["'](?:\.\.\/\.\.\/\.\.\/)(?!\.\.\/)([^"']*)["']/g, 'from "../../$1"');
                dirty = true;
            }
        }
    }

    if (dirty) {
        try {
            fs.writeFileSync(file, content, 'utf8');
            console.log("Fixed imports in " + rel);
        } catch(e) {
            console.error("Failed to write " + rel, e.message);
        }
    }
});
